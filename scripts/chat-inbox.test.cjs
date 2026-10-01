// Exercise the actual Redux thunk and inbox/components without production reads.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { build } = require("esbuild");
const React = require("react");
const { configureStore } = require("@reduxjs/toolkit");
const { Provider } = require("react-redux");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");

async function loadModule(entry, mocks) {
  const bundled = await build({
    entryPoints: [path.join(root, entry)], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external",
    plugins: [{ name: "test-boundaries", setup(builder) {
      for (const suffix of Object.keys(mocks)) {
        builder.onResolve({ filter: new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }, () => ({ path: suffix, external: true }));
      }
    } }],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports,
  );
  return module.exports;
}

test("profile requests deduplicate, keep full avatars, refresh stale cache and back off failure", async () => {
  let reads = 0;
  let release;
  const mocks = {
    "firebase.config": { auth: {currentUser: {uid: "vendor"}} },
    "services/chatParticipantProfiles": {
      getChatParticipantProfile: request => {
        assert.equal(request.ownerUid, "vendor");
        assert.equal(request.conversationId, "thread");
        reads++;
        return new Promise((resolve, reject) => { release = { resolve, reject }; });
      },
    },
  };
  const { default: reducer, fetchCustomerProfile } = await loadModule("src/redux/reducers/vendorChatSlice.js", mocks);
  const store = configureStore({ reducer: { vendorChats: reducer } });
  const photo = "data:image/svg+xml," + "x".repeat(20_000);
  const request = customerId => ({customerId, conversationId: "thread"});
  const one = store.dispatch(fetchCustomerProfile(request("buyer")));
  const two = store.dispatch(fetchCustomerProfile(request("buyer")));
  assert.equal(reads, 1);
  release.resolve({uid: "buyer", displayName: "Buyer", photoURL: photo});
  await Promise.all([one, two]);
  assert.equal(store.getState().vendorChats.profiles.buyer.photoURL, photo);
  await store.dispatch(fetchCustomerProfile(request("buyer")));
  assert.equal(reads, 1);

  const previous = structuredClone(store.getState().vendorChats);
  previous.profileRequests.buyer.updatedAt = Date.now() - 300_001;
  const refreshed = configureStore({ reducer: { vendorChats: reducer }, preloadedState: { vendorChats: previous } });
  const remove = refreshed.dispatch(fetchCustomerProfile(request("buyer")));
  assert.equal(refreshed.getState().vendorChats.profiles.buyer.photoURL, photo, "keep image visible while refreshing");
  release.resolve({uid: "buyer", displayName: "Buyer", photoURL: null});
  await remove;
  assert.equal(refreshed.getState().vendorChats.profiles.buyer.photoURL, null);
  const missing = refreshed.dispatch(fetchCustomerProfile(request("missing")));
  release.resolve({uid: "missing", displayName: "Customer", photoURL: null});
  await missing;
  assert.equal(refreshed.getState().vendorChats.profiles.missing.photoURL, null);

  const failed = refreshed.dispatch(fetchCustomerProfile(request("offline")));
  const beforeFailure = reads;
  const errorLog = console.error;
  console.error = () => {};
  try { release.reject(new Error("offline")); await failed; } finally { console.error = errorLog; }
  await refreshed.dispatch(fetchCustomerProfile(request("offline")));
  assert.equal(reads, beforeFailure, "no retry loop");
  for (const invalid of [{}, {customerId: ""}, {customerId: "buyer"}]) await refreshed.dispatch(fetchCustomerProfile(invalid));
  assert.equal(reads, beforeFailure);
});

test("continuous inbox renders full profile photos, has no legacy tabs and isolates account switches", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.sessionStorage = dom.window.sessionStorage;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require("react-dom/client");
  const { act } = require("react-dom/test-utils");
  let auth = { currentUser: { uid: "vendor" }, loading: false };
  let reads = 0;
  const moves = [];
  const photo = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><text>${"x".repeat(20_000)}</text></svg>`);
  const mocks = {
    "firebase.config": { get auth() {return auth;} },
    "services/chatParticipantProfiles": {
      getChatParticipantProfile: async request => {
        assert.equal(request.conversationId, "thread");
        reads++;
        return {uid: "buyer", displayName: "Rachael", photoURL: photo};
      },
    },
    "useAuth": { useAuth: () => auth },
    "services/offerConversations": { hydrateMyOfferConversations: async () => {} },
    "services/haptics": { appHaptics: { selection: () => {} } },
    "layout/AppPageHeader": ({ title }) => React.createElement("header", null, title),
    "Helmet/SEO": () => null,
    "Loading/NoMessage": () => null,
    "react-router-dom": { useNavigate: () => (url) => moves.push(url), useLocation: () => ({ pathname: "/vchats", search: "" }) },
  };
  const { default: customerReducer } = await loadModule("src/redux/reducers/vendorChatSlice.js", mocks);
  const { default: Inbox } = await loadModule("src/pages/vendor/VendorChatList.jsx", mocks);
  const conversation = { id: "thread", buyerId: "buyer", vendorId: "vendor", buyer: { displayName: "Rachael", avatarUrl: "truncated" }, latestEvent: { type: "text", preview: "Hello" }, latestActivityAt: 1 };
  const store = configureStore({ reducer: {
    vendorChats: customerReducer,
    offerConversations: (state = { ids: ["thread"], entities: { thread: conversation }, ownerUid: "vendor", ownerRole: "vendor", status: "ready" }, action) =>
      action.type === "test/avatarChanged"
        ? { ...state, entities: { thread: { ...conversation, buyer: { ...conversation.buyer, ...action.payload } } } }
        : state,
  } });
  const app = createRoot(document.getElementById("root"));
  const render = async () => act(async () => { app.render(React.createElement(Provider, { store }, React.createElement(Inbox))); });
  try {
    await render();
    assert.equal(document.querySelector("[role=tablist]"), null);
    assert.equal(document.querySelector("img").getAttribute("src"), photo);
    assert.equal(reads, 1);
    assert.match(document.body.textContent, /Rachael/);
    await act(async () => { document.querySelector("button").click(); });
    assert.deepEqual(moves, ["/offer-conversations/thread"]);
    await render();
    assert.equal(reads, 1);
    await act(async () => { document.querySelector("img").dispatchEvent(new dom.window.Event("error")); });
    assert.equal(document.querySelector("img"), null, "broken image shows the contact fallback");
    await act(async () => { store.dispatch({ type: "test/avatarChanged", payload: { avatarVersion: 2, avatarUrl: "https://example.com/new.jpg" } }); });
    assert.equal(document.querySelector("img").getAttribute("src"), "https://example.com/new.jpg", "a changed photo renders after an earlier failure");
    await act(async () => { store.dispatch({ type: "test/avatarChanged", payload: { avatarVersion: 2, avatarUrl: "" } }); });
    assert.equal(document.querySelector("img"), null, "removed avatar does not resurrect cached picture");
    assert.equal(reads, 1, "repaired summaries don't trigger more profile reads");
    auth = { currentUser: { uid: "other-vendor" }, loading: false };
    await render();
    assert.doesNotMatch(document.body.textContent, /Rachael/);
    auth = { currentUser: null, loading: true };
    await render();
    assert.equal(moves.length, 1, "no premature login redirect during auth hydration");
    auth = { currentUser: null, loading: false };
    await render();
    assert.equal(moves.at(-1), "/vendorlogin");
  } finally {
    await act(async () => app.unmount());
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.sessionStorage;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

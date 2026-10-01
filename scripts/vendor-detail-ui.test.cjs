const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { build } = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { Provider } = require("react-redux");
const { configureStore } = require("@reduxjs/toolkit");
const { JSDOM } = require("jsdom");
const project = path.resolve(__dirname, "..");

// Bundle the real UI, replacing only network/native/layout boundaries in tests.
async function loadComponent(entry, mocks) {
  const result = await build({
    entryPoints: [path.join(project, entry)], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", loader: { ".css": "empty" },
    plugins: [{ name: "test-boundaries", setup(builder) {
      for (const suffix of Object.keys(mocks)) {
        builder.onResolve({ filter: new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }, () => ({ path: suffix, external: true }));
      }
    } }],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports,
  );
  return module.exports.default;
}

const store = () => configureStore({ reducer: (state = { vendorProfile: { data: null } }) => state });
const baseOrder = (extra = {}) => ({
  id: "order-1", orderId: "MTP-1", vendorId: "vendor", kind: "delivery",
  vendorStatus: "declined", progressStatus: "Declined", declineReason: "Item damaged: seam is torn.",
  createdAt: "2026-09-27T08:00:00Z", items: [{ productId: "p1", name: "Shirt", quantity: 1, unitPrice: 4000 }],
  ...extra,
});

test("decline reasons render for delivery, pickup and declined stockpile orders", async () => {
  const Details = await loadComponent("src/pages/Orders/VendorOrderDetailsSheet.jsx", {
    "firebase.config": { functions: {}, storage: {} },
    "custom-hooks/orderListener": { refreshVendorOrders: async () => [] },
    "layout/AppBottomSheet": ({ open, children }) => open ? React.createElement("section", null, children) : null,
    "Form/NativePickerField": () => null,
    "Inputs/NativeImageInput": () => null,
    "services/haptics": { appHaptics: {} },
    "services/privateMedia": {loadDeliveryProof: () => {throw Error("Unexpected proof read");}},
  });
  const render = (order, orders = [order], sourceBucket = "declined") => renderToStaticMarkup(
    React.createElement(Provider, { store: store() }, React.createElement(Details, { open: true, order, orders, sourceBucket })),
  );
  for (const kind of ["delivery", "pickup", "stockpile"]) {
    const html = render(baseOrder({ kind }));
    assert.equal((html.match(/Decline reason/g) || []).length, 1, kind);
    assert.equal((html.match(/Item damaged: seam is torn\./g) || []).length, 1, kind);
    assert.doesNotMatch(html, /Accept order|Confirm courier handover|needs your decision/);
  }
  const legacy = render(baseOrder({ vendorStatus: undefined, declineReason: "Vendor did not respond within 48 hours" }));
  assert.match(legacy, /Vendor did not respond within 48 hours/);
  assert.doesNotMatch(legacy, /Awaiting your decision|needs your decision/);
  assert.match(render(baseOrder({ declineReason: "  " })), /No decline reason was recorded/);
  assert.doesNotMatch(render(baseOrder({ vendorStatus: "accepted", progressStatus: "Processing", declineReason: "stale reason" })), /Decline reason|stale reason/);

  const active = baseOrder({ id: "accepted", kind: "stockpile", vendorStatus: "accepted", progressStatus: "Processing", declineReason: null, stockpile: { id: "pile", isActive: true, status: "active" } });
  const declinedAddition = baseOrder({ id: "declined-addition", orderId: "MTP-2", kind: "stockpile" });
  const grouped = render(active, [active, declinedAddition], "active");
  assert.match(grouped, /Active stockpile/);
  assert.equal((grouped.match(/Decline reason/g) || []).length, 1);
  assert.equal((grouped.match(/Item damaged: seam is torn\./g) || []).length, 1);
  const escaped = render(baseOrder({ declineReason: "<script>alert('bad')</script>" }));
  assert.match(escaped, /&lt;script&gt;/);
  assert.doesNotMatch(escaped, /<script>/);
});

test("profile details hides/restores bottom navigation and keeps payout digits masked", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require("react-dom/client");
  const { act } = require("react-dom/test-utils");
  const AccessContext = React.createContext();
  const VendorContext = React.createContext();
  const profile = {
    firstName: "Sample", lastName: "Vendor", shopName: "Sample store", email: "sample@example.test",
    pickupAddress: "Existing pickup address",
    bankDetails: { bankName: "Example Bank", accountName: "SAMPLE STORE LIMITED", accountNumber: "0123456789" },
  };
  const supportRequests = [];
  const Details = await loadComponent("src/pages/vendor/VprofileDetails.jsx", {
    "Context/Vendorcontext": { VendorContext },
    "Context/AccesContext": { AccessContext },
    "Context/TawkProvider": { useTawk: () => ({ openChat: (details) => supportRequests.push(details) }) },
    "Loading/Loading": () => React.createElement("span", null, "Loading"),
    "layout/AppPageHeader": ({ title, onBack }) => React.createElement("header", null, title, React.createElement("button", { onClick: onBack }, "Back")),
    "services/vendorProfileManagement": { updateVendorProfileField: () => { throw Error("Unexpected write"); }, vendorProfileErrorMessage: () => "Error" },
    "services/haptics": { appHaptics: {} },
    "./EditFieldModal": () => null,
  });
  function Harness() {
    const [hidden, setHideBottomBar] = React.useState(false);
    const [show, setShow] = React.useState(true);
    return React.createElement(Provider, { store: store() },
      React.createElement(AccessContext.Provider, { value: { hideBottomBar: hidden, setHideBottomBar } },
        React.createElement(VendorContext.Provider, { value: { vendorData: profile, loading: false } },
          show && React.createElement(Details, { onBack: () => setShow(false) }),
          !hidden && React.createElement("nav", null, "Bottom navigation"),
        ),
      ),
    );
  }
  const app = createRoot(document.getElementById("root"));
  try {
    await act(async () => app.render(React.createElement(React.StrictMode, null, React.createElement(Harness))));
    assert.equal(document.querySelector("nav"), null);
    assert.match(document.body.textContent, /••••••6789/);
    assert.doesNotMatch(document.body.innerHTML, /0123456789/);
    assert.match(document.body.textContent, /SAMPLE STORE LIMITED/);
    assert.match(document.body.textContent, /Withdrawals are paid only to this verified account/);
    assert.match(document.body.textContent, /Existing pickup address/);
    assert.doesNotMatch(document.body.textContent, /once every 48 hours/);
    assert.equal(document.querySelector('[aria-label="Edit Buyer pickup address"]'), null);
    await act(async () => document.querySelector('[aria-label="Contact support to change buyer pickup address"]').click());
    assert.equal(supportRequests.length, 1);
    assert.equal(supportRequests[0].topic, "change-buyer-pickup-address");
    await act(async () => document.querySelector("header button").click());
    assert.ok(document.querySelector("nav"));
    assert.equal(document.querySelector(".vendor-detail-page"), null);
  } finally {
    await act(async () => app.unmount());
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

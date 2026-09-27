import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  persistence,
  cartMerge,
  cartSync,
  cartPage,
  authModal,
  login,
  settings,
  productDetail,
  checkout,
  storeBasket,
] = await Promise.all([
  read("src/services/cartPersistence.js"),
  read("src/services/cartMerge.js"),
  read("src/custom-hooks/useCartSync.js"),
  read("src/pages/Cart.jsx"),
  read("src/components/PwaModals/AuthModal.jsx"),
  read("src/pages/Login.jsx"),
  read("src/pages/UserSide/Settings.jsx"),
  read("src/pages/UserSide/ProductDetail.jsx"),
  read("src/pages/NewCheckout.jsx"),
  read("src/components/QuickMode/StoreBasket.jsx"),
]);

assert.equal(
  persistence.includes("mutationReceipts"),
  false,
  "cart writes must stay on carts/{uid}; deployed rules do not permit receipt subcollection writes",
);
assert.match(
  persistence,
  /hydrateUser\s*=\s*async\s*\(uid,\s*\{\s*importGuest\s*=\s*false/,
  "passive hydration must not import a guest basket",
);
assert.match(
  persistence,
  /stageAnonymousCartAsGuest/,
  "anonymous UID replacement must have a durable cart handoff",
);
assert.match(
  cartMerge,
  /importGuest:\s*true/,
  "validated fetchAndMergeCart must be the explicit guest-import boundary",
);
assert.equal(
  cartSync.includes("clearGuestCartCache"),
  false,
  "raw Firebase auth events must never clear the guest cart",
);
assert.match(
  cartSync,
  /stageAnonymousCartAsGuest\(previousUid\)/,
  "auth owner changes must preserve an anonymous cart",
);
assert.match(
  settings,
  /clearGuestCartCache\(\);\s*await signOut\(auth\)/s,
  "only explicit customer logout should clear the signed-out basket",
);
assert.match(
  authModal,
  /fetchAndMergeCart\(db,\s*uid,\s*dispatch\)/,
  "QuickAuth surfaces without a callback still need the validated cart import",
);
assert.match(
  cartPage,
  /\[pendingCheckoutVendor,\s*setPendingCheckoutVendor\]\s*=\s*useState\(null\)/,
  "cross-vendor checkout must retain its pending target in React state",
);
assert.match(
  cartPage,
  /setPendingCheckoutVendor\(vendorId\);\s*setShowExitStockpileModal\(true\)/s,
  "cross-vendor checkout must open the repile decision sheet",
);

const cartSurfaces = [
  cartPage,
  authModal,
  login,
  productDetail,
  checkout,
  storeBasket,
].join("\n");
for (const forbiddenCopy of [
  "still syncing",
  "finish syncing",
  "sync it when",
  "restore your cart",
  "We merged your items",
  "items are safe on this device",
]) {
  assert.equal(
    cartSurfaces.toLowerCase().includes(forbiddenCopy.toLowerCase()),
    false,
    `cart persistence must remain silent; found: ${forbiddenCopy}`,
  );
}
assert.match(
  login,
  /const fetchCartFromFirestore = async[\s\S]*?Cart import will retry after login/,
  "login must isolate cart-import failures from authentication errors",
);
assert.match(
  storeBasket,
  /const fetchCartFromFirestore = async[\s\S]*?Cart import will retry after quick checkout login/,
  "quick checkout must isolate cart-import failures from authentication errors",
);

const emailLoginStart = login.indexOf("const signIn = async");
const socialLoginStart = login.indexOf("const handleGoogleSignIn", emailLoginStart);
const emailLogin = login.slice(emailLoginStart, socialLoginStart);
assert.ok(emailLoginStart >= 0 && socialLoginStart > emailLoginStart);
assert.ok(
  emailLogin.indexOf("if (!user.emailVerified)") <
    emailLogin.indexOf("await fetchCartFromFirestore(user.uid)"),
  "email verification must happen before guest cart import",
);
assert.ok(
  emailLogin.indexOf("await fetchCartFromFirestore(user.uid)") <
    emailLogin.indexOf("navigate(redirectTo"),
  "validated cart import must finish before login navigation",
);

console.log("Cart auth-boundary and checkout integration checks passed.");

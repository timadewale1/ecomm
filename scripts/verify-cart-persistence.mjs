import assert from "node:assert/strict";
import {
  applyCartMutation,
  applyCartMutations,
  buildCartSetOptions,
  deriveGuestCartAdditions,
} from "../src/services/cartPersistenceOperations.js";

const product = (id, quantity = 1) => ({ id, quantity });

const serverCart = {
  vendorA: {
    vendorName: "A",
    products: {
      removeMe: product("remove"),
      keepMe: product("keep"),
    },
  },
  vendorB: {
    vendorName: "B",
    products: { otherDeviceItem: product("other") },
  },
};

const intendedAfterRemoval = {
  vendorA: {
    vendorName: "A",
    products: { keepMe: product("keep") },
  },
};

const removed = applyCartMutation(serverCart, intendedAfterRemoval, {
  type: "remove_item",
  vendorId: "vendorA",
  productKey: "removeMe",
});

assert.equal(removed.vendorA.products.removeMe, undefined);
assert.equal(removed.vendorA.products.keepMe.id, "keep");
assert.equal(removed.vendorB.products.otherDeviceItem.id, "other");

const intendedQuantity = {
  vendorA: {
    vendorName: "A",
    products: { keepMe: product("keep", 3) },
  },
};
const quantityUpdated = applyCartMutation(serverCart, intendedQuantity, {
  type: "quantity_update",
  vendorId: "vendorA",
  productKey: "keepMe",
});
assert.equal(quantityUpdated.vendorA.products.keepMe.quantity, 3);
assert.equal(quantityUpdated.vendorA.products.removeMe.id, "remove");
assert.equal(quantityUpdated.vendorB.products.otherDeviceItem.id, "other");

const concurrentQuantityIncrease = applyCartMutation(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 4) },
    },
  },
  intendedQuantity,
  {
    type: "quantity_update",
    vendorId: "vendorA",
    productKey: "keepMe",
    quantityDelta: 1,
  },
);
assert.equal(concurrentQuantityIncrease.vendorA.products.keepMe.quantity, 5);

const concurrentQuantityDecrease = applyCartMutation(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 2) },
    },
  },
  {},
  {
    type: "quantity_update",
    vendorId: "vendorA",
    productKey: "keepMe",
    quantityDelta: -1,
  },
);
assert.equal(concurrentQuantityDecrease.vendorA.products.keepMe.quantity, 1);

// A minus tap on the last local unit expresses deletion, not an arithmetic
// decrement. It must still remove the line if another device raised it to 2.
const lastLocalUnitRemoved = applyCartMutation(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 2) },
    },
  },
  {},
  {
    type: "remove_item",
    vendorId: "vendorA",
    productKey: "keepMe",
  },
);
assert.equal(lastLocalUnitRemoved.vendorA, undefined);

const concurrentAdd = applyCartMutations(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 2) },
    },
  },
  intendedQuantity,
  [
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 1),
      quantityMode: "increment",
      quantityDelta: 1,
      mutationId: "concurrent-add-once",
    },
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 1),
      quantityMode: "increment",
      quantityDelta: 1,
      mutationId: "concurrent-add-once",
    },
  ],
);
assert.equal(concurrentAdd.vendorA.products.keepMe.quantity, 3);

const replaceThenIncrease = applyCartMutations(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 5) },
    },
  },
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 3) },
    },
  },
  [
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 2),
      quantityMode: "replace",
      mutationId: "replace-at-two",
    },
    {
      type: "quantity_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      quantityDelta: 1,
      mutationId: "increase-to-three",
    },
  ],
);
assert.equal(replaceThenIncrease.vendorA.products.keepMe.quantity, 3);

const replaceThenDecrease = applyCartMutations(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 5) },
    },
  },
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 1) },
    },
  },
  [
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 2),
      quantityMode: "replace",
      mutationId: "replace-before-decrease",
    },
    {
      type: "quantity_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      quantityDelta: -1,
      mutationId: "decrease-to-one",
    },
  ],
);
assert.equal(replaceThenDecrease.vendorA.products.keepMe.quantity, 1);

const orderedAbsoluteEdits = applyCartMutations(
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 5) },
    },
  },
  {
    vendorA: {
      vendorName: "A",
      products: { keepMe: product("keep", 4) },
    },
  },
  [
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 2),
      quantityMode: "replace",
      mutationId: "ordered-replace-two",
    },
    {
      type: "quantity_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      quantityDelta: 1,
      mutationId: "ordered-increment",
    },
    {
      type: "add_or_update",
      vendorId: "vendorA",
      productKey: "keepMe",
      product: product("keep", 4),
      quantityMode: "replace",
      mutationId: "ordered-replace-four",
    },
  ],
);
assert.equal(orderedAbsoluteEdits.vendorA.products.keepMe.quantity, 4);

const concurrentGuestAdditions = deriveGuestCartAdditions(
  {
    vendorA: {
      vendorName: "A",
      products: {
        existing: product("existing", 3),
        newItem: product("new", 1),
      },
    },
  },
  {
    vendorA: {
      vendorName: "A",
      products: { existing: product("existing", 1) },
    },
  },
);
assert.equal(concurrentGuestAdditions.vendorA.products.existing.quantity, 2);
assert.equal(concurrentGuestAdditions.vendorA.products.newItem.quantity, 1);
assert.deepEqual(
  deriveGuestCartAdditions(
    {
      vendorA: {
        vendorName: "A",
        products: { existing: product("existing", 1) },
      },
    },
    {
      vendorA: {
        vendorName: "A",
        products: { existing: product("existing", 2) },
      },
    },
  ),
  {},
);

const offlineDeletesReplayed = applyCartMutations(serverCart, {}, [
  {
    type: "remove_item",
    vendorId: "vendorA",
    productKey: "removeMe",
    mutationId: "offline-remove-a",
  },
  {
    type: "remove_item",
    vendorId: "vendorA",
    productKey: "keepMe",
    mutationId: "offline-remove-b",
  },
]);
assert.equal(offlineDeletesReplayed.vendorA, undefined);
assert.equal(offlineDeletesReplayed.vendorB.products.otherDeviceItem.id, "other");

const itemAdded = applyCartMutation(
  serverCart,
  {
    vendorA: {
      vendorName: "A",
      products: { newItem: product("new") },
    },
  },
  {
    type: "add_or_update",
    vendorId: "vendorA",
    productKey: "newItem",
  },
);
assert.equal(itemAdded.vendorA.products.newItem.id, "new");
assert.equal(itemAdded.vendorA.products.keepMe.id, "keep");
assert.equal(itemAdded.vendorB.products.otherDeviceItem.id, "other");

const soleItemRemoved = applyCartMutation(
  {
    vendorA: {
      vendorName: "A",
      products: { removeMe: product("remove") },
    },
    ...serverCart,
    vendorC: {
      vendorName: "C",
      products: { removeMe: product("remove") },
    },
  },
  {},
  {
    type: "remove_item",
    vendorId: "vendorC",
    productKey: "removeMe",
  },
);
assert.equal(soleItemRemoved.vendorC, undefined);
assert.equal(soleItemRemoved.vendorB.products.otherDeviceItem.id, "other");

const clearedVendor = applyCartMutation(serverCart, {}, {
  type: "clear_vendor",
  vendorId: "vendorA",
});
assert.equal(clearedVendor.vendorA, undefined);
assert.equal(clearedVendor.vendorB.products.otherDeviceItem.id, "other");

const options = buildCartSetOptions({
  cart: {},
  cartSchemaVersion: 2,
  cartClientRevision: 4,
});
assert.deepEqual(options, {
  mergeFields: ["cart", "cartSchemaVersion", "cartClientRevision"],
});
assert.equal(options.merge, undefined);

console.log("Cart persistence operation checks passed.");

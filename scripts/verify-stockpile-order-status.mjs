import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import {
  STOCKPILE_ORDER_MEMBERSHIP,
  getStockpileOrderMembership,
} from "../src/services/stockpileOrderStatus.js";

const require = createRequire(import.meta.url);
const { membershipStatusForOrder } = require("../../functions/stockpileLifecycle.js");

const cases = [
  [{ progressStatus: "Pending" }, STOCKPILE_ORDER_MEMBERSHIP.AWAITING_VENDOR],
  [
    { progressStatus: "Pending", vendorStatus: "accepted" },
    STOCKPILE_ORDER_MEMBERSHIP.READY,
  ],
  [{ progressStatus: "In Progress" }, STOCKPILE_ORDER_MEMBERSHIP.READY],
  [{ progressStatus: "Shipped" }, STOCKPILE_ORDER_MEMBERSHIP.READY],
  [{ progressStatus: "Delivered" }, STOCKPILE_ORDER_MEMBERSHIP.READY],
  [
    { progressStatus: "In Progress", vendorStatus: "declined" },
    STOCKPILE_ORDER_MEMBERSHIP.DECLINED,
  ],
  [{ progressStatus: "Declined" }, STOCKPILE_ORDER_MEMBERSHIP.DECLINED],
];

for (const [order, expected] of cases) {
  assert.equal(getStockpileOrderMembership(order), expected);
  assert.equal(
    getStockpileOrderMembership(order),
    membershipStatusForOrder(order),
    `Frontend/backend stockpile status mismatch for ${JSON.stringify(order)}`,
  );
}

const [stockpileSlice, storePage, cartPage, ordersCentre, orderHistoryStyles] =
  await Promise.all([
    readFile(
      new URL("../src/redux/reducers/stockpileSlice.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/pages/StorePage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Cart.jsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/pages/UserSide/OrdersCentre.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/pages/UserSide/order-history.css", import.meta.url),
      "utf8",
    ),
  ]);

assert.equal(
  stockpileSlice.includes('progressStatus === "Declined") continue'),
  false,
  "declined orders must remain visible in pile history",
);
assert.match(
  stockpileSlice,
  /pileOrders\.push\([\s\S]*?membershipStatus[\s\S]*?declineReason/,
  "pile state must retain order provenance and decision metadata",
);
assert.match(
  storePage,
  /pileOrders\.map[\s\S]*?Accepted[\s\S]*?Declined[\s\S]*?Pending/,
  "store pile sheet must render all membership states",
);
assert.match(
  cartPage,
  /visiblePileOrders\.map[\s\S]*?Order \{order\.orderId\}[\s\S]*?order\.items/,
  "cart View Pile sheet must render one entity per order",
);
assert.equal(
  cartPage.includes("pileItems.map"),
  false,
  "cart View Pile sheet must not flatten order statuses onto individual items",
);
assert.equal(
  ordersCentre.includes("orderWasDeclined") ||
    ordersCentre.includes("_isStockpileContainer"),
  false,
  "the order-history projection must preserve the existing stockpile and decline behavior",
);
assert.match(
  ordersCentre,
  /stockpile-order-sets[\s\S]*?_relatedOrders[\s\S]*?<OrderStatus order=\{stockpileOrder\}/,
  "buyer order history must show a status for every order inside the stockpile",
);
assert.match(
  ordersCentre,
  /className="order-status-dot"/,
  "order statuses must use the compact colored dot",
);
assert.match(
  orderHistoryStyles,
  /\.stockpile-order-set \+ \.stockpile-order-set[\s\S]*?border-top:/,
  "each additional stockpile order must be separated by a line",
);

console.log("Stockpile order status parity checks passed.");

import React from "react";
import moment from "moment";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";
import { appHaptics } from "../../services/haptics";
import "./review-order-picker.css";

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const visibleId = (order) => {
  const id = String(order.stockpileDocId || order.id || "");
  return id.length > 18 ? `${id.slice(0, 9)}…${id.slice(-6)}` : id;
};

const ReviewOrderPicker = ({ orders, loading, onBack, onSelect }) => (
  <section className="review-order-picker" aria-label="Choose an order to rate">
    <header>
      <button type="button" onClick={onBack} aria-label="Back">
        <LuArrowLeft aria-hidden="true" />
      </button>
      <h1>Choose an order</h1>
      <span aria-hidden="true" />
    </header>

    <div className="review-order-picker-copy">
      <h2>What would you like to rate?</h2>
      <p>Select a delivered order. Your rating will appear on the seller’s store.</p>
    </div>

    <div className="review-order-picker-list">
      {loading ? (
        [0, 1, 2].map((item) => (
          <div className="review-order-picker-skeleton" key={item}>
            <span />
            <div><i /><i /></div>
          </div>
        ))
      ) : orders.length === 0 ? (
        <div className="review-order-picker-empty">
          <h2>No orders to rate</h2>
          <p>You have rated all delivered orders from this seller.</p>
        </div>
      ) : (
        orders.map((order) => (
          <button
            type="button"
            className="review-order-picker-card"
            key={order.reviewTargetKey}
            onClick={() => {
              appHaptics.selection();
              onSelect(order);
            }}
          >
            <div className="review-order-picker-images">
              {(order.cartItems || []).slice(0, 3).map((item, index) => (
                <img
                  key={`${item.productId || "product"}-${index}`}
                  src={item.imageUrl || "/Search_empty.svg"}
                  alt=""
                />
              ))}
            </div>
            <div className="review-order-picker-card-copy">
              <strong>
                {order.isStockpile ? "Stockpile" : "Order"} {visibleId(order)}
              </strong>
              <span>
                {(order.cartItems || []).length} {(order.cartItems || []).length === 1 ? "item" : "items"}
                {toDate(order.createdAt)
                  ? ` · ${moment(toDate(order.createdAt)).format("D MMM YYYY")}`
                  : ""}
              </span>
            </div>
            <LuChevronRight aria-hidden="true" />
          </button>
        ))
      )}
    </div>
  </section>
);

export default ReviewOrderPicker;

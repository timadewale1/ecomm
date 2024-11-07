// src/components/orders/PendingOrders.js
import React from "react";
import moment from "moment";

const PendingOrders = ({ orders, openModal }) => {
  const groupOrdersByDate = (orders) => {
    const today = [];
    const yesterday = [];
    const thisWeek = [];

    orders.forEach((order) => {
      const orderDate = moment(order.createdAt.seconds * 1000);
      const now = moment();

      if (orderDate.isSame(now, "day")) {
        today.push(order);
      } else if (orderDate.isSame(now.clone().subtract(1, "day"), "day")) {
        yesterday.push(order);
      } else if (orderDate.isSame(now, "week")) {
        thisWeek.push(order);
      }
    });

    return { today, yesterday, thisWeek };
  };

  const { today, yesterday, thisWeek } = groupOrdersByDate(orders);

  const renderOrderGroup = (title, ordersGroup) =>
    ordersGroup.length > 0 && (
      <>
        <h2 className="font-semibold text-right flex text-sm text-black font-opensans mt-3 mb-3">{title}</h2>
        <ul className="space-y-4">
          {ordersGroup.map((order) => (
            <li
              key={order.id}
              className="p-2 bg-gray-100 rounded-lg cursor-pointer"
              onClick={() => openModal(order)}
            >
              <div className="flex justify-between">
                <span className="font-semibold text-black font-opensans text-xs">Pending order</span>
                <span className="text-xs font-semibold text-black font-opensans">
                  {moment(order.createdAt.seconds * 1000).format("hh:mm A")}
                </span>
              </div>
              <p className="text-xs flex text-left text-gray-700 font-opensans mt-2">
                You have an order from {order.userInfo.displayName} (Order ID:{" "}
                {order.id}) for{" "}
                {order.cartItems.reduce((acc, item) => acc + item.quantity, 0)}{" "}
                items. Please review and process the order.
              </p>
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <div>
      {renderOrderGroup("Today", today)}
      {renderOrderGroup("Yesterday", yesterday)}
      {renderOrderGroup("This Week", thisWeek)}
    </div>
  );
};

export default PendingOrders;

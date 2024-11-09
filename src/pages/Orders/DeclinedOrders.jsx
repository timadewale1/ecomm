// src/components/orders/DeclinedOrders.js
import React from "react";
import { MdCancel } from "react-icons/md";
import moment from "moment";

const DeclinedOrders = ({ orders, openModal }) => {
  // Group orders by date
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
        <h2 className="font-semibold text-right flex text-sm text-black font-opensans mt-3 mb-3">
          {title}
        </h2>
        <ul className="space-y-4">
          {ordersGroup.map((order) => (
            <li
              key={order.id}
              className="p-2.5 bg-gray-100 rounded-lg flex items-start cursor-pointer"
              onClick={() => openModal(order)}
            >
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-black font-opensans text-xs">
                    Declined Order
                  </span>
                  <span className="text-xs font-semibold text-black font-opensans">
                    {moment(order.createdAt.seconds * 1000).format("hh:mm A")}
                  </span>
                </div>
                <div className="flex items-center mt-2 justify-center">
                  {/* Icon for Declined Order */}
                  <div className="w-28 h-12 flex items-center justify-center bg-red-100 rounded-md mr-3">
                    <MdCancel className="text-red-500 text-3xl" />
                  </div>
                  <p className="text-xs flex text-left text-gray-700 font-opensans mt-2">
                    Order from {order.userInfo.displayName} (Order ID:{" "}
                    {order.id}) for{" "}
                    {order.cartItems.reduce(
                      (acc, item) => acc + item.quantity,
                      0
                    )}{" "}
                    items was declined by you. click to see reason why.
                  </p>
                </div>
              </div>
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

export default DeclinedOrders;

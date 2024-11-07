// src/components/orders/DeclinedOrders.js
import React from "react";

const DeclinedOrders = ({ orders, openModal }) => {
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li
          key={order.id}
          className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-100 transition"
          onClick={() => openModal(order)}
        >
          {order.products.map((product, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-700">
                {product.name} (Quantity: {product.quantity})
              </span>
              <span className="text-red-500">Declined</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
};

export default DeclinedOrders;

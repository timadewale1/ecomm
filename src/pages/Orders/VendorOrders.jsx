import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import useAuth from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";

import PendingOrders from "./PendingOrders";
import InProgressOrders from "./InProgressOrders";
import ShippedOrders from "./ShippedOrders";
import DeclinedOrders from "./DeclinedOrders";
import OrderDetailsModal from "./OrderDetailsModals";

const VendorOrders = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Get orders from Redux store
  const orders = useSelector((state) => state.orders?.orders);
  const loading = orders === undefined || orders === null;

  const filteredOrders = useMemo(() => {
    const filtered = orders
      ? orders.filter((order) =>
          activeTab === "Shipped"
            ? ["Shipped", "Delivered"].includes(order.progressStatus)
            : order.progressStatus === activeTab
        )
      : [];

    // Sort orders from latest to earliest based on createdAt timestamp
    return filtered.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [orders, activeTab]);

  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case "Pending":
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            📦 No pending orders at the moment. Keep an eye here -- your next
            sale could be just around the corner!
          </div>
        );
      case "In Progress":
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            🚧 All caught up! No orders in progress right now.
          </div>
        );
      case "Shipped":
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            📦 No shipped or delivered orders to track currently. Your fulfilled
            orders will show here.
          </div>
        );
      case "Declined":
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            🙁 No declined orders in the list. Keep providing great service!
          </div>
        );
      default:
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            No orders found.
          </div>
        );
    }
  };

  return (
    <div className="p-3 bg-white min-h-screen flex flex-col items-center">
      {/* Top Card Banner for Selected Tab */}
      <div className="bg-customDeepOrange rounded-xl w-full h-28 text-center mb-4 flex items-center justify-center relative">
        <div className="absolute top-0 right-0">
          <img src="./Vector.png" alt="icon" className="w-16 h-20" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-opensans font-normal text-white text-sm capitalize">
            {activeTab} Orders
          </h1>
          <p className="text-4xl font-opensans font-semibold text-white mt-2">
            {filteredOrders.length}
          </p>
        </div>
      </div>

      {/* Tabs for Order Status */}
      <div className="tabs flex space-x-12 mb-1 align-items-center justify-center">
        {["Pending", "In Progress", "Shipped", "Declined"].map((tab) => (
          <button
            key={tab}
            className={`pb-2 text-xs font-normal font-opensans ${
              activeTab === tab
                ? "border-b-2 border-customDeepOrange text-customDeepOrange"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Render Orders List or Skeleton/Message */}
      <div className="orders-list pb-16 w-full max-w-xs space-y-3 text-center">
        {loading ? (
          <Skeleton count={2} height={60} className="mb-4" />
        ) : filteredOrders.length > 0 ? (
          activeTab === "Pending" ? (
            <PendingOrders orders={filteredOrders} openModal={openModal} />
          ) : activeTab === "In Progress" ? (
            <InProgressOrders orders={filteredOrders} openModal={openModal} />
          ) : activeTab === "Shipped" ? (
            <ShippedOrders orders={filteredOrders} openModal={openModal} />
          ) : (
            <DeclinedOrders orders={filteredOrders} openModal={openModal} />
          )
        ) : (
          <div className="text-gray-500 text-sm mt-6">
            {getEmptyStateMessage()}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        order={selectedOrder}
      />
    </div>
  );
};

export default VendorOrders;

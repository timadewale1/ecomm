// src/components/orders/VendorOrders.jsx
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";

import PendingOrders from "./PendingOrders";
import InProgressOrders from "./InProgressOrders";
import ShippedOrders from "./ShippedOrders";
import DeclinedOrders from "./DeclinedOrders";
// Import the new StockpileOrders component:
import StockpileOrders from "./StockpileOrders";
import OrderDetailsModal from "./OrderDetailsModals";
import ScrollToTop from "../../components/layout/ScrollToTop";
import SEO from "../../components/Helmet/SEO";

const VendorOrders = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const orders = useSelector((state) => state.orders?.orders);
  const loading = orders === undefined || orders === null;

  const filteredOrders = useMemo(() => {
    if (!orders || !currentUser?.uid) return [];

    let filtered = [];

    if (activeTab === "Stockpiles") {
      // Filter only stockpile orders that belong to this vendor.
      filtered = orders.filter(
        (order) =>
          order.isStockpile === true &&
          order.vendorId === currentUser.uid &&
          order.vendorStatus === "accepted"
      );
    } else if (activeTab === "Shipped") {
      filtered = orders.filter(
        (order) =>
          !order.isStockpile &&
          ["Shipped", "Delivered"].includes(order.progressStatus)
      );
    } else {
      filtered = orders.filter((order) => order.progressStatus === activeTab);
    }

    return filtered.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [orders, activeTab, currentUser?.uid]);

  const fetchVendorRevenue = async (vendorId) => {
    try {
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(
        `${API_BASE_URL}/vendorRevenue/${vendorId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch vendor revenue");
      }

      const data = await response.json();
      setTotalRevenue(data.revenue);
      return data.revenue;
    } catch (error) {
      console.error("Error fetching vendor revenue:", error);
      throw error;
    }
  };

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
            📦 No pending orders at the moment. Keep an eye here – your next
            sale could be just around the corner!
          </div>
        );
      case "Stockpiles":
        return (
          <div className="text-center translate-y-20 text-gray-700 text-xs font-normal font-opensans">
            📦 No stockpile orders yet. Encourage customers to stockpile,
            support eco friendly fashion🌴.
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
    <>
      <SEO
        title="Vendor Orders - My Thrift"
        description="Orders on your My Thrift store"
        url="https://www.shopmythrift.store/vendor-orders"
      />
      <div className="p-3 bg-white min-h-screen flex flex-col items-center">
        <ScrollToTop />

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

        {/* Tabs with added Stockpiles */}
        <div className="tabs flex flex-wrap justify-center gap-5 mb-1">
          {["Pending", "Stockpiles", "In Progress", "Shipped", "Declined"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-2 text-xs font-normal font-opensans ${
                  activeTab === tab
                    ? "border-b-2 border-customDeepOrange text-customDeepOrange"
                    : "text-gray-500"
                }`}
              >
                {tab}
                {tab === "Stockpiles" && (
                  <span className="absolute -top-2.5 -right-4 bg-customOrange text-[10px] text-white px-1 rounded-md font-bold">
                    Beta
                  </span>
                )}
              </button>
            )
          )}
        </div>

        <div className="orders-list pb-16 w-full px-4 space-y-3 text-center">
          {loading ? (
            <Skeleton count={2} height={60} className="mb-4" />
          ) : filteredOrders.length > 0 ? (
            activeTab === "Pending" ? (
              <PendingOrders orders={filteredOrders} openModal={openModal} />
            ) : activeTab === "Stockpiles" ? (
              // Render the StockpileOrders component for stockpile orders
              // When rendering the StockpileOrders component:
              <StockpileOrders
                orders={filteredOrders}
                openModal={(stockpile) => {
                  setSelectedOrder(stockpile); // stockpile here is the merged/enriched object
                  setIsModalOpen(true);
                }}
              />
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

        <OrderDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          order={selectedOrder}
          fetchVendorRevenue={fetchVendorRevenue}
          setTotalRevenue={setTotalRevenue}
        />
      </div>
    </>
  );
};

export default VendorOrders;

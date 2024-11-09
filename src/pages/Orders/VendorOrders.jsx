// src/components/orders/VendorOrders.js
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../../firebase.config";
import useAuth from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// Import status-specific components and the new OrderDetailsModal
import PendingOrders from "./PendingOrders";
import InProgressOrders from "./InProgressOrders";
import ShippedOrders from "./ShippedOrders";
import DeclinedOrders from "./DeclinedOrders";
import OrderDetailsModal from "./OrderDetailsModals";

const VendorOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("Pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (currentUser) {
        try {
          const q = query(
            collection(db, "orders"),
            where("vendorId", "==", currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            setOrders([]);
            return;
          }
          const fetchedOrders = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(fetchedOrders);
        } catch (error) {
          console.error("Error fetching orders:", error);
          toast.error("Error fetching orders. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrders();
  }, [currentUser]);

  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  // Filter orders by the selected tab status
  // Filter orders by the selected tab status
  const filteredOrders = orders.filter((order) =>
    activeTab === "Shipped"
      ? ["Shipped", "Delivered"].includes(order.progressStatus)
      : order.progressStatus === activeTab
  );

  return (
    <div className="p-3 bg-white min-h-screen  flex flex-col items-center">
      {/* Pending Orders Banner */}
      <div className="bg-customDeepOrange rounded-xl w-full h-28 text-center mb-4 flex items-center justify-center relative">
        <div className="absolute top-0 right-0">
          <img src="./Vector.png" alt="icon" className="w-16 h-20" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-opensans font-normal text-white text-sm">
            Pending Orders
          </h1>
          <p className="text-4xl font-opensans font-semibold text-white mt-2">
            {
              orders.filter((order) => order.progressStatus === "Pending")
                .length
            }
          </p>
        </div>
      </div>

      {/* Tabs for Order Status */}
      <div className="tabs flex space-x-8 mb-1 align-items-center justify-center">
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
            🍂 No {activeTab.toLowerCase()} orders yet.
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

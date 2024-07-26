import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaRegClock, FaCheck, FaTimes } from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import Modal from "../../components/layout/Modal";
import {
  getDoc,
  doc,
  query,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import useAuth from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const VendorOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("Paid");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (currentUser) {
        try {
          const q = query(collection(db, "orders"));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.log("No orders found.");
          }

          const fetchedOrders = [];
          for (const orderDoc of querySnapshot.docs) {
            const orderData = orderDoc.data();

            // Ensure products is an array
            if (Array.isArray(orderData.products)) {
              // Check if any product in the order has the matching vendorId
              const hasVendor = orderData.products.some(
                (product) => product.vendorId === currentUser.uid
              );

              if (hasVendor) {
                const userDoc = await getDoc(doc(db, "users", orderData.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  fetchedOrders.push({
                    id: orderDoc.id,
                    ...orderData,
                    user: {
                      displayName: userData.displayName,
                      email: userData.email,
                      phoneNumber: userData.phoneNumber,
                    },
                  });
                } else {
                  fetchedOrders.push({
                    id: orderDoc.id,
                    ...orderData,
                    user: null,
                  });
                }
              }
            } else {
              console.error(`Order ${orderDoc.id} has invalid products field`);
            }
          }
          console.log("Fetched orders:", fetchedOrders);
          setOrders(fetchedOrders);
        } catch (error) {
          console.error("Error fetching orders: ", error);
          toast.error("Error fetching orders. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchOrders();
  }, [currentUser]);

  const filterOrders = (status) => {
    return orders.filter((order) => order.paymentStatus === status);
  };

  const updateOrderStatus = async (orderId, updateData) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, updateData);
      // Update the local state to reflect changes
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, ...updateData } : order
        )
      );
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status: ", error);
      toast.error("Error updating order status. Please try again.");
    }
  };

  const acceptOrder = (order) => {
    updateOrderStatus(order.id, { status: "pending", paymentStatus: "pending" });
  };

  const rejectOrder = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, {
      status: "cancelled",
      rejected: true,
      rejectNote,
    });
    closeRejectModal();
  };

  const renderOrders = () => {
    const filteredOrders = filterOrders(activeTab);
    if (filteredOrders.length === 0) {
      return (
        <div className="p-4 bg-white rounded-lg shadow-md text-center">
          You don't have any orders yet.
        </div>
      );
    }
    return (
      <ul className="space-y-2 font-ubuntu">
        {filteredOrders.map((order) => (
          <li
            key={order.id}
            className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-100 transition flex justify-between"
            onClick={() => openModal(order)}
          >
            <div>
              {order.products.map((product, index) => (
                <div key={index} className="justify-between flex flex-col">
                  <span className="text-gray-700 flex flex-col">
                    {product.name} (Quantity: {product.quantity})
                  </span>
                </div>
              ))}
            </div>
            {activeTab === "Paid" && (
              <div className="flex space-x-4 mt-2">
                <button
                  className="text-green-500 px-1 py-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    acceptOrder(order);
                  }}
                >
                  <FaCheck />
                </button>
                <button
                  className="text-red-500 px-1 py-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRejectModal(order);
                  }}
                >
                  <FaX />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  const openRejectModal = (order) => {
    setSelectedOrder(order);
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setSelectedOrder(null);
    setRejectNote("");
    setIsRejectModalOpen(false);
  };

  const renderModalContent = () => {
    if (!selectedOrder) {
      return <p>No order details available.</p>;
    }

    const { id, user, products, paymentStatus } = selectedOrder;

    return (
      <div className="space-y-4 font-ubuntu">
        <div className="text-lg font-bold">
          Ordered By: {user?.displayName || "Unknown User"}
        </div>
        {user && (
          <>
            <div className="text-sm text-gray-700">
              Email: {user.email || "Not Available"}
            </div>
            <div className="text-sm text-gray-700">
              Phone: {user.phoneNumber || "Not Available"}
            </div>
          </>
        )}
        <div
          className={`text-sm ${
            paymentStatus === "completed"
              ? "text-green-500"
              : paymentStatus === "Paid"
              ? "text-orange-500"
              : "text-red-500"
          }`}
        >
          Status:{" "}
          {paymentStatus
            ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)
            : "Unknown"}
        </div>
        <div className="text-sm text-gray-500">Products:</div>
        <ul className="list-disc list-inside">
          {products && products.length > 0 ? (
            products.map((product, index) => (
              <li
                key={index}
                className="text-sm text-gray-700 flex items-center space-x-2"
              >
                {product.selectedImageUrl && (
                  <img
                    src={product.selectedImageUrl}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <span>
                  {product.name} (Quantity: {product.quantity})
                </span>
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-700">No products available.</li>
          )}
        </ul>
        <div className="mt-4">
          <select
            value={paymentStatus}
            onChange={(e) =>
              updateOrderStatus(id, { paymentStatus: e.target.value })
            }
            className="p-2 border rounded"
          >
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="in transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>
    );
  };

  const renderRejectModalContent = () => {
    return (
      <div className="space-y-4 font-ubuntu">
        <h2 className="text-lg font-bold">Reject Order</h2>
        <textarea
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter reason for rejecting the order"
        />
        <div className="flex space-x-4">
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={rejectOrder}
          >
            Reject
          </button>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={closeRejectModal}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen font-ubuntu">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Vendor Orders</h1>
      <div className="mb-4 text-lg font-bold text-gray-700">
        Total All-Time Completed Orders:{" "}
        {orders.filter((order) => order.paymentStatus === "completed").length}
      </div>

      <div className="tabs flex space-x-1 mb-4 align-items-center justify-center">
        {["Paid", "completed", "canceled"].map((tab) => (
          <button
            key={tab}
            className={`px-2 py-1 text-sm md:text-sm rounded-lg flex items-center ${
              activeTab === tab
                ? "bg-green-700 text-white"
                : "bg-white text-gray-700"
            } shadow-md hover:bg-green-800 transition`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "Paid" && <FaRegClock className="mr-1" />}
            {tab === "completed" && <FaCheck className="mr-1" />}
            {tab === "canceled" && <FaTimes className="mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="orders-list space-y-4">
        {loading ? (
          <>
            <Skeleton count={2} height={60} className="mb-4" />
            <Skeleton count={2} height={60} className="mb-4" />
            <Skeleton count={2} height={60} className="mb-4" />
          </>
        ) : (
          renderOrders()
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>

      <Modal isOpen={isRejectModalOpen} onClose={closeRejectModal}>
        {renderRejectModalContent()}
      </Modal>
    </div>
  );
};

export default VendorOrders;

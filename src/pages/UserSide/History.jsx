import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase.config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import { FaAngleLeft, FaPrint } from "react-icons/fa6";
import { useReactToPrint } from "react-to-print";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Waiting from "../../components/Loading/Waiting";

const OrderHistory = ({ setShowHistory }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  useEffect(() => {
    const fetchOrders = async (userId) => {
      try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const userOrders = [];

        for (const orderDoc of ordersSnapshot.docs) {
          const orderData = orderDoc.data();
          if (orderData.userId === userId) {
            userOrders.push({ id: orderDoc.id, ...orderData });
          }
        }

        console.log("Fetched User Orders:", userOrders);

        const vendorIds = new Set();
        userOrders.forEach((order) => {
          if (order.products) {
            if (Array.isArray(order.products)) {
              order.products.forEach((product) => {
                if (product.vendorId) {
                  vendorIds.add(product.vendorId);
                }
              });
            } else {
              console.log("order.products is not an array:", order.products);
            }
          } else {
            console.log("order.products is undefined for order:", order);
          }
        });

        if (vendorIds.size === 0) {
          console.log("No valid vendor IDs found.");
          setOrders(userOrders);
          setLoading(false);
          return;
        }

        console.log("Vendor IDs:", Array.from(vendorIds));

        const vendorPromises = Array.from(vendorIds).map((vendorId) =>
          getDoc(doc(db, "vendors", vendorId))
        );

        const vendorDocs = await Promise.all(vendorPromises);
        const vendors = vendorDocs.reduce((acc, vendorDoc) => {
          if (vendorDoc.exists()) {
            acc[vendorDoc.id] = vendorDoc.data().shopName;
          }
          return acc;
        }, {});

        console.log("Fetched Vendor Data:", vendors);

        const ordersWithVendors = userOrders.map((order) => ({
          ...order,
          vendorNames: Array.isArray(order.products) ? order.products.map(
            (product) => vendors[product.vendorId] || "Unknown Vendor"
          ) : [],
        }));

        setOrders(ordersWithVendors);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Error fetching orders: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchOrders(user.uid);
      } else {
        setCurrentUser(null);
        setOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-2">
      <div className="sticky p-2 top-0 bg-white z-10 flex items-center -translate-y-4  justify-between h-24">
        <div className="flex items-center space-x-2">
          <FaAngleLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => setShowHistory(false)}
          />
          <h1 className="text-xl font-bold">Order History</h1>
        </div>
        <FaPrint
          className="text-2xl text-black cursor-pointer"
          onClick={handlePrint}
        />
      </div>
      {loading ? (
        <div className="space-y-4  mt-4">
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="border p-4 rounded-lg shadow">
                <Skeleton width={100} height={20} />
                <Skeleton width={150} height={20} />
                <div className="mt-2">
                  <Skeleton width={100} height={20} />
                  <div className="flex items-center mt-2">
                    <Skeleton width={64} height={64} />
                    <div className="ml-4">
                      <Skeleton width={200} height={20} />
                      <Skeleton width={150} height={20} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : !currentUser ? (
        <div>Please log in to view your order history.</div>
      ) : orders.length === 0 ? (
        <Waiting />
      ) : (
        <div className="space-y-4 " ref={componentRef}>
          {orders.map((order) => (
            <div key={order.id} className="border p-4 rounded-lg shadow">
              <p className="text-sm font-ubuntu font-bold">
                Vendor(s): {order.vendorNames.join(", ")}
              </p>
              <p className="text-sm font-medium">Status: {order.paymentStatus}</p>
              <div className="mt-2">
                <h3 className="text-md mb-2 font-semibold">Items ordered:</h3>
                <ul className="list-disc list-inside">
                  {Array.isArray(order.products) ? order.products.map((product, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <div className="flex mb-2 items-center">
                        <img
                          src={product.selectedImageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg mr-4"
                        />
                        <div>
                          <p className="text-sm font-bold text-black">
                            {product.name} - ₦{product.price}
                          </p>
                          <p className="text-sm font-poppins text-black translate-y-2">
                            Date:{" "}
                            {new Date(
                              order.orderDate.seconds * 1000
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-black">
                        {product.quantity > 1 && `(${product.quantity})`}
                      </p>
                    </li>
                  )) : <p>Products not available</p>}
                  <h2 className="text-xs font-poppins font-semibold text-black mt-2">
                    Order ID: {order.id}
                  </h2>
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

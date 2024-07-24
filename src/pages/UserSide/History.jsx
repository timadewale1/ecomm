import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase.config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import Loading from "../../components/Loading/Loading";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchOrders = async (userId) => {
      try {
        const ordersRef = collection(db, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const userOrders = ordersSnapshot.docs
          .filter((doc) => {
            const orderData = doc.data();
            console.log("Order Data:", orderData);
            return orderData.userId === userId;
          })
          .map((doc) => {
            const orderData = doc.data();
            console.log("Vendor ID for order:", orderData.vendorId); // Logging vendorId for each order
            return { id: doc.id, ...orderData };
          });

        console.log("Fetched User Orders:", userOrders);

        const vendorIds = userOrders
          .map(order => order.vendorId)
          .filter(vendorId => vendorId !== undefined); // Filter out undefined vendorIds

        console.log("Vendor IDs:", vendorIds);

        if (vendorIds.length === 0) {
          console.error("No valid vendor IDs found.");
          return;
        }

        const vendorPromises = vendorIds.map(vendorId => {
          if (vendorId) {
            return getDoc(doc(db, "vendors", vendorId));
          } else {
            return null;
          }
        });

        const vendorDocs = await Promise.all(vendorPromises);
        const vendors = vendorDocs.reduce((acc, vendorDoc) => {
          if (vendorDoc && vendorDoc.exists()) {
            acc[vendorDoc.id] = vendorDoc.data().shopName;
          }
          return acc;
        }, {});

        console.log("Fetched Vendor Data:", vendors);

        const ordersWithVendors = userOrders.map(order => ({
          ...order,
          vendorName: vendors[order.vendorId] || "Unknown Vendor"
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

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return <div>Please log in to view your order history.</div>;
  }

  if (orders.length === 0) {
    return <div>No orders found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Order History</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Order ID: {order.id}</h2>
            <p className="text-sm">Vendor: {order.vendorName}</p>
            <p className="text-sm">Date: {new Date(order.orderDate.seconds * 1000).toLocaleDateString()}</p>
            <p className="text-sm">Status: {order.paymentStatus}</p>
            <div className="mt-2">
              <h3 className="text-md font-semibold">Products:</h3>
              <ul className="list-disc list-inside">
                {order.products.map((product, index) => (
                  <li key={index}>
                    {product.name} - ₦{product.price}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { onSnapshot, query, where, collection } from "firebase/firestore";
import { db } from "../firebase.config";

const useVendorOrders = (vendorId) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;

    const q = query(collection(db, "orders"), where("vendorId", "==", vendorId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(updatedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Error fetching orders. Please try again.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [vendorId]);

  return { orders, loading };
};
export default useVendorOrders;
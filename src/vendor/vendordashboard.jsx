import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.config";
import Navbar from "./navbar";
import { toast } from "react-toastify";

const VendorDashboard = () => {
  const [vendorId, setVendorId] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setVendorId(user.uid);
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          await fetchStatistics(user.uid);
        } else {
          toast.error("Vendor data not found");
        }
      }
    });
  }, []);

  const fetchStatistics = async (vendorId) => {
    try {
      const productsCollection = collection(
        db,
        "vendors",
        vendorId,
        "products"
      );
      const productsSnapshot = await getDocs(productsCollection);
      const products = productsSnapshot.docs.map((doc) => doc.data());

      const totalProducts = products.length;
      const totalOrders = 0;
      const totalSales = products.reduce(
        (acc, product) => acc + product.price,
        0
      );

      setTotalProducts(totalProducts);
      setTotalOrders(totalOrders);
      setTotalSales(totalSales);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data please refresh");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard">
        <h2>Dashboard</h2>
        <div>
          <p>Total Orders: {totalOrders}</p>
          <p>Total Sales: ${totalSales.toFixed(2)}</p>
          <p>Total Products: {totalProducts}</p>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;

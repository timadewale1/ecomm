import React, { useEffect, useState, useContext } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { FaPlus, FaBox, FaShoppingCart, FaListAlt } from "react-icons/fa";
import { TbCurrencyNaira } from "react-icons/tb";
import Modal from "../../components/layout/Modal";
import AddProduct from "../vendor/AddProducts";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading/Loading";
import { VendorContext } from "../../components/Context/Vendorcontext"; // Use the existing VendorContext

const VendorDashboard = () => {
  const { vendorData, loading } = useContext(VendorContext); // Get vendor data from context
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (vendorData) {
      // Fetch real-time statistics and activities only if vendor data exists
      fetchStatistics(vendorData.vendorId);
      fetchRecentActivities(vendorData.vendorId);
    }
  }, [vendorData]);

  // Fetch vendor's products, orders, and sales statistics in real-time
  const fetchStatistics = (vendorId) => {
    const productsRef = collection(db, "products");
    const productsQuery = query(productsRef, where("vendorId", "==", vendorId));

    // Listen for real-time updates to products
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const totalProducts = snapshot.docs.length;
      setTotalProducts(totalProducts);

      // You can add similar logic for orders and sales
      setTotalOrders(0); // Placeholder for orders
      setTotalSales(0);  // Placeholder for sales
    });

    return () => unsubscribe();
  };

  // Fetch vendor's recent activities in real-time
  const fetchRecentActivities = (vendorId) => {
    const activityRef = collection(db, "vendors", vendorId, "activityNotes");
    const recentActivityQuery = query(activityRef, orderBy("timestamp", "desc"), limit(4));

    // Listen for real-time updates to recent activities
    const unsubscribe = onSnapshot(recentActivityQuery, (querySnapshot) => {
      const activities = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentActivities(activities);
    });

    return () => unsubscribe();
  };

  const handleSwitch2Products = () => {
    navigate("/vendor-products");
  };

  const handleSwitch2Orders = () => {
    navigate("/vendor-orders");
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    ); // You can show a loading spinner or skeleton here
  }

  return (
    <>
      <div className="p-4 bg-gray-100 min-h-screen">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          Vendor Dashboard
        </h2>

        {/* Display message if the vendor is not approved */}
        {!vendorData?.isApproved && (
          <div className="bg-red-100 text-red-700 p-4 h-20  font-opensans text-xs rounded-lg mb-6">
            <p>
              Your profile is under review. We usually get back within 12 hours.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div
            className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between"
            onClick={handleSwitch2Orders}
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Total Orders
              </h3>
              <p className="text-2xl font-bold text-green-700">{totalOrders}</p>
            </div>
            <FaShoppingCart className="h-8 w-8 text-green-700" />
          </div>

          <div className="bg-white pt-4 pr-4 pb-4 pl-5 rounded-lg shadow-md flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Total Sales
              </h3>
              <p className="text-2xl font-bold text-green-700">
                NGN{totalSales.toFixed(2)}
              </p>
            </div>
            <TbCurrencyNaira className="h-12 w-12 text-green-700" />
          </div>

          <div
            className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between"
            onClick={handleSwitch2Products}
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Total Products
              </h3>
              <p className="text-2xl font-bold text-green-700">
                {totalProducts}
              </p>
            </div>
            <FaBox className="h-8 w-8 text-green-700" />
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Recent Activities
              </h3>
            </div>
            <FaListAlt className="h-8 w-8 text-green-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Recent Activities
          </h3>
          <ul className="space-y-2">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="text-gray-700">
                {activity.note} -{" "}
                <span className="text-gray-500 text-sm">
                  {new Date(activity.timestamp.toDate()).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={openModal}
        className={`fixed bottom-32 right-3 ${
          vendorData?.isApproved ? "bg-green-700" : "bg-gray-400 cursor-not-allowed"
        } text-white rounded-full p-4 shadow-lg focus:outline-none`}
        disabled={!vendorData?.isApproved}
      >
        <FaPlus className="h-4 w-4" />
      </button>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddProduct vendorId={vendorData?.vendorId} closeModal={closeModal} />
      </Modal>
    </>
  );
};

export default VendorDashboard;

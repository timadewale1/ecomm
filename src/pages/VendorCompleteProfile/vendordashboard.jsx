import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { FaPlus, FaBox, FaShoppingCart, FaListAlt } from 'react-icons/fa';
import { TbCurrencyNaira } from 'react-icons/tb';
import Modal from '../../components/layout/Modal';
import AddProduct from '../vendor/AddProducts';
import { useNavigate } from 'react-router-dom';

const VendorDashboard = () => {
  const [vendorId, setVendorId] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setVendorId(user.uid);
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          await fetchStatistics(user.uid);
          await fetchRecentActivities(user.uid);
        } else {
          toast.error("Vendor data not found");
        }
      }
    });
  }, []);

  const fetchStatistics = async (vendorId) => {
    try {
      const productsCollection = collection(db, "vendors", vendorId, "products");
      const productsSnapshot = await getDocs(productsCollection);
      const products = productsSnapshot.docs.map((doc) => doc.data());

      const totalProducts = products.length;
      const totalOrders = 0;
      const totalSales = 0;

      setTotalProducts(totalProducts);
      setTotalOrders(totalOrders);
      setTotalSales(totalSales);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data, please refresh.");
    }
  };

  const fetchRecentActivities = async (vendorId) => {
    try {
      const activityRef = collection(db, "vendors", vendorId, "activityNotes");
      const recentActivityQuery = query(activityRef, orderBy("timestamp", "desc"), limit(4));
      const querySnapshot = await getDocs(recentActivityQuery);

      const activities = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      toast.error("Failed to fetch recent activities.");
    }
  };

  const handleSwitch2Products = () => {
    navigate('/vendor-products');
  };

  const handleSwitch2Orders = () => {
    navigate('/vendor-orders');
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  return (
    <>
      <div className="p-4 bg-gray-100 min-h-screen">
        <h2 className="text-2xl font-bold text-green-700 mb-4">Vendor Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between" onClick={handleSwitch2Orders}>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
              <p className="text-2xl font-bold text-green-700">{totalOrders}</p>
            </div>
            <FaShoppingCart className="h-8 w-8 text-green-700" />
          </div>
          <div className="bg-white pt-4 pr-4 pb-4 pl-5 rounded-lg shadow-md flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Sales</h3>
              <p className="text-2xl font-bold text-green-700">NGN{totalSales.toFixed(2)}</p>
            </div>
            <TbCurrencyNaira className="h-12 w-12 text-green-700" />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between" onClick={handleSwitch2Products}>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
              <p className="text-2xl font-bold text-green-700">{totalProducts}</p>
            </div>
            <FaBox className="h-8 w-8 text-green-700" />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Recent Activities</h3>
            </div>
            <FaListAlt className="h-8 w-8 text-green-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Activities</h3>
          <ul className="space-y-2">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="text-gray-700">
                {activity.note} - <span className="text-gray-500 text-sm">{new Date(activity.timestamp.toDate()).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={openModal}
        className="fixed bottom-32 right-3 bg-green-700 text-white rounded-full p-4 shadow-lg hover:bg-green-800 focus:outline-none focus:ring focus:ring-green-700"
      >
        <FaPlus className="h-4 w-4" />
      </button>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddProduct vendorId={vendorId} closeModal={closeModal} />
      </Modal>
    </>
  );
};

export default VendorDashboard;

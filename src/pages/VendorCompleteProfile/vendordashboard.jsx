import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { FaPlus, FaBox, FaShoppingCart, FaListAlt } from 'react-icons/fa';
import { TbCurrencyNaira } from 'react-icons/tb';
import Modal from '../../components/layout/Modal';
import AddProduct from '../vendor/AddProducts';
import { useNavigate } from 'react-router-dom';

const VendorDashboard = () => {
  const [vendorId, setVendorId] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0); // Actual data
  const [totalSales, setTotalSales] = useState(0); // Actual data
  const [totalProducts, setTotalProducts] = useState(0); // Actual data
  const [isModalOpen, setModalOpen] = useState(false);

  // Dummy data for recent activities
  const recentActivities = [
    { id: 1, activity: 'New order placed by John Doe' },
    { id: 2, activity: 'Product "Smartphone" added to inventory' },
    { id: 3, activity: 'Order #1234 shipped to Jane Smith' },
    { id: 4, activity: 'Product "Headphones" out of stock' },
  ];

  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setVendorId(user.uid);
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          await fetchStatistics(user.uid);
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
      // const totalSales = products.reduce((acc, product) => acc + product.price, 0);

      setTotalProducts(totalProducts);
      setTotalOrders(totalOrders);
      setTotalSales(totalSales);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data please refresh");
    }
  };

  const handleSwitch2Products = () => {
    // Add code to switch to products
    navigate('/vendor-products')
  }
  
  const handleSwitch2Orders = () => {
    // Add code to switch to products
    navigate('/vendor-orders')
  }
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
              <p className="text-2xl font-bold text-green-700">{totalOrders}</p> {/* Actual data */}
            </div>
            <FaShoppingCart className="h-8 w-8 text-green-700" />
          </div>
          <div className="bg-white pt-4 pr-4 pb-4 pl-5 rounded-lg shadow-md flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Sales</h3>
              <p className="text-2xl font-bold text-green-700">NGN{totalSales.toFixed(2)}</p> {/* Actual data */}
            </div>
            <TbCurrencyNaira className="h-12 w-12 text-green-700" />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between" onClick={handleSwitch2Products}>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
              <p className="text-2xl font-bold text-green-700">{totalProducts}</p> {/* Actual data */}
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
              <li key={activity.id} className="text-gray-700">{activity.activity}</li>
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
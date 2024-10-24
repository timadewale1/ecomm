import React, { useEffect, useState, useContext } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FaPlus, FaBox, FaShoppingCart, FaListAlt } from "react-icons/fa";
import { RxCopy } from "react-icons/rx";
import { TbBell, TbCurrencyNaira } from "react-icons/tb";
import Modal from "../../components/layout/Modal";
import AddProduct from "../vendor/AddProducts";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading/Loading";
import { VendorContext } from "../../components/Context/Vendorcontext"; // Use the existing VendorContext
import { BsBell, BsBoxSeam, BsCopy } from "react-icons/bs";
import { CopyAllRounded } from "@mui/icons-material";
import { IoFilter } from "react-icons/io5";

const VendorDashboard = () => {
  const { vendorData, loading } = useContext(VendorContext); // Get vendor data from context
  const [totalFulfilledOrders, setTotalFulfilledOrders] = useState(0);
  const [totalUnfulfilledOrders, setTotalUnfulfilledOrders] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
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
      setTotalFulfilledOrders(0); // Placeholder for orders
      setTotalRevenue("00.00"); // Placeholder for sales
    });

    return () => unsubscribe();
  };

  const textToCopy = `www.mythrift.com/vendor/${vendorData.shopName.replace(/\s+/g, '')}`;

  const copyToClipboard = async () => {
    console.log("Clicked");
    try {
      await navigator.clipboard.writeText(textToCopy); // Ensure the text is copied
      toast.success("Store link copied!"); // Show the success toast
    } catch (err) {
      toast.error("Failed to copy!"); // Handle any errors during copy
      console.error("Failed to copy text: ", err);
    }
  };

  const formatDateOrTime = (timestamp) => {
    const eventDate = new Date(timestamp.toDate()); // Convert Firestore timestamp to JS Date
    const today = new Date();
  
    // Check if the event happened today by comparing year, month, and day
    const isToday = eventDate.getDate() === today.getDate() &&
                    eventDate.getMonth() === today.getMonth() &&
                    eventDate.getFullYear() === today.getFullYear();
  
    // Return time if it's today, else return the date
    if (isToday) {
      return eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format as HH:mm
    } else {
      return eventDate.toLocaleDateString(); // Return formatted date
    }
  };

  // Fetch vendor's recent activities in real-time
  const fetchRecentActivities = (vendorId) => {
    const activityRef = collection(db, "vendors", vendorId, "activityNotes");
    const recentActivityQuery = query(
      activityRef,
      orderBy("timestamp", "desc"),
      limit(4)
    );

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
      <div className="text-black mx-3 my-7 flex flex-col justify-center space-y-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="overflow-hidden w-11 h-11 rounded-full flex justify-center items-center mr-1">
              <img
                src={vendorData.photoURL}
                alt=""
                className="rounded-full object-cover h-11 w-11"
              />
            </div>
            <div className="ml-1 space-y-2">
              <p className="font-bold text-lg">Hello, {vendorData.firstName}</p>
              <p className="text-xs">Let's make cool cash</p>
            </div>
          </div>
          <div>
            <button className="border rounded-full p-1">
              <img src="notif.png" alt="" className="w-5 h-5 " />
            </button>
          </div>
        </div>

        {!vendorData.isApproved && (
          <div className="flex flex-col justify-center items-center">
            <img src="info.png" alt="" className="w-full h-28" />
          </div>
        )}

        <div className="flex flex-col justify-center items-center mt-4">
          <div className="bg-customDeepOrange w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
          <img src="./vector.png" alt="" />
          <img src="" alt="" />
            <div className="flex flex-col justify-center items-center space-y-4">
              <p className="text-white text-lg">Total Revenue</p>
              <p className="text-white text-3xl font-bold">
                &#x20a6;{totalRevenue}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-white text-xs truncate w-60 font-thin">
                  {textToCopy}
                </p>
                <button
                  className="text-white"
                  onClick={copyToClipboard}
                >
                  <BsCopy className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center mt-4">
          <div>
            <p className="text-black text-start font-bold mb-2">Overview</p>

            <div className="grid grid-cols-2 justify-between">
              <div className="flex flex-col space-y-4 w-full h-20 rounded-xl p-2 m-2">
                <div className="flex justify-between">
                  <BsBoxSeam className="text-customOrange ml-3" />
                  <p className="text-black text-start font-light text-xs">
                    Total Orders
                  </p>
                </div>
                <p className="text-end font-bold text-black">{totalOrders}</p>
              </div>

              <div className="flex flex-col space-y-4 w-full h-20 rounded-xl p-2 m-2">
                <div className="flex justify-between">
                  <BsBoxSeam className="text-customOrange ml-3" />
                  <p className="text-black text-start font-light text-xs">
                    Total Products
                  </p>
                </div>
                <p className="text-end font-bold text-black">{totalProducts}</p>
              </div>

              <div className="flex flex-col space-y-4 w-full h-20 rounded-xl p-2 m-2">
                <div className="flex justify-between">
                  <BsBoxSeam className="text-customOrange ml-3" />
                  <p className="text-black text-start font-light text-xs">
                    Unfulfilled Orders
                  </p>
                </div>
                <p className="text-end font-bold text-black">
                  {totalUnfulfilledOrders}
                </p>
              </div>

              <div className="flex flex-col space-y-4 w-full h-20 rounded-xl p-2 m-2">
                <div className="flex justify-between">
                  <BsBoxSeam className="text-customOrange ml-3" />
                  <p className="text-black text-start font-light text-xs">
                    Fulfilled Orders
                  </p>
                </div>
                <p className="text-end font-bold text-black">
                  {totalFulfilledOrders}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <div className="flex justify-between mb-4">
            <p className="text-black font-bold">Recent activity</p>
            <IoFilter className="text-customOrange" />
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {recentActivities ? (
              <>
                {recentActivities.map((activity) => (
                  <li key={activity.id}>
                    <div className="text-gray-700 flex justify-between">
                      <p>
                        {activity.note} -{" "}
                      </p>
                      
                      <p className="text-gray-500 text-sm">
                      {formatDateOrTime(activity.timestamp)}
                    </p>
                    </div>
                    
                    
                  </li>
                ))}
              </>
            ) : (
              <div>
                <img src="./Note.png" alt="" />
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={openModal}
        className={`fixed bottom-24 right-5 flex justify-center items-center ${
          vendorData?.isApproved
            ? "bg-customOrange"
            : "bg-customOrange opacity-35 cursor-not-allowed"
        } text-white rounded-full w-11 h-11 shadow-lg focus:outline-none`}
        disabled={!vendorData?.isApproved}
      >
        <span className="text-5xl">
          +
        </span>
      </button>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddProduct vendorId={vendorData?.vendorId} closeModal={closeModal} />
      </Modal>
      <ToastContainer /> {/* Required to display the toast */}
    </>
  );
};

export default VendorDashboard;

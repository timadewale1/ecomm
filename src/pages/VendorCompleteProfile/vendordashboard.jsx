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

import toast from "react-hot-toast";
import { FaPlus, FaBox, FaShoppingCart, FaListAlt } from "react-icons/fa";
import { RxCopy } from "react-icons/rx";
import { TbBell, TbCurrencyNaira } from "react-icons/tb";
import Modal from "../../components/layout/Modal";
import AddProduct from "../vendor/AddProducts";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading/Loading";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { FiPlus } from "react-icons/fi";
import { IoIosNotificationsOutline } from "react-icons/io"; // Use the existing VendorContext
import { BsBell, BsBoxSeam, BsCopy, BsEye, BsEyeSlash } from "react-icons/bs";
import { CopyAllRounded } from "@mui/icons-material";
import { LuListFilter } from "react-icons/lu";
import NotApproved from "../../components/Infos/NotApproved";
const VendorDashboard = () => {
  const { vendorData, loading } = useContext(VendorContext); // Get vendor data from context
  const [totalFulfilledOrders, setTotalFulfilledOrders] = useState(0);
  const [hide, setHide] = useState(false);
  const [filterOptions, setFilterOptions] = useState("All");
  const [viewOptions, setViewOptions] = useState(false);
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
  });

  const filteredActivities = recentActivities.filter((activity) => {
    if (filterOptions === "All") return true;
    return activity.type === filterOptions;
  });

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

  const textToCopy = `https://mythriftprod.vercel.app/${
    vendorData.marketPlaceType === "virtual" ? ("store") : ("marketstorepage")
  }/${vendorData.vendorId}`;

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
    const isToday =
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear();

    // Return time if it's today, else return the date
    if (isToday) {
      return eventDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }); // Format as HH:mm
    } else {
      return eventDate.toLocaleDateString(); // Return formatted date
    }
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours(); // Get the current hour (0 - 23)
    let greeting;

    if (currentHour >= 0 && currentHour < 12) {
      greeting = "Good Morning";
    } else if (currentHour >= 12 && currentHour < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    return greeting;
  };

  // Example usage:
  const greeting = getGreeting();

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

  if (!vendorData) {
    return <p>Unable to load vendor data. Please try again later.</p>;
  }
  return (
    <>
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-opensans ">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="overflow-hidden w-11 h-11 rounded-full flex justify-center items-center mr-1">
              <img
                src={vendorData.photoURL || vendorData.coverImageUrl}
                alt="Vendor profile"
                className="rounded-full object-cover h-11 w-11"
              />
            </div>
            <div className="ml-1 space-y-2">
              <p className="font-bold text-lg text-black">
                {greeting}, {vendorData.firstName}
              </p>
            </div>
          </div>
          <div>
            <button className="border rounded-full p-1">
              <IoIosNotificationsOutline className="w-5 h-5 " />
            </button>
          </div>
        </div>

        {!vendorData.isApproved && (
          <div className="flex flex-col justify-center items-center">
            <NotApproved />
            {/* <img src="info.png" alt="" className="w-full h-28" /> */}
          </div>
        )}

        <div className="flex flex-col justify-center items-center mt-4">
          <div className="relative bg-customDeepOrange w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
            <div className="absolute top-0 right-0">
              <img src="./Vector.png" alt="" className="w-16 h-24" />
            </div>
            <div className="absolute bottom-0 left-0">
              <img src="./Vector2.png" alt="" className="w-16 h-16" />
            </div>
            <div className="flex flex-col justify-center items-center space-y-4">
              <p className="text-white text-lg flex justify-between items-center">
                <p className="text-white mr-2">Total Revenue </p>
                <p>
                  {!hide ? (
                    <BsEye
                      onClick={() => setHide(!hide)}
                      className="text-white"
                    />
                  ) : (
                    <BsEyeSlash
                      onClick={() => setHide(!hide)}
                      className="text-white"
                    />
                  )}
                </p>
              </p>
              <p className="text-white text-3xl font-bold">
                {!hide ? (
                  <p className="text-white text-3xl font-bold">
                    &#x20a6;{totalRevenue}
                  </p>
                ) : (
                  <p className="text-white text-3xl font-bold">{"**.**"}</p>
                )}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-white text-xs truncate w-60 font-thin">
                  {textToCopy}
                </p>
                <button className="text-white" onClick={copyToClipboard}>
                  <BsCopy className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center mt-4">
          <div>
            <p className="text-black text-lg text-start font-semibold mb-3">
              Overview
            </p>

            <div className="grid grid-cols-2 gap-2 justify-center">
              <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                <div className="flex justify-between items-center">
                  <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                    <BsBoxSeam className="text-sm text-customOrange" />
                  </div>

                  <div>
                    <p className="text-xs text-customRichBrown font-medium">
                      Total Orders
                    </p>
                  </div>
                </div>
                <div className="text-lg font-semibold text-end">
                  {totalOrders}
                </div>
              </div>

              <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                <div className="flex justify-between items-center">
                  <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                    <BsBoxSeam className="text-sm text-customOrange" />
                  </div>

                  <div>
                    <p className="text-xs text-customRichBrown font-medium">
                      Total Products
                    </p>
                  </div>
                </div>
                <div className="text-lg font-semibold text-end">
                  {totalProducts}
                </div>
              </div>

              <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                <div className="flex justify-between items-center">
                  <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                    <BsBoxSeam className="text-sm text-customOrange" />
                  </div>

                  <div>
                    <p className="text-xs text-customRichBrown font-medium">
                      Unfulfilled Orders
                    </p>
                  </div>
                </div>
                <div className="text-lg font-semibold text-end">
                  {totalUnfulfilledOrders}
                </div>
              </div>

              <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                <div className="flex justify-between items-center">
                  <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                    <BsBoxSeam className="text-sm text-customOrange" />
                  </div>

                  <div>
                    <p className="text-xs text-customRichBrown font-medium">
                      Fulfilled Orders
                    </p>
                  </div>
                </div>
                <div className="text-lg font-semibold text-end">
                  {totalFulfilledOrders}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <div className="flex justify-between mb-3">
            <p className="text-black text-lg font-semibold">Recent activity</p>

            <div className="relative">
              {viewOptions && (
                <div className="z-50 absolute bg-white w-44 h-40 rounded-2.5xl shadow-[0_0_10px_rgba(0,0,0,0.1)] -left-44 top-2 p-3 flex flex-col justify-between">
                  <span
                    className="text-xs ml-2 cursor-pointer"
                    onClick={() => {
                      setFilterOptions("All");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    All
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className="text-xs ml-2 cursor-pointer"
                    onClick={() => {
                      setFilterOptions("Recent Transactions");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Recent Transactions
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className="text-xs ml-2 cursor-pointer"
                    onClick={() => {
                      setFilterOptions("Orders");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Orders
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className="text-xs ml-2 cursor-pointer"
                    onClick={() => {
                      setFilterOptions("Product Update");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Product Update
                  </span>
                </div>
              )}
              <LuListFilter
                className="text-customOrange cursor-pointer"
                onClick={() => setViewOptions(!viewOptions)}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {recentActivities ? (
              <>
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="mb-2 bg-customSoftGray rounded-2xl px-4 py-2"
                  >
                    <div className="flex justify-between mb-2">
                      <p className="text-black font-semibold text-xs">
                        {activity.title}
                      </p>

                      <p className="text-black font-semibold text-xs">
                        {formatDateOrTime(activity.timestamp)}
                      </p>
                    </div>
                    <p className="text-black text-xs">{activity.note}</p>
                  </div>
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
        <span className="text-3xl">
          <FiPlus />
        </span>
      </button>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddProduct vendorId={vendorData?.vendorId} closeModal={closeModal} />
      </Modal>
    </>
  );
};

export default VendorDashboard;

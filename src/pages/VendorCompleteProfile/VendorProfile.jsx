import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { MdModeEdit } from "react-icons/md";
import { auth, db } from "../../firebase.config";
import { RotatingLines } from "react-loader-spinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, ChevronLeft } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import useAuth from "../../custom-hooks/useAuth";
import { IoMdContact } from "react-icons/io";
import { TbHomeStar } from "react-icons/tb";
import { PiSignOutBold } from "react-icons/pi";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";
import VprofileDetails from "../vendor/VprofileDetails.jsx";

ChartJS.register(ArcElement, Tooltip, Legend);

const VendorProfile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [displayName, setDisplayName] = useState("");

  const [email, setEmail] = useState("");

  const [shopName, setShopName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [fulfilledOrders, setFulfilledOrders] = useState(0);
  const [unfulfilledOrders, setUnfulfilledOrders] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState(0);
  const totalOrders = fulfilledOrders + unfulfilledOrders + incomingOrders;

  const activityData = {
    labels: ["Fulfilled", "Unfulfilled", "Incoming"],
    datasets: [
      {
        data:
          totalOrders === 0
            ? [1, 1, 1]
            : [fulfilledOrders, unfulfilledOrders, incomingOrders],
        backgroundColor: ["#D92CA0", "#F27D38", "#5CBF49"],
        hoverBackgroundColor: ["#D92CA0", "#F27D38", "#5CBF49"],
        borderWidth: 0,
      },
    ],
  };

  const activityOptions = {
    rotation: -90, // Start from the top (semi-circle orientation)
    circumference: 180, // Only show half of the chart (semi-circle)
    cutout: "70%", // Size of the center hole
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const ordersRef = collection(db, "orders");

        const fulfilledQuery = query(
          ordersRef,
          where("status", "==", "fulfilled")
        );
        const fulfilledSnapshot = await getDocs(fulfilledQuery);
        setFulfilledOrders(fulfilledSnapshot.size);

        const unfulfilledQuery = query(
          ordersRef,
          where("status", "==", "unfulfilled")
        );
        const unfulfilledSnapshot = await getDocs(unfulfilledQuery);
        setUnfulfilledOrders(unfulfilledSnapshot.size);

        const incomingQuery = query(
          ordersRef,
          where("status", "==", "incoming")
        );
        const incomingSnapshot = await getDocs(incomingQuery);
        setIncomingOrders(incomingSnapshot.size);
      } catch (error) {
        console.error("Error fetching order data:", error);
      }
    };

    fetchOrderData();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vendorDoc.exists()) {
            const data = vendorDoc.data();
            setUserData(data);
            setDisplayName(data.firstName + " " + data.lastName);
            setEmail(data.email || "");
            setShopName(data.shopName || "");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut(auth);
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="py-4 px-2 font-opensans ">
      {!showDetails && !showHistory ? (
        <div className="flex flex-col items-center">
          {/* Profile Picture and Name */}
          <div className="flex border rounded-full p-1 justify-center mt-6 relative">
            {isLoading ? (
              <Skeleton circle={true} height={144} width={144} />
            ) : userData && userData.photoURL ? (
              <img
                src={userData.photoURL}
                alt=""
                className="rounded-full object-cover h-28 w-28"
                onClick={() => setIsAvatarModalOpen(true)}
              />
            ) : (
              <div
                className="rounded-full h-36 w-36 flex items-center justify-center"
                onClick={() => setIsAvatarModalOpen(true)}
              >
                <IoMdContact className="text-gray-500 text-7xl" />
              </div>
            )}
            <MdModeEdit
              className="absolute bottom-0 right-0 border text-black mr-2 text-3xl p-2 rounded-full bg-white cursor-pointer shadow-md"
              onClick={() => setIsAvatarModalOpen(true)}
            />
          </div>

          <div className="text-lg font-semibold text-black capitalize mt-2">
            {shopName}
          </div>

          {/* My Activity Chart */}
          <div className=" my-4 w-full ">
            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                My Activity
              </h1>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-customGrey">
              <div className="w-40 h-40 relative">
                {" "}
                {/* Adjusted size for a semi-circle */}
                <Doughnut data={activityData} options={activityOptions} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center mt-5">
                    <p className="text-xs font-medium">Total Orders</p>
                    <p className="text-lg font-bold">{totalOrders}</p>
                  </div>
                </div>
              </div>
              <div className="flex mt-2 space-x-6 text-sm mb-3">
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded-full bg-[#D92CA0]"></span>
                  <span>Fulfilled ({fulfilledOrders})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded-full bg-[#F27D38]"></span>
                  <span>Unfulfilled ({unfulfilledOrders})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded-full bg-[#5CBF49]"></span>
                  <span>Incoming ({incomingOrders})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Options */}
          <div className="w-full mt-2">
            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                Personal
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <div
                className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center">
                  <User className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Personal information
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>

            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <div
                className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("")}
              >
                <div className="flex items-center">
                  <TbHomeStar className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    View Ratings
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>

              <div
                className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={handleLogout}
              >
                <div className="flex items-center ">
                  <PiSignOutBold className="text-red-600 text-xl mr-4" />
                  <p className="text-size text-black font-normal capitalize">
                    Sign Out
                  </p>
                  {isLoggingOut && (
                    <RotatingLines
                      strokeColor="#f9531e"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <VprofileDetails
              showDetails={showDetails}
              setShowDetails={setShowDetails}
            />
          )}
          {showHistory && (
            <div className="flex flex-col items-center">
              <ChevronLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowHistory(false)}
              />
              <h2 className="text-xl font-ubuntu mt-4">Recent Activities</h2>
              {/* Render History content here */}
            </div>
          )}
        </>
      )}

      {isAvatarModalOpen && (
        <AvatarSelectorModal
          userId={currentUser.uid}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarChange={(newAvatar) =>
            setUserData((prev) => ({ ...prev, photoURL: newAvatar }))
          }
        />
      )}
    </div>
  );
};

export default VendorProfile;

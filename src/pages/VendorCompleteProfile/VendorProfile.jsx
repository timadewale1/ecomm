import React, { useEffect, useState } from "react";
import {
  signOut,
  updateProfile,
  updateEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { MdHistory, MdHelpOutline, MdModeEdit } from "react-icons/md";
import { auth, db } from "../../firebase.config";
import { RotatingLines } from "react-loader-spinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import useAuth from "../../custom-hooks/useAuth";
import { IoMdContact } from "react-icons/io";
import {
  FaPen,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaAngleRight,
  FaAngleLeft,
} from "react-icons/fa";
import { TbHomeStar } from "react-icons/tb";
import { GrSecure } from "react-icons/gr";
import { PiSignOutBold } from "react-icons/pi";
import { FaRegCircleUser, FaShop } from "react-icons/fa6";

import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";
import VprofileDetails from "../vendor/VprofileDetails.jsx";
import OrderChart from './OrderChart';

const VendorProfile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [editD, setEditD] = useState("");
  const [email, setEmail] = useState("");
  const [editE, setEditE] = useState("");
  const [shopName, setShopName] = useState("");
  const [editS, setEditS] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [fulfilledOrders, setFulfilledOrders] = useState(0);
  const [unfulfilledOrders, setUnfulfilledOrders] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState(0);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const ordersRef = collection(db, "orders");
        
        // Query fulfilled orders
        const fulfilledQuery = query(ordersRef, where("status", "==", "fulfilled"));
        const fulfilledSnapshot = await getDocs(fulfilledQuery);
        setFulfilledOrders(fulfilledSnapshot.size);

        // Query unfulfilled orders
        const unfulfilledQuery = query(ordersRef, where("status", "==", "unfulfilled"));
        const unfulfilledSnapshot = await getDocs(unfulfilledQuery);
        setUnfulfilledOrders(unfulfilledSnapshot.size);

        // Query incoming orders
        const incomingQuery = query(ordersRef, where("status", "==", "incoming"));
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

  const handleEdit = (field) => {
    setEditField(field);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editField === "displayName" && /[^a-zA-Z\s]/.test(displayName)) {
      toast.error("You cannot use numbers as username!", {
        className: "custom-toast",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Other profile updates...
      if (editField === "displayName") {
        await updateProfile(auth.currentUser, { displayName });
        await updateDoc(doc(db, "vendors", currentUser.uid), { displayName });
      } else if (editField === "email") {
        await updateEmail(auth.currentUser, email);
        await sendEmailVerification(auth.currentUser);
        await updateDoc(doc(db, "vendors", currentUser.uid), { email: editE });
      } else if (editField === "password") {
        await updatePassword(auth.currentUser, password);
        toast.success("Password updated successfully", {
          className: "custom-toast",
        });
      } else if (editField === "shopName") {
        if (shopName === "") {
          toast.error("Store Name cannot be empty", {
            className: "custom-toast",
          });
          return;
        } else if (shopName.length <= 3) {
          toast.error("Store Name must be more than 3 characters", {
            className: "custom-toast",
          });
          return;
        }
        await updateDoc(doc(db, "vendors", currentUser.uid), {
          shopName: editS,
        });
        toast.success("Store Name has been changed", {
          className: "custom-toast",
        });
      }

      // Update photoURL
      await updateDoc(doc(db, "vendors", currentUser.uid), {
        photoURL: userData.photoURL,
      });

      toast.success("Profile updated successfully", {
        className: "custom-toast",
      });

      setIsEditing(false);
      setEditField("");
    } catch (error) {
      console.log(error);
      toast.error("Error updating profile, try again later", {
        className: "custom-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

 
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Start the loading spinner
      await signOut(auth);
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false); // Stop the loading spinner
    }
  };


  

  const handleAvatarChange = (newAvatar) => {
    setUserData((prev) => ({ ...prev, photoURL: newAvatar }));
  };

  return (
    <div className="pb-4">
      {!showDetails &&
      !showHistory ? (
        <div className="flex flex-col items-center">
            
            <div className="flex border  rounded-full p-1 justify-center mt-4 relative">
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
                  className="rounded-full h-36 w-36 flex items-center justify-center "
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  <IoMdContact className="text-gray-500 text-7xl" />
                </div>
              )}
              <MdModeEdit
                className="absolute bottom-0 right-0 border text-black  mr-2 text-3xl p-2 rounded-full bg-white cursor-pointer shadow-md"
                onClick={() => setIsAvatarModalOpen(true)}
              />
            </div>

            
          <div className="">
            {isLoading ? (
              <Skeleton width={150} height={24} />
            ) : userData && userData.shopName ? (
              <p className="text-lg font-semibold text-black capitalize mt-2">
                {shopName}
              </p>
            ) : (
              <div/>
            )}
          </div>


          
          <div className="w-full mt-2">
            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                Personal
              </h1>
            </div>

            <div className="flex flex-col items-center w-full">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center">
                  <FaRegCircleUser className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                      Personal information
                    </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
           
           
            </div>
            <div className="flex flex-col items-center w-full">
           
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() => setShowHistory(!showHistory)}
              >
                <div className="flex items-center">
                  <MdHistory className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Recent Activities
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
             
            </div>
            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
            
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("")}
              >
                <div className="flex items-center">
                  <TbHomeStar className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    View Ratings
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              
            </div>
            <div
      className="flex flex-col items-center w-full cursor-pointer border-none rounded-xl bg-customGrey mb-3 px-2"
      onClick={handleLogout}
    >
      <div className="flex items-center justify-between w-full px-4 py-3">
        <PiSignOutBold className="text-red-600 text-xl mr-4" />
        <p className="text-size text-black w-full font-normal">Sign Out</p>
        
        {isLoggingOut && (
          <RotatingLines
            strokeColor="#f9531e"
            strokeWidth="5"
            animationDuration="0.75"
            width="24" // Adjust size as needed
            visible={true}
          />
        )}
      </div>
    </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <VprofileDetails showDetails={showDetails} setShowDetails={setShowDetails} />
          )}

          {showHistory && (
            <div className="flex flex-col items-center">
              <FaAngleLeft
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
          onAvatarChange={handleAvatarChange}
        />
      )}
    </div>
  );
};

export default VendorProfile;

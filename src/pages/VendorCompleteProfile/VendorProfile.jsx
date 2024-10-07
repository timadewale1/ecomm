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
import { auth, db } from "../../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import useAuth from "../../custom-hooks/useAuth";
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
import { MdEmail, MdHistory } from "react-icons/md";

import { RotatingLines } from "react-loader-spinner";
import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";
import VprofileDetails from "../vendor/VprofileDetails.jsx";

const VendorProfile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
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
      await signOut(auth);
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      toast.error("Error logging out", { className: "custom-toast" });
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
          <div className="relative flex justify-center w-full h-full">
            {/* Store Image */}
            <div className="relative w-full h-72">
              {isLoading ? (
                <Skeleton height={288} />
              ) : userData && userData.coverImageUrl ? (
                <img
                  src={userData.coverImageUrl}
                  alt="Store"
                  className="w-full h-full object-cover rounded-b-lg bg-gray-400"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 rounded-b-lg" />
              )}

              {/* User Image */}
              <div className="absolute top-52 left-0">
                {isLoading ? (
                  <Skeleton circle height={144} width={144} />
                ) : userData && userData.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="User"
                    className="rounded-full object-cover h-36 w-36 border-2 border-white bg-gray-400"
                  />
                ) : (
                  <img
                    src="" // You might want to provide a placeholder or default image here
                    alt="User"
                    className="rounded-full h-36 w-36 border-4 border-white"
                  />
                )}
                <div className="absolute top-1 right-1 bg-white p-2 rounded-full">
                  <FaPen
                    className=" text-black cursor-pointer"
                    onClick={() => setIsAvatarModalOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            {isLoading ? (
              <Skeleton width={150} height={24} />
            ) : userData && userData.shopName ? (
              <p className="text-md font-medium text-black capitalize">
                {shopName}
              </p>
            ) : (
              <div className="h-6 bg-gray-300 w-40 mt-10" />
            )}
          </div>
          <div className="w-full mt-12">
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                Personal
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center">
                  <FaRegCircleUser className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Profile Details
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
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
              <hr className="w-full border-gray-600" />
            </div>
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
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
              <hr className="w-full border-gray-600" />
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

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <RotatingLines
            strokeColor="orange"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
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

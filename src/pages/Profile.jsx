import React, { useEffect, useState } from "react";

import { db } from "../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import useAuth from "../custom-hooks/useAuth";
import { FaPen, FaHeart, FaAngleRight, FaAngleLeft } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { GiClothes } from "react-icons/gi";

import OrderHistory from "./UserSide/History";
import { MdHistory, MdHelpOutline } from "react-icons/md";
import { CiMoneyBill } from "react-icons/ci";
import { AiOutlineDashboard } from "react-icons/ai";
import UserDashboard from "./UserDashboard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import AvatarSelectorModal from "../components/Avatars/AvatarSelectorModal";
import ProfileDetails from "./UserSide/ProfileDetails";
import FAQs from "./UserSide/FAQs";
import { IoMdContact } from "react-icons/io";
import Donate from "./Donate";
const Profile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleAvatarChange = (newAvatar) => {
    setUserData((prev) => ({ ...prev, photoURL: newAvatar }));
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: "",
      });
      setUserData((prev) => ({ ...prev, photoURL: "" }));
      toast.success("Avatar removed successfully", {
        className: "custom-toast",
      });
    } catch (error) {
      toast.error("Error removing avatar. Please try again.", {
        className: "custom-toast",
      });
    }
  };

  return (
    <div className="py-4">
      {!showDetails &&
      !showHistory &&
      !showMetrics &&
      !showFAQs &&
      !showDonations ? (
        <div className="flex flex-col items-center">
          <div className="flex justify-center mt-4 relative">
            {loading ? (
              <Skeleton circle={true} height={144} width={144} />
            ) : userData && userData.photoURL ? (
              <img
                src={userData.photoURL}
                alt=""
                className="rounded-full object-cover h-36 w-36"
                onClick={() => setIsAvatarModalOpen(true)}
              />
            ) : (
              <div
                className="rounded-full h-36 w-36 flex items-center justify-center bg-gray-200"
                onClick={() => setIsAvatarModalOpen(true)}
              >
                <IoMdContact className="text-gray-500 text-7xl" />
              </div>
            )}
            <FaPen
              className="absolute top-0 right-0 text-black cursor-pointer"
              onClick={() => setIsAvatarModalOpen(true)}
            />
          </div>
          <p className="text-lg font-medium text-black capitalize mt-2">
            {loading ? <Skeleton width={100} /> : userData?.username}
          </p>
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
                onClick={() => navigate("/favorites")}
              >
                <div className="flex items-center">
                  <FaHeart className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Favorites
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
                    History
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
                onClick={() => navigate("/user-dashboard")}
              >
                <div className="flex items-center">
                  <AiOutlineDashboard className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Metrics
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                More
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowFAQs(!showFAQs)}
              >
                <div className="flex items-center">
                  <MdHelpOutline className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    FAQs
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
                onClick={() => setShowDonations(true)}
              >
                <div className="flex items-center">
                  <CiMoneyBill className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Donations
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div
              className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
              onClick={() => navigate("/explore")}
            >
              <div className="flex items-center">
                <GiClothes className="text-black text-xl mr-4" />
                <h2 className="text-size font-normal text-black capitalize">
                  Declutter
                </h2>
              </div>
              <FaAngleRight className="text-black" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <ProfileDetails
              currentUser={currentUser}
              userData={userData}
              setUserData={setUserData}
              setShowDetails={setShowDetails}
            />
          )}
          {showHistory && (
            <div className="flex flex-col items-center">
              <OrderHistory setShowHistory={setShowHistory} />
            </div>
          )}
          {showMetrics && <UserDashboard />}
          {showFAQs && <FAQs setShowFAQs={setShowFAQs} />}
          {showDonations && (
            <div className="flex flex-col items-center">
              <FaAngleLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowDonations(false)}
              />
              <h2 className="text-xl font-ubuntu">Donations</h2>
              <Donate />
            </div>
          )}
        </>
      )}

      {isAvatarModalOpen && (
        <AvatarSelectorModal
          userId={currentUser.uid}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarChange={handleAvatarChange}
          onRemoveAvatar={handleRemoveAvatar}
        />
      )}
    </div>
  );
};

export default Profile;

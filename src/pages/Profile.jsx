import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase.config";
import { toast } from "react-toastify";
import { ChevronRight, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import useAuth from "../custom-hooks/useAuth";
import { FaPen, FaHeart, FaAngleRight, FaAngleLeft } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { RotatingLines } from "react-loader-spinner";
import { PiSignOutBold } from "react-icons/pi";
import { GiClothes } from "react-icons/gi";
import { LiaClipboardListSolid } from "react-icons/lia";
import OrderHistory from "./UserSide/History";
import { MdHistory, MdHelpOutline, MdModeEdit } from "react-icons/md";
import { CiMoneyBill } from "react-icons/ci";
import { AiOutlineDashboard } from "react-icons/ai";
import UserDashboard from "./UserDashboard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { BsBoxSeam } from "react-icons/bs";
import AvatarSelectorModal from "../components/Avatars/AvatarSelectorModal";
import ProfileDetails from "./UserSide/ProfileDetails";
import FAQs from "./UserSide/FAQs";
import { IoMdContact } from "react-icons/io";
import { clearCart } from "../redux/actions/action";
import { useDispatch, useSelector } from "react-redux";
import { resetUserData } from "../redux/actions/authactions";
import Donate from "./Donate";
const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // const [isIncomplete, setIsIncomplete] = useState(false);
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const incompleteProfile = queryParams.get("incomplete") === "true";
    setIsIncomplete(incompleteProfile);
    setShowHighlight(incompleteProfile);

    // Fade out the highlight after 10 seconds
    if (incompleteProfile) {
      const highlightTimeout = setTimeout(() => setShowHighlight(false), 10000);
      return () => clearTimeout(highlightTimeout);
    }

    const fetchUserData = async () => {
      if (currentUser) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [currentUser, location.search]);

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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Start the loading spinner

      console.log("Logging out, cart:", cart); // Log the cart data
      await setDoc(doc(db, "carts", currentUser.uid), { cart });
      console.log("Cart saved to Firestore:", { cart }); // Log after saving to Firestore

      await signOut(auth);
      localStorage.removeItem("cart");
      dispatch(clearCart()); // Clear Redux cart state
      dispatch(resetUserData()); // Reset user data
      console.log("Cart cleared in Redux and localStorage");

      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false); // Stop the loading spinner
    }
  };

  return (
    <div className="py-4">
      {!showDetails && !showMetrics && !showFAQs && !showDonations ? (
        <div className="flex flex-col items-center">
          <h1 className="font-poppins text-xl font-semibold "> My Profile</h1>
          <div className="flex border  rounded-full p-1 justify-center mt-4 relative">
            {loading ? (
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

          <p className="text-lg font-semibold text-black font-poppins capitalize mt-2">
            {loading ? <Skeleton width={100} /> : userData?.username}
          </p>

          <div className="w-full mt-2">
            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 translate-y-3 text-black">
                Account
              </h1>
            </div>
            <div className="px-2">
              {" "}
             
              <div
                className={`relative flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl transition-all duration-500 ease-in-out ${
                  showHighlight
                    ? "highlight border-red-500 bg-red-100"
                    : "bg-customGrey"
                } mb-3`}
                onClick={() => setShowDetails(true)}
              >
                <div className="flex items-center w-full">
                  <User className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Personal information
                  </h2>
                  <ChevronRight className="text-black ml-auto" />
                </div>

                {isIncomplete && showHighlight && (
                  <span className="absolute top-1 right-4 font-opensans text-xs text-red-500 animate-pulse">
                    Update profile here
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer  border-none rounded-xl bg-customGrey mb-2"
                onClick={() => navigate("/favorites")}
              >
                <div className="flex items-center">
                  <FaHeart className="text-red-500  text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Favorites
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>

            <div className="w-full h-14 flex">
              <h1 className="text-base font-ubuntu font-semibold mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            <div className="flex flex-col items-center px-2 w-full ">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("/user-dashboard")}
              >
                <div className="flex items-center">
                  <AiOutlineDashboard className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Metrics
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("/user-orders")}
              >
                <div className="flex items-center">
                  <BsBoxSeam className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Orders
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="w-full h-14 flex">
              <h1 className="text-base font-ubuntu font-semibold mx-4 translate-y-3 text-black">
                More
              </h1>
            </div>
            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => setShowFAQs(!showFAQs)}
              >
                <div className="flex items-center ">
                  <MdHelpOutline className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    FAQs
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => setShowDonations(true)}
              >
                <div className="flex items-center">
                  <CiMoneyBill className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Donations
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("/explore")}
              >
                <div className="flex items-center">
                  <GiClothes className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Declutter
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>

            <div
              className="flex flex-col items-center w-full cursor-pointer border-none rounded-xl bg-customGrey mb-3 px-2"
              onClick={handleLogout}
            >
              <div className="flex items-center justify-between w-full px-4 py-3">
                <PiSignOutBold className="text-red-600 text-xl mr-4" />
                <p className="text-size text-black w-full font-normal">
                  Sign Out
                </p>

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
            <ProfileDetails
              currentUser={currentUser}
              userData={userData}
              setUserData={setUserData}
              setShowDetails={setShowDetails}
            />
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

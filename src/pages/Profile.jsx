import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase.config";
import { toast } from "react-hot-toast";
import { ChevronRight, User, ChevronLeft } from "lucide-react";
import { AiOutlineUserSwitch } from "react-icons/ai";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../custom-hooks/useAuth";
import { FaHeart } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import { FcOnlineSupport } from "react-icons/fc";
import { PiSignOutBold } from "react-icons/pi";
import { GiClothes } from "react-icons/gi";
import { MdHelpOutline, MdModeEdit, MdOutlineFeedback } from "react-icons/md";
import {
  setUserData,
  updateUserData,
  resetUserData,
} from "../redux/actions/useractions";
import { CiMoneyBill } from "react-icons/ci";
import { LuLogIn } from "react-icons/lu";
import { AiOutlineDashboard, AiOutlineExperiment } from "react-icons/ai";

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { BsBoxSeam, BsShieldFillCheck } from "react-icons/bs";
import AvatarSelectorModal from "../components/Avatars/AvatarSelectorModal";
import ProfileDetails from "./UserSide/ProfileDetails";
import FAQs from "./UserSide/FAQs";
import { IoMdContact } from "react-icons/io";
import { clearCart } from "../redux/actions/action";
import { useDispatch, useSelector } from "react-redux";
import { FaFileContract } from "react-icons/fa6";
import SEO from "../components/Helmet/SEO";
import { exitStockpileMode } from "../redux/reducers/stockpileSlice";
const Profile = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

    if (incompleteProfile) {
      const highlightTimeout = setTimeout(() => setShowHighlight(false), 10000);
      return () => clearTimeout(highlightTimeout);
    }

    const fetchUserData = async () => {
      if (currentUser && !userData) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            dispatch(setUserData(userDoc.data()));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [currentUser, location.search]);
  const openChat = () => {
    if (window.HelpCrunch) {
      console.log("Opening HelpCrunch chat...");
      window.HelpCrunch("openChat");
    } else {
      console.error("HelpCrunch is not initialized.");
    }
  };

  useEffect(() => {
    // Ensure HelpCrunch is fully initialized
    const initializeHelpCrunch = () => {
      if (window.HelpCrunch) {
        window.HelpCrunch("onReady", () => {
          console.log("HelpCrunch is ready.");
          window.HelpCrunch("hideChatWidget"); // Ensure widget is hidden
        });
      } else {
        console.error("HelpCrunch is not loaded.");
      }
    };

    initializeHelpCrunch();
  }, []);

  const handleAvatarChange = (newAvatar) => {
    dispatch(updateUserData({ photoURL: newAvatar }));
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: "",
      });
      dispatch(updateUserData({ photoURL: "" }));
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

      console.log("Starting logout process...");

      // Logout from HelpCrunch
      if (window.HelpCrunch) {
        console.log("Logging out from HelpCrunch...");
        window.HelpCrunch("logout", function (data) {
          if (data && data.success) {
            console.log("Successfully logged out from HelpCrunch.");
          } else {
            console.error(
              "HelpCrunch logout failed or returned no data:",
              data
            );
          }
        });
      } else {
        console.warn(
          "HelpCrunch is not initialized. Skipping HelpCrunch logout."
        );
      }

      console.log("Saving cart data before Firebase logout...");
      await setDoc(doc(db, "carts", currentUser.uid), { cart });
      console.log("Cart saved to Firestore:", { cart }); // Log after saving to Firestore

      console.log("Logging out from Firebase...");
      await signOut(auth);

      console.log("Clearing local storage and Redux state...");
      localStorage.removeItem("cart");
      dispatch(clearCart()); // Clear Redux cart state
      dispatch(resetUserData());
      dispatch(exitStockpileMode());
      console.log("Cart cleared in Redux and localStorage");

      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/newhome");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false); // Stop the loading spinner
      console.log("Logout process completed.");
    }
  };

  return (
    <>
      <SEO
        title={`Profile - My Thrift`}
        description={`Update your personal information, view your orders, and more.`}
        url={`https://www.shopmythrift.store/profile`}
      />
      <div className="py-6  pb-24">
        {!showDetails && !showMetrics && !showFAQs ? (
          <div className="flex flex-col items-center">
            <h1 className="font-opensans text-xl font-semibold ">
              {" "}
              My Profile
            </h1>

            <div className="flex border  rounded-full p-1 justify-center mt-4 relative">
              {loading ? (
                <Skeleton circle={true} height={120} width={120} />
              ) : userData && userData.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt=""
                  className="rounded-full object-cover h-28 w-28"
                  onClick={() => {
                    if (currentUser) setIsAvatarModalOpen(true);
                  }}
                />
              ) : (
                <div
                  className="rounded-full h-36 w-36 flex items-center justify-center"
                  onClick={() => {
                    if (currentUser) setIsAvatarModalOpen(true);
                  }}
                >
                  <IoMdContact className="text-gray-500 text-8xl" />
                </div>
              )}
              {currentUser && (
                <MdModeEdit
                  className="absolute bottom-0 right-0 border text-black mr-2 text-3xl p-2 rounded-full bg-white cursor-pointer shadow-md"
                  onClick={() => setIsAvatarModalOpen(true)}
                />
              )}
            </div>

            <p className="text-lg font-semibold text-black font-opensans capitalize mt-2">
              {loading ? <Skeleton width={100} /> : userData?.username}
            </p>

            <div className="w-full mt-2">
              <div className="w-full h-14 flex">
                <h1 className="text-base font-semibold mx-4 font-opensans translate-y-3 text-black">
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
                    <h2 className="text-size font-normal  text-sm  font-opensans text-black capitalize">
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
                    <h2 className="text-size text-sm  font-normal font-opensans text-black capitalize">
                      Favorites
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              </div>
            </div>

            <div className="w-full h-14 flex">
              <h1 className="text-base font-opensans font-semibold mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            {/* {currentUser && (
            <>
              <div className="flex flex-col items-center px-2 w-full">
                <div
                  className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                  onClick={() => navigate("/user-dashboard")}
                >
                  <div className="flex items-center">
                    <AiOutlineDashboard className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal font-opensans text-black capitalize">
                      Metrics
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              </div>
            </>
          )} */}

            <div className="flex flex-col items-center w-full px-2">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer border-none rounded-xl bg-customGrey mb-3"
                onClick={() => navigate("/user-orders")}
              >
                <div className="flex items-center">
                  <BsBoxSeam className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal font-opensans text-black capitalize">
                    Orders
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="w-full h-14 flex">
              <h1 className="text-base font-opensans font-semibold mx-4 translate-y-3 text-black">
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
                  <h2 className="text-size font-normal text-sm  font-opensans text-black capitalize">
                    FAQs
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>
            </div>
            <div className="flex flex-col items-center w-full px-2">
              {/* Donations Section */}
              <div className="relative flex items-center justify-between w-full px-4 py-3 cursor-not-allowed border-none rounded-xl bg-gray-100 mb-3 opacity-60">
                <div className="flex items-center">
                  <CiMoneyBill className="text-gray-600 text-xl mr-4" />
                  <h2 className="text-size font-normal text-sm  font-opensans text-gray-600 capitalize">
                    Donations
                  </h2>
                </div>
                {/* Coming Soon Message on the Far Right */}
                <div className="flex items-center">
                  <MdHelpOutline className="text-customOrange text-lg mr-2" />
                  <span className="text-customOrange font-semibold text-xs">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Declutter Section */}
              <div className="relative flex items-center justify-between w-full px-4 py-3 cursor-not-allowed border-none rounded-xl bg-gray-100 mb-3 opacity-60">
                <div className="flex items-center">
                  <GiClothes className="text-gray-600 text-xl mr-4" />
                  <h2 className="text-size font-normal text-sm  font-opensans text-gray-600 capitalize">
                    Declutter
                  </h2>
                </div>
                {/* Coming Soon Message on the Far Right */}
                <div className="flex items-center">
                  <MdHelpOutline className="text-customOrange text-lg mr-2" />
                  <span className="text-customOrange font-semibold text-xs">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-14 flex">
              <h1 className="text-base font-semibold mx-4 font-opensans translate-y-3 text-black">
                Legal
              </h1>
            </div>
            <div className="flex flex-col items-center px-2 w-full">
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() =>
                  window.open(
                    "/terms-and-conditions",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <div className="flex items-center">
                  <FaFileContract className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-sm font-opensans text-black capitalize">
                    Terms and Conditions
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>

              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                onClick={() =>
                  window.open(
                    "/privacy-policy",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <div className="flex items-center">
                  <BsShieldFillCheck className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-sm font-opensans text-black capitalize">
                    Privacy Policy
                  </h2>
                </div>
                <ChevronRight className="text-black" />
              </div>

              <div className="w-full h-14 flex ml-4">
                <h1 className="text-base font-semibold mx-2 font-opensans translate-y-3 text-black">
                  Beta
                </h1>
                <AiOutlineExperiment className="font-semibold text-lg translate-y-[14px] text-black" />
              </div>
              <div className="flex flex-col items-center w-full">
                <div
                  className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={() => navigate("/send-us-feedback")}
                >
                  <div className="flex items-center">
                    <MdOutlineFeedback className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-sm  font-opensans text-black capitalize">
                      Send us your feedback! 📣
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center px-2 w-full">
              {currentUser && (
                <div
                  id="contact-support-tab"
                  className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={openChat}
                >
                  <div className="flex items-center">
                    <FcOnlineSupport className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-sm font-opensans text-black capitalize">
                      Contact Support
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center px-2 w-full">
              {currentUser && (
                <div
                  className="flex flex-col items-center w-full cursor-pointer border-none rounded-xl bg-customGrey mb-3 px-2"
                  onClick={handleLogout}
                >
                  <div className="flex items-center justify-between w-full px-4 py-3">
                    <PiSignOutBold className="text-red-600 text-xl mr-4" />
                    <p className="text-size text-black text-sm  font-opensans w-full font-normal">
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
              )}
              {!currentUser && (
                <div
                  className="flex flex-col items-center w-full cursor-pointer border-none rounded-xl bg-customGrey mb-3 px-2"
                  onClick={() => navigate("/login")}
                >
                  <div className="flex items-center justify-between w-full px-4 py-3">
                    <LuLogIn className="text-green-600 text-xl mr-4" />
                    <p className="text-size text-black text-sm  font-opensans w-full font-normal">
                      Login
                    </p>
                  </div>
                </div>
              )}
              {!currentUser && (
                <div
                  className="flex flex-col items-center w-full cursor-pointer border-none rounded-xl bg-customGrey mb-3 px-2"
                  onClick={() => navigate("/confirm-state")}
                >
                  <div className="flex items-center justify-between w-full px-4 py-3">
                    <AiOutlineUserSwitch className="text-customOrange text-xl mr-4" />
                    <p className="text-size text-black font-opensans w-full text-sm font-normal">
                      Switch Role
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full text-center mt-2">
              <p className="text-sm font-poppins font-medium text-gray-500"> v.2.8</p>
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

            {/* {showMetrics && <UserDashboard />} */}
            {showFAQs && <FAQs setShowFAQs={setShowFAQs} />}
            {/* {showDonations && (
            <div className="flex flex-col items-center">
              <ChevronLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowDonations(false)}
              />
              <h2 className="text-xl font-ubuntu">Donations</h2>
              <Donate />
            </div>
          )} */}
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
    </>
  );
};

export default Profile;

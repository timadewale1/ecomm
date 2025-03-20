import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { RotatingLines } from "react-loader-spinner";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, ChevronLeft } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../custom-hooks/useAuth";
import { TbHomeStar, TbTruckDelivery } from "react-icons/tb";
import { PiLinkBold, PiLinkLight, PiSignOutBold } from "react-icons/pi";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Skeleton from "react-loading-skeleton";
import VprofileDetails from "../vendor/VprofileDetails.jsx";
import { useDispatch, useSelector } from "react-redux";
import { clearOrders } from "../../redux/actions/orderaction.js";
import { setVendorProfile, setLoading } from "../../redux/vendorProfileSlice";
import {
  FaCartShopping,
  FaFacebookF,
  FaFileContract,
  FaTwitter,
  FaWhatsapp,
  FaX,
  FaXTwitter,
} from "react-icons/fa6";
import { BsShieldFillCheck } from "react-icons/bs";
import { IoBook } from "react-icons/io5";
import { IoIosCall, IoIosStats } from "react-icons/io";
import ReactModal from "react-modal";
import Modal from "react-modal";
import { AiOutlineExperiment } from "react-icons/ai";
import { MdOutlineClose, MdOutlineFeedback } from "react-icons/md";
import SEO from "../../components/Helmet/SEO.jsx";
import ProfileView from "./profileView.jsx";
import { GoChevronLeft } from "react-icons/go";
ChartJS.register(ArcElement, Tooltip, Legend);

const defaultImageUrl =
  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

const VendorProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // const [followersCount, setFollowersCount] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [fulfilledOrders, setFulfilledOrders] = useState(0);
  const [unfulfilledOrders, setUnfulfilledOrders] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState(0);
  const totalOrders = fulfilledOrders + unfulfilledOrders + incomingOrders;
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const activityData = {
    labels: ["Fulfilled", "Unfulfilled", "Incoming"],
    datasets: [
      {
        data:
          totalOrders === 0
            ? [1, 1, 1]
            : [fulfilledOrders, unfulfilledOrders, incomingOrders],
        backgroundColor: ["#28a745", "#6c757d", "#007bff"],
        hoverBackgroundColor: ["#D92CA0", "#F27D38", "#5CBF49"],
        borderWidth: 0,
      },
    ],
  };
  // Function to open modal
  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  // Function to close modal
  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
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

  const { data: userData, loading } = useSelector(
    (state) => state.vendorProfile
  );

  // Fetch user data on mount if not already in Redux
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        dispatch(setLoading(true)); // Set loading state
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid)); // Replace with actual UID
          if (vendorDoc.exists()) {
            dispatch(setVendorProfile(vendorDoc.data())); // Save data in Redux
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data.", {
            className: "custom-toast",
          });
        } finally {
          dispatch(setLoading(false)); // Stop loading
        }
      }
    };

    fetchUserData();
  }, [dispatch, currentUser]);
  // useEffect(() => {
  //   if (!currentUser?.uid) return; // Ensure currentUser is defined

  //   const fetchFollowersCount = async () => {
  //     try {
  //       const followersQuery = query(
  //         collection(db, "follows"),
  //         where("vendorId", "==", currentUser.uid)
  //       );
  //       const querySnapshot = await getDocs(followersQuery);
  //       setFollowersCount(querySnapshot.size);
  //     } catch (error) {
  //       console.error("Error fetching followers count:", error);
  //     }
  //   };

  //   fetchFollowersCount();
  // }, [currentUser]);

  const {
    shopName,
    coverImageUrl,
    marketPlaceType,
    description,
    uid,
    likesCount,
    followersCount,
  } = userData || {};

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!currentUser.uid) return; // Ensure currentUser is defined

      try {
        const ordersRef = collection(db, "orders");

        // Fulfilled Orders (Delivered)
        const fulfilledQuery = query(
          ordersRef,
          where("progressStatus", "==", "Delivered"),
          where("vendorId", "==", currentUser.uid)
        );
        const fulfilledSnapshot = await getDocs(fulfilledQuery);
        setFulfilledOrders(fulfilledSnapshot.size);

        // Unfulfilled Orders (In Progress, Shipped, or Pending)
        const unfulfilledQuery = query(
          ordersRef,
          where("progressStatus", "in", ["In Progress", "Shipped", "Pending"]),
          where("vendorId", "==", currentUser.uid)
        );
        const unfulfilledSnapshot = await getDocs(unfulfilledQuery);
        setUnfulfilledOrders(unfulfilledSnapshot.size);

        // Incoming Orders
        const incomingQuery = query(
          ordersRef,
          where("progressStatus", "==", "Pending"),
          where("vendorId", "==", currentUser.uid)
        );
        const incomingSnapshot = await getDocs(incomingQuery);
        setIncomingOrders(incomingSnapshot.size);
      } catch (error) {
        console.error("Error fetching order data:", error);
      }
    };

    fetchOrderData();
  }, [currentUser]);

  // useEffect(() => {
  //   setIsLoading(true);
  //   const fetchUserData = async () => {
  //     if (currentUser) {
  //       try {
  //         // Fetch user document from Firestore
  //         const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
  //         if (vendorDoc.exists()) {
  //           const data = vendorDoc.data();
  //           setUserData(data);
  //           setDisplayName(data.firstName + " " + data.lastName);
  //           setEmail(data.email || "");
  //           setShopName(data.shopName || "");

  //           // Set cover image URL from Firestore or use default image
  //           setCoverImageUrl(data.coverImageUrl || defaultImageUrl);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching user data:", error);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     }
  //   };
  //   fetchUserData();
  // }, [currentUser]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Start the loading spinner

      // Perform HelpCrunch logout
      if (window.HelpCrunch) {
        console.log("Logging out from HelpCrunch...");
        window.HelpCrunch("logout", (data) => {
          if (data && data.success) {
            console.log("Successfully logged out from HelpCrunch.");
          } else {
            console.error("HelpCrunch logout failed:", data);
          }
        });
      } else {
        console.warn(
          "HelpCrunch is not initialized. Skipping HelpCrunch logout."
        );
      }

      // Sign out from Firebase authentication
      await signOut(auth);

      // Dispatch clearOrders action to clear orders from Redux store
      dispatch(clearOrders());

      // Show success message and navigate
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false); // Stop the loading spinner
    }
  };

  const profileLink = `https://shopmythrift.store/${
    userData && (marketPlaceType === "virtual" ? "store" : "marketstorepage")
  }/${uid}?shared=true`;

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (!copied) {
      console.log("Clicked");
      try {
        (await navigator.clipboard.writeText(profileLink)) &&
          console.log("copied"); // Ensure the text is copied
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Failed to copy!"); // Handle any errors during copy
        console.error("Failed to copy text: ", err);
      }
    }
  };

  return (
    <>
      <SEO
        title={`Vendor Profile - My Thrift`}
        description={`Manage your My Thrift store`}
        url={`https://www.shopmythrift.store/vendor-profile`}
      />
      <div className="font-opensans">
        {!showDetails && !showHistory && !showGuides && !profileOpen ? (
          <div className="pb-20 pt-2">
            {/* Cover Image Section */}
            <div className="p-2 flex items-center w-full">
              <div className="w-24">
                <div
                  className="relative cursor-pointer w-28 h-28 bg-cover bg-center bg-customSoftGray flex rounded-full"
                  onClick={openProfileModal}
                  style={{
                    backgroundImage: loading
                      ? "none"
                      : marketPlaceType === "virtual"
                      ? `url(${coverImageUrl})`
                      : `url(${defaultImageUrl})`,
                    backgroundSize: "cover", // Ensures the image covers the div
                    backgroundPosition: "center", // Centers the image
                    backgroundRepeat: "no-repeat",
                    width: "112px",
                    height: "112px", // Prevents repeating
                  }}
                >
                  {loading && (
                    <Skeleton
                      height={100} // Adjusted height to match the cover div height
                      width="100%"
                      className="absolute top-0 left-0 w-full h-full"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between w-96 px-3 h-full ml-2">
                <div className="text-2xl font-ubuntu font-bold capitalize mb-6">
                  {shopName}
                </div>

                <div
                  onClick={() => setIsStatsModalOpen(true)}
                  className="flex justify-between items-start w-full h-full"
                >
                  <div className="flex flex-col justify-center">
                    <p className="text-customDeepOrange text-xl font-opensans font-semibold">
                      {followersCount || 0}
                    </p>
                    <p className="text-black text-sm font-opensans">
                      Followers
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-customDeepOrange text-xl font-opensans font-semibold">
                      {likesCount || 0}
                    </p>
                    <p className="text-black text-sm font-opensans">Likes</p>
                  </div>

                  <div className="flex flex-col justify-center relative">
                    <div className="flex flex-col justify-center relative">
                      <div className="absolute inset-0 bg-white/30 backdrop-blur-md w-40 rounded-md"></div>
                      <p className="text-customDeepOrange text-xl font-opensans font-semibold relative z-10 blur-sm">
                        100
                      </p>
                      <p className="text-black text-sm font-opensans  relative z-10">
                        Pending Cart Items
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {description && (
                <div className="w-full px-2 mt-4">
                  <h1 className="text-base font-opensans text-black">
                    {description}
                  </h1>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              {/* My Activity Chart */}
              <div className=" my-4 w-full px-2">
                <div className="w-full h-14 flex">
                  <h1 className="text-base font-semibold font-opensans mx-2 translate-y-4 text-black">
                    Quick Stats
                  </h1>
                </div>
                <div className="relative bg-customOrange flex flex-col items-center rounded-xl">
                  <div className="absolute top-0 right-0">
                    <img src="./Vector.png" alt="" className="w-16 h-24" />
                  </div>
                  <div className="absolute bottom-0 left-0">
                    <img src="./Vector2.png" alt="" className="w-16 h-16" />
                  </div>
                  <div className="w-40 h-40 relative">
                    <Doughnut data={activityData} options={activityOptions} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center mt-5">
                        <p className="text-xs text-white font-opensans font-medium">
                          Total Orders
                        </p>
                        <p className="text-lg font-opensans text-white font-bold">
                          {totalOrders}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex mt-2 space-x-6 text-sm mb-3">
                    <div className="flex items-center space-x-1">
                      <span className="w-3 h-3 rounded-full bg-[#28a745]"></span>
                      <span className="font-opensans text-white">
                        Fulfilled ({fulfilledOrders})
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3 h-3 rounded-full bg-[#6c757d]"></span>
                      <span className="font-opensans text-white">
                        Unfulfilled ({unfulfilledOrders})
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-3 h-3 rounded-full bg-[#007bff]"></span>
                      <span className="font-opensans text-white">
                        Incoming ({incomingOrders})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Options */}
              <div className="w-full mt-2 px-2">
                <div className="w-full h-14 flex">
                  <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
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
                  <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
                    Data
                  </h1>
                </div>
                <div className="flex flex-col items-center w-full">
                  <div
                    className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                    onClick={() => navigate("/store-reviews")}
                  >
                    <div className="flex items-center">
                      <TbHomeStar className="text-black text-xl mr-4" />
                      <h2 className="text-size font-normal text-black capitalize">
                        View Ratings
                      </h2>
                    </div>
                    <ChevronRight className="text-black" />
                  </div>
                </div>

                <div className="w-full h-14 flex">
                  <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
                    Legal
                  </h1>
                </div>
                <div className="flex flex-col items-center w-full">
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

                  <div
                    className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                    onClick={() => setShowGuides(true)}
                  >
                    <div className="flex items-center">
                      <IoBook className="text-black text-xl mr-4" />
                      <h2 className="text-size font-normal text-black capitalize">
                        Guidelines
                      </h2>
                    </div>
                    <ChevronRight className="text-black" />
                  </div>
                </div>

                <div className="w-full h-14 flex">
                  <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
                    Beta
                  </h1>
                  <AiOutlineExperiment className="font-semibold text-lg translate-y-[14px] text-black" />
                </div>
                <div className="flex flex-col items-center w-full">
                  <div
                    className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                    onClick={() => navigate("/send-us-feedback")}
                  >
                    <div className="flex items-center">
                      <MdOutlineFeedback className="text-black text-xl mr-4" />
                      <h2 className="text-size font-normal text-black capitalize">
                        Send us your feedback! 📣
                      </h2>
                    </div>
                    <ChevronRight className="text-black" />
                  </div>
                  {/* Beta version text */}
                </div>

                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={handleLogout}
                >
                  <div className="flex items-center">
                    <PiSignOutBold className="text-red-600 text-xl mr-4" />
                    <p className="text-size text-black font-normal capitalize">
                      Sign Out
                    </p>
                  </div>
                  {isLoggingOut && (
                    <div className="flex items-center ml-auto">
                      <RotatingLines
                        strokeColor="#f9531e"
                        strokeWidth="5"
                        animationDuration="0.75"
                        width="24"
                        visible={true}
                      />
                    </div>
                  )}
                </div>
                <div className="w-full text-center mt-2">
                  <p className="text-sm font-medium text-gray-500">
                    Beta v.1.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {profileOpen && (
              <div
                className="flex flex-col p-2 h-actualScreenHeight bg-customOrange"
                style={{
                  boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.2)",
                  zIndex: "1100",
                }}
              >
                <div className="flex justify-between mt-2 mb-3">
                  <ChevronLeft
                    className="text-2xl text-white cursor-pointer"
                    onClick={() => setProfileOpen(!profileOpen)}
                  />
                </div>
                <div className="flex flex-col h-full w-full items-center justify-evenly">
                  <div className="w-[90%] p-1 rounded-2xl border-2 border-dashed border-white">
                    <div
                      className="h-[400px] w-full bg-cover bg-center bg-customSoftGray flex rounded-2xl"
                      style={{
                        backgroundImage: loading
                          ? "none"
                          : !loading && marketPlaceType === "virtual"
                          ? `url(${coverImageUrl})`
                          : `url(${defaultImageUrl})`,
                        backgroundSize: "cover", // Ensures the image covers the div
                        backgroundPosition: "center", // Centers the image
                        backgroundRepeat: "no-repeat", // Prevents repeating
                      }}
                    ></div>
                  </div>

                  {/* Share buttons */}
                  <div className="space-y-4">
                    <div className="text-white text-2xl font-medium text-center">
                      Share your store link:
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {/* Copy profile link */}
                      <button
                        className="flex justify-center items-center space-x-2 bg-white text-customOrange px-4 py-2 rounded-full shadow-md w-36"
                        onClick={copyToClipboard}
                      >
                        <PiLinkBold className="w-5 h-5" />
                        <span className="text-sm">Copy Link</span>
                      </button>
                      {/* Facebook share */}
                      <button
                        className="flex justify-center items-center space-x-2 bg-white text-customOrange px-4 py-2 rounded-full shadow-md w-36"
                        onClick={() =>
                          window.open(
                            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                              profileLink
                            )}`,
                            "_blank"
                          )
                        }
                      >
                        <FaFacebookF className="w-5 h-5" />
                        <span className="text-sm">Facebook</span>
                      </button>
                      {/* Twitter share */}
                      <button
                        className="flex justify-center items-center space-x-2 bg-white text-customOrange px-4 py-2 rounded-full shadow-md w-36"
                        onClick={() =>
                          window.open(
                            `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                              profileLink
                            )}`,
                            "_blank"
                          )
                        }
                      >
                        <FaXTwitter className="w-5 h-5" />
                        <span className="text-sm">Twitter</span>
                      </button>
                      {/* WhatsApp share */}
                      <button
                        className="flex justify-center items-center space-x-2 bg-white text-customOrange px-4 py-2 rounded-full shadow-md w-36"
                        onClick={() =>
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(
                              profileLink
                            )}`,
                            "_blank"
                          )
                        }
                      >
                        <FaWhatsapp className="w-5 h-5" />
                        <span className="text-sm">WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showDetails && (
              <VprofileDetails
                showDetails={showDetails}
                setShowDetails={setShowDetails}
              />
            )}
            {showGuides && (
              <div className="flex flex-col p-2">
                <div className="flex justify-between mt-2 mb-3">
                  <ChevronLeft
                    className="text-2xl text-black cursor-pointer"
                    onClick={() => setShowGuides(false)}
                  />
                  <h2 className="text-xl font-ubuntu">Guidelines</h2>
                  <div></div>
                </div>

                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={() => navigate("/call-guidelines")}
                >
                  <div className="flex items-center">
                    <IoIosCall className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-black capitalize">
                      Call Guidelines
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>

                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={() => navigate("/delivery-guidelines")}
                >
                  <div className="flex items-center">
                    <TbTruckDelivery className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-black capitalize">
                      Delivery Guidelines
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ReactModal
        isOpen={isProfileModalOpen}
        onRequestClose={closeProfileModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed profile-modal inset-0 bg-black bg-opacity-50"
      >
        <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md shadow-lg">
          <GoChevronLeft
            className="absolute top-4 left-4 text-black text-3xl cursor-pointer"
            onClick={closeProfileModal}
          />
          <ProfileView />
        </div>
      </ReactModal>
      <Modal
        isOpen={isStatsModalOpen}
        onRequestClose={() => setIsStatsModalOpen(false)}
        contentLabel="Account Stats"
        className="bg-white p-6 rounded-lg shadow-lg w-80 mx-auto  outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <div className="flex items-center  justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              <IoIosStats className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-sm font-semibold">
              Customer Interaction Stats
            </h2>
          </div>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={() => setIsStatsModalOpen(false)}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-opensans font-medium text-gray-700">
            <span className="font-semibold text-sm text-customDeepOrange">
              {followersCount || 0}
            </span>{" "}
            people are following your store. Followers receive email
            notifications whenever you add new products or offer discounts,
            helping to boost engagement and sales.
          </p>

          <p className="text-xs font-medium font-opensans text-gray-700">
            <span className="font-semibold text-sm text-customDeepOrange">
              {likesCount || 0}
            </span>{" "}
            times your products have been added to customer wishlists. This
            reflects buyer interest and potential future sales.
          </p>

          <p className="text-xs font-medium font-opensans text-gray-700">
            pending items in customers' carts.{" "}
            <span className="text-customOrange  italic">
              (This feature is in beta and not yet available to you.)
            </span>
          </p>
          <div className="border-t border-gray-200 translate-y-2 mt-4"></div>

          <p className="text-xs  font-opensans  text-gray-600 font-light italic">
            Having fewer followers doesn’t mean your store isn’t getting
            attention. We receive 10K+ monthly visitors browsing different
            stores.⭐
          </p>
        </div>
      </Modal>
    </>
  );
};

export default VendorProfile;

import React from "react";
import { useState, useEffect } from "react";
import Modal from "react-modal";
import toast from "react-hot-toast";
import { MdOutlineClose, MdOutlineLocalShipping } from "react-icons/md";
import {
  FaLeaf,
  FaRegCalendarCheck,
  FaBell,
  FaShieldAlt,
  FaBoxOpen,
  FaHourglassHalf,
  FaHeadset,
  FaSpinner,
} from "react-icons/fa";
import { SiFusionauth } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardCheck } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import { RiShakeHandsFill } from "react-icons/ri";
import { FcExpired } from "react-icons/fc";
import { FaShippingFast } from "react-icons/fa";
import moment from "moment"; // if you're not already importing it
import { followVendor } from "../redux/reducers/followVendor";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";
// Make sure to set the app element (for accessibility)
Modal.setAppElement("#root");

const OrderPlacedModal = ({
  showPopup,
  onRequestClose,
  isStockpile,
  currentUser, // you need to pass in the current user from the parent or context

  order,
}) => {
  const navigate = useNavigate();
  useEffect(() => {
    const checkIfFollowing = async () => {
      if (!currentUser?.uid || !order?.vendorId) return;
      try {
        const followRef = doc(
          db,
          "follows",
          `${currentUser.uid}_${order.vendorId}`
        );
        const followSnap = await getDoc(followRef);
        if (followSnap.exists()) {
          setIsFollowing(true); // The user is already following
        } else {
          setIsFollowing(false);
        }
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    };
    if (showPopup) {
      checkIfFollowing();
    }
  }, [showPopup, currentUser, order]);
  const expiryDate = order.createdAt?.seconds
    ? moment(order.createdAt.seconds * 1000)
        .add(order.stockpileDuration || 2, "weeks")
        .format("dddd, MMM Do")
    : null;

  console.log("🧡 Calculated expiry date:", expiryDate);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const handleFollowClick = async () => {
    if (!currentUser) {
      toast.error("Please log in to follow the vendor.");
      return;
    }
    try {
      setIsFollowLoading(true);

      const vendorObj = { id: order.vendorId };
      const result = await followVendor(currentUser.uid, vendorObj);

      if (result.followed) {
        toast.success(
          "You’re now following this vendor! You will be notified of new items and promos"
        );
        setIsFollowing(true);
        onRequestClose();
      } else {
        toast.success("You have unfollowed this vendor.");
        setIsFollowing(false);
      }
    } catch (error) {
      console.error("Follow/unfollow error:", error);
      toast.error(error.message);
    } finally {
      setIsFollowLoading(false);
    }
  };
  const isPickupOrder = Boolean(order?.isPickup ?? order?.userInfo?.isPickup);
  // If showPopup is false, don't render anything
  if (!showPopup) return null;
  const itemsInPile = order.cartItems?.length || 1;
  const carbonSaved = ((itemsInPile - 1) * 0.45).toFixed(2); // kg
  console.log("🟡 Items in pile:", itemsInPile);
  console.log("🟢 Carbon saved:", carbonSaved);
  // Define step-by-step instructions based on order type
  const steps = isStockpile
    ? [
        {
          icon: <FaLeaf className="text-green-600 text-2xl" />,
          title: "You're Making a Difference",
          text:
            itemsInPile > 1 ? (
              <>
                By stockpiling, you've prevented{" "}
                <span className="font-bold text-green-500">
                  {carbonSaved}kg
                </span>{" "}
                of CO₂ from entering the atmosphere. High five for going green
                🌍!
              </>
            ) : (
              `By stockpiling your order, you're helping reduce delivery emissions. Add more items to make an even bigger eco impact 🌿!`
            ),
        },
        {
          icon: <RiShakeHandsFill className="text-amber-800 text-2xl" />,
          title: "Vendor Is In",
          text: "Your pile has been received by the vendor. Feel free to keep adding more items.",
        },
        {
          icon: <FaBell className="text-yellow-500 text-2xl" />,
          title: "Never Miss a Drop",
          text: "Follow this vendor to get real-time alerts when they post new gems.",
        },
        {
          icon: <FcExpired className="text-purple-500 text-2xl" />,
          title: "Pile Expiry Date",
          text: (
            <>
              This pile is valid till{" "}
              <span className="font-bold text-customOrange">{expiryDate}</span>.
              We'll ping you when it’s almost time to ship.
            </>
          ),
        },
        {
          icon: <FaShippingFast className="text-gray-800 text-2xl" />,
          title: "You're in Control",
          text: "Want it shipped earlier? No stress. You can request dispatch anytime before the deadline.",
        },
      ]
    : [
        {
          icon: <HiOutlineClipboardCheck className="text-blue-500 text-xl" />,
          title: "Order Received",
          text: "Your order has been placed and the vendor has been notified. We will keep you in the loop.",
        },
        isPickupOrder
          ? {
              /* 🆕 slot shown ONLY for pick-up orders */
              icon: <SiFusionauth className="text-emerald-600 text-xl" />,
              title: "Pick-up Code",
              text: (
                <>
                  Your order is secured with a unique pick-up code
                  <br />
                  The vendor will soon inform you of the exact day and time your
                  items will be ready. Please keep the provided pick-up code
                  safe—you'll need it to collect your order.
                </>
              ),
            }
          : {
              /* existing fulfil-ment timeline slot */
              icon: <FaHourglassHalf className="text-yellow-500 text-xl" />,
              title: "Fulfilment Timeline",
              text: "Orders typically take 3–7 days to be fulfilled. We’re working to shorten that timeline.",
            },
        {
          icon: <FaShieldAlt className="text-green-600 text-xl" />,
          title: "Buyer Protection",
          text: "We hold a percentage of your payment. The vendor only gets paid in full once delivery is confirmed.",
        },
        {
          icon: <FaHeadset className="text-red-500 text-xl" />,
          title: "Support",
          text: "If there’s any issue with what you received, please contact our support immediately.",
        },
      ];

  return (
    <Modal
      isOpen={showPopup}
      onRequestClose={onRequestClose}
      shouldCloseOnOverlayClick={true}
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full  max-h-[90vh] rounded-t-3xl bg-white shadow-lg p-6 z-50 outline-none"
      overlayClassName="fixed inset-0 bg-black/30 backdrop-blur-xs flex justify-center items-end z-40"
      closeTimeoutMS={300}
    >
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-opensans font-bold text-customRichBrown">
                {isStockpile ? "Stockpile Confirmation" : "Order Confirmation"}
              </h2>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <MdOutlineClose
                  onClick={onRequestClose}
                  className="text-xl cursor-pointer text-gray-600"
                />
              </div>
            </div>
            <div className="border-b border-gray-200 mb-4"></div>
            <div className="space-y-4 ">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-3  bg-gray-50 px-2 py-1 rounded-lg items-start"
                >
                  <div className="pt-1">{step.icon}</div>
                  <div>
                    <p className="font-semibold font-opensans  text-base text-gray-900">
                      {step.title}
                    </p>
                    <p className="text-xs font-opensans text-gray-700 mt-1">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              {isFollowing ? (
                <button
                  onClick={() => {
                    onRequestClose(); // close the modal
                    navigate("/newhome"); // then navigate
                  }}
                  className="w-full py-3 mb-3 rounded-md font-opensans font-medium bg-customOrange text-white"
                >
                  Continue Shopping
                </button>
              ) : (
                <button
                  onClick={handleFollowClick}
                  disabled={isFollowLoading}
                  className="w-full py-3 mb-3 rounded-md font-opensans font-medium bg-customOrange text-white"
                >
                  {isFollowLoading ? (
                    <div className="flex justify-center items-center">
                      <FaSpinner className="animate-spin mr-2" />
                    </div>
                  ) : (
                    "Follow Vendor"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default OrderPlacedModal;

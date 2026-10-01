import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdOutlineClose } from "react-icons/md";
import {
  FaLeaf,
  FaRegCalendarCheck,
  FaBell,
  FaShieldAlt,
  FaHourglassHalf,
  FaHeadset,
  FaSpinner,
} from "react-icons/fa";
import { SiFusionauth } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardCheck } from "react-icons/hi";
import { RiShakeHandsFill } from "react-icons/ri";
import { FcExpired } from "react-icons/fc";
import { FaShippingFast } from "react-icons/fa";
import moment from "moment"; // if you're not already importing it
import { setVendorFollowState, getVendorFollowState } from "../services/vendorFollow";
import AppBottomSheet from "./layout/AppBottomSheet";
import { appHaptics } from "../services/haptics";
import "./Order/order-confirmation-sheet.css";

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
        const followed = await getVendorFollowState(currentUser.uid, order.vendorId);
        if (followed) {
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
  useEffect(() => {
    if (showPopup) void appHaptics.success();
  }, [showPopup]);
  const expiryDate = order.createdAt?.seconds
    ? moment(order.createdAt.seconds * 1000)
        .add(order.stockpileDuration || 2, "weeks")
        .format("dddd, MMM Do")
    : null;

  console.log("🧡 Calculated expiry date:", expiryDate);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const followMutationRef = useRef(false);
  const handleFollowClick = async () => {
    if (!currentUser) {
      toast.error("Please log in to follow the vendor.");
      return;
    }
    if (followMutationRef.current) return;

    followMutationRef.current = true;
    try {
      setIsFollowLoading(true);

      const result = await setVendorFollowState({
        userId: currentUser.uid,
        vendorId: order.vendorId,
        shouldFollow: !isFollowing,
      });

      if (result.followed) {
        toast.success(
          "You’re now following this vendor! You will be notified of new items and promos",
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
      followMutationRef.current = false;
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
    <AppBottomSheet
      open={showPopup}
      onClose={onRequestClose}
      height="88dvh"
      ariaLabel={isStockpile ? "Stockpile confirmation" : "Order confirmation"}
      surfaceClassName="order-confirmation-sheet"
      compactTop
    >
      <header className="order-confirmation-header">
        <div>
          <p>{isStockpile ? "Stockpile placed" : "Payment confirmed"}</p>
          <h2>{isStockpile ? "Stockpile confirmation" : "Order confirmation"}</h2>
        </div>
        <button type="button" onClick={onRequestClose} aria-label="Close">
          <MdOutlineClose aria-hidden="true" />
        </button>
      </header>

      <div className="order-confirmation-scroll scrollbar-hide">
        <div className="order-confirmation-success" aria-hidden="true">
          <HiOutlineClipboardCheck />
        </div>
        <p className="order-confirmation-lead">
          {isStockpile
            ? "Your order is safely in this stockpile. We’ll keep you updated as the vendor responds."
            : "Your order has been placed successfully. We’ll keep you updated at every stage."}
        </p>

        <div className="order-confirmation-steps">
          {steps.map((step, index) => (
            <article key={index} className="order-confirmation-step">
              <span>{step.icon}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <footer className="order-confirmation-actions">
        {isFollowing ? (
          <button
            type="button"
            onClick={() => {
              void appHaptics.selection();
              onRequestClose();
              navigate("/");
            }}
          >
            Continue shopping
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void appHaptics.selection();
              void handleFollowClick();
            }}
            disabled={isFollowLoading}
          >
            {isFollowLoading ? <FaSpinner className="animate-spin" /> : "Follow vendor"}
          </button>
        )}
      </footer>
    </AppBottomSheet>
  );
};

export default OrderPlacedModal;

// src/components/ChatListItem.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { fetchCustomerProfile } from "../../redux/reducers/vendorChatSlice";

const DEFAULT_AVATAR = "/default-avatar.png";

export default function ChatListItem({ inquiry }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Pull the cached profile from Redux (if it exists)
  const customerData = useSelector(
    (state) => state.vendorChats.profiles[inquiry.customerId]
  );

  // If we don’t have this customer in Redux yet, dispatch to fetch it
  React.useEffect(() => {
    if (!customerData) {
      dispatch(fetchCustomerProfile(inquiry.customerId));
    }
  }, [dispatch, inquiry.customerId, customerData]);

  // Format the timestamp
  const formattedDate = inquiry.createdAt
    ? inquiry.createdAt.toDate().toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Click handler: navigate first, then mark as read in background
  const handleClick = () => {
    // 1) Navigate immediately
    navigate(`/vchats/${inquiry.id}`);

    // 2) Fire-and-forget update to mark hasRead=true
    if (!inquiry.hasRead) {
      const inquiryRef = doc(db, "inquiries", inquiry.id);
      updateDoc(inquiryRef, { hasRead: true }).catch((error) => {
        console.error("Error marking inquiry as read:", error);
        // Optional: you could show a toast here, e.g.:
        // toast.error("Could not mark as read");
      });
    }
  };

  return (
    <div
      className="flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      {/* Avatar */}
      <img
        src={customerData?.photoURL || DEFAULT_AVATAR}
        alt="avatar"
        className="w-12 h-12 rounded-full object-cover mr-4"
      />

      {/* Name + question preview */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold font-opensans text-gray-800 truncate">
          {customerData?.displayName || "Loading…"}
        </div>
        <div className="text-sm font-opensans text-gray-600 truncate mt-1">
          {inquiry.question}
        </div>
      </div>

      {/* Timestamp + unread dot */}
      <div className="flex items-center ml-4">
        <div className="text-xs text-gray-400 font-opensans whitespace-nowrap">
          {formattedDate}
        </div>

        {/* Only show the orange dot if hasRead is false */}
        {!inquiry.hasRead && (
          <span className="w-3 h-3 bg-customOrange rounded-full ml-2" />
        )}
      </div>
    </div>
  );
}

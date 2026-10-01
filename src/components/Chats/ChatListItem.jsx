// src/components/ChatListItem.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchCustomerProfile } from "../../redux/reducers/vendorChatSlice";
import ChatAvatar from "./ChatAvatar";
import {useAuth} from "../../custom-hooks/useAuth";
import {updateLegacyInquiry} from "../../services/legacyInquiryAccess";

const DEFAULT_AVATAR = "/default-avatar.png";

export default function ChatListItem({ inquiry }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {currentUser} = useAuth();

  // Pull the cached profile from Redux (if it exists)
  const customerData = useSelector(
    (state) => state.vendorChats.ownerUid === currentUser?.uid ? state.vendorChats.profiles[inquiry.customerId] : null
  );

  // If we don’t have this customer in Redux yet, dispatch to fetch it
  React.useEffect(() => {
    if (!customerData) {
      dispatch(fetchCustomerProfile({customerId: inquiry.customerId, inquiryId: inquiry.id}));
    }
  }, [dispatch, inquiry.customerId, inquiry.id, currentUser?.uid, customerData]);

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
      updateLegacyInquiry(inquiry.id, "read").catch((error) => {
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
      <ChatAvatar src={customerData?.photoURL} className="mr-4 h-12 w-12" />

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

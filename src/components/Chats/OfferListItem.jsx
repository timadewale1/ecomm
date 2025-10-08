// src/components/Chats/OfferListItem.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { fetchCustomerProfile } from "../../redux/reducers/vendorChatSlice";
import { IoMdContact } from "react-icons/io";

const NGN = (n) =>
  Number(n || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

const StatusPill = ({ status }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    countered: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-opensans font-semibold ${cls}`}>
      {status}
    </span>
  );
};

export default function OfferListItem({ offer }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Reuse your customer profile fetcher (buyer is a user)
  const buyer = useSelector(
    (s) => s.vendorChats.profiles[offer.buyerId]
  );
  React.useEffect(() => {
    if (!buyer) dispatch(fetchCustomerProfile(offer.buyerId));
  }, [buyer, offer.buyerId, dispatch]);

  const createdAt = offer.createdAt
    ? offer.createdAt.toDate().toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const defaultMsg = `I want to get this item for ${NGN(offer.amount)}`;

  const handleClick = () => {
    // Go to your vendor offer detail page (adjust route if different)
    navigate(`/vchats/${offer.id}?type=offer`);

    // mark as read (vendor side) in the background
    if (!offer.vendorRead) {
      updateDoc(doc(db, "offers", offer.id), { vendorRead: true }).catch((e) =>
        console.error("mark vendorRead failed:", e)
      );
    }
  };

  return (
    <div
      className="flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      {/* Avatar */}
      {buyer?.photoURL ? (
        <img
          src={buyer.photoURL}
          alt="avatar"
          className="w-12 h-12 rounded-full object-cover mr-4"
        />
      ) : (
        <IoMdContact className="w-12 h-12 text-gray-400 mr-4" />
      )}

      {/* Product + message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold font-opensans text-gray-800 truncate">
            {buyer?.displayName || "Loading…"}
          </div>
          <StatusPill status={offer.status} />
        </div>

        <div className="text-sm font-opensans text-gray-600 truncate mt-0.5">
          {offer.productName || "Product"} • {defaultMsg}
        </div>
      </div>

      {/* Time + unread dot */}
      <div className="flex items-center ml-4">
        <div className="text-xs text-gray-400 font-opensans whitespace-nowrap">
          {createdAt}
        </div>
        {!offer.vendorRead && (
          <span className="w-3 h-3 bg-customOrange rounded-full ml-2" />
        )}
      </div>
    </div>
  );
}

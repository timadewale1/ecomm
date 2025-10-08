// src/components/Offers/OfferListItem.jsx
import React from "react";
import { PiArrowsCounterClockwiseFill } from "react-icons/pi";
const NGN = (n) =>
  Number(n || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

export default function OfferListItem({ offer, onClick }) {
  const updated = offer.updatedAt?.toDate
    ? offer.updatedAt.toDate()
    : null;

  return (
    <div
      className="flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <img
        src={offer.productCover || "/placeholder.png"}
        alt="product"
        className="w-14 h-14 rounded-lg object-cover mr-3 flex-shrink-0"
      />

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <div className="font-opensans font-semibold text-gray-900 truncate">
          {offer.productName || "Item"}
        </div>

        {/* Price row */}
        <div className="text-sm font-opensans text-gray-700 mt-0.5 flex items-center gap-2">
          <span className="line-through text-gray-400">{NGN(offer.listPrice)}</span>
          <span className="font-semibold">{NGN(offer.amount)}</span>
          {offer.status === "countered" && offer.counterAmount ? (
            <>
             <PiArrowsCounterClockwiseFill className="text-blue-500"/>
              <span className="font-semibold">{NGN(offer.counterAmount)}</span>
            </>
          ) : null}
        </div>

        {/* Vendor */}
        <div className="text-xs text-gray-500 font-opensans mt-0.5 truncate">
          {offer.vendorShopName || "Vendor"}
        </div>
      </div>

      {/* Right: status + time + unread */}
      <div className="ml-3 text-right">
        <div
          className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-opensans ${
            offer.status === "accepted"
              ? "bg-green-100 text-green-800"
              : offer.status === "declined"
              ? "bg-red-100 text-red-800"
              : offer.status === "countered"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {offer.status}
        </div>
        <div className="text-[11px] text-gray-400 font-opensans mt-1">
          {updated
            ? updated.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </div>

        {!offer.buyerRead && (
          <span className="inline-block w-2.5 h-2.5 bg-customOrange rounded-full mt-1 ml-auto" />
        )}
      </div>
    </div>
  );
}

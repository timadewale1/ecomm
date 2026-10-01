// src/components/Chats/OfferListItem.jsx
import React from "react";
import ChatAvatar from "./ChatAvatar";
import useConversationAvatar from "../../custom-hooks/useConversationAvatar";

const statusFromEvent = (type) => {
  const map = {
    offer_placed: ["Pending", "bg-amber-50 text-amber-800"],
    offer_revised: ["Pending", "bg-amber-50 text-amber-800"],
    offer_countered: ["Countered", "bg-sky-50 text-sky-800"],
    offer_accepted: ["Accepted", "bg-emerald-50 text-emerald-800"],
    offer_declined: ["Declined", "bg-rose-50 text-rose-800"],
    offer_expired: ["Expired", "bg-slate-100 text-slate-700"],
    offer_superseded: ["Updated", "bg-slate-100 text-slate-700"],
    text: ["Message", "bg-orange-50 text-orange-700"],
    question_asked: ["Question", "bg-violet-50 text-violet-700"],
  };
  return map[type] || ["Offer", "bg-gray-100 text-gray-700"];
};

const formatActivityTime = (value) => {
  const millis = typeof value?.toMillis === "function" ? value.toMillis() : Number(value || 0);
  if (!millis) return "";
  return new Date(millis).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OfferListItem({
  conversation,
  onClick,
  now = Date.now(),
  audience = "vendor",
}) {
  const avatarSource = useConversationAvatar(conversation, audience);
  const counterpart =
    audience === "buyer" ? conversation?.vendor || {} : conversation?.buyer || {};
  const latestEvent = conversation?.latestEvent || {};
  const latestExpired =
    ["offer_countered", "offer_accepted"].includes(latestEvent.type) &&
    Number(latestEvent.validUntilMs || 0) > 0 &&
    Number(latestEvent.validUntilMs) <= now;
  const [statusLabel, statusClass] = statusFromEvent(
    latestExpired ? "offer_expired" : latestEvent.type,
  );
  const unreadCount = Number(
    audience === "buyer"
      ? conversation?.buyerUnreadCount || 0
      : conversation?.vendorUnreadCount || 0,
  );
  const preview =
    conversation?.latestEvent?.preview ||
    conversation?.latestProduct?.name ||
    "Offer activity";

  return (
    <button
      type="button"
      className="flex w-full items-center border-b border-gray-100 bg-white p-3 text-left transition-colors hover:bg-gray-50"
      onClick={onClick}
    >
      <ChatAvatar src={avatarSource} className="mr-3 h-12 w-12" />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <strong className="truncate font-satoshi text-[15px] font-semibold text-gray-900">
            {counterpart.displayName || (audience === "buyer" ? "Vendor" : "Buyer")}
          </strong>
          <span className={`rounded-full px-2 py-0.5 font-satoshi text-[10px] font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </span>
        <span className="mt-0.5 block truncate font-satoshi text-[13px] text-gray-600">
          {preview}
        </span>
      </span>

      <span className="ml-3 flex flex-col items-end gap-1">
        <time className="whitespace-nowrap font-satoshi text-[11px] text-gray-400">
          {formatActivityTime(conversation?.latestActivityAt)}
        </time>
        {unreadCount > 0 && (
          <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-customOrange px-1 font-satoshi text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
    </button>
  );
}

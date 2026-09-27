// src/pages/VendorChatList.jsx
import React, { useEffect, useState } from "react";
import OfferListItem from "../../components/Chats/OfferListItem";
import { useLocation, useNavigate } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import NoMessage from "../../components/Loading/NoMessage";
import SEO from "../../components/Helmet/SEO";
import { useSelector } from "react-redux";
import {
  selectOfferConversations,
  selectOfferConversationsStatus,
} from "../../redux/reducers/offerConversationsSlice";
import { appHaptics } from "../../services/haptics";
import { hydrateMyOfferConversations } from "../../services/offerConversations";
import AppPageHeader from "../../components/layout/AppPageHeader";
import { useAuth } from "../../custom-hooks/useAuth";

const EMPTY_CONVERSATIONS = [];

const OfferConversationSkeleton = () => (
  <div className="animate-pulse" aria-label="Loading conversations" aria-busy="true">
    {[0, 1, 2, 3].map((row) => (
      <div className="flex items-center gap-3 border-b border-gray-100 p-3" key={row}>
        <span className="h-12 w-12 flex-none rounded-full bg-gray-200" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block h-3.5 w-2/5 rounded bg-gray-200" />
          <span className="block h-3 w-3/4 rounded bg-gray-100" />
        </span>
      </div>
    ))}
  </div>
);

export default function VendorChatList() {
  const { currentUser, loading: authLoading } = useAuth();
  const uid = currentUser?.uid;
  const offerConversations = useSelector(selectOfferConversations);
  const offerConversationsStatus = useSelector(selectOfferConversationsStatus);
  const ownsInbox = useSelector((state) =>
    Boolean(uid && state.offerConversations.ownerUid === uid && state.offerConversations.ownerRole === "vendor"),
  );
  const conversations = ownsInbox ? offerConversations : EMPTY_CONVERSATIONS;
  const inboxStatus = ownsInbox ? offerConversationsStatus : "connecting";
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !uid || inboxStatus !== "ready") return;
    const key = `mythrift:offer-conversations-hydrated:v2:${uid}:vendor`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Chat remains usable when WebView storage is unavailable.
    }
    hydrateMyOfferConversations().catch((error) => {
      try { sessionStorage.removeItem(key); } catch { /* Best-effort session cache. */ }
      console.warn("[vendor-offers] historical hydration failed", error);
    });
  }, [authLoading, uid, inboxStatus]);

  useEffect(() => {
    if (!authLoading && !uid) {
      navigate("/vendorlogin", {
        replace: true,
        state: {returnTo: `${location.pathname}${location.search}`},
      });
    }
  }, [authLoading, uid, location.pathname, location.search, navigate]);

  const filteredConversations = React.useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation?.buyer?.displayName,
        conversation?.latestEvent?.preview,
        conversation?.latestProduct?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [conversations, searchTerm]);

  return (
    <>
      <SEO
        title={`Messages - My Thrift`}
        description={`Manage and view your chats and offers.`}
        url={`https://www.shopmythrift.store/vchats`}
      />

      <div className="mx-auto flex h-[100dvh] w-full max-w-xl flex-col bg-white pb-[calc(78px+env(safe-area-inset-bottom))] font-satoshi">
        <AppPageHeader
          title="Messages"
          showBack={false}
          className="vendor-section-header"
        />

        {/* SEARCH */}
        <div className="px-4 py-2 bg-white border-gray-100 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search chats..."
              aria-label="Search chats"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 pr-11 text-[15px] outline-none transition focus:border-customOrange focus:bg-white focus:ring-2 focus:ring-orange-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* LIST */}
        <div className="min-h-0 flex-1 overflow-auto">
          {filteredConversations.length === 0 &&
            ["idle", "connecting"].includes(inboxStatus) ? (
              <OfferConversationSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <NoMessage />
                <p className="font-satoshi text-xs text-center text-gray-600">
                  {inboxStatus === "error"
                    ? "We couldn’t load your chats. Check your connection and try again."
                    : searchTerm.trim()
                      ? "No chats match your search."
                      : "You don’t have any chats yet. Offers and verified product questions will appear here."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <OfferListItem
                  key={conversation.id}
                  conversation={conversation}
                  now={now}
                  onClick={() => {
                    appHaptics.selection();
                    navigate(`/offer-conversations/${conversation.id}`);
                  }}
                />
              ))
            )
          }
        </div>
      </div>
    </>
  );
}

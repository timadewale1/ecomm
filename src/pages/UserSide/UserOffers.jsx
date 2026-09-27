import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search } from "lucide-react";
import AppPageHeader from "../../components/layout/AppPageHeader";
import OfferListItem from "./UserOfferListItem";
import ConversationListItem from "../../components/Chats/OfferListItem";
import SEO from "../../components/Helmet/SEO";
import { useAuth } from "../../custom-hooks/useAuth";
import useNativePageRefresh from "../../custom-hooks/useNativePageRefresh";
import {
  selectBuyerOffers,
  selectBuyerOffersStatus,
} from "../../redux/reducers/buyerOffersSlice";
import {
  selectOfferConversations,
  selectOfferConversationsStatus,
} from "../../redux/reducers/offerConversationsSlice";
import { refreshBuyerOffersFromServer } from "../../services/realtime/userRealtimeSync";
import { appHaptics } from "../../services/haptics";
import { isOfferExpired } from "../../services/offerExpiry";
import useHorizontalTabSwipe from "../../custom-hooks/useHorizontalTabSwipe";
import {
  ensureOfferConversation,
  hydrateMyOfferConversations,
} from "../../services/offerConversations";
import toast from "react-hot-toast";
import "./user-offers.css";

const TABS = [
  ["pending", "Pending"],
  ["accepted", "Accepted"],
  ["countered", "Countered"],
  ["declined", "Declined"],
];

const offerActivityTime = (offer) =>
  Number(
    offer?.updatedAt ||
      offer?.counteredAt ||
      offer?.acceptedAt ||
      offer?.declinedAt ||
      offer?.createdAt ||
      0
  );

const offerRound = (offer) => {
  const value = Number(offer?.round || 0);
  return Number.isFinite(value) ? value : 0;
};

const shouldReplaceThreadOffer = (current, candidate) => {
  const currentRound = offerRound(current);
  const candidateRound = offerRound(candidate);
  if (candidateRound !== currentRound) return candidateRound > currentRound;

  const currentSuperseded =
    String(current?.status || "").toLowerCase() === "superseded";
  const candidateSuperseded =
    String(candidate?.status || "").toLowerCase() === "superseded";
  if (currentSuperseded !== candidateSuperseded) return !candidateSuperseded;

  return offerActivityTime(candidate) > offerActivityTime(current);
};

const offerDisplayTab = (offer) => {
  const status = String(offer?.status || "pending").toLowerCase();
  if (status === "expired" || status === "sold") {
    const previousStatus = String(offer?.previousStatus || "").toLowerCase();
    return ["pending", "accepted", "countered", "declined"].includes(
      previousStatus,
    )
      ? previousStatus
      : "pending";
  }
  if (status === "superseded") return "pending";
  return status;
};

const OffersListSkeleton = () => (
  <div className="offers-redux-skeleton" aria-label="Loading offers" aria-busy="true">
    {[0, 1, 2].map((item) => (
      <div className="offers-redux-skeleton-row" key={item}>
        <span className="offers-redux-skeleton-image" />
        <span className="offers-redux-skeleton-lines">
          <span />
          <span />
          <span />
        </span>
      </div>
    ))}
  </div>
);

export default function UserOffers() {
  const location = useLocation();
  const offers = useSelector(selectBuyerOffers);
  const offersStatus = useSelector(selectBuyerOffersStatus);
  const conversations = useSelector(selectOfferConversations);
  const conversationsStatus = useSelector(selectOfferConversationsStatus);
  const [view, setView] = useState(() => {
    const requestedView = new URLSearchParams(location.search).get("view");
    if (requestedView === "chats") return "chats";
    return localStorage.getItem("userOffersView") === "chats" ? "chats" : "offers";
  });
  const [now, setNow] = useState(Date.now());
  const [openingThreadKey, setOpeningThreadKey] = useState(null);
  const openingThreadRef = useRef(false);
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem("userOffersTab");
    return TABS.some(([key]) => key === saved) ? saved : "countered";
  });
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    localStorage.setItem("userOffersTab", tab);
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("userOffersView", view);
  }, [view]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("view") === "chats") {
      setView("chats");
    }
  }, [location.search]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (
      !currentUser?.uid ||
      conversationsStatus !== "ready"
    ) return;
    const key = `mythrift:offer-conversations-hydrated:v2:${currentUser.uid}:buyer`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    hydrateMyOfferConversations().catch((error) => {
      sessionStorage.removeItem(key);
      console.warn("[buyer-offers] historical hydration failed", error);
    });
  }, [conversationsStatus, currentUser?.uid]);

  const refreshOffers = useCallback(async () => {
    if (!currentUser?.uid) return;
    await refreshBuyerOffersFromServer(currentUser.uid);
  }, [currentUser?.uid]);

  useNativePageRefresh(refreshOffers, {
    enabled: Boolean(currentUser?.uid),
    verticalOffset: 112,
  });

  const groupedThreads = useMemo(() => {
    const threads = new Map();
    for (const offer of offers) {
      const key = `${offer.vendorId || "v"}__${offer.productId || "p"}`;
      const current = threads.get(key);
      if (!current) {
        threads.set(key, {
          threadKey: key,
          vendorId: offer.vendorId,
          productId: offer.productId,
          latest: offer,
        });
        continue;
      }
      if (shouldReplaceThreadOffer(current.latest, offer)) current.latest = offer;
    }

    return Array.from(threads.values()).sort(
      (a, b) => offerActivityTime(b.latest) - offerActivityTime(a.latest)
    );
  }, [offers]);

  const filtered = useMemo(
    () => groupedThreads.filter(({ latest }) => offerDisplayTab(latest) === tab),
    [groupedThreads, tab],
  );

  const openThread = async (thread) => {
    if (!thread?.latest?.id || openingThreadRef.current) return;
    openingThreadRef.current = true;
    setOpeningThreadKey(thread.threadKey);
    appHaptics.selection();
    try {
      const conversationId = await ensureOfferConversation(thread.latest.id, {
        vendorId: thread.latest.vendorId,
        buyerId: currentUser?.uid,
      });
      if (!conversationId) throw new Error("Conversation unavailable");
      navigate(
        `/offer-conversations/${conversationId}?focusOffer=${encodeURIComponent(thread.latest.id)}`,
      );
    } catch (error) {
      console.error("[offers] conversation open failed", error);
      toast.error("This offer conversation could not be opened. Please try again.");
    } finally {
      openingThreadRef.current = false;
      setOpeningThreadKey(null);
    }
  };

  const openProductAction = (offer, action) => {
    if (!offer?.productId) return;
    const expired = isOfferExpired(offer);
    const status = String(offer.status || "").toLowerCase();
    const offerPrice =
      !expired && status === "countered"
        ? Number(offer.counterAmount)
        : !expired && status === "accepted"
          ? Number(offer.amount)
          : null;
    navigate(`/product/${offer.productId}`, {
      state: {
        ...(Number.isFinite(offerPrice) ? { offerPrice } : {}),
        offerAction: action,
        returnTo: "/offers",
      },
    });
  };

  const handleTabChange = useCallback((nextTab) => {
    if (tab === nextTab) return;
    appHaptics.selection();
    setTab(nextTab);
  }, [tab]);

  const handleViewChange = useCallback((nextView) => {
    if (view === nextView) return;
    appHaptics.selection();
    setView(nextView);
  }, [view]);

  const offerTabSwipeHandlers = useHorizontalTabSwipe({
    tabs: TABS.map(([key]) => key),
    activeTab: tab,
    onChange: handleTabChange,
  });

  return (
    <>
      <SEO
        title="My Offers – My Thrift"
        description="Track your offers and vendor responses."
        url="https://www.shopmythrift.store/offers"
      />
      <main
        {...(view === "offers" ? offerTabSwipeHandlers : {})}
        className="offers-page app-horizontal-tab-swipe"
      >
        <AppPageHeader
          title="My Offers"
          onBack={() => navigate("/profile")}
          className="offers-header"
          rightAction={
            <button type="button" onClick={() => navigate("/search")} aria-label="Search">
              <Search aria-hidden="true" />
            </button>
          }
        >
          <div className="offers-navigation">
            <nav className="offers-primary-tabs" aria-label="Offers and chats">
              <button
                type="button"
                className={view === "offers" ? "is-active" : ""}
                onClick={() => handleViewChange("offers")}
              >
                Offers
              </button>
              <button
                type="button"
                className={view === "chats" ? "is-active" : ""}
                onClick={() => handleViewChange("chats")}
              >
                Chats
                {conversations.reduce(
                  (total, item) => total + Number(item.buyerUnreadCount || 0),
                  0,
                ) > 0 && <span className="offers-chat-unread" aria-label="Unread chats" />}
              </button>
            </nav>
            {view === "offers" && (
              <nav className="offers-tabs" aria-label="Offer status">
                {TABS.map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    className={tab === key ? "is-active" : ""}
                    onClick={() => handleTabChange(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </AppPageHeader>

        <section className="offers-list" aria-live="polite">
          {view === "chats" ? (
            conversations.length === 0 &&
            ["idle", "connecting"].includes(conversationsStatus) ? (
              <OffersListSkeleton />
            ) : conversations.length === 0 ? (
              <div className="offers-empty">Your vendor chats and product questions will appear here.</div>
            ) : (
              <div className="offers-chat-list">
                {conversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    audience="buyer"
                    now={now}
                    onClick={() => {
                      appHaptics.selection();
                      navigate(`/offer-conversations/${conversation.id}`);
                    }}
                  />
                ))}
              </div>
            )
          ) : offers.length === 0 &&
          (offersStatus === "idle" || offersStatus === "connecting") ? (
            <OffersListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="offers-empty">Nothing here yet.</div>
          ) : (
            filtered.map((thread) => (
              <OfferListItem
                key={thread.threadKey}
                offer={thread.latest}
                now={now}
                loading={openingThreadKey === thread.threadKey}
                disabled={Boolean(openingThreadKey)}
                onClick={() => openThread(thread)}
                onBuyNow={() => openProductAction(thread.latest, "buy")}
                onSendOffer={() => openProductAction(thread.latest, "offer")}
              />
            ))
          )}
        </section>
      </main>
    </>
  );
}

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  Reply,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { db } from "../firebase.config";
import { useAuth } from "../custom-hooks/useAuth";
import useConversationAvatar from "../custom-hooks/useConversationAvatar";
import AppPageHeader from "../components/layout/AppPageHeader";
import AppBottomSheet from "../components/layout/AppBottomSheet";
import ChatAvatar from "../components/Chats/ChatAvatar";
import SEO from "../components/Helmet/SEO";
import { appHaptics } from "../services/haptics";
import {
  createClientMessageId,
  acknowledgeOfferConversationSafety,
  actOnOfferConversation,
  markOfferConversationRead,
  reportOfferConversationMessage,
  sendOfferConversationMessage,
  setOfferConversationBlocked,
  touchOfferConversationPresence,
  repairOfferConversationAvatars,
} from "../services/offerConversations";
import "./offer-conversation.css";
import { useAppExperience } from "../components/Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../services/appExperience";

const PAGE_SIZE = 30;
const PRESENCE_ACTIVE_WINDOW_MS = 2 * 60 * 1000;

const currency = (value) =>
  Number(value || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

const eventMillis = (event) => {
  const value = event?.createdAt;
  if (typeof value?.toMillis === "function") return value.toMillis();
  return Number(value || 0);
};

const formatTime = (event) => {
  const millis = eventMillis(event);
  if (!millis) return "";
  return new Date(millis).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const presenceLabel = (lastActiveAt, now) => {
  const millis = timestampToMillis(lastActiveAt);
  if (!millis) return "My Thrift chat";
  const elapsed = Math.max(0, now - millis);
  if (elapsed <= PRESENCE_ACTIVE_WINDOW_MS) return "Active now";
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${new Date(millis).toLocaleDateString([], {month: "short", day: "numeric"})}`;
};

const mergeEvents = (...collections) => {
  const byId = new Map();
  collections.flat().forEach((event) => {
    if (event?.id) byId.set(event.id, event);
  });
  return Array.from(byId.values()).sort((a, b) => eventMillis(a) - eventMillis(b));
};

const offerStatusLabel = {
  offer_placed: "Offer placed",
  offer_revised: "Offer updated",
  offer_countered: "Vendor countered",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  offer_expired: "Offer expired",
  offer_superseded: "Replaced by a newer offer",
};

function SwipeableMessage({
  event,
  mine,
  seen,
  replyAuthorName,
  onReply,
  onOptions,
}) {
  const [offset, setOffset] = useState(0);
  const gestureRef = useRef(null);

  const onPointerDown = (pointerEvent) => {
    if (pointerEvent.pointerType === "mouse" && pointerEvent.button !== 0) return;
    gestureRef.current = {
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      horizontal: null,
    };
    pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
  };

  const onPointerMove = (pointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    const dx = pointerEvent.clientX - gesture.startX;
    const dy = pointerEvent.clientY - gesture.startY;
    if (gesture.horizontal == null && Math.max(Math.abs(dx), Math.abs(dy)) > 7) {
      gesture.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!gesture.horizontal) return;
    if (dx < 0) {
      pointerEvent.preventDefault();
      setOffset(Math.max(-72, dx));
    }
  };

  const finishGesture = () => {
    if (offset <= -46) {
      appHaptics.selection();
      onReply?.(event);
    }
    gestureRef.current = null;
    setOffset(0);
  };

  return (
    <div className={`offer-chat-message-shell ${mine ? "is-mine" : "is-theirs"}`}>
      <div
        className={`offer-chat-message ${mine ? "is-mine" : "is-theirs"}`}
        style={{transform: `translateX(${offset}px)`}}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
      >
        <div>
          {event.replyTo?.text && (
            <button
              type="button"
              className="offer-chat-reply-quote"
              onClick={() =>
                document
                  .querySelector(`[data-message-id="${CSS.escape(event.replyTo.eventId)}"]`)
                  ?.scrollIntoView({behavior: "smooth", block: "center"})
              }
            >
              <span>{replyAuthorName || "Message"}</span>
              {event.replyTo.text}
            </button>
          )}
          {event.replyToQuestion?.question && (
            <button
              type="button"
              className="offer-chat-reply-quote offer-chat-question-quote"
              onClick={() =>
                document
                  .querySelector(
                    `[data-question-id="${CSS.escape(
                      event.replyToQuestion.eventId,
                    )}"]`,
                  )
                  ?.scrollIntoView({behavior: "smooth", block: "center"})
              }
            >
              <span>Answer to product question</span>
              {event.replyToQuestion.question}
            </button>
          )}
          <p>{event.text}</p>
          <time>{formatTime(event)}</time>
          {seen && <small className="offer-chat-seen">Seen</small>}
        </div>
        {!mine && (
          <button type="button" aria-label="Message options" onClick={() => onOptions(event)}>
            <MoreHorizontal aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionEventCard({
  event,
  role,
  answered,
  focused,
  onReply,
  onViewProduct,
}) {
  const product = event.product || {};
  const titleId = `question-title-${event.id}`;
  const bodyId = `question-body-${event.id}`;
  return (
    <article
      data-question-id={event.id}
      className={`offer-chat-question-card ${focused ? "is-focused" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <div className="offer-chat-question-heading">
        <span aria-hidden="true"><CircleHelp /></span>
        <div>
          <small>Product question</small>
          <strong id={titleId}>{product.name || "Product"}</strong>
        </div>
      </div>
      <button
        type="button"
        className="offer-chat-question-product"
        onClick={() => onViewProduct(event)}
        aria-label={`View ${product.name || "product"}`}
      >
        <img src={product.imageUrl || "/placeholder.png"} alt="" />
        <span>View product</span>
      </button>
      <p id={bodyId}>{event.question}</p>
      <time>{formatTime(event)}</time>
      {role === "vendor" && !answered && (
        <button
          type="button"
          className="offer-chat-question-reply"
          onClick={() => onReply(event)}
          aria-label={`Reply to question about ${product.name || "this product"}`}
        >
          <Reply aria-hidden="true" />
          <span>
            <strong>Reply to question</strong>
            <small>Your next message will be sent as this answer</small>
          </span>
        </button>
      )}
      {answered && (
        <span className="offer-chat-question-answered">
          <Check aria-hidden="true" /> Answered
        </span>
      )}
    </article>
  );
}

function OfferEventCard({
  event,
  latestForOffer,
  role,
  focused,
  onAction,
  now,
  actionBusy,
  busyAction,
}) {
  const product = event.product || {};
  const isPlaced = ["offer_placed", "offer_revised"].includes(event.type);
  const isActionable =
    isPlaced &&
    ["offer_placed", "offer_revised"].includes(latestForOffer?.type) &&
    latestForOffer?.id === event.id &&
    event.offerStatus === "pending";
  const hasExpired =
    ["offer_countered", "offer_accepted"].includes(event.type) &&
    Number(event.validUntilMs || 0) > 0 &&
    Number(event.validUntilMs) <= now;
  const buyerCanBuy =
    role === "buyer" &&
    latestForOffer?.id === event.id &&
    ["offer_countered", "offer_accepted"].includes(event.type) &&
    !hasExpired;
  const isLoadingAction = (action) =>
    busyAction?.offerId === event.offerId && busyAction?.action === action;

  if (!isPlaced) {
    return (
      <article
        data-offer-id={event.offerId}
        className={`offer-chat-status-event offer-chat-status-event--${
          hasExpired ? "offer_expired" : event.type
        } ${
          focused ? "is-focused" : ""
        }`}
      >
        <span className="offer-chat-status-icon">
          {event.type === "offer_declined" ||
          event.type === "offer_expired" ||
          event.type === "offer_superseded" ||
          hasExpired ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
        </span>
        <div>
          <strong>
            {event.type === "offer_expired" &&
            ["PRODUCT_SOLD", "product_sold"].includes(event.reasonCode)
              ? "Item sold"
              : hasExpired
              ? offerStatusLabel.offer_expired
              : offerStatusLabel[event.type] || "Offer updated"}
          </strong>
          <p>
            {event.type === "offer_countered" && event.counterAmount
              ? `${product.name || "Item"} · ${currency(event.counterAmount)}`
              : product.name || "Item"}
          </p>
          <time>{formatTime(event)}</time>
        </div>
        {buyerCanBuy && (
          <button type="button" onClick={() => onAction("buy", event)} disabled={actionBusy}>
            View item
          </button>
        )}
      </article>
    );
  }

  return (
    <article
      data-offer-id={event.offerId}
      className={`offer-chat-offer-card ${focused ? "is-focused" : ""}`}
    >
      <button
        type="button"
        className="offer-chat-product"
        onClick={() => onAction("product", event)}
      >
        <img src={product.imageUrl || "/placeholder.png"} alt="" />
        <span>
          <strong>{product.name || "Product"}</strong>
          <small>{event.round ? `Offer round ${event.round}` : "Offer"}</small>
        </span>
      </button>
      <div className="offer-chat-prices">
        {product.listPrice ? <s>{currency(product.listPrice)}</s> : null}
        <strong>{currency(event.amount)}</strong>
      </div>
      <p>I’d like to get this item for {currency(event.amount)}.</p>
      <time>{formatTime(event)}</time>
      {role === "vendor" && isActionable && (
        <div className="offer-chat-actions">
          <button type="button" onClick={() => onAction("decline", event)} disabled={actionBusy}>
            {isLoadingAction("decline") ? <Loader2 className="is-spinning" aria-hidden="true" /> : "Decline"}
          </button>
          <button type="button" onClick={() => onAction("counter", event)} disabled={actionBusy}>
            Counter
          </button>
          <button type="button" className="is-primary" onClick={() => onAction("accept", event)} disabled={actionBusy}>
            {isLoadingAction("accept") ? <Loader2 className="is-spinning" aria-hidden="true" /> : "Accept"}
          </button>
        </div>
      )}
    </article>
  );
}

export default function OfferConversation() {
  const {conversationId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {currentUser, currentUserData, loading: authLoading} = useAuth();
  const {experience} = useAppExperience();
  const [conversation, setConversation] = useState(null);
  const [latestEvents, setLatestEvents] = useState([]);
  const [olderEvents, setOlderEvents] = useState([]);
  const [oldestCursor, setOldestCursor] = useState(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [pickupContexts, setPickupContexts] = useState([]);
  const [pickupSecrets, setPickupSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [pendingMessages, setPendingMessages] = useState([]);
  const [menuEvent, setMenuEvent] = useState(null);
  const [counterEvent, setCounterEvent] = useState(null);
  const [counterValue, setCounterValue] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyingToQuestion, setReplyingToQuestion] = useState(null);
  const [moderationBusy, setModerationBusy] = useState(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [rememberSafety, setRememberSafety] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const safetyPresentedRef = useRef(false);
  const actionLockRef = useRef(false);
  const pickupHighlightTimerRef = useRef(null);
  const [highlightedPickupId, setHighlightedPickupId] = useState(null);
  const focusOfferId = new URLSearchParams(location.search).get("focusOffer");
  const focusQuestionId = new URLSearchParams(location.search).get("focusQuestion");

  const role = useMemo(() => {
    if (!currentUser?.uid || !conversation) return null;
    if (conversation.buyerId === currentUser.uid) return "buyer";
    if (conversation.vendorId === currentUser.uid) return "vendor";
    return null;
  }, [conversation, currentUser?.uid]);

  const counterpart = role === "vendor" ? conversation?.buyer : conversation?.vendor;
  const avatarSource = useConversationAvatar(conversation, role);
  useEffect(() => {
    if (role && conversation) {
      repairOfferConversationAvatars([{...conversation, id: conversationId}]);
    }
  }, [conversation, conversationId, role]);
  const participantName = useCallback(
    (actorRole) =>
      conversation?.[actorRole]?.displayName ||
      (actorRole === "vendor" ? "Vendor" : "Buyer"),
    [conversation],
  );
  const orderedPickupContexts = useMemo(
    () =>
      [...pickupContexts].sort(
        (left, right) =>
          timestampToMillis(left.updatedAt || left.createdAt) -
          timestampToMillis(right.updatedAt || right.createdAt),
      ),
    [pickupContexts],
  );
  const lastPickupContext = orderedPickupContexts.at(-1) || null;
  const allEvents = useMemo(
    () => mergeEvents(olderEvents, latestEvents),
    [latestEvents, olderEvents],
  );
  const latestByOffer = useMemo(() => {
    const map = new Map();
    allEvents.forEach((event) => {
      if (event.offerId) map.set(event.offerId, event);
    });
    return map;
  }, [allEvents]);
  const answeredQuestionIds = useMemo(
    () =>
      new Set(
        allEvents
          .map((event) => event.replyToQuestion?.eventId)
          .filter(Boolean),
      ),
    [allEvents],
  );
  const lastOwnTextEvent = useMemo(
    () => [...allEvents].reverse().find(
      (event) => event.type === "text" && event.senderId === currentUser?.uid,
    ),
    [allEvents, currentUser?.uid],
  );
  const counterpartLastReadAt =
    role === "buyer" ? conversation?.vendorLastReadAt : conversation?.buyerLastReadAt;
  const counterpartLastActiveAt =
    role === "buyer" ? conversation?.vendorLastActiveAt : conversation?.buyerLastActiveAt;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (pickupHighlightTimerRef.current) {
        window.clearTimeout(pickupHighlightTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const height = viewport?.height || window.innerHeight;
      document.documentElement.style.setProperty(
        "--offer-chat-viewport-height",
        `${Math.round(height)}px`,
      );
      if (document.activeElement === inputRef.current) {
        window.requestAnimationFrame(() => {
          scrollerRef.current?.scrollTo({top: scrollerRef.current.scrollHeight});
        });
      }
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      document.documentElement.style.removeProperty("--offer-chat-viewport-height");
    };
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!currentUser?.uid) {
      navigate(experience === APP_EXPERIENCE.VENDOR ? "/vendorlogin" : "/login", {
        replace: true,
        state: {returnTo: location.pathname + location.search},
      });
      return undefined;
    }
    const ref = doc(db, "offerConversations", conversationId);
    return onSnapshot(
      ref,
      (snapshot) => {
        setConversation(snapshot.exists() ? {id: snapshot.id, ...snapshot.data()} : null);
        setLoading(false);
      },
      (error) => {
        console.error("[offer-conversation] summary failed", error);
        setLoading(false);
        toast.error("This offer conversation could not be loaded.");
      },
    );
  }, [authLoading, conversationId, currentUser?.uid, experience, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const request = query(
      collection(db, "offerConversations", conversationId, "events"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    );
    return onSnapshot(
      request,
      (snapshot) => {
        const next = snapshot.docs
          .map((entry) => ({id: entry.id, ...entry.data()}))
          .reverse();
        setLatestEvents(next);
        setOldestCursor(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasOlder(snapshot.size === PAGE_SIZE);
        setPendingMessages((current) =>
          current.filter(
            (pending) => !next.some((event) => event.clientMessageId === pending.clientMessageId),
          ),
        );
      },
      (error) => {
        console.error("[offer-conversation] events failed", error);
        toast.error("Messages could not be loaded.");
      },
    );
  }, [conversationId, currentUser?.uid]);

  useEffect(() => {
    if (role !== "buyer" || !currentUser?.uid) {
      setPickupSecrets({});
      return undefined;
    }
    return onSnapshot(
      query(
        collection(db, "offerConversations", conversationId, "buyerOrderSecrets"),
        where("buyerId", "==", currentUser.uid),
      ),
      (snapshot) => {
        setPickupSecrets(
          Object.fromEntries(snapshot.docs.map((entry) => [entry.id, entry.data()])),
        );
      },
      (error) => console.warn("[offer-conversation] pickup code unavailable", error),
    );
  }, [conversationId, currentUser?.uid, role]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    return onSnapshot(
      collection(db, "offerConversations", conversationId, "orderContexts"),
      (snapshot) => {
        setPickupContexts(
          snapshot.docs
            .map((entry) => ({id: entry.id, ...entry.data()}))
            .filter((context) => context.active),
        );
      },
      (error) => console.warn("[offer-conversation] pickup context unavailable", error),
    );
  }, [conversationId, currentUser?.uid]);

  useEffect(() => {
    if (!role) return undefined;
    const markRead = () => {
      if (document.visibilityState === "visible") {
        markOfferConversationRead(conversationId).catch(() => {});
      }
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [conversationId, role, allEvents.length]);

  useEffect(() => {
    if (!role || !conversationId) return undefined;
    const touch = () => {
      if (document.visibilityState === "visible") {
        touchOfferConversationPresence(conversationId).catch(() => {});
      }
    };
    touch();
    const interval = window.setInterval(touch, 60_000);
    document.addEventListener("visibilitychange", touch);
    window.addEventListener("focus", touch);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
      window.removeEventListener("focus", touch);
    };
  }, [conversationId, role]);

  useEffect(() => {
    if (!role || !conversationId) return;
    const cloudAcknowledged = Boolean(
      conversation?.[`${role}SafetyAcknowledgedAt`] ||
      conversation?.[role]?.safetyAcknowledgedAt,
    );
    const localKey = `mythrift:offer-chat-safety:${currentUser?.uid || "guest"}`;
    if (
      !cloudAcknowledged &&
      localStorage.getItem(localKey) !== "1" &&
      !safetyPresentedRef.current
    ) {
      safetyPresentedRef.current = true;
      setSafetyOpen(true);
    }
  }, [conversation, conversationId, currentUser?.uid, role]);

  useEffect(() => {
    if ((!focusOfferId && !focusQuestionId) || !allEvents.length) return;
    const frame = window.requestAnimationFrame(() => {
      const target = focusQuestionId
        ? document.querySelector(
            `[data-question-id="${CSS.escape(focusQuestionId)}"]`,
          )
        : document.querySelector(
            `[data-offer-id="${CSS.escape(focusOfferId)}"]`,
          );
      target?.scrollIntoView({behavior: "smooth", block: "center"});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allEvents.length, focusOfferId, focusQuestionId]);

  useEffect(() => {
    if (focusOfferId || focusQuestionId || !allEvents.length) return;
    const frame = window.requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({top: scrollerRef.current.scrollHeight, behavior: "smooth"});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allEvents.length, focusOfferId, focusQuestionId, pendingMessages.length]);

  const loadOlder = useCallback(async () => {
    if (!oldestCursor || !hasOlder || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "offerConversations", conversationId, "events"),
          orderBy("createdAt", "desc"),
          startAfter(oldestCursor),
          limit(PAGE_SIZE),
        ),
      );
      const next = snapshot.docs.map((entry) => ({id: entry.id, ...entry.data()})).reverse();
      setOlderEvents((current) => mergeEvents(next, current));
      if (snapshot.docs.length) {
        setOldestCursor(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasOlder(snapshot.size === PAGE_SIZE);
    } catch (error) {
      console.error(error);
      toast.error("Older messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasOlder, loadingOlder, oldestCursor]);

  const sendPending = useCallback(
    async (pending) => {
      setPendingMessages((current) =>
        current.map((entry) =>
          entry.clientMessageId === pending.clientMessageId
            ? {...entry, status: "sending"}
            : entry,
        ),
      );
      try {
        const result = await sendOfferConversationMessage({
          conversationId,
          text: pending.text,
          clientMessageId: pending.clientMessageId,
          replyToMessageId: pending.replyTo?.id || null,
          replyToQuestionId: pending.replyToQuestion?.id || null,
        });
        if (result?.guestAnswerDelivery === "queued") {
          toast.success(
            "Answer saved. Email delivery is queued and will retry automatically.",
          );
        }
      } catch (error) {
        console.error(error);
        setPendingMessages((current) =>
          current.map((entry) =>
            entry.clientMessageId === pending.clientMessageId
              ? {...entry, status: "failed"}
              : entry,
          ),
        );
        appHaptics.error();
        toast.error(error?.message || "Message could not be sent.");
      }
    },
    [conversationId],
  );

  const submitMessage = (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || body.length > 1000 || conversation?.state !== "active") return;
    if (
      conversation?.participantType === "guest" &&
      role === "vendor" &&
      !replyingToQuestion
    ) {
      toast.error("Choose Reply to question before answering this guest.");
      return;
    }
    const pending = {
      clientMessageId: createClientMessageId(),
      text: body,
      status: "sending",
      createdAt: Date.now(),
      replyTo: replyingTo
        ? {id: replyingTo.id, text: replyingTo.text, actorRole: replyingTo.actorRole}
        : null,
      replyToQuestion: replyingToQuestion
        ? {
            id: replyingToQuestion.id,
            question: replyingToQuestion.question,
            product: replyingToQuestion.product,
          }
        : null,
    };
    setText("");
    setReplyingTo(null);
    setReplyingToQuestion(null);
    setPendingMessages((current) => [...current, pending]);
    appHaptics.light();
    window.requestAnimationFrame(() => inputRef.current?.focus({preventScroll: true}));
    void sendPending(pending);
  };

  const finishSafetyIntro = async () => {
    if (safetyBusy) return;
    if (!rememberSafety) {
      setSafetyOpen(false);
      return;
    }
    setSafetyBusy(true);
    try {
      await acknowledgeOfferConversationSafety(conversationId);
      localStorage.setItem(
        `mythrift:offer-chat-safety:${currentUser?.uid || "guest"}`,
        "1",
      );
      setSafetyOpen(false);
    } catch (error) {
      toast.error("That preference could not be saved. Please try again.");
    } finally {
      setSafetyBusy(false);
    }
  };

  const updateOffer = async (event, action, successMessage, counterAmount = null) => {
    if (!event?.offerId || actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    setBusyAction({offerId: event.offerId, action});
    try {
      await actOnOfferConversation({
        conversationId,
        offerId: event.offerId,
        action,
        counterAmount,
      });
      appHaptics.success();
      toast.success(successMessage);
      setCounterEvent(null);
      setCounterValue("");
    } catch (error) {
      console.error(error);
      appHaptics.error();
      toast.error("That offer changed before your action completed. Refresh and try again.");
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
      setBusyAction(null);
    }
  };

  const handleOfferAction = (action, event) => {
    if (action === "product" || action === "buy") {
      if (!event.product?.productId) return;
      if (role === "vendor") {
        appHaptics.selection();
        navigate("/vendor-products", {
          state: {
            highlightId: event.product.productId,
            returnTo: `${location.pathname}${location.search}`,
          },
        });
        return;
      }
      const offerPrice =
        event.type === "offer_countered" ? event.counterAmount : event.amount;
      navigate(`/product/${event.product.productId}`, {
        state: {
          ...(action === "buy" ? {offerPrice: Number(offerPrice)} : {}),
          offerAction: action === "buy" ? "buy" : undefined,
          returnTo: `${location.pathname}${location.search}`,
        },
      });
      return;
    }
    if (action === "counter") {
      appHaptics.selection();
      setCounterEvent(event);
      setCounterValue("");
      return;
    }
    if (action === "accept") {
      updateOffer(
        event,
        "accept",
        "Offer accepted.",
      );
      return;
    }
    if (action === "decline") {
      updateOffer(
        event,
        "decline",
        "Offer declined.",
      );
    }
  };

  const viewQuestionProduct = (event) => {
    const productId = event?.product?.productId;
    if (!productId) return;
    appHaptics.selection();
    if (role === "vendor") {
      navigate("/vendor-products", {
        state: {
          highlightId: productId,
          returnTo: `${location.pathname}${location.search}`,
        },
      });
      return;
    }
    navigate(`/product/${productId}`, {
      state: {returnTo: `${location.pathname}${location.search}`},
    });
  };

  const beginQuestionReply = (event) => {
    if (!event?.id) return;
    appHaptics.selection();
    setReplyingTo(null);
    setReplyingToQuestion(event);
    window.requestAnimationFrame(() => inputRef.current?.focus({preventScroll: true}));
  };

  const submitCounter = () => {
    const value = Math.round(Number(counterValue));
    const minimum = Number(counterEvent?.amount || 0) + 1;
    const maximum = Number(counterEvent?.product?.listPrice || 0) - 1;
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      toast.error(`Enter an amount between ${currency(minimum)} and ${currency(maximum)}.`);
      return;
    }
    updateOffer(
      counterEvent,
      "counter",
      "Counter offer sent.",
      value,
    );
  };

  const openMap = (context) => {
    const destination =
      context.pickupLat != null && context.pickupLng != null
        ? `${context.pickupLat},${context.pickupLng}`
        : context.pickupAddress;
    if (!destination) return toast.error("The pickup location is not available yet.");
    appHaptics.selection();
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const viewPickupOrder = (context) => {
    if (!context?.orderId) return;
    appHaptics.selection();
    navigate(role === "vendor" ? "/vendor-orders" : "/user-orders", {
      state: {
        focusOrderId: context.orderId,
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const goToLastPickupPin = () => {
    if (!lastPickupContext?.id) return;
    setMenuEvent(null);
    setHighlightedPickupId(lastPickupContext.id);
    appHaptics.selection();
    window.requestAnimationFrame(() => {
      const target = scrollerRef.current?.querySelector(
        `[data-pickup-context-id="${CSS.escape(lastPickupContext.id)}"]`,
      );
      target?.scrollIntoView({behavior: "smooth", block: "center"});
    });
    if (pickupHighlightTimerRef.current) {
      window.clearTimeout(pickupHighlightTimerRef.current);
    }
    pickupHighlightTimerRef.current = window.setTimeout(
      () => setHighlightedPickupId(null),
      2200,
    );
  };

  const reportSelected = async () => {
    if (!menuEvent || moderationBusy) return;
    setModerationBusy("report");
    try {
      await reportOfferConversationMessage({
        conversationId,
        eventId: menuEvent.id,
        reason: "Inappropriate or unsafe message",
      });
      appHaptics.success();
      toast.success("Message reported. Our support team will review it.");
      setMenuEvent(null);
    } catch (error) {
      toast.error(error?.message || "This report could not be sent.");
    } finally {
      setModerationBusy(null);
    }
  };

  const toggleBlocked = async () => {
    if (moderationBusy) return;
    const blocked = conversation?.state !== "blocked";
    setModerationBusy("block");
    try {
      await setOfferConversationBlocked(conversationId, blocked);
      appHaptics.warning();
      toast.success(blocked ? "Messaging blocked." : "Messaging unblocked.");
      setMenuEvent(null);
    } catch (error) {
      toast.error(error?.message || "That setting could not be changed.");
    } finally {
      setModerationBusy(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="offer-chat-loading" aria-label="Loading conversation">
        <Loader2 aria-hidden="true" />
      </div>
    );
  }
  if (!conversation || !role) {
    return (
      <div className="offer-chat-unavailable">
        <p>This offer conversation is unavailable.</p>
        <button type="button" onClick={() => navigate(currentUserData?.role === "vendor" ? "/vchats" : "/offers")}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <main className="offer-chat-page">
      <SEO title={`Chat with ${counterpart?.displayName || "My Thrift"}`} />
      <AppPageHeader
        title={
          <span className="offer-chat-header-identity">
            <ChatAvatar src={avatarSource} className="h-9 w-9" />
            <span className="offer-chat-header-title">
            <span>{counterpart?.displayName || (role === "vendor" ? "Buyer" : "Vendor")}</span>
            <small className={presenceLabel(counterpartLastActiveAt, now) === "Active now" ? "is-live" : ""}>
              {presenceLabel(counterpartLastActiveAt, now)}
            </small>
            </span>
          </span>
        }
        onBack={() => {
          if (location.state?.backMode === "pop") {
            navigate(-1);
            return;
          }
          navigate(
            location.state?.returnTo ||
              (role === "vendor" ? "/vchats" : "/offers"),
            {replace: true},
          );
        }}
        rightAction={
          <button type="button" aria-label="Conversation options" onClick={() => setMenuEvent({id: null})}>
            <MoreHorizontal aria-hidden="true" />
          </button>
        }
      />

      <section className="offer-chat-scroll" ref={scrollerRef} aria-live="polite">
        {hasOlder && (
          <button type="button" className="offer-chat-load-older" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? <Loader2 className="is-spinning" aria-hidden="true" /> : "Load earlier activity"}
          </button>
        )}

        {orderedPickupContexts.map((context) => (
          <article
            className={`offer-chat-pickup ${highlightedPickupId === context.id ? "is-focused" : ""}`}
            data-pickup-context-id={context.id}
            key={context.id}
          >
            <div className="offer-chat-pickup-icon"><MapPin aria-hidden="true" /></div>
            <div>
              <strong>Pickup order {context.displayOrderId || ""}</strong>
              <p>
                Use this chat to reach the vendor. Keeping the conversation here helps My Thrift support you if anything goes wrong.
              </p>
              {context.pickupWindow?.days && (
                <small>{context.pickupWindow.days} · {context.pickupWindow.time || "Time pending"}</small>
              )}
              {role === "buyer" && pickupSecrets[context.id]?.pickupCode && (
                <div className="offer-chat-pickup-code">
                  Pickup code <strong>{pickupSecrets[context.id].pickupCode}</strong>
                  <small>Only share this at collection.</small>
                </div>
              )}
              <div className="offer-chat-pickup-actions">
                <button type="button" onClick={() => viewPickupOrder(context)}>
                  <Package aria-hidden="true" /> View order
                </button>
                <button type="button" onClick={() => openMap(context)}>
                  <MapPin aria-hidden="true" /> Open Maps
                </button>
              </div>
            </div>
          </article>
        ))}

        {allEvents.map((event) =>
          event.type === "text" ? (
            <div
              key={event.id}
              data-message-id={event.id}
            >
              <SwipeableMessage
                event={event}
                mine={event.senderId === currentUser?.uid}
                replyAuthorName={participantName(event.replyTo?.actorRole)}
                seen={Boolean(
                  lastOwnTextEvent?.id === event.id &&
                  timestampToMillis(counterpartLastReadAt) >= eventMillis(event)
                )}
                onReply={(message) => {
                  setReplyingToQuestion(null);
                  setReplyingTo(message);
                }}
                onOptions={setMenuEvent}
              />
            </div>
          ) : event.type === "question_asked" ? (
            <QuestionEventCard
              key={event.id}
              event={event}
              role={role}
              answered={
                Boolean(event.answeredAt || event.answerEventId) ||
                answeredQuestionIds.has(event.id)
              }
              focused={Boolean(
                focusQuestionId && focusQuestionId === event.id,
              )}
              onReply={beginQuestionReply}
              onViewProduct={viewQuestionProduct}
            />
          ) : (
            <OfferEventCard
              key={event.id}
              event={event}
              latestForOffer={latestByOffer.get(event.offerId)}
              role={role}
              focused={Boolean(focusOfferId && focusOfferId === event.offerId)}
              onAction={handleOfferAction}
              now={now}
              actionBusy={actionBusy}
              busyAction={busyAction}
            />
          ),
        )}

        {pendingMessages.map((pending) => (
          <div className="offer-chat-message is-mine is-pending" key={pending.clientMessageId}>
            <div>
              {pending.replyTo?.text && (
                <div className="offer-chat-reply-quote is-pending-quote">
                  <span>{participantName(pending.replyTo.actorRole)}</span>
                  {pending.replyTo.text}
                </div>
              )}
              {pending.replyToQuestion?.question && (
                <div className="offer-chat-reply-quote offer-chat-question-quote is-pending-quote">
                  <span>Answering product question</span>
                  {pending.replyToQuestion.question}
                </div>
              )}
              <p>{pending.text}</p>
              {pending.status === "failed" ? (
                <button type="button" onClick={() => sendPending(pending)}>Not sent · tap to retry</button>
              ) : (
                <small>Sending…</small>
              )}
            </div>
          </div>
        ))}
      </section>

      <form className="offer-chat-composer" onSubmit={submitMessage}>
        {conversation.state !== "active" && (
          <p>
            {conversation.state === "blocked"
              ? "Messaging is blocked in this conversation."
              : conversation.state === "guest_answered"
                ? "The guest answer was sent by email. A new verified question will reopen this chat."
                : "This conversation is currently unavailable."}
          </p>
        )}
        {replyingTo && (
          <div className="offer-chat-composer-reply">
            <Reply aria-hidden="true" />
            <span>
              <strong>Replying to {participantName(replyingTo.actorRole)}</strong>
              {replyingTo.text}
            </span>
            <button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}>
              <X aria-hidden="true" />
            </button>
          </div>
        )}
        {replyingToQuestion && (
          <div className="offer-chat-composer-question" role="status">
            <CircleHelp aria-hidden="true" />
            <span>
              <strong>
                Answering question about {replyingToQuestion.product?.name || "this product"}
              </strong>
              {replyingToQuestion.question}
            </span>
            <button
              type="button"
              aria-label="Cancel question answer"
              onClick={() => setReplyingToQuestion(null)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="offer-chat-input-row">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              replyingToQuestion
                ? "Write the answer to this question"
                : conversation.participantType === "guest" && role === "vendor"
                  ? "Choose Reply to question above"
                  : "Message about your offer"
            }
            maxLength={1000}
            rows={1}
            disabled={
              conversation.state !== "active" ||
              (conversation.participantType === "guest" &&
                role === "vendor" &&
                !replyingToQuestion)
            }
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={
              !text.trim() ||
              conversation.state !== "active" ||
              (conversation.participantType === "guest" &&
                role === "vendor" &&
                !replyingToQuestion)
            }
            onPointerDown={(event) => event.preventDefault()}
          >
            <Send aria-hidden="true" />
          </button>
        </div>
        <div className="offer-chat-safety offer-chat-safety--composer">
          <ShieldCheck aria-hidden="true" />
          <span>
            Keep business on My Thrift. We monitor chats for marketplace safety.
            Attempting to take or finalise business off-platform is at your own
            risk and will result in a permanent account ban.
          </span>
        </div>
      </form>

      <AppBottomSheet
        open={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        height="48dvh"
        compactTop
        ariaLabel="Safe offer messaging"
        dismissible={!safetyBusy}
      >
        <div className="offer-chat-safety-sheet">
          <span className="offer-chat-safety-sheet-icon"><ShieldCheck aria-hidden="true" /></span>
          <h2>Keep your deal protected</h2>
          <p>
            Keep offers, payments and pickup conversations on My Thrift. We monitor
            chats to protect buyers, vendors and marketplace transactions. Attempting
            to take or finalise business off-platform is at your own risk and will
            result in a permanent account ban. Abusive or disrespectful messages are
            not allowed.
          </p>
          <label>
            <input
              type="checkbox"
              checked={rememberSafety}
              onChange={(event) => setRememberSafety(event.target.checked)}
            />
            Don’t show this again on my account
          </label>
          <button type="button" onClick={finishSafetyIntro} disabled={safetyBusy}>
            {safetyBusy ? <Loader2 className="is-spinning" aria-hidden="true" /> : "Continue to chat"}
          </button>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        open={Boolean(menuEvent)}
        onClose={() => !moderationBusy && setMenuEvent(null)}
        height={role === "buyer" && lastPickupContext ? "42dvh" : "34dvh"}
        compactTop
        ariaLabel="Conversation options"
        dismissible={!moderationBusy}
      >
        <div className="offer-chat-sheet">
          <h2>{menuEvent?.id ? "Message options" : "Conversation options"}</h2>
          {menuEvent?.id && (
            <>
              <button
                type="button"
                disabled={Boolean(moderationBusy)}
                onClick={() => {
                  setReplyingToQuestion(null);
                  setReplyingTo(menuEvent);
                  setMenuEvent(null);
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                Reply to this message
              </button>
              <button
                type="button"
                onClick={reportSelected}
                disabled={Boolean(moderationBusy)}
                aria-busy={moderationBusy === "report"}
              >
                {moderationBusy === "report" ? (
                  <Loader2 className="is-spinning" aria-hidden="true" />
                ) : (
                  "Report this message"
                )}
              </button>
            </>
          )}
          {!menuEvent?.id && role === "buyer" && lastPickupContext && (
            <button type="button" onClick={goToLastPickupPin}>
              <MapPin aria-hidden="true" /> Go to latest pickup pin
            </button>
          )}
          <button
            type="button"
            className="is-danger"
            onClick={toggleBlocked}
            disabled={Boolean(moderationBusy)}
            aria-busy={moderationBusy === "block"}
          >
            {moderationBusy === "block" ? (
              <Loader2 className="is-spinning" aria-hidden="true" />
            ) : conversation.state === "blocked" ? (
              "Unblock messaging"
            ) : (
              "Block messaging"
            )}
          </button>
          <p>Blocking stops new messages. Existing offer and order records remain available.</p>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        open={Boolean(counterEvent)}
        onClose={() => !actionBusy && setCounterEvent(null)}
        height="38dvh"
        compactTop
        ariaLabel="Send counter offer"
        dismissible={!actionBusy}
      >
        <div className="offer-chat-sheet">
          <h2>Counter offer</h2>
          <p>Enter an amount above {currency(counterEvent?.amount)} and below {currency(counterEvent?.product?.listPrice)}.</p>
          <input
            type="number"
            inputMode="numeric"
            value={counterValue}
            onChange={(event) => setCounterValue(event.target.value)}
            placeholder="Counter amount"
          />
          <button type="button" className="is-primary" onClick={submitCounter} disabled={actionBusy}>
            {actionBusy ? <Loader2 className="is-spinning" aria-hidden="true" /> : "Send counter"}
          </button>
        </div>
      </AppBottomSheet>
    </main>
  );
}

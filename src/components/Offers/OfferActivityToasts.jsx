import React, {useEffect, useRef} from "react";
import {CircleHelp, MessageCircle, UserRound} from "lucide-react";
import {useLocation, useNavigate} from "react-router-dom";
import toast from "react-hot-toast";
import {appHaptics} from "../../services/haptics";
import "./offer-activity-toasts.css";

const GROUP_WINDOW_MS = 5000;

export default function OfferActivityToasts() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  const groupRef = useRef(null);
  const resetTimerRef = useRef(null);
  const seenEventIdsRef = useRef(new Set());

  locationRef.current = location;

  useEffect(() => {
    const renderGroup = (group) => {
      const conversations = new Map();
      group.entries.forEach((entry) => conversations.set(entry.conversationId, entry));
      const first = group.entries[0];
      const sameConversation = conversations.size === 1;
      const isQuestion =
        sameConversation && first.eventType === "question_asked";
      const extraCount = Math.max(0, group.entries.length - 1);
      const title = sameConversation
        ? isQuestion
          ? `New question from ${first.counterpartName}`
          : first.counterpartName
        : `${group.entries.length} new chat updates`;
      const body = sameConversation
        ? `${first.preview}${extraCount ? ` · +${extraCount} more` : ""}`
        : `Messages and offer updates from ${conversations.size} chats`;
      const actionLabel = sameConversation ? "View" : "View messages";

      toast.custom(
        (toastRecord) => (
          <div
            className={`offer-activity-toast ${isQuestion ? "is-question" : ""} ${toastRecord.visible ? "is-visible" : ""}`}
            role="status"
          >
            <span className="offer-activity-toast__avatar">
              {isQuestion ? (
                <CircleHelp aria-hidden="true" />
              ) : sameConversation && first.counterpartAvatar ? (
                <img src={first.counterpartAvatar} alt="" />
              ) : sameConversation ? (
                <UserRound aria-hidden="true" />
              ) : (
                <MessageCircle aria-hidden="true" />
              )}
            </span>
            <span className="offer-activity-toast__copy">
              <strong>{title}</strong>
              <span>{body}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastRecord.id);
                if (sameConversation) {
                  navigate(
                    isQuestion
                      ? `/offer-conversations/${first.conversationId}?focusQuestion=${encodeURIComponent(first.eventId)}`
                      : `/offer-conversations/${first.conversationId}`,
                  );
                } else {
                  navigate(first.role === "vendor" ? "/vchats" : "/offers?view=chats");
                }
              }}
            >
              {actionLabel}
            </button>
          </div>
        ),
        {
          id: group.toastId,
          duration: 3500,
          position: "top-center",
        },
      );
    };

    const handleActivity = (event) => {
      const detail = event.detail;
      if (!detail?.eventId || document.visibilityState !== "visible") return;
      if (seenEventIdsRef.current.has(detail.eventId)) return;
      seenEventIdsRef.current.add(detail.eventId);
      if (seenEventIdsRef.current.size > 250) {
        seenEventIdsRef.current = new Set(
          Array.from(seenEventIdsRef.current).slice(-150),
        );
      }

      const activeConversationPath = `/offer-conversations/${detail.conversationId}`;
      if (locationRef.current.pathname === activeConversationPath) return;

      const now = Date.now();
      let group = groupRef.current;
      if (!group || now - group.startedAt >= GROUP_WINDOW_MS) {
        group = {
          startedAt: now,
          toastId: `offer-activity-${now}`,
          entries: [],
        };
        groupRef.current = group;
        void appHaptics.light();
      }
      group.entries.push(detail);
      renderGroup(group);

      window.clearTimeout(resetTimerRef.current);
      const remaining = Math.max(0, GROUP_WINDOW_MS - (now - group.startedAt));
      resetTimerRef.current = window.setTimeout(() => {
        if (groupRef.current?.toastId === group.toastId) groupRef.current = null;
      }, remaining);
    };

    window.addEventListener("mythrift:offer-conversation-activity", handleActivity);
    return () => {
      window.removeEventListener("mythrift:offer-conversation-activity", handleActivity);
      window.clearTimeout(resetTimerRef.current);
    };
  }, [navigate]);

  return null;
}

// src/lib/signals.js
import { auth } from "../firebase.config"; // adjust path
import { signInAnonymously } from "firebase/auth";

const QUEUE = [];
let flushTimer = null;

const STORAGE_KEY = "mythrift:userData";
const MAX_QUEUE = 500;

function getSessionId() {
  const k = "mt_session_id";
  let v = sessionStorage.getItem(k);
  if (!v) {
    v = `${Math.random().toString(16).slice(2)}_${Date.now()}`;
    sessionStorage.setItem(k, v);
  }
  return v;
}

function getRole() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data?.role === "string" ? data.role : null;
  } catch {
    return null;
  }
}

function isVendor() {
  return getRole() === "vendor";
}

export function track(type, payload = {}, context = {}) {
  // ✅ Never track vendors
  if (isVendor()) return;

  QUEUE.push({
    type,
    ts: Date.now(),
    ...payload,
    context: {
      surface: context.surface || "unknown",
      path: context.path || window.location.pathname,
      sessionId: context.sessionId || getSessionId(),
      device: "web",
    },
  });

  // safety cap
  if (QUEUE.length > MAX_QUEUE) QUEUE.splice(0, QUEUE.length - MAX_QUEUE);

  scheduleFlush();
}

function scheduleFlush() {
  if (QUEUE.length >= 20) return flush();
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(), 5000);
}

async function ensureAuthUser() {
  // If vendor, don't even try
  if (isVendor()) return null;

  if (auth.currentUser) return auth.currentUser;

  // ✅ Create a guest identity so we can track + store seenDaily
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    return null;
  }
}

export async function flush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;

  if (!QUEUE.length) return;

  // ✅ If role switched to vendor mid-session, drop queue
  if (isVendor()) {
    QUEUE.splice(0, QUEUE.length);
    return;
  }

  const endpoint = import.meta.env.VITE_PUBLIC_TRACK_SIGNAL_ENDPOINT;
  if (!endpoint) return;

  const user = await ensureAuthUser();
  if (!user) return;

  const token = await user.getIdToken();
  const events = QUEUE.splice(0, QUEUE.length);

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
    keepalive: true,
  });
}

// flush on exit/tab hide
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});
window.addEventListener("pagehide", () => flush());

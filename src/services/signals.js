// src/services/signals.js (or src/lib/signals.js — just be consistent)
import { auth } from "../firebase.config"; // adjust path

const QUEUE = [];
let flushTimer = null;
let flushPromise = null; // ✅ single-flight guard

const STORAGE_KEY = "mythrift:userData";
const MAX_QUEUE = 500;

const FLUSH_EVERY_MS = 5000;
const FLUSH_THRESHOLD = 20;

// ✅ keep payloads small (keepalive + mobile safari safety)
const BATCH_SIZE = 60;

// ✅ browser guard
const IS_BROWSER =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof navigator !== "undefined";

function safeSessionGet(key) {
  if (!IS_BROWSER) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSessionSet(key, value) {
  if (!IS_BROWSER) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}
function safeLocalGet(key) {
  if (!IS_BROWSER) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getSessionIdV1() {
  const key = "mt_session_id";
  let v = safeSessionGet(key);
  if (!v) {
    v =
      (IS_BROWSER && crypto?.randomUUID?.()) ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    safeSessionSet(key, v);
  }
  return v;
}

function getRole() {
  try {
    const raw = safeLocalGet(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data?.role === "string" ? data.role : null;
  } catch {
    return null;
  }
}

export function track(type, payload = {}, context = {}) {
  const endpoint = import.meta.env.VITE_PUBLIC_TRACK_SIGNAL_ENDPOINT;

  // ✅ Only requirement: logged-in user
  if (!auth.currentUser) return;

  const surface = context.surface || "unknown";

  QUEUE.push({
    type,
    ts: Date.now(),

    // payload fields (backend expects these at root)
    ...payload,

    context: {
      surface,
      path: context.path || (IS_BROWSER ? window.location.pathname : "unknown"),
      sessionId: context.sessionId || getSessionIdV1(),
      device: "web",
    },

    role: getRole() || undefined,
  });

  // Cap queue size
  if (QUEUE.length > MAX_QUEUE) {
    QUEUE.splice(0, QUEUE.length - MAX_QUEUE);
  }

  // ✅ If endpoint missing, keep queue but still retry occasionally
  if (!endpoint) {
    scheduleFlush(15000);
    return;
  }

  scheduleFlush();
}

function scheduleFlush(customDelayMs) {
  if (!IS_BROWSER) return;

  if (QUEUE.length >= FLUSH_THRESHOLD) {
    void flush({ reason: "threshold" });
    return;
  }

  if (flushTimer) return;

  const delay = typeof customDelayMs === "number" ? customDelayMs : FLUSH_EVERY_MS;
  flushTimer = setTimeout(() => {
    void flush({ reason: "timer" });
  }, delay);
}

export async function flush({ reason = "manual" } = {}) {
  // ✅ single-flight: if a flush is already running, reuse it
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;

    if (!QUEUE.length) return;

    // ✅ Still require logged-in user
    if (!auth.currentUser) return;

    const endpoint = import.meta.env.VITE_PUBLIC_TRACK_SIGNAL_ENDPOINT;
    if (!endpoint) {
      // keep queue; retry later
      scheduleFlush(15000);
      return;
    }

    let token = "";
    try {
      token = await auth.currentUser.getIdToken();
    } catch (e) {
      // keep queue; retry later
      scheduleFlush(8000);
      return;
    }

    // ✅ send only one batch per flush (small + safe)
    const batch = QUEUE.slice(0, BATCH_SIZE);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: batch, meta: { reason } }),
        keepalive: true,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`flush failed: ${res.status} ${t}`);
      }

      // ✅ clear only what we sent
      QUEUE.splice(0, batch.length);

      // ✅ if more remains, flush again soon
      if (QUEUE.length) scheduleFlush(250);
    } catch (e) {
      // ✅ keep queue; retry later even if no new track() happens
      scheduleFlush(8000);
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

// ✅ Flush on unload-ish events (browser guard)
if (IS_BROWSER) {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush({ reason: "hidden" });
  });

  window.addEventListener("pagehide", () => {
    void flush({ reason: "pagehide" });
  });
}

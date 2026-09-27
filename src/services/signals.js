// src/services/signals.js
import { auth } from "../firebase.config";
import { Capacitor } from "@capacitor/core";

// ============================================================
// V1 — CURRENT PRODUCTION SIGNAL PIPELINE
// ============================================================
// We deliberately keep V1 running while V2 is shadow tested.

const V1_QUEUE = [];
let v1FlushTimer = null;
let v1FlushPromise = null;

const STORAGE_KEY = "mythrift:userData";

const V1_MAX_QUEUE = 500;
const V1_FLUSH_EVERY_MS = 5000;
const V1_FLUSH_THRESHOLD = 20;
const V1_BATCH_SIZE = 60;

// ============================================================
// V2 — NEW SHADOW SIGNAL PIPELINE
// ============================================================

const V2_STORAGE_KEY = "mythrift:signalQueue:v2";
const ANONYMOUS_ID_KEY = "mythrift:anonymousId:v2";

const V2_MAX_QUEUE = 500;
const V2_BATCH_SIZE = 50;

const V2_FLUSH_EVERY_MS = 5000;
const V2_RETRY_MS = 8000;

let v2FlushTimer = null;
let v2FlushPromise = null;

// ============================================================
// Browser helpers
// ============================================================

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

function safeLocalSet(key, value) {
  if (!IS_BROWSER) return;

  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ============================================================
// ID helpers
// ============================================================

function makeId(prefix = "id") {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();

    if (uuid) {
      return `${prefix}_${uuid}`;
    }
  } catch {}

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}_${Math.random().toString(16).slice(2)}`;
}

// ============================================================
// Session ID
// ============================================================

export function getSessionIdV1() {
  const key = "mt_session_id";

  let value = safeSessionGet(key);

  if (!value) {
    value = makeId("session");
    safeSessionSet(key, value);
  }

  return value;
}

// ============================================================
// Anonymous ID
// ============================================================
// Persistent across sessions.
//
// This allows V2 to learn from logged-out users without pretending
// that they are authenticated users.

export function getAnonymousIdV2() {
  let value = safeLocalGet(ANONYMOUS_ID_KEY);

  if (!value) {
    value = makeId("anon");
    safeLocalSet(ANONYMOUS_ID_KEY, value);
  }

  return value;
}

// ============================================================
// Device
// ============================================================

function getDeviceV2() {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === "ios") return "capacitor_ios";
    if (platform === "android") return "capacitor_android";
  } catch {}

  return "web";
}

// ============================================================
// Existing user role helper
// ============================================================

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

// ============================================================
// V2 persistent state
// ============================================================
//
// The important part:
//
// {
//   queue: [...events],
//   inflight: {
//      batchId,
//      eventIds
//   }
// }
//
// Once a batch gets an ID, we KEEP that ID until the backend
// acknowledges the batch.
//
// Therefore:
//
// request succeeds but response gets lost
//           ↓
// frontend retries SAME batchId
//           ↓
// backend recognizes duplicate
//           ↓
// taste is NOT incremented twice

function emptyV2State() {
  return {
    queue: [],
    inflight: null,
  };
}

function loadV2State() {
  if (!IS_BROWSER) {
    return emptyV2State();
  }

  try {
    const raw = safeLocalGet(V2_STORAGE_KEY);

    if (!raw) {
      return emptyV2State();
    }

    const parsed = JSON.parse(raw);

    return {
      queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
      inflight:
        parsed?.inflight &&
        typeof parsed.inflight.batchId === "string" &&
        Array.isArray(parsed.inflight.eventIds)
          ? parsed.inflight
          : null,
    };
  } catch {
    return emptyV2State();
  }
}

let V2_STATE = loadV2State();

function persistV2State() {
  if (!IS_BROWSER) return;

  try {
    safeLocalSet(V2_STORAGE_KEY, JSON.stringify(V2_STATE));
  } catch {}
}

// ============================================================
// Context normalization
// ============================================================

function buildContextV2(context = {}) {
  return {
    surface: context.surface || "unknown",

    path:
      context.path ||
      (IS_BROWSER ? window.location.pathname : "unknown"),

    sessionId:
      context.sessionId ||
      getSessionIdV1(),

    device: getDeviceV2(),

    // Recommendation attribution
    feedRequestId:
      context.feedRequestId || undefined,

    searchRequestId:
      context.searchRequestId || undefined,

    candidateSource:
      context.candidateSource || undefined,

    position:
      Number.isFinite(Number(context.position))
        ? Number(context.position)
        : undefined,

    algorithmVersion:
      context.algorithmVersion || undefined,
  };
}

// ============================================================
// Public tracking API
// ============================================================
//
// Existing call sites can KEEP doing:
//
// track("product_view", {...}, {...})
//
// We generate:
// - old V1 event
// - new V2 event
//
// No page/component migration required yet.
// ============================================================
// V2 trusted-event routing
// ============================================================
//
// For SIGNED-IN users, these actions are now sourced from
// trusted Firestore triggers.
//
// Guests still need the client event because they do not create
// the corresponding Firestore documents.

const V2_TRUSTED_FOR_SIGNED_IN = new Set([
  // Favorite truth
  "product_like",
  "product_unlike",

  // Cart truth
  "add_to_cart",
  "remove_from_cart",

  // Follow truth
  "follow_vendor",
  "unfollow_vendor",
]);

const V2_ALLOWED_EVENTS = new Set([
  "product_impression",
  "product_view",
  "search_results_impression",
  "search_result_click",

  "product_like",
  "product_unlike",

  "add_to_cart",
  "remove_from_cart",

  "checkout_started",

  "vendor_view",
  "follow_vendor",
  "unfollow_vendor",

  "not_interested",
]);

function shouldSendClientEventToV2(type) {
  // Do not let old/V1-only analytics events
  // poison the V2 recommendation queue.
  if (!V2_ALLOWED_EVENTS.has(type)) {
    return false;
  }

  const isSignedIn =
    !!auth.currentUser?.uid;

  if (
    isSignedIn &&
    V2_TRUSTED_FOR_SIGNED_IN.has(type)
  ) {
    return false;
  }

  return true;
}

function enqueueV2Event(
  type,
  payload,
  context,
  now
) {
  const safePayload =
    payload && typeof payload === "object"
      ? payload
      : {};
  const {
    productId,
    vendorId,
    ...props
  } = safePayload;

  const v2Event = {
    eventId: makeId("evt"),
    type,
    ts: now,

    productId,
    vendorId,
    props,

    context: buildContextV2(context),
  };

  V2_STATE.queue.push(v2Event);

  if (V2_STATE.queue.length > V2_MAX_QUEUE) {
    const overflow =
      V2_STATE.queue.length - V2_MAX_QUEUE;

    // Never remove events belonging to an inflight batch.
    if (!V2_STATE.inflight) {
      V2_STATE.queue.splice(
        0,
        overflow
      );
    } else {
      const protectedIds = new Set(
        V2_STATE.inflight.eventIds
      );

      let remaining = overflow;

      V2_STATE.queue =
        V2_STATE.queue.filter(
          (event) => {
            if (remaining <= 0) {
              return true;
            }

            if (
              protectedIds.has(
                event.eventId
              )
            ) {
              return true;
            }

            remaining -= 1;
            return false;
          }
        );
    }
  }

  persistV2State();
  scheduleV2Flush();
}
export function track(
  type,
  payload = {},
  context = {}
) {
  const now = Date.now();

  // ==========================================================
  // V2
  // ==========================================================
  //
  // Signed-in favorites are now learned from the trusted
  // Firestore favorite trigger instead of the client.
  //
  // Guest favorites still go through client V2 because guests
  // do not have users/{uid}/favorites documents.

  if (shouldSendClientEventToV2(type)) {
    enqueueV2Event(
      type,
      payload,
      context,
      now
    );
  }

  // ==========================================================
  // V1 — KEEP PRODUCTION BEHAVIOUR UNCHANGED
  // ==========================================================

  if (!auth.currentUser) {
    return;
  }

  const surface =
    context.surface || "unknown";

  V1_QUEUE.push({
    type,

    ts: now,

    ...payload,

    context: {
      surface,

      path:
        context.path ||
        (IS_BROWSER
          ? window.location.pathname
          : "unknown"),

      sessionId:
        context.sessionId ||
        getSessionIdV1(),

      device: "web",
    },

    role:
      getRole() || undefined,
  });

  if (
    V1_QUEUE.length >
    V1_MAX_QUEUE
  ) {
    V1_QUEUE.splice(
      0,
      V1_QUEUE.length -
        V1_MAX_QUEUE
    );
  }

  scheduleV1Flush();
}

// ============================================================
// V1 scheduler
// ============================================================

function scheduleV1Flush(customDelayMs) {
  if (!IS_BROWSER) return;

  if (V1_QUEUE.length >= V1_FLUSH_THRESHOLD) {
    void flushV1({
      reason: "threshold",
    });

    return;
  }

  if (v1FlushTimer) return;

  const delay =
    typeof customDelayMs === "number"
      ? customDelayMs
      : V1_FLUSH_EVERY_MS;

  v1FlushTimer = setTimeout(() => {
    void flushV1({
      reason: "timer",
    });
  }, delay);
}

// ============================================================
// V1 flush
// ============================================================

async function flushV1({
  reason = "manual",
} = {}) {
  if (v1FlushPromise) {
    return v1FlushPromise;
  }

  v1FlushPromise = (async () => {
    if (v1FlushTimer) {
      clearTimeout(v1FlushTimer);
    }

    v1FlushTimer = null;

    if (!V1_QUEUE.length) return;

    if (!auth.currentUser) return;

    const endpoint =
      import.meta.env
        .VITE_PUBLIC_TRACK_SIGNAL_ENDPOINT;

    if (!endpoint) {
      scheduleV1Flush(15000);
      return;
    }

    let token = "";

    try {
      token =
        await auth.currentUser.getIdToken();
    } catch {
      scheduleV1Flush(8000);
      return;
    }

    const batch =
      V1_QUEUE.slice(0, V1_BATCH_SIZE);

    try {
      const res = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          events: batch,

          meta: {
            reason,
          },
        }),

        keepalive: true,
      });

      if (!res.ok) {
        const text =
          await res.text().catch(() => "");

        throw new Error(
          `V1 flush failed: ${res.status} ${text}`
        );
      }

      V1_QUEUE.splice(0, batch.length);

      if (V1_QUEUE.length) {
        scheduleV1Flush(250);
      }
    } catch {
      scheduleV1Flush(8000);
    }
  })().finally(() => {
    v1FlushPromise = null;
  });

  return v1FlushPromise;
}

// ============================================================
// V2 scheduler
// ============================================================

function scheduleV2Flush(customDelayMs) {
  if (!IS_BROWSER) return;

  if (!V2_STATE.queue.length) {
    return;
  }

  if (v2FlushTimer) {
    return;
  }

  const delay =
    typeof customDelayMs === "number"
      ? customDelayMs
      : V2_FLUSH_EVERY_MS;

  v2FlushTimer = setTimeout(() => {
    void flushV2({
      reason: "timer",
    });
  }, delay);
}

// ============================================================
// Get/create durable V2 batch
// ============================================================

function getInflightV2Batch() {
  // ----------------------------------------------------------
  // Retry existing inflight batch
  // ----------------------------------------------------------

  if (V2_STATE.inflight) {
    const wantedIds =
      new Set(V2_STATE.inflight.eventIds);

    const events =
      V2_STATE.queue.filter((event) =>
        wantedIds.has(event.eventId)
      );

    // Inflight metadata got corrupted or queue was modified.
    // Reset it rather than sending a different payload using
    // the same batchId.
    if (
      events.length !==
      V2_STATE.inflight.eventIds.length
    ) {
      V2_STATE.inflight = null;

      persistV2State();

      return getInflightV2Batch();
    }

    return {
      batchId:
        V2_STATE.inflight.batchId,

      events,
    };
  }

  // ----------------------------------------------------------
  // Create NEW batch
  // ----------------------------------------------------------

  const events =
    V2_STATE.queue.slice(
      0,
      V2_BATCH_SIZE
    );

  if (!events.length) {
    return null;
  }

  const batchId =
    makeId("batch");

  V2_STATE.inflight = {
    batchId,

    eventIds:
      events.map(
        (event) => event.eventId
      ),

    createdAt: Date.now(),
  };

  // Critical:
  //
  // Persist BEFORE network request.
  //
  // If app crashes after server accepts but before response
  // arrives, next launch uses the SAME batch ID.
  persistV2State();

  return {
    batchId,
    events,
  };
}

// ============================================================
// V2 flush
// ============================================================

export async function flushV2({
  reason = "manual",
} = {}) {
  if (v2FlushPromise) {
    return v2FlushPromise;
  }

  v2FlushPromise = (async () => {
    if (v2FlushTimer) {
      clearTimeout(v2FlushTimer);
    }

    v2FlushTimer = null;

    if (!V2_STATE.queue.length) {
      return;
    }

    const endpoint =
      import.meta.env
        .VITE_PUBLIC_TRACK_SIGNAL_V2_ENDPOINT;

    if (!endpoint) {
      scheduleV2Flush(15000);
      return;
    }

    const batch =
      getInflightV2Batch();

    if (!batch) {
      return;
    }

    const currentUser =
      auth.currentUser;

    const headers = {
      "Content-Type":
        "application/json",
    };

    // --------------------------------------------------------
    // Authenticated user
    // --------------------------------------------------------

    if (currentUser) {
      try {
        const token =
          await currentUser.getIdToken();

        headers.Authorization =
          `Bearer ${token}`;
      } catch {
        // Important:
        //
        // If Firebase says a user exists but token retrieval
        // fails, DON'T silently submit as a guest.
        //
        // Retry later so signals stay attached to the right
        // identity.
        scheduleV2Flush(
          V2_RETRY_MS
        );

        return;
      }
    }

    const anonymousId =
      getAnonymousIdV2();

    try {
      const res = await fetch(
        endpoint,
        {
          method: "POST",

          headers,

          body: JSON.stringify({
            batchId:
              batch.batchId,

            anonymousId,

            events:
              batch.events,

            meta: {
              reason,
              clientVersion: 2,
            },
          }),

          keepalive: true,
        }
      );

      if (!res.ok) {
        const text =
          await res
            .text()
            .catch(() => "");

        throw new Error(
          `V2 flush failed: ${res.status} ${text}`
        );
      }

      // ------------------------------------------------------
      // ACK
      // ------------------------------------------------------
      //
      // Server accepted this exact batch.
      //
      // Delete by eventId rather than splice N events so queue
      // ordering changes cannot delete newer unsent events.

      const sentIds =
        new Set(
          V2_STATE.inflight?.eventIds ||
            []
        );

      V2_STATE.queue =
        V2_STATE.queue.filter(
          (event) =>
            !sentIds.has(
              event.eventId
            )
        );

      V2_STATE.inflight = null;

      persistV2State();

      // More signals arrived while this batch was uploading.
      if (V2_STATE.queue.length) {
        scheduleV2Flush(250);
      }
    } catch (error) {
      console.warn(
        "[signals:v2] flush failed; will retry",
        error
      );

      // DO NOT clear inflight.
      //
      // Next attempt will use:
      // - same event IDs
      // - same batch ID
      // - same payload
      scheduleV2Flush(
        V2_RETRY_MS
      );
    }
  })().finally(() => {
    v2FlushPromise = null;
  });

  return v2FlushPromise;
}

// ============================================================
// Existing public flush API
// ============================================================
//
// Keep this export because other parts of your frontend might
// already import flush().
//
// It now flushes BOTH systems independently.

export async function flush({
  reason = "manual",
} = {}) {
  await Promise.allSettled([
    flushV1({ reason }),
    flushV2({ reason }),
  ]);
}

// ============================================================
// Lifecycle
// ============================================================

if (IS_BROWSER) {
  window.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        void flush({
          reason: "hidden",
        });
      }
    }
  );

  window.addEventListener(
    "pagehide",
    () => {
      void flush({
        reason: "pagehide",
      });
    }
  );

  window.addEventListener(
    "online",
    () => {
      void flush({
        reason: "online",
      });
    }
  );

  // If the previous browser/app session closed with unsent V2
  // events, resume the queue automatically.
  if (V2_STATE.queue.length) {
    scheduleV2Flush(1000);
  }
}

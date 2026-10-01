import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";
import { useAuth } from "../../custom-hooks/useAuth";
import { auth, functions } from "../../firebase.config";
import { appHaptics } from "../../services/haptics";
import {
  isIOSApp,
  isNativeApp,
  nativePlatform,
} from "../../services/platform";

const TAWK_PROPERTY_ID = "68541decea9e87190a96647e";
const TAWK_WIDGET_ID = "1iu499p2k";
const TAWK_WIDGET_SRC = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
const SCRIPT_ID = "mythrift-tawk-widget";
const ACTIVE_UID_KEY = "mythrift:tawk-active-uid:v2";
const LEGACY_ACTIVE_IDENTITY_KEY = "mythrift:tawk-active-identity:v1";
const IDENTITY_UNCERTAIN_KEY = "mythrift:tawk-identity-uncertain:v1";
const UNREAD_KEY_PREFIX = "mythrift:tawk-unread:v2:";
const SUPPORT_REPLY_TOAST_ID = "mythrift-support-reply";
const READY_TIMEOUT_MS = 10_000;
const API_CALLBACK_TIMEOUT_MS = 10_000;
const ATTRIBUTE_VALUE_LIMIT = 255;
const REPLY_EVENT_QUARANTINE_MS = 2_500;

const DEFAULT_CONTEXT = {
  openChat: async () => false,
  logoutChat: async () => false,
  resetGuestSupport: async () => false,
  clearUnread: () => {},
  loaded: false,
  unreadCount: 0,
  identityStatus: "idle",
};

const TawkContext = createContext(DEFAULT_CONTEXT);

const cleanAttribute = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ATTRIBUTE_VALUE_LIMIT);
};

const compactAttributes = (attributes) =>
  Object.fromEntries(
    Object.entries(attributes)
      .map(([key, value]) => [key, cleanAttribute(value)])
      .filter(([, value]) => value.length > 0),
  );

const hasValue = (value) => cleanAttribute(value).length > 0;

const isAffirmative = (value) =>
  value === true || ["true", "yes", "1"].includes(cleanAttribute(value).toLowerCase());

const getAuthenticatedUid = (user) =>
  user?.uid && user.isAnonymous !== true ? user.uid : null;

const readStoredUid = () => {
  try {
    const current = cleanAttribute(
      window.localStorage?.getItem(ACTIVE_UID_KEY),
    );
    if (current) return current;
    const legacyRaw = window.localStorage?.getItem(
      LEGACY_ACTIVE_IDENTITY_KEY,
    );
    if (!legacyRaw) return "";
    const legacy = JSON.parse(legacyRaw);
    return legacy?.type === "authenticated" ||
      legacy?.type === "guest-fallback"
      ? cleanAttribute(legacy.uid)
      : "";
  } catch {
    return "";
  }
};

const readIdentityUncertain = () => {
  try {
    return window.localStorage?.getItem(IDENTITY_UNCERTAIN_KEY) === "1";
  } catch {
    return false;
  }
};

const storeIdentityUncertain = (uncertain) => {
  try {
    if (uncertain) window.localStorage?.setItem(IDENTITY_UNCERTAIN_KEY, "1");
    else window.localStorage?.removeItem(IDENTITY_UNCERTAIN_KEY);
  } catch {
    // The in-memory fail-closed state still protects this app session.
  }
};

const storeActiveUid = (uid) => {
  try {
    if (uid) window.localStorage?.setItem(ACTIVE_UID_KEY, uid);
    else window.localStorage?.removeItem(ACTIVE_UID_KEY);
    window.localStorage?.removeItem(LEGACY_ACTIVE_IDENTITY_KEY);
  } catch {
    // Support still works when WebView storage is unavailable.
  }
};

const unreadStorageKey = (owner) =>
  `${UNREAD_KEY_PREFIX}${cleanAttribute(owner) || "guest"}`;

const readUnread = (owner) => {
  try {
    const value = Number(
      window.localStorage?.getItem(unreadStorageKey(owner)) || 0,
    );
    return Number.isFinite(value) ? Math.max(0, Math.min(99, value)) : 0;
  } catch {
    return 0;
  }
};

const writeUnread = (owner, count) => {
  const next = Math.max(0, Math.min(99, Number(count) || 0));
  try {
    if (next > 0) {
      window.localStorage?.setItem(unreadStorageKey(owner), String(next));
    } else {
      window.localStorage?.removeItem(unreadStorageKey(owner));
    }
  } catch {
    // Best-effort notification state only.
  }
  return next;
};

export const normalizeSupportPhone = (value) => {
  const raw = cleanAttribute(value);
  if (!raw) return "";

  const compact = raw.replace(/[\s().-]/g, "");
  let candidate = compact;
  if (/^0\d{10}$/.test(compact)) candidate = `+234${compact.slice(1)}`;
  else if (/^[789]\d{9}$/.test(compact)) candidate = `+234${compact}`;
  else if (/^234\d{10}$/.test(compact)) candidate = `+${compact}`;
  else if (/^\+2340\d{10}$/.test(compact)) {
    candidate = `+234${compact.slice(5)}`;
  }

  return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : "";
};

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const inferSupportContext = (rawContext) => {
  // Existing buttons sometimes pass openChat directly, which supplies a React
  // click event. Only deliberate plain-object metadata belongs in Tawk.
  const supplied =
    rawContext &&
    typeof rawContext === "object" &&
    !rawContext.nativeEvent &&
    typeof rawContext.preventDefault !== "function"
      ? rawContext
      : {};

  const pathname = cleanAttribute(window.location?.pathname || "");
  const attributes = {
    "support-entry":
      supplied.supportEntry || supplied["support-entry"] || "general",
    screen: supplied.screen || pathname.replace(/^\//, "") || "unknown",
    "order-id":
      supplied.orderId || supplied["order-id"] || "not-applicable",
    "product-id":
      supplied.productId || supplied["product-id"] || "not-applicable",
    "vendor-id":
      supplied.vendorId || supplied["vendor-id"] || "not-applicable",
    "payment-reference":
      supplied.paymentReference ||
      supplied["payment-reference"] ||
      "not-applicable",
  };

  const productMatch = pathname.match(/^\/product\/([^/]+)/);
  const vendorMatch = pathname.match(/^\/store\/([^/]+)/);
  if (attributes["product-id"] === "not-applicable" && productMatch?.[1]) {
    attributes["product-id"] = safeDecode(productMatch[1]);
  }
  if (attributes["vendor-id"] === "not-applicable" && vendorMatch?.[1]) {
    attributes["vendor-id"] = safeDecode(vendorMatch[1]);
  }

  return compactAttributes(attributes);
};

const buildAuthenticatedAttributes = (user, userData, supportContext) => {
  const data = userData && typeof userData === "object" ? userData : {};
  const role = cleanAttribute(data.role || "user").toLowerCase();
  const isVendor = role === "vendor";
  const fullName = [data.firstName, data.lastName]
    .map(cleanAttribute)
    .filter(Boolean)
    .join(" ");
  const friendlyName = isVendor
    ? data.shopName ||
      data.businessName ||
      data.storeName ||
      data.name ||
      fullName ||
      user.displayName ||
      user.email
    : data.displayName ||
      fullName ||
      user.displayName ||
      data.username ||
      user.email;
  const phoneOnFile = data.phoneNumber || user.phoneNumber;
  const addressOnFile = hasValue(
    data.address ||
      data.Address ||
      data.deliveryAddress ||
      data.pickupAddress ||
      data.location?.address,
  );
  return compactAttributes({
    name: friendlyName || "My Thrift customer",
    email: user.email || data.email,
    phone: normalizeSupportPhone(phoneOnFile),

    // Preserve the exact legacy dashboard shape. The original integration
    // used jobTitle for the role; the richer profile added Job Title too.
    jobTitle: role,
    "job-title": isVendor ? "Vendor" : "Customer",
    uid: user.uid,
    role,
    "firebase-uid": user.uid,
    "account-role": role,
    "account-type": isVendor ? "vendor" : "buyer",
    username: data.username,
    "profile-complete": isAffirmative(data.profileComplete) ? "yes" : "no",
    "email-verified": user.emailVerified === true ? "yes" : "no",
    "phone-on-file": hasValue(phoneOnFile) ? "yes" : "no",
    "address-on-file": addressOnFile ? "yes" : "no",
    "app-platform": isNativeApp ? nativePlatform : "web",
    "app-version": import.meta.env.VITE_APP_VERSION || "0.1",
    ...supportContext,
  });
};

const callbackError = (error, fallbackMessage) => {
  if (!error) return null;
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  const normalized = new Error(error?.message || fallbackMessage);
  if (error?.code !== undefined) normalized.code = error.code;
  if (error?.status !== undefined) normalized.status = error.status;
  return normalized;
};

const isAlreadyLoggedOutError = (error) =>
  /NOT[_ -]?LOGGED|NO[_ -]?USER|ALREADY[_ -]?LOGGED[_ -]?OUT/i.test(
    [error?.code, error?.message, error].filter(Boolean).join(" "),
  );

const callTawkWithCallback = (
  method,
  payload,
  label,
  { onTimeout, onLateCallback } = {},
) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let lateCallbackHandled = false;
    const finish = (error) => {
      if (settled) {
        if (timedOut && !lateCallbackHandled) {
          lateCallbackHandled = true;
          onLateCallback?.(error);
        }
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      const normalized = callbackError(error, `${label} failed`);
      if (normalized) reject(normalized);
      else resolve();
    };
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      timedOut = true;
      onTimeout?.();
      reject(new Error(`${label} timed out`));
    }, API_CALLBACK_TIMEOUT_MS);

    try {
      if (payload === undefined) method(finish);
      else method(payload, finish);
    } catch (error) {
      finish(error);
    }
  });

const waitUntil = (predicate, timeoutMs = READY_TIMEOUT_MS) =>
  new Promise((resolve) => {
    if (predicate()) {
      resolve(true);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (predicate()) {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });

const isTawkSdkReady = () => {
  const script = document.getElementById(SCRIPT_ID);
  if (script?.dataset?.mythriftReady === "true") return true;
  try {
    const status = window.Tawk_API?.getStatus?.();
    return ["online", "away", "offline"].includes(status);
  } catch {
    return false;
  }
};

const messageFingerprint = (message) => {
  const text = cleanAttribute(
    typeof message === "string"
      ? message
      : message?.id || message?.message || message?.text,
  );
  if (!text) return "";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${hash >>> 0}`;
};

const getTopLevelBodyChild = (node) => {
  let candidate = node;
  while (candidate?.parentElement && candidate.parentElement !== document.body) {
    candidate = candidate.parentElement;
  }
  return candidate?.parentElement === document.body ? candidate : null;
};

const isTawkFrame = (frame) => {
  const signature = [
    frame.id,
    frame.name,
    frame.title,
    frame.getAttribute("src"),
    frame.getAttribute("aria-label"),
  ]
    .map(cleanAttribute)
    .join(" ")
    .toLowerCase();
  return (
    signature.includes("tawk") ||
    signature.includes("chat widget") ||
    signature.includes("embed.tawk.to")
  );
};

const findFullscreenTawkHost = (frame) => {
  const host = getTopLevelBodyChild(frame);
  if (!host) return null;

  const viewportHeight = Math.max(window.innerHeight || 0, 1);
  const frames = Array.from(
    new Set([
      ...(host.tagName === "IFRAME" ? [host] : []),
      ...host.querySelectorAll("iframe"),
    ]),
  );
  const hasTawkSignature = frames.some(isTawkFrame);
  const hasGeneratedBridge =
    frames.length >= 2 &&
    frames.some(
      (item) =>
        cleanAttribute(item.getAttribute("src")).toLowerCase() ===
        "about:blank",
    ) &&
    frames.some((item) => item.hasAttribute("srcdoc"));
  if (!hasTawkSignature && !hasGeneratedBridge) return null;

  const hostStyle = window.getComputedStyle(host);
  const isFullscreen = frames.some((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const style = window.getComputedStyle(candidate);
    return (
      rect.height >= viewportHeight * 0.6 &&
      (style.position === "fixed" || hostStyle.position === "fixed")
    );
  });
  return isFullscreen ? host : null;
};

export const TawkProvider = ({ children }) => {
  const {
    currentUser,
    currentUserData,
    currentUserDataUid,
    loading: authLoading,
  } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [identityStatus, setIdentityStatus] = useState("idle");
  const [unreadCount, setUnreadCount] = useState(0);
  const [widgetVisible, setWidgetVisible] = useState(false);

  const mountedRef = useRef(false);
  const apiReadyRef = useRef(false);
  const scriptFailedRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const currentUserDataRef = useRef(currentUserData);
  const currentUserDataUidRef = useRef(currentUserDataUid);
  const authLoadingRef = useRef(authLoading);
  const generationRef = useRef(0);
  const operationQueueRef = useRef(Promise.resolve());
  const identityTaskRef = useRef(null);
  const loggedUidRef = useRef("");
  // Tracks an SDK login from the moment it starts, not only after its callback.
  // If Firebase switches accounts mid-call, the next reconciliation must first
  // log that possibly-established identity out before logging the new user in.
  const sdkIdentityUidRef = useRef("");
  const identityUncertainRef = useRef(readIdentityUncertain());
  const uncertainMutationTokensRef = useRef(new Set());
  const lateMutationRecoveryRef = useRef(null);
  const guestSessionPreparedRef = useRef(false);
  const loginPayloadKeyRef = useRef("");
  const staticPayloadKeyRef = useRef("");
  const supportContextKeyRef = useRef("");
  const identityCredentialsRef = useRef(null);
  const latestSupportContextRef = useRef(inferSupportContext());
  const widgetVisibleRef = useRef(false);
  const openTaskRef = useRef(null);
  const openAttemptRef = useRef(0);
  const maximizeRequestRef = useRef(null);
  const maximizeInFlightRef = useRef(false);
  const ignoreCloseEventsUntilRef = useRef(0);
  const openChatRef = useRef(null);
  const syncIdentityRef = useRef(null);
  const frameObserverRef = useRef(null);
  const frameScanTimersRef = useRef([]);
  const pendingReplyRef = useRef(null);
  const lastAgentMessageRef = useRef({ signature: "", at: 0 });
  const replyQuarantineUntilRef = useRef(0);

  currentUserRef.current = currentUser;
  currentUserDataRef.current = currentUserData;
  currentUserDataUidRef.current = currentUserDataUid;
  authLoadingRef.current = authLoading;
  widgetVisibleRef.current = widgetVisible;

  const activeOwner = getAuthenticatedUid(currentUser) || "guest";

  const profileSignature = useMemo(
    () =>
      JSON.stringify([
        currentUserDataUid,
        currentUserData?.role,
        currentUserData?.firstName,
        currentUserData?.lastName,
        currentUserData?.displayName,
        currentUserData?.username,
        currentUserData?.shopName,
        currentUserData?.businessName,
        currentUserData?.storeName,
        currentUserData?.name,
        currentUserData?.email,
        currentUserData?.phoneNumber,
        currentUserData?.profileComplete,
        currentUserData?.address,
        currentUserData?.Address,
        currentUserData?.deliveryAddress,
        currentUserData?.pickupAddress,
        currentUserData?.state,
        currentUserData?.city,
        currentUserData?.locality,
        currentUserData?.marketPlace,
        currentUserData?.location?.address,
        currentUserData?.location?.state,
        currentUser?.displayName,
        currentUser?.email,
        currentUser?.emailVerified,
        currentUser?.phoneNumber,
      ]),
    [currentUser, currentUserData, currentUserDataUid],
  );

  const enqueueOperation = useCallback((operation) => {
    const next = operationQueueRef.current.catch(() => {}).then(operation);
    operationQueueRef.current = next.catch(() => {});
    return next;
  }, []);

  const clearSafeAreaGuard = useCallback(() => {
    frameObserverRef.current?.disconnect();
    frameObserverRef.current = null;
    frameScanTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    frameScanTimersRef.current = [];
    document.documentElement.classList.remove("tawk-chat-maximized");
    document
      .querySelectorAll('[data-mythrift-tawk-host="true"]')
      .forEach((node) => node.removeAttribute("data-mythrift-tawk-host"));
  }, []);

  const applySafeAreaGuard = useCallback(() => {
    if (!isIOSApp) return;
    clearSafeAreaGuard();
    document.documentElement.classList.add("tawk-chat-maximized");

    const tagFullscreenHost = () => {
      if (!widgetVisibleRef.current) return;
      document.querySelectorAll("iframe").forEach((frame) => {
        const host = findFullscreenTawkHost(frame);
        if (host) host.setAttribute("data-mythrift-tawk-host", "true");
      });
    };

    tagFullscreenHost();
    frameObserverRef.current = new MutationObserver(tagFullscreenHost);
    frameObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "srcdoc"],
    });
    [0, 50, 150, 350, 800, 1500].forEach((delay) => {
      frameScanTimersRef.current.push(
        window.setTimeout(tagFullscreenHost, delay),
      );
    });
  }, [clearSafeAreaGuard]);

  const resolveMaximizeRequest = useCallback((opened) => {
    const request = maximizeRequestRef.current;
    if (!request) return;
    maximizeRequestRef.current = null;
    window.clearTimeout(request.timer);
    request.resolve(opened);
  }, []);

  const finalizeWidgetClose = useCallback(() => {
    widgetVisibleRef.current = false;
    setWidgetVisible(false);
    clearSafeAreaGuard();
  }, [clearSafeAreaGuard]);

  const hideWidget = useCallback(() => {
    maximizeInFlightRef.current = false;
    resolveMaximizeRequest(false);
    finalizeWidgetClose();
    try {
      // Hiding is intentionally the only close operation. It preserves the
      // active Tawk visitor and conversation.
      window.Tawk_API?.hideWidget?.();
    } catch {
      // The widget can already be hidden during WebView teardown.
    }
  }, [finalizeWidgetClose, resolveMaximizeRequest]);

  const clearUnread = useCallback(() => {
    const owner = loggedUidRef.current || activeOwner;
    writeUnread(owner, 0);
    setUnreadCount(0);
    pendingReplyRef.current = null;
    toast.dismiss(SUPPORT_REPLY_TOAST_ID);
  }, [activeOwner]);

  const createIdentityMutationHandlers = useCallback(
    (kind, uid) => {
      const token = {};
      return {
        onTimeout: () => {
          uncertainMutationTokensRef.current.add(token);
          identityUncertainRef.current = true;
          if (uid) sdkIdentityUidRef.current = uid;
          storeIdentityUncertain(true);
          setIdentityStatus("error");
          hideWidget();
        },
        onLateCallback: (error) => {
          if (!uncertainMutationTokensRef.current.delete(token)) return;
          lateMutationRecoveryRef.current?.({ kind, error });
        },
      };
    },
    [hideWidget],
  );

  const performSdkLogout = useCallback(async () => {
    const api = window.Tawk_API;
    if (!apiReadyRef.current || typeof api?.logout !== "function") {
      return false;
    }
    try {
      const mutationHandlers = createIdentityMutationHandlers(
        "logout",
        sdkIdentityUidRef.current || loggedUidRef.current || readStoredUid(),
      );
      await callTawkWithCallback(
        api.logout.bind(api),
        undefined,
        "Tawk logout",
        mutationHandlers,
      );
      if (uncertainMutationTokensRef.current.size === 0) {
        identityUncertainRef.current = false;
        storeIdentityUncertain(false);
      }
      return true;
    } catch (error) {
      if (isAlreadyLoggedOutError(error)) {
        identityUncertainRef.current = false;
        storeIdentityUncertain(false);
        return true;
      }
      console.error(
        "[Tawk] Secure logout failed",
        error?.code || error?.message || "unknown-error",
      );
      return false;
    }
  }, [createIdentityMutationHandlers]);

  const clearConfirmedIdentity = useCallback(() => {
    loggedUidRef.current = "";
    sdkIdentityUidRef.current = "";
    loginPayloadKeyRef.current = "";
    staticPayloadKeyRef.current = "";
    supportContextKeyRef.current = "";
    identityCredentialsRef.current = null;
    storeActiveUid("");
  }, []);

  const syncIdentity = useCallback(
    (supportContext = latestSupportContextRef.current) => {
      const requestedUser = currentUserRef.current;
      const requestedUid = getAuthenticatedUid(requestedUser);
      const requestedGeneration = generationRef.current;
      const requestedProfile =
        requestedUid && currentUserDataUidRef.current === requestedUid
          ? currentUserDataRef.current
          : null;
      const context = compactAttributes(supportContext || {});
      const requestedStaticAttributes = requestedUid
        ? buildAuthenticatedAttributes(requestedUser, requestedProfile, {})
        : {};
      const requestedStaticPayloadKey = JSON.stringify(
        requestedStaticAttributes,
      );
      const contextKey = JSON.stringify(context);
      const taskKey = `${requestedGeneration}:${requestedUid || "guest"}:${requestedStaticPayloadKey}:${contextKey}`;

      if (identityTaskRef.current?.key === taskKey) {
        return identityTaskRef.current.promise;
      }

      const promise = enqueueOperation(async () => {
        if (
          requestedGeneration !== generationRef.current ||
          authLoadingRef.current ||
          getAuthenticatedUid(currentUserRef.current) !== requestedUid ||
          getAuthenticatedUid(auth.currentUser) !== requestedUid
        ) {
          return false;
        }
        if (!apiReadyRef.current) return false;

        // A previous SDK mutation timed out. While its callback is still able
        // to arrive, remain fail-closed. On a fresh app process there is no
        // pending callback, so one confirmed logout safely resets the cookie
        // session before we continue.
        if (identityUncertainRef.current) {
          if (uncertainMutationTokensRef.current.size > 0) return false;
          setIdentityStatus("connecting");
          hideWidget();
          const recovered = await performSdkLogout();
          if (!recovered) {
            setIdentityStatus("error");
            return false;
          }
          clearConfirmedIdentity();
          identityUncertainRef.current = false;
          storeIdentityUncertain(false);
        }

        if (!requestedUid) {
          const previousUid =
            loggedUidRef.current || sdkIdentityUidRef.current || readStoredUid();
          // Only clear a known authenticated/uncertain identity. A normal guest
          // keeps Tawk's visitor cookie, so their conversation survives closing
          // Support and later WebView launches.
          if (previousUid || identityUncertainRef.current) {
            setIdentityStatus("connecting");
            hideWidget();
            const loggedOut = await performSdkLogout();
            if (!loggedOut) {
              setIdentityStatus("error");
              return false;
            }
          }
          clearConfirmedIdentity();
          guestSessionPreparedRef.current = true;
          if (
            supportContextKeyRef.current !== contextKey &&
            typeof window.Tawk_API?.setAttributes === "function"
          ) {
            try {
              await callTawkWithCallback(
                window.Tawk_API.setAttributes.bind(window.Tawk_API),
                context,
                "Tawk guest support context",
              );
              supportContextKeyRef.current = contextKey;
            } catch (error) {
              // Context is useful to agents but must not prevent a guest from
              // opening the pre-chat/knowledge-base experience.
              console.warn(
                "[Tawk] Guest support context was not attached",
                error?.code || error?.message || "unknown-error",
              );
            }
          }
          replyQuarantineUntilRef.current =
            Date.now() + REPLY_EVENT_QUARANTINE_MS;
          setIdentityStatus("guest");
          return true;
        }

        guestSessionPreparedRef.current = false;

        const staticAttributes = requestedStaticAttributes;
        const attributes = { ...staticAttributes, ...context };
        const payloadKey = JSON.stringify(attributes);
        const staticPayloadKey = requestedStaticPayloadKey;
        // Once this UID is authenticated, profile/context changes are metadata
        // only. Never call login again for the same user because login refreshes
        // and reconnects Tawk's conversation session.
        if (
          loggedUidRef.current === requestedUid &&
          identityCredentialsRef.current?.userId === requestedUid
        ) {
          const api = window.Tawk_API;
          if (typeof api?.setAttributes === "function") {
            if (staticPayloadKeyRef.current !== staticPayloadKey) {
              try {
                await callTawkWithCallback(
                  api.setAttributes.bind(api),
                  {
                    ...staticAttributes,
                    userId: identityCredentialsRef.current.userId,
                    hash: identityCredentialsRef.current.hash,
                  },
                  "Tawk profile update",
                );
                staticPayloadKeyRef.current = staticPayloadKey;
              } catch (error) {
                // Keep the confirmed conversation attached. A later profile
                // update or cold-launch login can retry without reconnecting now.
                console.warn(
                  "[Tawk] Profile metadata update was rejected",
                  error?.code || error?.message || "unknown-error",
                );
              }
            }
            if (supportContextKeyRef.current !== contextKey) {
              try {
                await callTawkWithCallback(
                  api.setAttributes.bind(api),
                  context,
                  "Tawk support context",
                );
                supportContextKeyRef.current = contextKey;
              } catch (error) {
                console.warn(
                  "[Tawk] Support context update was rejected",
                  error?.code || error?.message || "unknown-error",
                );
              }
            }
          }
          loginPayloadKeyRef.current = payloadKey;
          setIdentityStatus("ready");
          return true;
        }

        setIdentityStatus("connecting");
        hideWidget();

        const previousUid =
          loggedUidRef.current || sdkIdentityUidRef.current || readStoredUid();
        if (
          (loggedUidRef.current && loggedUidRef.current !== requestedUid) ||
          (sdkIdentityUidRef.current &&
            sdkIdentityUidRef.current !== requestedUid) ||
          (previousUid && previousUid !== requestedUid)
        ) {
          const loggedOut = await performSdkLogout();
          if (!loggedOut) {
            setIdentityStatus("error");
            return false;
          }
          clearConfirmedIdentity();
        }

        const getTawkIdentity = httpsCallable(functions, "getTawkIdentity");
        let identity;
        try {
          const response = await getTawkIdentity({});
          identity = response?.data;
        } catch (error) {
          console.error(
            "[Tawk] Secure identity request failed",
            error?.code || "unknown-error",
          );
          setIdentityStatus("error");
          return false;
        }

        if (
          identity?.userId !== requestedUid ||
          !hasValue(identity?.hash) ||
          requestedGeneration !== generationRef.current ||
          getAuthenticatedUid(currentUserRef.current) !== requestedUid ||
          getAuthenticatedUid(auth.currentUser) !== requestedUid
        ) {
          setIdentityStatus("error");
          return false;
        }

        const api = window.Tawk_API;
        if (typeof api?.login !== "function") {
          setIdentityStatus("error");
          return false;
        }

        try {
          // One atomic call restores the stable visitor, restores their prior
          // conversations, and reproduces the full dashboard ABOUT profile.
          sdkIdentityUidRef.current = requestedUid;
          replyQuarantineUntilRef.current = Number.POSITIVE_INFINITY;
          await callTawkWithCallback(
            api.login.bind(api),
            {
              ...attributes,
              userId: identity.userId,
              hash: identity.hash,
            },
            "Tawk authenticated login",
            createIdentityMutationHandlers("login", requestedUid),
          );
        } catch (error) {
          if (!identityUncertainRef.current) {
            sdkIdentityUidRef.current = "";
            replyQuarantineUntilRef.current =
              Date.now() + REPLY_EVENT_QUARANTINE_MS;
          }
          console.error(
            "[Tawk] Authenticated login failed",
            error?.code || error?.message || "unknown-error",
          );
          setIdentityStatus("error");
          return false;
        }

        if (
          requestedGeneration !== generationRef.current ||
          getAuthenticatedUid(currentUserRef.current) !== requestedUid ||
          getAuthenticatedUid(auth.currentUser) !== requestedUid
        ) {
          return false;
        }

        loggedUidRef.current = requestedUid;
        loginPayloadKeyRef.current = payloadKey;
        staticPayloadKeyRef.current = staticPayloadKey;
        supportContextKeyRef.current = contextKey;
        identityCredentialsRef.current = {
          userId: identity.userId,
          hash: identity.hash,
        };
        storeActiveUid(requestedUid);
        identityUncertainRef.current = false;
        storeIdentityUncertain(false);
        replyQuarantineUntilRef.current =
          Date.now() + REPLY_EVENT_QUARANTINE_MS;
        setIdentityStatus("ready");
        return true;
      }).finally(() => {
        if (identityTaskRef.current?.promise === promise) {
          identityTaskRef.current = null;
        }
      });

      identityTaskRef.current = { key: taskKey, promise };
      return promise;
    },
    [
      clearConfirmedIdentity,
      createIdentityMutationHandlers,
      enqueueOperation,
      hideWidget,
      performSdkLogout,
    ],
  );

  syncIdentityRef.current = syncIdentity;

  lateMutationRecoveryRef.current = ({ kind, error }) => {
    if (!mountedRef.current || uncertainMutationTokensRef.current.size > 0) {
      return;
    }

    if (kind === "login" && !error) {
      // A login that completed after our timeout may now own the SDK session.
      // No other identity is allowed in meanwhile, so one queued logout safely
      // returns the widget to a known state before retrying current Firebase auth.
      void enqueueOperation(async () => {
        const cleared = await performSdkLogout();
        if (!cleared) return;
        clearConfirmedIdentity();
        identityUncertainRef.current = false;
        storeIdentityUncertain(false);
        setIdentityStatus("idle");
        void syncIdentityRef.current?.();
      });
      return;
    }

    // A late failed login did not establish identity; a late successful logout
    // removed it. A failed logout leaves the previous confirmed refs intact so
    // the next reconciliation can retry that exact transition safely.
    if (kind === "login") sdkIdentityUidRef.current = "";
    if (kind === "logout" && !error) clearConfirmedIdentity();
    identityUncertainRef.current = false;
    storeIdentityUncertain(false);
    setIdentityStatus("idle");
    void syncIdentityRef.current?.();
  };

  const markReady = useCallback(() => {
    if (!mountedRef.current || apiReadyRef.current) return;
    apiReadyRef.current = true;
    scriptFailedRef.current = false;
    const script = document.getElementById(SCRIPT_ID);
    if (script) script.dataset.mythriftReady = "true";
    setLoaded(true);
    hideWidget();
    void syncIdentityRef.current?.();
  }, [hideWidget]);

  const injectScript = useCallback(() => {
    let script = document.getElementById(SCRIPT_ID);
    if (script) {
      if (isTawkSdkReady()) markReady();
      return script;
    }

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();
    window.Tawk_API.customStyle = {
      ...(window.Tawk_API.customStyle || {}),
      zIndex: "1000000 !important",
    };

    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = TAWK_WIDGET_SRC;
    script.dataset.mythriftWidgetId = TAWK_WIDGET_ID;
    script.charset = "UTF-8";
    script.crossOrigin = "anonymous";
    script.addEventListener(
      "load",
      () => {
        scriptFailedRef.current = false;
        // onLoad remains authoritative. The status probe only covers a React
        // StrictMode/HMR remount after a previously confirmed singleton load.
        if (isTawkSdkReady()) markReady();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        scriptFailedRef.current = true;
      },
      { once: true },
    );
    document.head.appendChild(script);
    return script;
  }, [markReady]);

  const showReplyToast = useCallback((owner) => {
    const sdkOwner = loggedUidRef.current || "guest";
    const firebaseOwner =
      getAuthenticatedUid(currentUserRef.current) || "guest";
    if (
      owner !== sdkOwner ||
      owner !== firebaseOwner ||
      widgetVisibleRef.current
    ) {
      return;
    }
    pendingReplyRef.current = null;
    void appHaptics.success();
    toast("Tap to reopen your support conversation.", {
      id: SUPPORT_REPLY_TOAST_ID,
      title: "Support replied",
      icon: "💬",
      duration: 3500,
      onPress: async () => {
        if (
          (loggedUidRef.current || "guest") !== owner ||
          (getAuthenticatedUid(currentUserRef.current) || "guest") !== owner
        ) {
          return false;
        }
        return (await openChatRef.current?.({
          "support-entry": "support-reply",
          screen:
            cleanAttribute(window.location?.pathname).replace(/^\//, "") ||
            "unknown",
        })) ?? false;
      },
    });
  }, []);

  const handleAgentMessage = useCallback(
    (message) => {
      if (
        widgetVisibleRef.current ||
        Date.now() < replyQuarantineUntilRef.current
      ) {
        return;
      }

      const signature = messageFingerprint(message);
      const now = Date.now();
      if (
        signature &&
        signature === lastAgentMessageRef.current.signature &&
        now - lastAgentMessageRef.current.at < 1500
      ) {
        return;
      }
      lastAgentMessageRef.current = { signature, at: now };

      const owner = loggedUidRef.current || "guest";
      const firebaseOwner =
        getAuthenticatedUid(currentUserRef.current) || "guest";
      if (owner !== firebaseOwner) return;
      const nextUnread = writeUnread(owner, readUnread(owner) + 1);
      if (owner === (getAuthenticatedUid(currentUserRef.current) || "guest")) {
        setUnreadCount(nextUnread);
      }

      if (document.visibilityState === "visible") showReplyToast(owner);
      else pendingReplyRef.current = { owner };
    },
    [showReplyToast],
  );

  const confirmWidgetOpen = useCallback(() => {
    maximizeInFlightRef.current = false;
    ignoreCloseEventsUntilRef.current = Date.now() + 500;
    widgetVisibleRef.current = true;
    setWidgetVisible(true);
    clearUnread();
    applySafeAreaGuard();
    resolveMaximizeRequest(true);
  }, [applySafeAreaGuard, clearUnread, resolveMaximizeRequest]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      openAttemptRef.current += 1;
      openTaskRef.current = null;
      resolveMaximizeRequest(false);
      frameObserverRef.current?.disconnect();
      frameScanTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [resolveMaximizeRequest]);

  useEffect(() => {
    window.Tawk_API = window.Tawk_API || {};
    const api = window.Tawk_API;
    const previousCallbacks = {
      onLoad: api.onLoad,
      onChatMaximized: api.onChatMaximized,
      onChatMinimized: api.onChatMinimized,
      onChatHidden: api.onChatHidden,
      onChatMessageAgent: api.onChatMessageAgent,
    };

    const onLoad = () => markReady();
    const onChatMaximized = () => {
      const request = maximizeRequestRef.current;
      if (!request) {
        // A delayed SDK event must never resurrect a cancelled surface. An
        // already-confirmed visible chat can legitimately emit a duplicate.
        if (!widgetVisibleRef.current) hideWidget();
        return;
      }
      if (
        request.attempt !== openAttemptRef.current ||
        request.generation !== generationRef.current ||
        request.uid !== getAuthenticatedUid(currentUserRef.current) ||
        request.uid !== getAuthenticatedUid(auth.currentUser)
      ) {
        resolveMaximizeRequest(false);
        hideWidget();
        return;
      }
      confirmWidgetOpen();
    };
    const onChatMinimized = () => {
      if (
        maximizeInFlightRef.current ||
        Date.now() < ignoreCloseEventsUntilRef.current
      ) {
        return;
      }
      hideWidget();
    };
    const onChatHidden = () => {
      if (
        maximizeInFlightRef.current ||
        Date.now() < ignoreCloseEventsUntilRef.current
      ) {
        return;
      }
      finalizeWidgetClose();
    };
    const onChatMessageAgent = (message) => handleAgentMessage(message);

    api.onLoad = onLoad;
    api.onChatMaximized = onChatMaximized;
    api.onChatMinimized = onChatMinimized;
    api.onChatHidden = onChatHidden;
    api.onChatMessageAgent = onChatMessageAgent;
    api.customStyle = {
      ...(api.customStyle || {}),
      zIndex: "1000000 !important",
    };

    if (isTawkSdkReady()) markReady();
    return () => {
      Object.entries(previousCallbacks).forEach(([name, previous]) => {
        const installed = {
          onLoad,
          onChatMaximized,
          onChatMinimized,
          onChatHidden,
          onChatMessageAgent,
        }[name];
        if (api[name] === installed) api[name] = previous;
      });
    };
  }, [
    applySafeAreaGuard,
    clearUnread,
    confirmWidgetOpen,
    finalizeWidgetClose,
    handleAgentMessage,
    hideWidget,
    markReady,
    resolveMaximizeRequest,
  ]);

  useEffect(() => {
    if (authLoading) return;
    injectScript();
  }, [authLoading, injectScript]);

  useEffect(() => {
    setUnreadCount(readUnread(activeOwner));
  }, [activeOwner]);

  useEffect(() => {
    // Invalidate and hide the previous owner's surface immediately. Do not
    // wait for the incoming account's Firestore profile lookup to finish.
    generationRef.current += 1;
    identityTaskRef.current = null;
    openAttemptRef.current += 1;
    openTaskRef.current = null;
    latestSupportContextRef.current = inferSupportContext();
    supportContextKeyRef.current = "";
    pendingReplyRef.current = null;
    lastAgentMessageRef.current = { signature: "", at: 0 };
    replyQuarantineUntilRef.current = Number.POSITIVE_INFINITY;
    toast.dismiss(SUPPORT_REPLY_TOAST_ID);
    hideWidget();
  }, [currentUser?.uid, hideWidget]);

  useEffect(() => {
    if (authLoading) return;
    if (apiReadyRef.current) void syncIdentityRef.current?.();
  }, [authLoading, currentUser?.uid]);

  useEffect(() => {
    if (
      authLoading ||
      !getAuthenticatedUid(currentUserRef.current) ||
      !apiReadyRef.current
    ) {
      return;
    }
    // Profile hydration/edits update metadata in place. They never hide or
    // reconnect an already-open support conversation.
    void syncIdentityRef.current?.();
  }, [authLoading, profileSignature]);

  useEffect(() => {
    const showPendingReply = () => {
      if (document.visibilityState !== "visible") return;
      const pending = pendingReplyRef.current;
      if (pending) showReplyToast(pending.owner);
    };
    document.addEventListener("visibilitychange", showPendingReply);
    return () => {
      document.removeEventListener("visibilitychange", showPendingReply);
    };
  }, [showReplyToast]);

  const openChat = useCallback(
    (rawContext) => {
      if (openTaskRef.current?.generation === generationRef.current) {
        return openTaskRef.current.promise;
      }
      const attempt = ++openAttemptRef.current;

      const task = (async () => {
        const authReady = await waitUntil(() => !authLoadingRef.current);
        if (!authReady || attempt !== openAttemptRef.current) {
          if (!authReady) {
            toast.error(
              "Your account is still loading. Please try support again.",
            );
          }
          return false;
        }

        const openingGeneration = generationRef.current;
        const openingUid = getAuthenticatedUid(currentUserRef.current);
        const isCurrentOpen = () =>
          attempt === openAttemptRef.current &&
          openingGeneration === generationRef.current &&
          openingUid === getAuthenticatedUid(currentUserRef.current) &&
          openingUid === getAuthenticatedUid(auth.currentUser);

        if (!isCurrentOpen()) {
          return false;
        }

        if (scriptFailedRef.current) {
          document.getElementById(SCRIPT_ID)?.remove();
          scriptFailedRef.current = false;
        }
        injectScript();
        const ready = await waitUntil(() => apiReadyRef.current);
        if (!ready || !isCurrentOpen()) {
          if (!ready) {
            toast.error(
              "Support couldn't load. Check your connection and try again.",
            );
          }
          return false;
        }

        const supportContext = inferSupportContext(rawContext);
        latestSupportContextRef.current = supportContext;
        const identityReady = await syncIdentity(supportContext);
        if (!identityReady || !isCurrentOpen()) {
          toast.error(
            openingUid
              ? "Support couldn't securely connect your account. Please try again."
              : "Support couldn't safely open. Please try again.",
          );
          return false;
        }

        const api = window.Tawk_API;
        if (
          typeof api?.showWidget !== "function" ||
          typeof api?.maximize !== "function"
        ) {
          toast.error("Support couldn't open. Please try again.");
          return false;
        }

        try {
          const maximized = new Promise((resolve) => {
            const timer = window.setTimeout(() => {
              if (maximizeRequestRef.current?.attempt === attempt) {
                maximizeRequestRef.current = null;
                maximizeInFlightRef.current = false;
              }
              resolve(false);
            }, 5_000);
            maximizeRequestRef.current = {
              attempt,
              generation: openingGeneration,
              uid: openingUid,
              timer,
              resolve,
            };
          });
          maximizeInFlightRef.current = true;
          ignoreCloseEventsUntilRef.current = 0;
          widgetVisibleRef.current = true;
          setWidgetVisible(true);
          applySafeAreaGuard();
          api.showWidget();
          let alreadyMaximized = false;
          try {
            alreadyMaximized = api.isChatMaximized?.() === true;
          } catch {
            alreadyMaximized = false;
          }

          if (alreadyMaximized && isCurrentOpen()) {
            // hideWidget preserves Tawk's internal maximized state. Re-showing
            // that surface does not reliably emit onChatMaximized again.
            confirmWidgetOpen();
          } else {
            api.maximize();
            const stateConfirmed = await waitUntil(() => {
              try {
                return api.isChatMaximized?.() === true;
              } catch {
                return false;
              }
            }, 750);
            if (
              stateConfirmed &&
              isCurrentOpen() &&
              maximizeRequestRef.current?.attempt === attempt
            ) {
              confirmWidgetOpen();
            }
          }
          const opened = await maximized;
          if (!opened || !isCurrentOpen()) {
            hideWidget();
            if (isCurrentOpen()) {
              toast.error("Support couldn't open. Please try again.");
            }
            return false;
          }
          return true;
        } catch {
          hideWidget();
          toast.error("Support couldn't open. Please try again.");
          return false;
        }
      })().finally(() => {
        if (openTaskRef.current?.promise === task) openTaskRef.current = null;
      });

      openTaskRef.current = {
        generation: generationRef.current,
        promise: task,
      };
      return task;
    }, [
      applySafeAreaGuard,
      confirmWidgetOpen,
      hideWidget,
      injectScript,
      syncIdentity,
    ],
  );

  openChatRef.current = openChat;

  const logoutChat = useCallback(
    async ({ clearCurrentUnread = true } = {}) => {
      generationRef.current += 1;
      identityTaskRef.current = null;
      openAttemptRef.current += 1;
      openTaskRef.current = null;
      hideWidget();
      toast.dismiss(SUPPORT_REPLY_TOAST_ID);
      pendingReplyRef.current = null;
      const owner = loggedUidRef.current || readStoredUid() || activeOwner;

      if (
        !apiReadyRef.current &&
        (loggedUidRef.current ||
          sdkIdentityUidRef.current ||
          readStoredUid() ||
          identityUncertainRef.current)
      ) {
        const ready = await waitUntil(() => apiReadyRef.current);
        if (!ready) return false;
      }
      if (
        loggedUidRef.current ||
        sdkIdentityUidRef.current ||
        readStoredUid() ||
        identityUncertainRef.current
      ) {
        const loggedOut = await enqueueOperation(performSdkLogout);
        if (!loggedOut) {
          setIdentityStatus("error");
          return false;
        }
      }

      clearConfirmedIdentity();
      identityUncertainRef.current = false;
      storeIdentityUncertain(false);
      if (clearCurrentUnread) {
        writeUnread(owner, 0);
        setUnreadCount(0);
      }
      setIdentityStatus("idle");
      return true;
    },
    [
      activeOwner,
      clearConfirmedIdentity,
      enqueueOperation,
      hideWidget,
      performSdkLogout,
    ],
  );

  // Kept for context API compatibility. With one widget this only clears a
  // private visitor before a guest session.
  const resetGuestSupport = useCallback(async () => {
    if (getAuthenticatedUid(currentUserRef.current)) return false;
    generationRef.current += 1;
    openAttemptRef.current += 1;
    openTaskRef.current = null;
    hideWidget();
    const ready = apiReadyRef.current
      ? true
      : await waitUntil(() => apiReadyRef.current);
    if (!ready) return false;
    const loggedOut = await enqueueOperation(performSdkLogout);
    if (!loggedOut) return false;
    clearConfirmedIdentity();
    guestSessionPreparedRef.current = true;
    writeUnread("guest", 0);
    setUnreadCount(0);
    setIdentityStatus("guest");
    return true;
  }, [
    clearConfirmedIdentity,
    enqueueOperation,
    hideWidget,
    performSdkLogout,
  ]);

  const contextValue = useMemo(
    () => ({
      openChat,
      logoutChat,
      resetGuestSupport,
      clearUnread,
      loaded,
      unreadCount,
      identityStatus,
    }),
    [
      clearUnread,
      identityStatus,
      loaded,
      logoutChat,
      openChat,
      resetGuestSupport,
      unreadCount,
    ],
  );

  return (
    <TawkContext.Provider value={contextValue}>
      {children}
      {isNativeApp && widgetVisible
        ? createPortal(
            <button
              type="button"
              className="tawk-native-close"
              aria-label="Close support chat"
              onClick={() => {
                void appHaptics.light();
                hideWidget();
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>,
            document.body,
          )
        : null}
    </TawkContext.Provider>
  );
};

export const useTawk = () => useContext(TawkContext);

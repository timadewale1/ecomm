// hooks/useAuth.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.config";
import toast from "react-hot-toast";
import { isBuyerSocialAuthProvisioning } from "../services/buyerSocialAuth";

const AuthContext = createContext();
const USER_DATA_KEY = "mythrift:userData";
const USER_DATA_OWNER_KEY = "mythrift:userDataOwner";

const readCachedUserData = (uid) => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // The embedded owner is written with the data in one storage operation.
    // Legacy user documents often carry `uid`; the companion key remains a
    // fallback for legacy vendor documents that do not.
    const ownerUid =
      data?.__myThriftAuthUid ||
      data?.uid ||
      localStorage.getItem(USER_DATA_OWNER_KEY) ||
      null;
    return ownerUid === uid ? data : null;
  } catch {
    return null;
  }
};

const storeCachedUserData = (data, uid) => {
  try {
    localStorage.setItem(
      USER_DATA_KEY,
      JSON.stringify({ ...data, __myThriftAuthUid: uid }),
    );
    localStorage.setItem(USER_DATA_OWNER_KEY, uid);
  } catch {
    // Authentication must keep working when WebView storage is unavailable.
  }
};

const clearCachedUserData = () => {
  try {
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(USER_DATA_OWNER_KEY);
  } catch {
    // Best-effort cache cleanup only.
  }
};

const roleForCollection = (collectionName) =>
  collectionName === "vendors" ? "vendor" : "user";

const collectionForRole = (role) =>
  role === "vendor" ? "vendors" : role === "user" ? "users" : null;

const dataFromSnapshot = (snapshot, collectionName) =>
  snapshot?.exists()
    ? { ...snapshot.data(), role: roleForCollection(collectionName) }
    : null;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [currentUserData, setCurrentUserData] = useState(() =>
    readCachedUserData(auth.currentUser?.uid),
  );
  const [currentUserDataUid, setCurrentUserDataUid] = useState(() =>
    readCachedUserData(auth.currentUser?.uid) ? auth.currentUser?.uid : null,
  );
  const [loading, setLoading] = useState(true);
  const [accountDeactivated, setAccountDeactivated] = useState(false);
  const [profileResolution, setProfileResolution] = useState("loading");
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const authGenerationRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const generation = ++authGenerationRef.current;
      const uid = user?.uid || null;
      const isCurrent = () =>
        generation === authGenerationRef.current &&
        (auth.currentUser?.uid || null) === uid;

      setLoading(true);
      setProfileResolution("loading");
      setAccountDeactivated(false);

      if (user) {
        // Bind cached profile data to the Firebase UID that produced it. This
        // prevents a fast account switch from briefly exposing account A's
        // profile while account B is restoring.
        const cachedData = readCachedUserData(user.uid);
        setCurrentUser(user);
        setCurrentUserData(cachedData);
        setCurrentUserDataUid(cachedData ? user.uid : null);
        if (!cachedData) clearCachedUserData();

        // A UID-bound cached profile is enough to choose the correct shell
        // immediately. Firestore still validates it in the background before
        // any protected write, and rules remain the security boundary.
        if (cachedData?.role) {
          setLoading(false);
          setProfileResolution("cached");
        }

        const userRef = doc(db, "users", user.uid);
        const vendorRef = doc(db, "vendors", user.uid);
        const preferredCollection = collectionForRole(cachedData?.role);
        let resolvedData = null;
        let networkFailed = false;

        const resolveFromNetwork = async () => {
          if (preferredCollection) {
            const preferredRef =
              preferredCollection === "vendors" ? vendorRef : userRef;
            const preferredResult = await Promise.allSettled([
              getDoc(preferredRef),
            ]);
            if (!isCurrent()) return null;
            if (preferredResult[0].status === "fulfilled") {
              const preferredData = dataFromSnapshot(
                preferredResult[0].value,
                preferredCollection,
              );
              if (preferredData) return preferredData;
            } else {
              networkFailed = true;
              return null;
            }

            const fallbackCollection =
              preferredCollection === "vendors" ? "users" : "vendors";
            const fallbackRef =
              fallbackCollection === "vendors" ? vendorRef : userRef;
            try {
              return dataFromSnapshot(
                await getDoc(fallbackRef),
                fallbackCollection,
              );
            } catch {
              networkFailed = true;
              return null;
            }
          }

          const [userResult, vendorResult] = await Promise.allSettled([
            getDoc(userRef),
            getDoc(vendorRef),
          ]);
          if (!isCurrent()) return null;
          networkFailed =
            userResult.status === "rejected" &&
            vendorResult.status === "rejected";

          const userData =
            userResult.status === "fulfilled"
              ? dataFromSnapshot(userResult.value, "users")
              : null;
          const vendorData =
            vendorResult.status === "fulfilled"
              ? dataFromSnapshot(vendorResult.value, "vendors")
              : null;

          if (userData && vendorData) {
            console.error("[auth] UID has both user and vendor profiles", {
              uid: user.uid,
            });
          }
          // Preserve the existing compatibility rule: legacy dual-profile
          // accounts resolve as buyers until they are repaired server-side.
          return userData || vendorData;
        };

        try {
          resolvedData = resolvedData || (await resolveFromNetwork());

          // A native provider publishes its Firebase session before the buyer
          // profile transaction can finish. Ordinary launches keep the single
          // short retry; a marked social-auth transaction receives a bounded
          // 3-second provisioning window so a new Apple/X account is never
          // falsely signed out on a slower mobile connection.
          if (!resolvedData && !networkFailed && isCurrent()) {
            const provisioning = isBuyerSocialAuthProvisioning(user.uid);
            const retryCount = provisioning ? 6 : 1;
            const retryDelay = provisioning ? 500 : 650;
            for (
              let attempt = 0;
              attempt < retryCount && !resolvedData && !networkFailed && isCurrent();
              attempt += 1
            ) {
              await delay(retryDelay);
              resolvedData = await resolveFromNetwork();
            }
          }

          if (!isCurrent()) return;

          if (resolvedData?.isDeactivated) {
            setAccountDeactivated(true);
            setProfileResolution("deactivated");
            await signOut(auth);
            return;
          }

          if (resolvedData) {
            setCurrentUserData(resolvedData);
            setCurrentUserDataUid(user.uid);
            storeCachedUserData(resolvedData, user.uid);
            setProfileResolution("resolved");
            setLoading(false);
            return;
          }

          if (networkFailed) {
            // Never turn a transport failure into an unauthorized-account
            // logout. A valid UID-bound cache can continue in offline mode.
            setProfileResolution(cachedData ? "offline-cached" : "offline");
            setLoading(false);
            return;
          }

          setProfileResolution("missing");
          setLoading(false);
          toast.error("We couldn’t finish loading this account. Please sign in again.");
          await signOut(auth);
        } catch (error) {
          if (!isCurrent()) return;
          console.error("[auth] Profile resolution failed:", error);
          setProfileResolution(cachedData ? "offline-cached" : "offline");
          setLoading(false);
        }
      } else {
        // signed out
        setCurrentUser(null);
        setCurrentUserData(null);
        setCurrentUserDataUid(null);
        clearCachedUserData();
        setProfileResolution("signed-out");
        setLoading(false);
      }
    });

    return () => {
      authGenerationRef.current += 1;
      unsubscribe();
    };
  }, [profileRefreshToken]);

  const refreshAuthProfile = useCallback(() => {
    setProfileResolution("loading");
    setLoading(true);
    setProfileRefreshToken((value) => value + 1);
  }, []);

  const updateCurrentUserData = useCallback((patch = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !patch || typeof patch !== "object") return;

    setCurrentUserData((current) => {
      const next = {
        ...(current || {}),
        ...patch,
      };
      storeCachedUserData(next, uid);
      return next;
    });
    setCurrentUserDataUid(uid);
  }, []);

  const startOTPVerification = () => {};
  const endOTPVerification = () => {};

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserData,
        currentUserDataUid,
        loading,
        profileResolution,
        accountDeactivated,
        refreshAuthProfile,
        updateCurrentUserData,
        startOTPVerification,
        endOTPVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

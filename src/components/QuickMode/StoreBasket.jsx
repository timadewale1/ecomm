import React, {
  useState,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeFromCart } from "../../redux/actions/action";
import { BsBasket } from "react-icons/bs";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import LocationPicker from "../Location/LocationPicker";

import IframeModal from "../PwaModals/PushNotifsModal";
import { LiaTimesSolid } from "react-icons/lia";
import {
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  TwitterAuthProvider,
  getAdditionalUserInfo,
  signInAnonymously,
} from "firebase/auth";
import { signInWithGoogle } from "../../services/firebaseAuth";
import { FaXTwitter } from "react-icons/fa6";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import posthog from "posthog-js";
import IkImage from "../../services/IkImage";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Badge from "../Badge/Badge";
import { FcGoogle } from "react-icons/fc";
import { SiReacthookform } from "react-icons/si";
import { RotatingLines } from "react-loader-spinner";
import AppBottomSheet from "../layout/AppBottomSheet";
import { isVariantSizeHidden } from "../../services/productVariantSelection";
import { fetchAndMergeCart } from "../../services/cartMerge";
const StoreBasket = forwardRef(function StoreBasket(
  { vendorId, quickMode = false },
  ref
) {
  const products = useSelector((s) => s.cart?.[vendorId]?.products || {});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerUrl, setDisclaimerUrl] = useState("");
  const [showDeliveryStep, setShowDeliveryStep] = useState(false);
  const [phoneRaw, setPhoneRaw] = useState(""); // store digits user types
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [note, setNote] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmFirst, setConfirmFirst] = useState("");
  const [confirmLast, setConfirmLast] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingAuthUser, setPendingAuthUser] = useState(null);
  const [confirmProvider, setConfirmProvider] = useState(null);
  const [confirmEmailLocked, setConfirmEmailLocked] = useState(false);
  const [pendingHandle, setPendingHandle] = useState(""); // twitter handle (no @)

  const [savingDelivery, setSavingDelivery] = useState(false);
  const isValidNg10 = (s) => /^[1-9]\d{9}$/.test(s);

  useEffect(() => {
    let cancelled = false;

    const prefill = async () => {
      if (!showDeliveryStep || !auth.currentUser) return;

      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (!snap.exists()) return;
        const d = snap.data() || {};

        // Phone: store as local 10 digits (strip +234 / leading 0)
        if (d.phoneNumber) {
          const digits = String(d.phoneNumber).replace(/\D/g, "");
          // Handle formats: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
          let local10 = digits;
          if (local10.startsWith("234")) local10 = local10.slice(3);
          if (local10.startsWith("0")) local10 = local10.slice(1);
          local10 = local10.slice(-10);
          if (local10.length === 10) setPhoneRaw(local10);
        }

        if (d.address && !cancelled) setAddress(d.address);
        if (d.location?.lat && d.location?.lng && !cancelled) {
          setCoords({ lat: d.location.lat, lng: d.location.lng });
        }
      } catch (e) {
        console.warn("Prefill delivery info failed:", e);
      }
    };

    prefill();
    return () => {
      cancelled = true;
    };
  }, [showDeliveryStep]);

  // Replace your current genUsername with this:
  const genUsername = (base) => {
    const seed = (base ?? "user").toString().trim().toLowerCase() || "user";
    return `${seed}${Math.floor(100 + Math.random() * 900)}`;
  };

  const handleManualCheckout = async () => {
    if (submitting) return; // guard against double-clicks

    if (!fname || !lname || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      setSubmitting(true);

      /* ───────── block vendor e-mails ───────── */
      const vSnap = await getDocs(
        query(collection(db, "vendors"), where("email", "==", cleanEmail))
      );
      if (!vSnap.empty) {
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      /* ───────── existing user? redirect to /login ───────── */
      const uSnap = await getDocs(
        query(collection(db, "users"), where("email", "==", cleanEmail))
      );
      if (!uSnap.empty) {
        toast(
          "Looks like you already have an account — please log in instead."
        );
        navigate("/login", { state: { from: "/latest-cart" } });
        return;
      }

      /* ───────── 1️⃣  anonymous sign-in ───────── */
      const { user } = await signInAnonymously(auth);

      /* ───────── 2️⃣  create / update user doc ───────── */
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      const baseData = {
        displayName: `${fname} ${lname}`.replace(/\s+/g, " ").trim(),
        username: genUsername(fname),
        email: cleanEmail,
        role: "user",
        referrer: localStorage.getItem("referrer") || null,
        birthday: "not-set",
        profileComplete: false,
        walletSetup: false,
        welcomeEmailSent: false,
        notificationAllowed: false,
        createdAt: new Date(),
      };

      if (userSnap.exists()) {
        await updateDoc(userRef, baseData); // merge
      } else {
        await setDoc(userRef, { uid: user.uid, ...baseData });
      }

      /* ───────── 3️⃣  cart merge, PostHog, fast flow ───────── */
      identifyUser(
        posthog,
        { ...user, displayName: baseData.displayName },
        { role: "user" }
      );

      await fetchCartFromFirestore(user.uid);

      setShowDeliveryStep(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not continue, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const { items, itemCount, total } = useMemo(() => {
    const arr = Object.entries(products).map(([productKey, p]) => ({
      ...p,
      productKey,
    }));
    const count = arr.reduce((sum, p) => sum + p.quantity, 0);
    const tot = arr.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return { items: arr, itemCount: count, total: tot };
  }, [products]);

  /* ---------- helpers ---------- */
  const identifyUser = (ph, userRecord, extra = {}) => {
    if (!ph) return; // provider not ready

    /* alias only the first time on this browser */
    const aliasKey = `ph_alias_${userRecord.uid}`;
    if (!localStorage.getItem(aliasKey)) {
      ph.alias(userRecord.uid);
      localStorage.setItem(aliasKey, "1");
    }

    ph.identify(userRecord.uid, {
      email: userRecord.email,
      name: userRecord.displayName ?? extra.username ?? "Unknown",
      phone: userRecord.phoneNumber ?? null,
      created_at: userRecord.metadata.creationTime,
      ...extra, // role, plan, etc.
    });
  };

  const handleConfirmDetails = async () => {
    const f = confirmFirst.trim();
    const l = confirmLast.trim();
    const e = confirmEmail.trim().toLowerCase();

    if (!f || !l || !e)
      return toast.error("Please fill in first name, last name and email.");
    if (!onlyLetters(f))
      return toast.error("First name can contain only letters.");
    if (!onlyLetters(l))
      return toast.error("Last name can contain only letters.");
    if (!isEmail(e)) return toast.error("Please enter a valid email address.");
    if (!pendingAuthUser) return toast.error("No session found. Please retry.");

    try {
      setConfirmLoading(true);

      // 1) HARD BLOCK: vendor email (applies to both providers)
      const vSnap = await getDocs(
        query(collection(db, "vendors"), where("email", "==", e))
      );
      const userVendorSnap = await getDocs(
        query(collection(db, "users"), where("email", "==", e))
      );
      const isVendorByUsers =
        !userVendorSnap.empty &&
        userVendorSnap.docs[0].data()?.role === "vendor";
      if (!vSnap.empty || isVendorByUsers) {
        try {
          await pendingAuthUser.delete?.();
        } catch {
          await auth.signOut();
        }
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // 2) Cross-provider conflict checks (Twitter needs this; Google email is owned by Google already)
      if (confirmProvider === "twitter") {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        if (methods.includes("password") && !methods.includes("twitter.com")) {
          try {
            await pendingAuthUser.delete?.();
          } catch {
            await auth.signOut();
          }
          toast.info(
            "This email was registered with a password. Please log in to continue."
          );
          navigate("/login", { state: { email: e, linkTwitter: true } });
          return;
        }
        if (
          methods.includes("google.com") &&
          !methods.includes("twitter.com")
        ) {
          try {
            await pendingAuthUser.delete?.();
          } catch {
            await auth.signOut();
          }
          toast.info(
            "This email is already registered with Google. Please log in with your original method."
          );
          navigate("/login", { state: { email: e } });
          return;
        }
      }

      // 3) Create/merge Firestore user
      const userRef = doc(db, "users", pendingAuthUser.uid);
      const userDoc = await getDoc(userRef);
      const fullName = `${f} ${l}`.trim();
      const baseData = {
        uid: pendingAuthUser.uid,
        email: e,

        displayName: fullName,
        username: genUsername(pendingHandle || f),
        role: "user",
        referrer: localStorage.getItem("referrer") || null,
        birthday: "not-set",
        profileComplete: false,
        walletSetup: false,
        welcomeEmailSent: false,
        notificationAllowed: false,
        createdAt: new Date(),
      };

      if (!userDoc.exists()) {
        await setDoc(userRef, baseData);
        posthog?.capture("signup_completed", { method: confirmProvider });
      } else {
        const patch = {
          email: e,
          displayName: fullName,
        };
        if (!userDoc.data()?.username)
          patch.username = genUsername(pendingHandle || f);
        await setDoc(userRef, patch, { merge: true });
      }

      // 4) Cart merge + analytics
      await fetchCartFromFirestore(pendingAuthUser.uid);

      identifyUser(
        posthog,
        { ...pendingAuthUser, displayName: `${f} ${l}`, email: e },
        { role: "user" }
      );
      posthog?.capture("login_succeeded", { method: confirmProvider });

      // Close confirm → open delivery
      setShowConfirmModal(false);
      setPendingAuthUser(null);
      setConfirmFirst("");
      setConfirmLast("");
      setAuthOpen(false);
      setConfirmEmail("");
      setShowDeliveryStep(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not save your details. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const onlyLetters = (s) => /^[A-Za-z][A-Za-z\s'-]*$/.test(s.trim());
  const isEmail = (s) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase());

  const isVendorEmail = async (cleanEmail) => {
    const vendorSnapshot = await getDocs(
      query(collection(db, "vendors"), where("email", "==", cleanEmail))
    );
    if (!vendorSnapshot.empty) return true;

    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("email", "==", cleanEmail))
    );
    return (
      !userSnapshot.empty && userSnapshot.docs[0].data()?.role === "vendor"
    );
  };

  const splitDisplayName = (displayName = "") => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  };

  const fetchCartFromFirestore = async (userId) => {
    try {
      return await fetchAndMergeCart(db, userId, dispatch);
    } catch (error) {
      console.warn("Cart import will retry after quick checkout login:", error);
      return null;
    }
  };
  const formatNaira = (n) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  const handleRemove = async (key) => {
    const syncPromise = dispatch(removeFromCart({ vendorId, productKey: key }));
    toast(`Removed item from cart`, { icon: "🗑️" });
    await syncPromise;
  };
  const openDisclaimerModal = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDisclaimerUrl(`${window.location.origin}${path}`);
    setShowDisclaimerModal(true);
  };
  const handleCheckout = () => {
    setOpen(false);

    if (quickMode) {
      if (!auth.currentUser) {
        setAuthOpen(true);
        return;
      }
      // already signed-in → resume delivery step immediately
      sessionStorage.setItem(`quickFlow_${vendorId}`, "delivery");
      setShowDeliveryStep(true);
    } else {
      navigate(`/newcheckout/${vendorId}`);
    }
  };
  useImperativeHandle(ref, () => ({
    openCheckoutAuth() {
      // guard: nothing to checkout? show the drawer instead
      if (!itemCount) {
        setOpen(true);
        return;
      }

      if (quickMode) {
        if (!auth.currentUser) {
          // jump straight to the sign-in sheet
          setAuthOpen(true);
        } else {
          // already signed in → jump straight to delivery step
          sessionStorage.setItem(`quickFlow_${vendorId}`, "delivery");
          setShowDeliveryStep(true);
        }
      } else {
        navigate(`/newcheckout/${vendorId}`);
      }
    },
    // (optional) let parents read the count for a badge
    getItemCount() {
      return itemCount;
    },
  }));
  /* nothing in cart? don’t render anything */
  if (!itemCount) return null;

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      posthog?.capture("login_attempted", { method: "google" });

      const result = await signInWithGoogle(auth, provider);
      const user = result.user;

      // ---- HARD BLOCK: vendor emails (no writes) ----
      const vSnap = await getDocs(
        query(collection(db, "vendors"), where("email", "==", user.email))
      );
      if (!vSnap.empty) {
        await auth.signOut();
        toast.error("This email is already used for a Vendor account!");
        return;
      }
      const uSnap = await getDocs(
        query(collection(db, "users"), where("email", "==", user.email))
      );
      if (!uSnap.empty && uSnap.docs[0].data()?.role === "vendor") {
        await auth.signOut();
        toast.error("This email is already used for a Vendor account!");
        return;
      }
      // -----------------------------------------------

      // Initialize/patch user doc (non-destructive)
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName ?? null,
          username: genUsername(user.displayName),
          profileComplete: false,
          walletSetup: false,
          birthday: "not-set",
          welcomeEmailSent: false,
          notificationAllowed: false,
          role: "user",
          referrer: localStorage.getItem("referrer") || null,
          createdAt: new Date(),
        });
        posthog?.capture("signup_completed", { method: "google" });
      } else {
        const data = userDoc.data() || {};
        const patch = {};
        if (data.displayName == null && user.displayName)
          patch.displayName = user.displayName;
        if (!data.username) patch.username = genUsername(user.displayName);
        if (Object.keys(patch).length) {
          await setDoc(userRef, patch, { merge: true });
        }
      }

      // Split name and decide whether to confirm
      const { first, last } = splitDisplayName(user.displayName || "");
      const needNameConfirm = !first || !last;

      if (needNameConfirm) {
        setConfirmFirst(first || "");
        setConfirmLast(last || "");
        setConfirmEmail(user.email || "");
        setPendingAuthUser(user);
        setConfirmProvider("google"); // keep provider
        setPendingHandle(""); // not used for Google
        setConfirmEmailLocked(true); // lock email for Google
        setShowConfirmModal(true);
        return;
      }

      // Optionally persist displayName if missing/null in Firestore
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists() || snap.data()?.displayName == null) {
          await setDoc(
            userRef,
            { displayName: (user.displayName || "").trim() || null },
            { merge: true }
          );
        }
      } catch (e) {
        console.error("Could not persist displayName for Google:", e);
      }

      // Cart merge
      await fetchCartFromFirestore(user.uid);

      identifyUser(posthog, user, { role: "user" });
      posthog?.capture("login_succeeded", { method: "google" });
      toast.success(`Welcome back ${user.displayName || "there"}!`);

      setShowDeliveryStep(true);
    } catch (error) {
      if (error?.code === "auth/account-exists-with-different-credential") {
        const email = error?.customData?.email;
        if (!email) {
          toast.error("This email is already registered. Please log in.");
          navigate("/login");
          setLoading(false);
          return;
        }
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);

          const vSnap = await getDocs(
            query(collection(db, "vendors"), where("email", "==", email))
          );
          if (!vSnap.empty) {
            toast.error("This email is already used for a Vendor account!");
            setLoading(false);
            return;
          }
          const userSnap = await getDocs(
            query(collection(db, "users"), where("email", "==", email))
          );
          if (!userSnap.empty && userSnap.docs[0].data()?.role === "vendor") {
            toast.error("This email is already used for a Vendor account!");
            setLoading(false);
            return;
          }

          if (methods.includes("password") && !methods.includes("google.com")) {
            toast.info(
              "This email was registered with a password. Please log in to continue."
            );
            navigate("/login", { state: { email, linkGoogle: true } });
            setLoading(false);
            return;
          }

          toast.info(
            "This email is already registered. Please log in with your original method."
          );
          navigate("/login", { state: { email } });
        } catch (mErr) {
          console.error("fetchSignInMethodsForEmail failed:", mErr);
          toast.error(
            "Sign-in conflict. Please log in first, then link Google in Account Settings."
          );
        }
        setLoading(false);
        return;
      }

      posthog?.capture("login_failed", { method: "google", code: error.code });
      console.error("Google Sign-In Error:", error);
      let msg = "Google Sign-In failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user")
        msg = "Popup closed before completing sign-in.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTwitterSignIn = async () => {
    const provider = new TwitterAuthProvider();
    const TAG = "[TWITTER_SIGNIN]";
    try {
      setLoading(true);
      posthog?.capture("login_attempted", { method: "twitter" });
      console.log(`${TAG} calling signInWithPopup...`);

      const result = await signInWithGoogle(auth, provider);
      const user = result.user;
      const info = getAdditionalUserInfo(result);
      const twitterHandle = info?.username || "";
      console.log(
        `${TAG} popup resolved uid=${user?.uid} email=${
          user?.email || "(empty)"
        }`
      );

      // Optional vendor-email guard if you have isVendorEmail available
      const clean = (user.email || "").toLowerCase().trim();
      if (clean && typeof isVendorEmail === "function") {
        try {
          if (await isVendorEmail(clean)) {
            console.warn(`${TAG} vendor email detected -> signOut`);
            await auth.signOut();
            toast.error("This email is already used for a Vendor account!");
            setLoading(false);
            return;
          }
        } catch (guardErr) {
          console.warn(`${TAG} vendor email guard error:`, guardErr);
        }
      }

      // Ensure a stub user doc exists BEFORE showing confirm modal
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        console.log(`${TAG} creating stub users/${user.uid}`);
        const makeUsername = () => {
          if (typeof genUsername === "function")
            return genUsername(user.displayName);
          const base =
            (user.displayName || "user").toString().trim().toLowerCase() ||
            "user";
          return `${base}${Math.floor(100 + Math.random() * 900)}`;
        };
        await setDoc(userRef, {
          uid: user.uid,
          email: clean || null, // Twitter can be missing email
          displayName: user.displayName ?? null,
          username: makeUsername(),
          role: "user",
          referrer: localStorage.getItem("referrer") || null,
          profileComplete: false,
          walletSetup: false,
          birthday: "not-set",
          welcomeEmailSent: false,
          notificationAllowed: false,
          createdAt: new Date(),
        });
        console.log(`${TAG} stub user doc created`);
      } else {
        const data = snap.data() || {};
        const patch = {};
        if (data.displayName == null && user.displayName)
          patch.displayName = user.displayName;
        if (!data.username) {
          patch.username =
            typeof genUsername === "function"
              ? genUsername(user.displayName)
              : `user${Math.floor(100000 + Math.random() * 900000)}`;
        }
        if (Object.keys(patch).length) {
          await setDoc(userRef, patch, { merge: true });
          console.log(`${TAG} patched existing user doc:`, patch);
        }
      }

      // Prefill confirm modal inputs
      const { first, last } = splitDisplayName(user.displayName || "");
      setPendingHandle(twitterHandle);
      setConfirmFirst(first);
      setConfirmLast(last); // may be empty; user will fill it
      setConfirmEmail(user.email || ""); // may be empty; user will fill it

      setPendingAuthUser(user);
      setConfirmProvider("twitter");
      setConfirmEmailLocked(false);
      setShowConfirmModal(true);

      posthog?.capture("login_succeeded", { method: "twitter" });
      console.log(`${TAG} showConfirmModal=true`);
    } catch (error) {
      // Same cross-provider conflict handling if we got an email from Twitter (rare)
      if (error?.code === "auth/account-exists-with-different-credential") {
        const email = error?.customData?.email;
        if (!email) {
          toast.error("This account already exists. Please log in.");
          navigate("/login");
          setLoading(false);
          return;
        }
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (
            methods.includes("password") &&
            !methods.includes("twitter.com")
          ) {
            toast.info(
              "This email was registered with a password. Please log in."
            );
            navigate("/login", { state: { email, linkTwitter: true } });
            setLoading(false);
            return;
          }
          toast.info(
            "This email is already registered. Please log in with your original method."
          );
          navigate("/login", { state: { email } });
        } catch (mErr) {
          console.error("fetchSignInMethodsForEmail failed:", mErr);
          toast.error(
            "Sign-in conflict. Please log in first, then link Twitter in Account Settings."
          );
        }
        setLoading(false);
        return;
      }

      posthog?.capture("login_failed", {
        method: "twitter",
        code: error?.code || "unknown",
      });
      console.error("Twitter Sign-In Error:", error);
      toast.error("Twitter sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeliveryInfo = async () => {
    // 1) Validate phone (local NG 10 digits, no leading 0)
    const raw = phoneRaw.replace(/\D/g, "");
    if (!isValidNg10(raw)) {
      toast.error(
        "Phone must be exactly 10 digits and not start with 0 (e.g. 8123456789)."
      );
      return;
    }

    // 2) Validate address/coords from LocationPicker
    if (!address || !coords?.lat || !coords?.lng) {
      toast.error("Please select your delivery address on the map.");
      return;
    }

    if (!auth.currentUser) {
      toast.error("You are not signed in.");
      return;
    }

    try {
      setSavingDelivery(true);

      // Format phone to E.164 for Nigeria
      const phoneE164 = `+234${raw}`;

      // Optional: trim the address to avoid stray spaces
      const cleanAddress = address.trim();

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        phoneNumber: phoneE164,
        address: cleanAddress, // <- actual address from picker
        location: { lat: coords.lat, lng: coords.lng }, // <- actual coords
        profileComplete: true,
        updatedAt: new Date(),
      });

      // Close UI and continue to checkout
      setAuthOpen(false);
      setShowDeliveryStep(false);

      const q = note ? `?note=${encodeURIComponent(note)}` : "";
      navigate(`/newcheckout/${vendorId}${q}`);
    } catch (e) {
      console.error(e);
      toast.error("Could not save delivery info. Please try again.");
    } finally {
      setSavingDelivery(false);
    }
  };

  return (
    <>
      {/* ─────────── FAB ─────────── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-2 z-50 w-14 h-14 rounded-full
                   bg-customOrange text-white flex flex-col items-center
                   justify-center shadow-xl"
      >
        <BsBasket size={22} />
        <Badge count={itemCount} />
      </button>

      {/* ─────────── Drawer ─────────── */}
      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]"
          />

          {/* sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[9000]
                       bg-white rounded-t-2xl shadow-lg
                       max-h-[80vh] flex flex-col
                       animate-[slideUp_0.25s_ease-out]"
            style={{
              "--tw-animate-slideUp":
                "from{transform:translateY(100%)} to{transform:translateY(0)}",
            }}
          >
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold font-opensans">
                Your Basket
              </h2>
              <button
                className="absolute bg-gray-200 rounded-full p-1 top-3 right-3 text-2xl"
                onClick={() => setOpen(false)}
              >
                <LiaTimesSolid className="text-2xl" />
              </button>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.map((p) => (
                <div
                  key={p.productKey}
                  className="py-4 border-b last:border-0 flex"
                >
                  {/* thumbnail */}
                  <div className="relative">
                    <IkImage
                      src={p.selectedImageUrl}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    {p.quantity > 1 && (
                      <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                        +{p.quantity}
                      </span>
                    )}
                  </div>

                  {/* details */}
                  <div className="flex-1 ml-4">
                    <p className="text-sm font-opensans font-medium truncate">
                      {p.name}
                    </p>
                    {p.isFashion && (
                      <p className="text-[11px] font-opensans text-gray-600 mt-1">
                        {!isVariantSizeHidden(p) && (
                          <>
                            Size:{" "}
                            <span className="font-semibold text-black">
                              {p.selectedSize}
                            </span>
                          </>
                        )}
                        {p.selectedColor && (
                          <>
                            {!isVariantSizeHidden(p) && " , "}Color:{" "}
                            <span className="font-semibold text-black capitalize">
                              {p.selectedColor.toLowerCase()}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-sm font-opensans font-bold mt-1">
                      {formatNaira(p.price * p.quantity)}
                    </p>
                  </div>

                  {/* remove */}
                  <button
                    onClick={() => handleRemove(p.productKey)}
                    className="text-xs font-opensans text-gray-500 ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="font-opensans font-medium">Total</span>
                <span className="font-bold font-opensans">
                  {formatNaira(total)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full h-12 font-opensans rounded-full bg-customOrange
                           text-white font-semibold flex items-center justify-center"
              >
                {quickMode ? " Buy Now" : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </>
      )}
      <AppBottomSheet
        open={authOpen && !showConfirmModal && !showDeliveryStep}
        onClose={() => !loading && setAuthOpen(false)}
        closeOnBackdrop={!loading}
        dismissible={!loading}
        height="65dvh"
        ariaLabel="Let’s set up your order"
        ariaBusy={loading}
        zIndex={9000}
        backdropClassName="bg-black/40 backdrop-blur-sm"
        surfaceClassName="scrollbar-hide items-center overflow-y-auto p-6 pt-5"
        compactTop
      >
            <button
              onClick={() => !loading && setAuthOpen(false)}
              disabled={loading}
              className="absolute bg-gray-200 rounded-full p-1 top-5 right-3 text-2xl disabled:opacity-60"
              aria-label="Close checkout sign in"
            >
              <LiaTimesSolid />
            </button>

            {/* heading */}
            <h3 className="text-lg font-opensans font-semibold mb-4">
              Let’s set up your order
            </h3>

            {/* ───────── Google button ───────── */}
            <div className="relative w-full mt-8 max-w-md mx-auto">
              {/* speed badge */}
              <div className="absolute -top-3 -right-3 z-10">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white
                      px-3 py-1 rounded-full text-xs font-bold font-satoshi shadow-lg animate-pulse"
                >
                  60% faster
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 rounded-full border flex items-center justify-center
                 gap-2 font-opensans font-medium disabled:opacity-60"
              >
                {loading ? (
                  <span className="loader-small" />
                ) : (
                  <>
                    <FcGoogle className="mr-2 text-2xl" />
                    Checkout with Google
                  </>
                )}
              </button>
            </div>
            <div className="relative w-full mt-4 max-w-md mx-auto">
              <button
                onClick={handleTwitterSignIn}
                disabled={loading}
                className="w-full h-11 rounded-full border flex items-center justify-center
              gap-2 font-opensans font-medium disabled:opacity-60"
              >
                {loading ? (
                  <span className="loader-small" />
                ) : (
                  <>
                    <FaXTwitter className="mr-2 text-2xl" />
                    Checkout with Twitter
                  </>
                )}
              </button>
            </div>

            {/* divider */}
            <div className="my-6 w-full flex items-center">
              <span className="flex-1 h-px bg-gray-300" />
              <span className="mx-3 text-xs uppercase text-gray-400">or</span>
              <span className="flex-1 h-px bg-gray-300" />
            </div>

            {/* ───────── Manual path ───────── */}
            {!showManual ? (
              /* just the “Checkout manually” button */
              <button
                onClick={() => setShowManual(true)}
                className="w-full max-w-md  font-medium h-11 rounded-full border flex items-center
                 justify-center gap-2 font-opensans"
              >
                <SiReacthookform className="mr-2 text-2xl" />
                Checkout as Guest
              </button>
            ) : (
              /* the 3-field form that was already in your code */
              <div className="w-full max-w-md space-y-3">
                <input
                  type="text"
                  placeholder="First name"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange transition"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange transition"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange transition"
                />

                <button
                  onClick={handleManualCheckout}
                  disabled={submitting}
                  className="w-full h-11 rounded-full bg-customOrange  text-white font-opensans
              font-semibold disabled:opacity-60 flex items-center justify-center"
                >
                  {submitting ? (
                    <RotatingLines
                      width={20}
                      strokeColor="#fff"
                      strokeWidth={5}
                      visible={true}
                    />
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            )}
            <p className="text-[10px] mt-5 font-satoshi text-gray-600 mb-2 text-center">
              By checking out, you agree to our{" "}
              <a
                href="#terms"
                onClick={openDisclaimerModal("/terms-and-conditions")}
                className="underline text-customOrange"
              >
                Terms&nbsp;&amp;&nbsp;Conditions
              </a>{" "}
              and{" "}
              <a
                href="#privacy"
                onClick={openDisclaimerModal("/privacy-policy")}
                className="underline text-customOrange"
              >
                Privacy Policy
              </a>
              .
            </p>
      </AppBottomSheet>

      <AppBottomSheet
        open={showConfirmModal}
        onClose={() => {
          if (confirmProvider === "twitter" && !isEmail(confirmEmail)) return;
          if (!confirmLoading) setShowConfirmModal(false);
        }}
        closeOnBackdrop={
          !confirmLoading &&
          !(confirmProvider === "twitter" && !isEmail(confirmEmail))
        }
        dismissible={
          !confirmLoading &&
          !(confirmProvider === "twitter" && !isEmail(confirmEmail))
        }
        height="55dvh"
        ariaLabel="Confirm your details"
        ariaBusy={confirmLoading}
        zIndex={9800}
        backdropClassName="bg-black/50 backdrop-blur-sm"
        surfaceClassName="px-5 pb-5 pt-5"
        compactTop
      >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 scrollbar-hide">
                <h3 className="text-lg font-opensans font-semibold mb-2 text-center">
                  Confirm your details
                </h3>
                <p className="text-xs text-gray-600 font-opensans mb-4 text-center">
                  We’ll use these for your order and delivery updates.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={confirmFirst}
                    onChange={(e) => setConfirmFirst(e.target.value)}
                    className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={confirmLast}
                    onChange={(e) => setConfirmLast(e.target.value)}
                    className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={confirmEmail}
                    onChange={(e) =>
                      !confirmEmailLocked && setConfirmEmail(e.target.value)
                    }
                    disabled={confirmEmailLocked}
                    className={`w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange ${
                      confirmEmailLocked ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                <button
                  onClick={handleConfirmDetails}
                  disabled={
                    confirmLoading ||
                    (confirmProvider === "twitter" && !isEmail(confirmEmail))
                  }
                  className="mt-5 w-full h-11 rounded-full bg-customOrange text-white font-opensans
                       font-semibold disabled:opacity-60 flex items-center justify-center"
                >
                  {confirmLoading ? (
                    <RotatingLines
                      width={20}
                      strokeColor="#fff"
                      strokeWidth={5}
                      visible
                    />
                  ) : (
                    "Complete"
                  )}
                </button>
              </div>
      </AppBottomSheet>
      {showDeliveryStep && (
        <>
          {/* inert backdrop */}
          <div
            onClick={() => setShowDeliveryStep(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9500]"
          />

          <div
            className="fixed z-[9600] bottom-0 left-0 right-0
                 h-[70vh] bg-white rounded-t-2xl shadow-xl
                 p-6 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-opensans font-semibold mb-1">
              Update delivery info
            </h3>
            <button
              className="absolute bg-gray-200 rounded-full p-1 top-3 right-3 text-2xl"
              onClick={() => setShowDeliveryStep(false)}
            >
              <LiaTimesSolid className="text-2xl" />
            </button>
            {/* Phone number */}
            <label className="text-xs font-opensans mt-4 text-gray-700 mb-1">
              Phone number
            </label>
            <div className="mb-4">
              {/* Use your PhoneInput, but keep raw 10 digits in state */}
              <PhoneInput
                country={"ng"}
                countryCodeEditable={false}
                // We show +234 visually, but we capture only the local 10 digits into phoneRaw
                value={phoneRaw ? `234${phoneRaw}` : ""}
                onChange={(val) => {
                  // val is like "2348123456789" — strip the "234" if present
                  const digits = (val || "").replace(/\D/g, "");
                  const local10 = digits.startsWith("234")
                    ? digits.slice(3)
                    : digits;
                  setPhoneRaw(local10.slice(0, 10)); // cap at 10
                }}
                inputProps={{
                  name: "phoneNumber",
                  required: true,
                  className:
                    "w-full h-11 bg-gray-100 text-black font-opensans rounded-md text-base focus:outline-none pl-12 focus:ring-2 focus:ring-customOrange",
                }}
              />
              <p className="text-[11px] mt-1 text-gray-500 font-opensans">
                Must be 10 digits and not start with 0.
              </p>
            </div>

            {/* Address / Map */}
            <label className="text-xs font-opensans text-gray-700 mb-1">
              Delivery address
            </label>
            <div className="mb-3">
              <LocationPicker
                initialAddress={address || ""}
                initialCoords={
                  coords?.lat && coords?.lng
                    ? { lat: coords.lat, lng: coords.lng }
                    : null
                }
                onLocationSelect={({ lat, lng, address }) => {
                  setCoords({ lat, lng });
                  setAddress(address || "");
                }}
              />

              {address && (
                <p className="text-[11px] mt-2 text-gray-700 font-opensans">
                  Selected: <span className="font-semibold">{address}</span>
                </p>
              )}
            </div>

            {/* Optional note for vendor */}
            <label className="text-xs font-opensans text-gray-700 mb-1">
              Note to vendor (optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="Leave delivery instructions or a short note…"
              className="w-full resize-none px-3 py-2 border rounded-md font-opensans text-base focus:outline-none focus:border-customOrange"
            />

            {/* Save / Continue */}
            <div className="mt-auto pt-4">
              <button
                onClick={handleSaveDeliveryInfo}
                disabled={savingDelivery}
                className="w-full h-11 rounded-full bg-customOrange text-white font-opensans
                     font-semibold disabled:opacity-60 flex items-center justify-center"
              >
                {savingDelivery ? (
                  <RotatingLines
                    width={20}
                    strokeColor="#fff"
                    strokeWidth={5}
                    visible
                  />
                ) : (
                  "Checkout"
                )}
              </button>
            </div>
          </div>
        </>
      )}
      <IframeModal
        show={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        url={disclaimerUrl}
      />
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/40 backdrop-blur-sm flex items-center justify-center">
          <RotatingLines
            strokeColor="#f9531e"
            strokeWidth="5"
            width="24"
            visible
          />
        </div>
      )}
    </>
  );
});
export default StoreBasket;

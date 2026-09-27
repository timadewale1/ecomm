import React, { useState, useEffect } from "react";
import { siteUrls } from "../../config/siteUrls.mjs";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import PaystackPop from "@paystack/inline-js";
import { RiShareForwardBoxLine } from "react-icons/ri";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../../components/Loading/Loading";
import ExpiredLink from "../../components/Loading/ExpiredLink";
import PaymentSuccess from "../../components/Loading/PaymentSuccess";
import SEO from "../../components/Helmet/SEO";
import { useAuth } from "../../custom-hooks/useAuth";

export default function PayPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");
  const [expired, setExpired] = useState(false);
  const [paymentState, setPaymentState] = useState("idle");
  const [paymentError, setPaymentError] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const isDeliveryDraft = draft?.draftType === "stockpile_delivery";

  // stockpile tips and rotating index
  const tips = [
    "With stockpile you are covered by Buyer Protection. Your order is safe.",
    "Tip: You can always re-pile,  and add more up until you are ready to ship! ",
    "Did you know? You only pay delivery once you’re ready to ship.",
    "Stockpiling reduces carbon footprint by 70% compared to single orders.",
  ];
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setTipIdx((i) => (i + 1) % tips.length);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let interval = null;

    const clearCountdown = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const startCountdown = (expires) => {
      clearCountdown();

      const tick = () => {
        const diff = expires - Date.now();
        if (diff <= 0) {
          clearCountdown();
          setExpired(true);
          return;
        }

        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000)
          .toString()
          .padStart(2, "0");
        setCountdown(`${m}m ${s}s`);
      };

      tick();
      interval = setInterval(tick, 1000);
    };

    const unsubscribe = onSnapshot(
      doc(db, "draftOrders", token),
      (snap) => {
        if (!snap.exists()) {
          setError("Link not found");
          setLoading(false);
          clearCountdown();
          return;
        }

        const data = snap.data();
        setDraft(data);

        if (String(data.status || "").toLowerCase() === "paid") {
          clearCountdown();
          setExpired(false);
          setPaymentError("");
          setPaymentReference((current) =>
            current || data.paymentReference || "",
          );
          setPaymentState("success");
          setLoading(false);
          return;
        }

        const expires = data.expiresAt?.toDate?.().getTime();
        if (!expires || Date.now() >= expires) {
          clearCountdown();
          setExpired(true);
        } else {
          setExpired(false);
          startCountdown(expires);
        }
        setLoading(false);
      },
      (snapshotError) => {
        clearCountdown();
        setError(snapshotError.message || "Unable to load payment link");
        setLoading(false);
      },
    );

    return () => {
      clearCountdown();
      unsubscribe();
    };
  }, [token]);

  const handlePayNow = () => {
    if (!draft?.access_code || ["opening", "confirming"].includes(paymentState)) {
      return;
    }

    setPaymentError("");
    setPaymentState("opening");

    try {
      const popup = new PaystackPop();
      popup.resumeTransaction(draft.access_code, {
        onSuccess: (transaction) => {
          setPaymentReference(transaction?.reference || "");
          setPaymentState((current) =>
            current === "success" ? current : "confirming",
          );
        },
        onCancel: () => {
          setPaymentState((current) =>
            current === "success" ? current : "idle",
          );
        },
        onError: (paystackError) => {
          setPaymentError(
            paystackError?.message ||
              "We couldn’t open Paystack. Please try again.",
          );
          setPaymentState((current) =>
            current === "success" ? current : "idle",
          );
        },
      });
    } catch (paystackError) {
      setPaymentError(
        paystackError?.message || "We couldn’t open Paystack. Please try again.",
      );
      setPaymentState("idle");
    }
  };

  if (loading) return <Loading />;
  if (paymentState === "success") {
    return (
      <main className="min-h-[100dvh] bg-white px-6 flex flex-col items-center justify-center text-center">
        <SEO
          title="Payment successful"
          url={`https://www.shopmythrift.store/pay/${token}`}
        />
        <div className="h-52 w-52" aria-hidden="true">
          <PaymentSuccess />
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          Payment successful
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
          {isDeliveryDraft
            ? "The delivery payment is confirmed. The courier booking is now being arranged for the completed stockpile."
            : "The order has been created successfully. The person who shared this payment request can now view it in their orders."}
        </p>
        {paymentReference && (
          <p className="mt-4 text-xs text-slate-400">
            Reference: {paymentReference}
          </p>
        )}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-10 w-full max-w-sm rounded-full bg-customOrange px-5 py-3 text-sm font-semibold text-white"
        >
          Continue shopping
        </button>
      </main>
    );
  }
  if (expired || error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <SEO
          title="Link Expired"
          url={`https://www.shopmythrift.store/pay/${token}`}
        />
        <ExpiredLink />
        <h2 className="text-3xl font-medium text-center mb-12 font-ubuntu">
          Ooops! Payment link has expired.
        </h2>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-3 bg-customOrange text-sm z-50 font-opensans text-white rounded"
        >
          Browse Stores
        </button>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Complete Payment – ${draft.vendorName}`}
        url={`https://www.shopmythrift.store/pay/${token}`}
      />

      {!currentUser && (
        <div className="border border-gray-100 flex flex-col space-x-3 py-3 px-2">
          <img src="/newlogo.png" alt="Logo" className="h-8 w-16" />
          <div className="flex flex-1 mt-4 space-x-3">
            <button
              onClick={() => navigate("/login")}
              className="flex-1 border border-customRichBrown text-customRichBrown rounded-full py-1 text-sm font-opensans"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="flex-1 bg-customOrange text-white rounded-full py-1 text-sm font-opensans"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
      <div className=" px-4">
        {draft.isStockpile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto mt-4 bg-customOrange/20 border border-customOrange rounded-lg px-4 py-2 flex items-center space-x-2"
          >
            <AiOutlineInfoCircle className="text-customOrange text-xl" />
            <AnimatePresence exitBeforeEnter>
              <motion.p
                key={tipIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xs font-opensans text-customOrange"
              >
                {tips[tipIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <div className="max-w-md mx-auto mt-6 p-6 bg-white rounded-lg">
        <div className="flex items-center mb-4">
          <img
            src={draft.ownerInfo.photoURL}
            alt={draft.ownerInfo.displayName}
            className="w-14 h-14 rounded-full mr-3"
          />
          <div>
            <p className="font-opensans text-xl font-semibold">
              {draft.ownerInfo.displayName} has requested you pay{" "}
              <span className="text-lg text-customOrange font-bold">
                ₦{draft.amount.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <p className="text-sm mt-16 font-opensans mb-2">
          Payment channel expires in{" "}
          <span className="font-semibold text-customOrange">{countdown}</span>
        </p>

        <div className="flex items-center justify-between border border-customRichBrown p-3 rounded mb-4 truncate">
          <span className="text-sm font-opensans">
            {siteUrls.appUrl(`/pay/${encodeURIComponent(token)}`)}
          </span>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                siteUrls.appUrl(`/pay/${encodeURIComponent(token)}`),
              )
            }
            className="ml-2"
          >
            <RiShareForwardBoxLine className="text-customRichBrown" />
          </button>
        </div>

        <p className="italic text-xs font-opensans text-gray-500 mt-4">
          {draft.ownerInfo.displayName} will be notified when we confirm payment
          and {isDeliveryDraft ? "arrange the stockpile delivery" : "create the order"}.
          {" "}Thank you! If you have any issues making payment, please{" "}
          <a
            href={`mailto:hello@shopmythrift.store?subject=Issue Paying for ${encodeURIComponent(
              draft.ownerInfo.displayName,
            )}&body=${encodeURIComponent(
              `Hey, I am having issues paying for ${draft.ownerInfo.displayName}. The payment token is ${token}.`,
            )}`}
            className="underline text-customOrange"
          >
            reach out to us at hello@shopmythrift.store
          </a>
          .
        </p>

        {paymentState === "confirming" && (
          <div
            className="mt-8 rounded-xl bg-orange-50 px-4 py-3 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-customOrange">
              Confirming your payment…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please keep this page open while we securely confirm the payment.
            </p>
          </div>
        )}

        {paymentError && (
          <p className="mt-6 text-center text-sm text-red-600" role="alert">
            {paymentError}
          </p>
        )}

        <button
          type="button"
          onClick={handlePayNow}
          disabled={["opening", "confirming"].includes(paymentState)}
          className="w-full py-3 mt-16 bg-customOrange text-white rounded-full font-opensans font-semibold"
        >
          {paymentState === "opening"
            ? "Opening secure payment…"
            : paymentState === "confirming"
              ? "Confirming payment…"
              : "Pay Now"}
        </button>
      </div>
    </>
  );
}

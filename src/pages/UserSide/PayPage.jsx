import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { RiShareForwardBoxLine } from "react-icons/ri";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../../components/Loading/Loading";
import ExpiredLink from "../../components/Loading/ExpiredLink";
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
    let interval;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "draftOrders", token));
        if (!snap.exists()) throw new Error("Link not found");
        const data = snap.data();
        const now = Date.now();
        const expires = data.expiresAt.toDate().getTime();
        if (now > expires) {
          setExpired(true);
        } else {
          setDraft(data);
          interval = setInterval(() => {
            const diff = expires - Date.now();
            if (diff <= 0) {
              setExpired(true);
              clearInterval(interval);
            } else {
              const m = Math.floor(diff / 60000);
              const s = Math.floor((diff % 60000) / 1000)
                .toString()
                .padStart(2, "0");
              setCountdown(`${m}m ${s}s`);
            }
          }, 1000);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return <Loading />;
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
          onClick={() => navigate("/newhome")}
          className="px-4 py-3 bg-customOrange text-sm z-50 font-opensans text-white rounded"
        >
          Browse Stores
        </button>
      </div>
    );
  }

  const payUrl = draft.authorization_url;

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
            https://www.shopmythrift.store/pay/{token}
          </span>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `https://www.shopmythrift.store/pay/${token}`
              )
            }
            className="ml-2"
          >
            <RiShareForwardBoxLine className="text-customRichBrown" />
          </button>
        </div>

        <p className="italic text-xs font-opensans text-gray-500 mt-4">
          {draft.ownerInfo.displayName} will be notified when we confirm payment
          and the order is created. Thank you! If you have any issues making
          payment, please{" "}
          <a
            href={`mailto:hello@shopmythrift.store?subject=Issue Paying for ${encodeURIComponent(
              draft.ownerInfo.displayName
            )}&body=${encodeURIComponent(
              `Hey, I am having issues paying for ${draft.ownerInfo.displayName}. The order token is ${token}.`
            )}`}
            className="underline text-customOrange"
          >
            reach out to us at hello@shopmythrift.store
          </a>
          .
        </p>

        <button
          onClick={() => (window.location.href = payUrl)}
          className="w-full py-3 mt-16 bg-customOrange text-white rounded-full font-opensans font-semibold"
        >
          Pay Now
        </button>
      </div>
    </>
  );
}

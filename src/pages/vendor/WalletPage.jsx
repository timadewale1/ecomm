// src/pages/WalletPage.jsx
import React, { useState, useEffect, useContext, useMemo } from "react";
import Modal from "react-modal";
import toast from "react-hot-toast";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { LuDelete } from "react-icons/lu";
import {
  GoChevronLeft,
  GoArrowUpRight,
  GoArrowDownRight,
} from "react-icons/go";
import { FiInfo } from "react-icons/fi";
import { TbXxx } from "react-icons/tb";
import { AiFillSafetyCertificate } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { VendorContext } from "../../components/Context/Vendorcontext";
import {
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import Loading from "../../components/Loading/Loading";
import { motion, AnimatePresence } from "framer-motion";
import { MdOutlineContentPasteSearch } from "react-icons/md";

import WithdrawLoad from "../../components/Loading/WithdrawLoad";
import FailedWithdraw from "../../components/Loading/FailedWithdraw";
import Paymentsuccess from "../../components/Loading/PaymentSuccess";
import SEO from "../../components/Helmet/SEO";
Modal.setAppElement("#root");

export default function WalletPage() {
  const { vendorData, loading: vendorLoading } = useContext(VendorContext);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  /* history: load cached list or default to [] */
  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem("walletHistory");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [countdown, setCountdown] = useState("");
  /* “hide balance” preference */
  const [hideBalance, setHideBalance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hideBalance") || "false");
    } catch {
      return false;
    }
  });

  // Withdraw flow
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawPinModal, setShowWithdrawPinModal] = useState(false);
  const [withdrawPin, setWithdrawPin] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  // Result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultAmount, setResultAmount] = useState(0);
  const [resultReference, setResultReference] = useState("");
  const [resultError, setResultError] = useState("");
  // ── payout-day helpers (for the MAIN card button only) ────────────────
  const PAYOUT_DAYS = [1, 3, 5]; // Mon, Wed, Fri
  const PAYOUT_OPEN_HOUR = 2;
  const now = new Date();
  const isPayoutWindow =
    PAYOUT_DAYS.includes(now.getDay()) && now.getHours() >= PAYOUT_OPEN_HOUR;
  const nextPayoutAt = React.useMemo(getNextPayoutWindow, []);

  // Wallet setup PIN flow
  const [showPinModal, setShowPinModal] = useState(false);
  const [initialPin, setInitialPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  const navigate = useNavigate();
  // ─── Helpers ────────────────────────────────────────────────────────────────
  const fetchHistory = async (id) => {
    try {
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const url = `${
        import.meta.env.VITE_API_BASE_URL
      }/wallet-transactions/${id}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.status) throw new Error(json.message);

      /*  massage the data once so the UI can stay simple later on  */
      return json.data
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((t) => ({
          id: t.id,
          type: t.amountSlug.startsWith("+") ? "paid" : "withdrawal",
          amount: t.amount,
          date: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date(t.createdAt)),
        }));
    } catch (err) {
      console.error("⚠️  fetchHistory error:", err);
      toast.error(err.message || "Failed to load history");
      return [];
    }
  };

  useEffect(() => {
    const tick = () => {
      const diff = nextPayoutAt - Date.now();
      if (diff <= 0) return setCountdown("now");

      const s = Math.floor(diff / 1e3) % 60;
      const m = Math.floor(diff / 6e4) % 60;
      const h = Math.floor(diff / 3.6e6) % 24;
      const d = Math.floor(diff / 8.64e7);

      const pad = (n) => n.toString().padStart(2, "0");
      setCountdown(`${d ? d + " d " : ""}${pad(h)}:${pad(m)}:${pad(s)}`);
    };

    tick(); // first run
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [nextPayoutAt]);

  useEffect(() => {
    if (!vendorData?.vendorId) return;

    /* ---------- 1) hydrate UI with any cached history immediately ---------- */
    try {
      const cached = localStorage.getItem("walletHistory");
      if (cached) setHistory(JSON.parse(cached));
    } catch {}

    /* ---------- 2) live balance listener ---------- */
    const unsub = onSnapshot(
      doc(db, "vendors", vendorData.vendorId),
      (snap) => {
        const d = snap.data();
        if (d) {
          setBalance(d.balance ?? 0);
          setPending(d.pendingBalance ?? 0);
        }
        /* refresh history every time the wallet document updates */
        fetchHistory(vendorData.vendorId).then((list) => {
          setHistory(list);
          localStorage.setItem("walletHistory", JSON.stringify(list));
        });
      }
    );

    /* ---------- 3) one-off fresh history fetch (in case no changes occur) -- */
    fetchHistory(vendorData.vendorId).then((list) => {
      setHistory(list);
      localStorage.setItem("walletHistory", JSON.stringify(list));
    });

    return () => unsub();
  }, [vendorData?.vendorId]);

  useEffect(() => {
    if (!vendorLoading && vendorData && vendorData.walletSetup === false) {
      setShowPinModal(true);
    }
  }, [vendorData, vendorLoading]);

  useEffect(() => {
    if (!showWithdrawPinModal) setWithdrawPin("");
  }, [showWithdrawPinModal]);
  const resolvedVendorId = vendorData?.vendorId || vendorData?.uid || "";

  const createWallet = async () => {
    if (pinLoading) return;
    setPinLoading(true);
    try {
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const url = `${import.meta.env.VITE_API_BASE_URL}/create-wallet`;

      console.log("🔐 createWallet – walletPin:", initialPin);
      const payload = {
        firstName: vendorData.firstName,
        lastName: vendorData.lastName,
        email: vendorData.email,
        myThriftId: vendorData.uid,
        walletPin: initialPin,
        phoneNumber: vendorData.phoneNumber,
      };
      console.log("📤 createWallet payload:", payload);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Log response status and headers
      console.log("📥 API Response Status:", res.status, res.statusText);
      console.log("📥 API Response Headers:", [...res.headers]);

      const result = await res.json();
      console.log("📥 API Response Body:", result);

      if (!result.status) throw new Error(result.message);
      const d = result.data;

      await updateDoc(doc(db, "vendors", vendorData.vendorId), {
        walletSetup: true,
        accountName: d.accountName,
        balance: d.balance,
        walletId: d.walletId,
        preferredBank: d.preferredBank,
        pendingBalance: d.pendingBalance,
        accountNumber: d.accountNumber,
      });

      setShowPinModal(false);
      localStorage.setItem('walletSetUp', 'true')
      toast.success("Wallet created");
    } catch (e) {
      console.error("❌ createWallet error:", e);
      toast.error(e.message || "Failed to create wallet");
    } finally {
      setPinLoading(false);
    }
  };

  // PIN pad handler for setup
  const onKeyPress = (k) => {
    if (k === "⌫") {
      isConfirming
        ? setConfirmPin((p) => p.slice(0, -1))
        : setInitialPin((p) => p.slice(0, -1));
      return;
    }
    if (!k) return;
    if (!isConfirming) {
      if (initialPin.length < 4) {
        const nxt = initialPin + k;
        setInitialPin(nxt);
        if (nxt.length === 4) setIsConfirming(true);
      }
    } else {
      if (confirmPin.length < 4) {
        const nxt = confirmPin + k;
        setConfirmPin(nxt);
        if (nxt.length === 4) {
          if (nxt === initialPin) createWallet();
          else {
            toast.error("PINs do not match");
            setConfirmPin("");
          }
        }
      }
    }
  };

  const performPayout = async (pin) => {
    setWithdrawLoading(true);
    try {
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const url = `${import.meta.env.VITE_API_BASE_URL}/request-payout`;

      // Log exactly what PIN and payload we’re sending
      console.log("🔐 performPayout – walletPin:", pin);
      const payload = {
        vendorId: resolvedVendorId,
        walletPin: pin,
        payoutAmount: Number(raw),
      };
      console.log("📤 performPayout payload:", payload);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      if (result.status) {
        const payload = {
          amount: result.data.amount,
          status: "success",
          reference: result.data.transactionReference,
          requestedAt: serverTimestamp(),
          type: "withdrawal",
          processedAt: serverTimestamp(),
        };

        // 👉 vendors/{vendorId}/withdrawals/
        await addDoc(
          collection(db, "vendors", resolvedVendorId, "withdrawals"),
          payload
        );
      }
      if (result.status === false) throw new Error(result.message);
      const d = result.data;
      setResultSuccess(true);
      setResultAmount(d.amount);
      setResultReference(d.transactionReference);
    } catch (e) {
      console.error("❌ performPayout error:", e);
      setResultSuccess(false);
      setResultError(e.message || "Transaction failed");
      toast.error(e.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
      setShowWithdrawPinModal(false);
      setShowResultModal(true);
      setWithdrawAmount("");
    }
  };
  function getNextPayoutWindow(from = new Date()) {
    const start = new Date(from); // clone
    start.setMinutes(0, 0, 0); // zero out smaller units

    // iterate forward; first day in PAYOUT_DAYS whose 02:00 we haven’t passed yet
    for (let i = 0; i < 8; i++) {
      const cand = new Date(start);
      cand.setDate(cand.getDate() + i);
      cand.setHours(PAYOUT_OPEN_HOUR); // 02:00 that day
      if (
        PAYOUT_DAYS.includes(cand.getDay()) &&
        cand > from // still in the future
      ) {
        return cand;
      }
    }
    return null; // should never happen
  }

  const onWithdrawKey = (k) => {
    if (withdrawLoading) return;

    if (k === "⌫") {
      // remove last digit
      setWithdrawPin((p) => p.slice(0, -1));
      return;
    }

    if (!k || withdrawPin.length >= 4) return;

    const nxt = withdrawPin + k; // next full string
    setWithdrawPin(nxt);

    // when we reach 4 digits, run payout with the latest pin
    if (nxt.length === 4) {
      performPayout(nxt); // ← pass the pin explicitly
    }
  };
  if (vendorLoading || !vendorData) return <Loading />;

  const raw = withdrawAmount.replace(/\D/g, "");
  const formatted = raw ? new Intl.NumberFormat("en-NG").format(+raw) : "";
  const displayAmount = formatted ? `₦${formatted}` : "₦0.00";

  const canWithdraw =
    isPayoutWindow && Number(raw) >= 100 && Number(raw) <= balance;

  const displayPin = isConfirming ? confirmPin : initialPin;
  const promptText = isConfirming ? "Confirm Your PIN" : "Set up Your PIN";

  return (
    <>
      <SEO
        title="Wallet - My Thrift"
        description="View your balance, track transactions, and withdraw earnings securely from your My Thrift wallet."
        url="https://www.shopmythrift.store/vendor-wallet"
      />

      <div className="p-4 w-full mx-auto font-opensans">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-6">
          <button onClick={() => navigate(-1)} className="absolute left-0 p-1">
            <GoChevronLeft className="text-2xl text-gray-800" />
          </button>
          <h2 className="text-lg font-opensans font-semibold">Wallet</h2>
        </div>

        {/* Balance Card */}
        <div className="relative z-10 bg-customDeepOrange rounded-2xl p-4 text-white overflow-hidden">
          <div className="absolute top-0 -right-2">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <h2 className="text-xs font-opensans font-light mb-1">
            My Thrift Balance
          </h2>
          <div className="flex items-center justify-start mb-4 space-x-2">
            {hideBalance ? (
              <TbXxx className="text-4xl" />
            ) : (
              <p className="text-3xl font-opensans font-bold">
                ₦{balance.toLocaleString()}
              </p>
            )}
            <button
              onClick={() =>
                setHideBalance((h) => {
                  const next = !h;
                  localStorage.setItem("hideBalance", JSON.stringify(next));
                  return next;
                })
              }
            >
              {hideBalance ? (
                <BsEye className="text-sm" />
              ) : (
                <BsEyeSlash className="text-sm" />
              )}
            </button>
          </div>
          <button
            onClick={() => {
              if (isPayoutWindow) setShowWithdrawModal(true); // open modal only today
            }}
            disabled={!isPayoutWindow} // disable on off-days
            className={`w-full mt-8 py-2.5 text-sm font-opensans rounded-full font-semibold
    ${
      isPayoutWindow
        ? "bg-white text-customOrange" // today → active
        : "bg-white bg-opacity-70 text-gray-500 cursor-not-allowed animate-pulse"
    }`}
          >
            {isPayoutWindow ? "Withdraw" : `Withdrawals open in ${countdown}`}
          </button>
        </div>

        {/* Pending & History */}
        <div className="bg-gray-50 rounded-2xl px-4 py-2 -translate-y-8">
          <div className="flex items-center justify-between mt-10 mb-1">
            {" "}
            <div className="flex items-center space-x-1">
              {" "}
              <p className="font-opensans text-sm text-gray-600">
                {" "}
                Pending balance{" "}
              </p>{" "}
              <FiInfo
                className="text-customRichBrown text-sm cursor-pointer"
                onClick={() => setShowInfoModal(true)}
                title="How pending payments work"
              />{" "}
            </div>{" "}
            <p className="font-opensans text-md font-semibold">
              {" "}
              ₦{pending.toLocaleString()}{" "}
            </p>{" "}
          </div>
          {!isPayoutWindow && (
            <p className="text-[10px] text-gray-500 mt-1">
              Withdrawals are processed only on Mon, Wed &amp; Fri.
            </p>
          )}
        </div>
        <div className="border border-gray-200 rounded-2xl p-4 bg-white">
          <h3 className="text-xs font-opensans font-medium mb-2">
            Transaction History
          </h3>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MdOutlineContentPasteSearch className="text-5xl text-customOrange" />
              <p className="text-xs text-center text-gray-500 mt-2">
                Your recent transactions willl appear here
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((tx) => (
                <li
                  key={tx.id}
                  className="flex justify-between border-b border-gray-200 py-3 last:border-0 hover:bg-gray-50"
                >
                  <span className="flex items-center space-x-2">
                    {tx.type === "withdrawal" ? (
                      <GoArrowDownRight className="text-xl text-gray-600" />
                    ) : (
                      <GoArrowUpRight className="text-xl text-gray-600" />
                    )}
                    <span className="text-sm font-semibold">
                      {tx.type === "withdrawal" ? "Withdrawal" : "Paid"}
                    </span>
                  </span>
                  <div className="text-right">
                    <p
                      className={`font-bold font-opensans text-base ${
                        tx.type === "withdrawal"
                          ? "text-gray-700"
                          : "text-green-600"
                      }`}
                    >
                      ₦{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{tx.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Withdraw Amount Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-30 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 h-dvh bg-white p-4 z-40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "tween",
                ease: "easeOut",
                duration: 0.3,
              }}
            >
              <div className="relative flex items-center justify-center mb-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="absolute left-0 p-1"
                >
                  <GoChevronLeft className="text-2xl text-gray-800" />
                </button>
                <h2 className="text-lg font-opensans font-semibold">
                  Withdraw Funds
                </h2>
              </div>
              <div className="absolute bottom-12 right-0 left-0 px-4">
                <div className="text-center mb-40">
                  <p className="text-sm font-lato font-medium text-gray-500">
                    Enter amount
                  </p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="₦0.00"
                    value={formatted}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setWithdrawAmount(digits);
                    }}
                    className="w-full text-6xl font-opensans font-semibold text-center bg-transparent focus:outline-none"
                  />
                </div>
                <div className="mt-6 px-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-opensans font-medium text-gray-600">
                      Withdrawable balance
                    </span>
                    <span className="text-sm font-opensans font-semibold">
                      ₦{balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t mb-3 border-gray-200"></div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-opensans font-medium text-gray-600">
                      Transfer to
                    </span>
                    <span>
                      <p className="text-sm text-right uppercase font-opensans font-semibold">
                        {vendorData.bankDetails.bankName || "N/A"}
                      </p>
                      <p className="text-xs font-opensans text-gray-600 font-normal">
                        {vendorData.bankDetails.accountNumber || "N/A"}
                      </p>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setShowWithdrawPinModal(true);
                  }}
                  disabled={!canWithdraw}
                  className="w-full bg-customOrange font-opensans text-white rounded-full mt-4 py-2.5 font-medium disabled:opacity-50"
                >
                  Withdraw {canWithdraw && displayAmount}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Setup PIN Modal (unchanged) */}
      <Modal
        isOpen={showPinModal}
        onRequestClose={() => setShowPinModal(false)}
        className="w-full mx-auto h-full bg-white px-4 py-4 outline-none"
        overlayClassName="fixed z-20 inset-0 bg-black bg-opacity-30 flex justify-center items-start"
      >
        <div className="relative flex items-center justify-center mb-6">
          <button
            onClick={() => {
              setShowPinModal(false);
              navigate(-1);
            }}
            className="absolute left-0 p-1"
          >
            <GoChevronLeft className="text-2xl text-gray-800" />
          </button>
          <h2 className="text-lg font-opensans font-semibold">Wallet</h2>
        </div>
        <div className="text-center px-16 mt-20">
          <h2 className="text-2xl font-bold font-lato mb-2">{promptText}</h2>
          <p className="mb-4 font-lato font-medium text-sm text-gray-600">
            Add a 4-digit PIN to securely approve withdrawals
          </p>
        </div>
        <div className="flex justify-center space-x-4 mt-8 mb-16">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < displayPin.length
                  ? "bg-customDeepOrange"
                  : "border-customOrange"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-center">
          <div className="grid grid-cols-3 font-semibold font-lato gap-9 w-max">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
              (k) => (
                <button
                  key={k}
                  onClick={() => onKeyPress(k)}
                  className="w-16 h-16 bg-gray-50 rounded-full text-2xl flex items-center justify-center"
                >
                  {k === "⌫" ? (
                    <LuDelete className="h-7 w-5 text-red-600" />
                  ) : (
                    k
                  )}
                </button>
              )
            )}
          </div>
        </div>
        <div className="text-center flex items-center justify-center mt-4">
          <AiFillSafetyCertificate className="text-green-600" />
          <p className="ml-1 font-satoshi font-light text-xs text-customOrange">
            Input is 100% encrypted (MTD)
          </p>
        </div>
      </Modal>

      {/* Withdraw PIN Modal */}
      <AnimatePresence>
        {showWithdrawPinModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-30 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 h-70% bg-white rounded-t-2xl p-4 z-40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
            >
              <div className="relative flex items-center justify-between mb-6">
                <h2 className="text-xl font-opensans font-semibold">
                  Enter Your PIN
                </h2>
                <div
                  onClick={() => setShowWithdrawPinModal(false)}
                  className="bg-gray-100 rounded-full p-1"
                >
                  <IoClose className="text-xl text-gray-800" />
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-8 mb-16">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 ${
                      i < withdrawPin.length
                        ? "bg-customDeepOrange"
                        : "border-customOrange"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center">
                <div className="grid grid-cols-3 font-semibold font-lato gap-9 w-max">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "",
                    "0",
                    "⌫",
                  ].map((k) => (
                    <button
                      key={k}
                      onClick={() => onWithdrawKey(k)}
                      disabled={withdrawLoading}
                      className="w-16 h-16 bg-gray-50 rounded-full text-2xl flex items-center justify-center"
                    >
                      {k === "⌫" ? (
                        <LuDelete className="h-7 w-5 text-red-600" />
                      ) : (
                        k
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-center flex items-center justify-center mt-4">
                <AiFillSafetyCertificate className="text-green-600" />
                <p className="ml-1 font-satoshi font-light text-xs text-customOrange">
                  Input is 100% encrypted (MTD)
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {withdrawLoading && <WithdrawLoad />}

      {pinLoading && <WithdrawLoad />}
      <Modal
        isOpen={showInfoModal}
        onRequestClose={() => setShowInfoModal(false)}
        className="w-[90%] mx-auto bg-white p-6 rounded-lg outline-none"
        overlayClassName="fixed z-[5000] inset-0 bg-black bg-opacity-30 flex items-center justify-center"
        ariaHideApp={false}
      >
        {" "}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-opensans font-semibold">
            How Pending Payments Work
          </h2>
        </div>
        <p className="text-sm font-opensans text-gray-700 mb-2">
          <span className="text-customOrange font-semibold">
            What is pending balance?
          </span>{" "}
          This is the amount that’s due to be added to your available wallet
          balance on the next scheduled payout day. Payouts are processed every
          Monday, Wednesday, and Friday. Please note that pending funds cannot
          be withdrawn until they’re cleared into your main balance.
        </p>
        <div className="text-center mt-6">
          <button
            onClick={() => setShowInfoModal(false)}
            className="px-6 py-2 font-opensans bg-customOrange text-white rounded-full text-sm"
          >
            Got it
          </button>
        </div>
      </Modal>
      <AnimatePresence>
        {showResultModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-30 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 h-[60%] bg-white rounded-t-2xl p-4 z-40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
            >
              <div className="relative flex items-center justify-between mb-6">
                <h2 className="text-lg font-opensans font-semibold">
                  {resultSuccess
                    ? "Withdrawal Successful"
                    : "Withdrawal Failed"}
                </h2>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="bg-gray-100 rounded-full p-1"
                >
                  <IoClose className="text-xl text-gray-800" />
                </button>
              </div>
              <div className="text-center">
                {resultSuccess ? (
                  <>
                    <div className="-translate-y-10 h-40">
                      <Paymentsuccess />
                    </div>
                    <div className="-translate-y-10 text-left">
                      <p className="font-opensans font-medium text-sm mb-2">
                        You withdrew:{" "}
                        <span className="text-2xl ml-2 font-bold text-customDeepOrange mb-4">
                          ₦{resultAmount.toLocaleString()}
                        </span>
                      </p>
                      <div className="border-gray-100 border  mb-4"></div>
                      <p className="font-opensans font-medium text-sm">
                        Transaction reference:{" "}
                        <span className="uppercase ml-2">
                          {resultReference}
                        </span>
                      </p>
                      <div className="border-gray-100 border mt-3 mb-4"></div>
                      <p className="font-opensans text-xs   mt-12">
                        Our payment partners processes transactions in real
                        time. The funds will typically reflect in your bank
                        account immediately—subject to your bank's processing
                        speed.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FailedWithdraw />
                    <p className="font-opensans text-sm text-red-600">
                      {resultError || "Transaction failed"}
                    </p>
                  </>
                )}
              </div>
              {/* <button
                onClick={() => setShowResultModal(false)}
                className="mt-6 w-full bg-customOrange text-white rounded-full py-2.5 font-opensans font-medium"
              >
                Close
              </button> */}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

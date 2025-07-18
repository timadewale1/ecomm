import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { GoChevronLeft } from "react-icons/go";
import { MdOutlineContentPasteSearch } from "react-icons/md";
import { GoArrowUpRight, GoArrowDownRight } from "react-icons/go";

import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useTawk } from "../../components/Context/TawkProvider";
import { useAuth } from "../../custom-hooks/useAuth";
import Loading from "../../components/Loading/Loading";
import SEO from "../../components/Helmet/SEO";
import WalletAnim from "../../components/Loading/WalletAnim";
import WalletSetup from "../../components/Loading/WalletSetup";
import { TbXxx } from "react-icons/tb";
import { LuCopy, LuCopyCheck } from "react-icons/lu";
import { FcOnlineSupport } from "react-icons/fc";

export default function UserWalletPage() {
  const {
    currentUserData,
    loading: authLoading,
    accountDeactivated,
  } = useAuth();
  const [balance, setBalance] = useState(0);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [walletSetup, setWalletSetup] = useState(
    currentUserData?.walletSetup ?? false
  );

  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem("userWalletHistory");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [hideBalance, setHideBalance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hideBalance") || "false");
    } catch {
      return false;
    }
  });
  const [walletCreating, setWalletCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { openChat } = useTawk();

  const copyToClipboard = async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast.success("Account number copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  // Generate a random 4-digit PIN
  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Fetch transaction history
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

      const transactions = json.data
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

      setHistory(transactions);
      localStorage.setItem("userWalletHistory", JSON.stringify(transactions));
      return transactions;
    } catch (err) {
      console.error("⚠️ fetchHistory error:", err);
      toast.error(err.message || "Failed to load history");
      return [];
    }
  };

  // Create wallet with normalized phone number
  const createWallet = async () => {
    if (walletCreating) return;
    setWalletCreating(true);
    try {
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const url = `${import.meta.env.VITE_API_BASE_URL}/create-wallet`;
      const randomPin = generateRandomPin();

      // Split displayName into firstName and lastName
      const [firstName, ...lastNameParts] = (
        currentUserData.displayName || ""
      ).split(" ");
      const lastName = lastNameParts.join(" ") || "";

      // Normalize phone number to include +234 and ensure >= 14 characters
      let phoneNumber = currentUserData.phoneNumber
        ?.toString()
        .replace(/\D/g, "");
      if (phoneNumber) {
        if (phoneNumber.startsWith("234")) {
          phoneNumber = `+${phoneNumber}`;
        } else if (phoneNumber.startsWith("0")) {
          phoneNumber = `+234${phoneNumber.slice(1)}`;
        } else {
          phoneNumber = `+234${phoneNumber}`;
        }

        if (phoneNumber.length < 14) {
          throw new Error("Invalid phone number: must be at least 10 digits");
        }
      } else {
        throw new Error("Phone number is missing");
      }

      const payload = {
        firstName: firstName || "",
        lastName: lastName,
        email: currentUserData.email,
        myThriftId: currentUserData.uid,
        walletPin: randomPin,
        phoneNumber: phoneNumber,
      };

      console.log("📤 createWallet payload:", {
        ...payload,
        walletPin: "****",
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 API Response Status:", res.status, res.statusText);
      const result = await res.json();
      console.log("📥 API Response Body:", result);

      if (!result.status) throw new Error(result.message);
      const d = result.data;

      // Update Firestore
      await updateDoc(doc(db, "users", currentUserData.uid), {
        walletSetup: true,
        accountName: d.accountName,
        balance: d.balance,
        walletId: String(d.walletId),
        preferredBank: d.preferredBank,
        accountNumber: d.accountNumber,
      });

      toast.success("Wallet created successfully");
    } catch (e) {
      console.error("❌ createWallet error:", e);
      toast.error(e.message || "Failed to create wallet");
    } finally {
      setWalletCreating(false);
    }
  };

  // Fetch wallet data
  useEffect(() => {
    if (!currentUserData?.uid) {
      if (!authLoading) {
        setError("User not authenticated");
        setIsLoading(false);
      }
      return;
    }

    if (accountDeactivated) {
      setError("Account is deactivated. Please contact support.");
      setIsLoading(false);
      return;
    }

    if (currentUserData.role !== "user") {
      setError("Access restricted to users only.");
      setIsLoading(false);
      return;
    }

    // Hydrate UI with cached history
    try {
      const cached = localStorage.getItem("userWalletHistory");
      if (cached) setHistory(JSON.parse(cached));
    } catch {}

    // **Combined real-time listener for balance, account details & walletSetup**
    const unsub = onSnapshot(
      doc(db, "users", currentUserData.uid),
      (snap) => {
        if (!snap.exists()) {
          setError("User document not found");
          setIsLoading(false);
          return;
        }

        const d = snap.data();
        setBalance(d.balance ?? 0);
        setAccountNumber(d.accountNumber ?? "");
        setBankName(d.preferredBank ?? "");
        setWalletSetup(d.walletSetup ?? false); // ← NEW

        // only flip off loading the first time we get data
        setIsLoading(false);

        // keep history fresh
        fetchHistory(currentUserData.uid);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Failed to fetch wallet data");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [
    currentUserData?.uid,
    authLoading,
    accountDeactivated,
    currentUserData?.role,
  ]);

  if (authLoading || isLoading) return <Loading />;
  if (error) {
    return (
      <div className="p-4 w-full mx-auto font-opensans text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 bg-customOrange text-white rounded-full py-2.5 px-6 font-opensans font-medium"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Show create wallet button if wallet is not set up
  if (!walletSetup) {
    return (
      <>
        <SEO
          title="Wallet Setup - My Thrift"
          description="Set up your My Thrift wallet to view your balance and account details."
          url="https://www.shopmythrift.store/user-wallet"
        />
        <div className="p-4 w-full mx-auto font-opensans">
          <div className="relative flex items-center justify-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 p-1"
            >
              <GoChevronLeft className="text-2xl text-gray-800" />
            </button>
            <h2 className="text-lg font-opensans font-semibold">
              Create Wallet
            </h2>
            <FcOnlineSupport
              onClick={openChat}
              className="absolute right-0 text-2xl text-customOrange cursor-pointer"
              title="Customer Care"
            />
          </div>
          <WalletSetup />
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-sm text-gray-600 font-opensans -translate-y-16 px-4">
              Set up your wallet to be able to pay for items directly, making
              checkout faster and more convenient every time you shop.
            </p>
            <button
              onClick={createWallet}
              disabled={walletCreating}
              className="bg-customOrange text-white rounded-full py-2.5 px-6 font-opensans font-medium disabled:opacity-50"
            >
              {walletCreating ? "Creating Wallet..." : "Setup Wallet"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Main wallet dashboard
  return (
    <>
      <SEO
        title="Wallet - My Thrift"
        description="View your balance and account details in your My Thrift wallet."
        url="https://www.shopmythrift.store/user-wallet"
      />
      <div className="p-4 w-full mx-auto font-opensans">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-6">
          <button onClick={() => navigate(-1)} className="absolute left-0 p-1">
            <GoChevronLeft className="text-2xl text-gray-800" />
          </button>
          <h2 className="text-lg font-opensans font-semibold">Wallet</h2>
          <FcOnlineSupport
            onClick={openChat}
            className="absolute right-0 text-2xl text-customOrange cursor-pointer"
            title="Customer Care"
          />
        </div>

        {/* Balance Card */}
        <div className="relative z-10 pb-12 bg-customDeepOrange rounded-2xl p-4 text-white overflow-hidden">
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
              onClick={() => {
                const next = !hideBalance;
                setHideBalance(next);
                localStorage.setItem("hideBalance", JSON.stringify(next));
              }}
            >
              {hideBalance ? (
                <BsEye className="text-sm" />
              ) : (
                <BsEyeSlash className="text-sm" />
              )}
            </button>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-gray-50 rounded-2xl px-4 py-2 -translate-y-5">
          <div className="mb-6"></div>
          <div className="flex justify-between mb-3">
            <span className="font-opensans text-sm text-gray-600">
              Bank Name
            </span>
            <span className="text-sm font-opensans font-semibold uppercase">
              {bankName || "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-opensans text-sm text-gray-600">
              Account Number
            </span>
            <span className="flex items-center space-x-2">
              <span className="text-sm font-opensans font-semibold">
                {accountNumber || "N/A"}
              </span>
              {accountNumber && (
                <button
                  onClick={copyToClipboard}
                  className="text-gray-600 hover:text-black"
                >
                  {copied ? (
                    <LuCopyCheck className="w-4 h-4 text-customOrange" />
                  ) : (
                    <LuCopy className="w-4 h-4 text-customOrange" />
                  )}
                </button>
              )}
            </span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="border border-gray-200 mt-4 rounded-2xl p-4 bg-white">
          <h3 className="text-xs font-opensans font-medium mb-2">
            Transaction History
          </h3>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MdOutlineContentPasteSearch className="text-5xl text-customOrange" />
              <p className="text-xs text-center text-gray-500 mt-2">
                Your recent transactions will appear here
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((tx) => (
                <li
                  key={tx.id}
                  className="flex justify-between border-b border-gray-200 py-3 last:border-0 hover:bg-gray-50"
                >
                  {/* icon + label */}
                  <span className="flex items-center space-x-2">
                    {tx.type === "withdrawal" ? (
                      <GoArrowUpRight className="text-xl text-gray-600" />
                    ) : (
                      <GoArrowDownRight className="text-xl text-gray-600" />
                    )}
                    <span className="text-sm font-semibold">
                      {tx.type === "withdrawal" ? "Paid" : "Deposit"}
                    </span>
                  </span>

                  {/* amount & date */}
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
    </>
  );
}

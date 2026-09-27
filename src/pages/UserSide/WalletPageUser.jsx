import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useTawk } from "../../components/Context/TawkProvider";
import { useAuth } from "../../custom-hooks/useAuth";
import Loading from "../../components/Loading/Loading";
import SEO from "../../components/Helmet/SEO";
import WalletSetup from "../../components/Loading/WalletSetup";
import { FcOnlineSupport } from "react-icons/fc";
import {
  WalletDashboard,
  WalletHistory,
  WalletTransactionSheet,
} from "./WalletUserViews";
import "./wallet-user.css";
import AppPageHeader from "../../components/layout/AppPageHeader";
import useNativePageRefresh from "../../custom-hooks/useNativePageRefresh";
import { appHaptics } from "../../services/haptics";
import { fetchUserWalletTransactions } from "../../services/walletTransactions";
import {
  selectUserWallet,
  userWalletEntryAnimationCompleted,
} from "../../redux/reducers/userWalletSlice";
import {
  createWallet as createWalletOnServer,
  getWalletApiErrorMessage,
} from "../../services/walletApi";

export default function UserWalletPage() {
  const {
    currentUser,
    currentUserData,
    loading: authLoading,
    accountDeactivated,
  } = useAuth();
  const dispatch = useDispatch();
  const walletState = useSelector(selectUserWallet);
  const walletUid = currentUser?.uid || currentUserData?.uid || null;
  const walletStateMatchesUser = walletState.ownerUid === walletUid;
  const hasLiveWalletSnapshot =
    walletStateMatchesUser && walletState.initialSnapshotReceived;
  const balance = hasLiveWalletSnapshot
    ? walletState.balance
    : Number(currentUserData?.balance) || 0;
  const accountNumber = hasLiveWalletSnapshot
    ? walletState.accountNumber
    : currentUserData?.accountNumber || "";
  const bankName = hasLiveWalletSnapshot
    ? walletState.bankName
    : currentUserData?.preferredBank || "";
  const walletSetup = hasLiveWalletSnapshot
    ? walletState.walletSetup
    : currentUserData?.walletSetup === true;
  const history = walletStateMatchesUser ? walletState.transactions : [];
  const [hideBalance, setHideBalance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hideBalance") || "false");
    } catch {
      return false;
    }
  });
  const [walletCreating, setWalletCreating] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isHistoryView = location.pathname === "/wallet-transactions";
  const [copied, setCopied] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { openChat } = useTawk();
  const balanceImpactHandled = useRef(false);
  const automaticHistoryAttemptUid = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add("wallet-page-active");
    document.documentElement.classList.toggle(
      "wallet-history-active",
      isHistoryView,
    );

    return () => {
      document.documentElement.classList.remove(
        "wallet-page-active",
        "wallet-history-active",
      );
    };
  }, [isHistoryView]);

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

  // Create wallet with normalized phone number
  const createWallet = async () => {
    if (walletCreating) return;
    setWalletCreating(true);
    try {
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
        accountType: "user",
        firstName: firstName || "",
        lastName: lastName,
        email: currentUserData.email,
        myThriftId: currentUserData.uid,
        walletPin: randomPin,
        phoneNumber: phoneNumber,
      };

      const result = await createWalletOnServer(payload);

      if (!result.status) throw new Error(result.message);

      void appHaptics.success();
      toast.success("Wallet created successfully");
    } catch (e) {
      console.error("❌ createWallet error:", e);
      toast.error(getWalletApiErrorMessage(e, "Failed to create wallet"));
    } finally {
      setWalletCreating(false);
    }
  };

  const refreshWalletHistory = useCallback(async () => {
    if (!walletUid) return;
    try {
      await dispatch(fetchUserWalletTransactions(walletUid, { force: true }));
    } catch (error) {
      toast.error(error.message || "Failed to load history");
      throw error;
    }
  }, [dispatch, walletUid]);

  useNativePageRefresh(refreshWalletHistory, {
    enabled: Boolean(walletUid && walletSetup && hasLiveWalletSnapshot),
    verticalOffset: 112,
  });

  // Transaction history is fetched once per signed-in user and then remains in
  // Redux. Later updates happen only through the explicit native refresh flow.
  useEffect(() => {
    if (!walletUid || !walletSetup || !hasLiveWalletSnapshot) return;
    const emptyReadyCache =
      walletState.transactionsStatus === "ready" && history.length === 0;
    if (
      !["idle", "error"].includes(walletState.transactionsStatus) &&
      !emptyReadyCache
    ) return;
    // One automatic attempt per mounted page/user. If a transient native
    // failure occurs, leaving and reopening the wallet retries once without
    // creating an in-place retry loop; pull-to-refresh remains available too.
    if (automaticHistoryAttemptUid.current === walletUid) return;
    automaticHistoryAttemptUid.current = walletUid;

    void dispatch(
      fetchUserWalletTransactions(walletUid, {force: emptyReadyCache}),
    ).catch((error) => {
      toast.error(error.message || "Failed to load history");
    });
  }, [
    dispatch,
    hasLiveWalletSnapshot,
    walletSetup,
    walletState.transactionsStatus,
    walletUid,
    history.length,
  ]);

  useEffect(() => {
    balanceImpactHandled.current = false;
  }, [walletUid]);

  const shouldAnimateBalance = Boolean(
    !isHistoryView &&
      walletUid &&
      walletSetup &&
      hasLiveWalletSnapshot &&
      !walletState.entryAnimationPlayed,
  );

  const handleBalanceAnimationEnd = useCallback(() => {
    if (!walletUid || balanceImpactHandled.current) return;
    balanceImpactHandled.current = true;
    appHaptics.medium();
    dispatch(userWalletEntryAnimationCompleted(walletUid));
  }, [dispatch, walletUid]);

  const walletSnapshotErroredForUser =
    walletStateMatchesUser && walletState.snapshotStatus === "error";

  let pageError = null;
  if (!authLoading && !walletUid) pageError = "User not authenticated";
  else if (accountDeactivated) {
    pageError = "Account is deactivated. Please contact support.";
  } else if (currentUserData?.role && currentUserData.role !== "user") {
    pageError = "Access restricted to users only.";
  } else if (
    walletStateMatchesUser &&
    walletSnapshotErroredForUser &&
    !hasLiveWalletSnapshot
  ) {
    pageError = walletState.snapshotError || "Failed to fetch wallet data";
  }

  const isInitialWalletLoading = Boolean(
    authLoading ||
      (walletUid &&
        currentUserData?.role === "user" &&
        !hasLiveWalletSnapshot &&
        !walletSnapshotErroredForUser),
  );

  if (isInitialWalletLoading) return <Loading />;
  if (pageError) {
    return (
      <div className="p-4 w-full mx-auto font-opensans text-center">
        <p className="text-red-600">{pageError}</p>
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
          <AppPageHeader
            title="Create Wallet"
            onBack={() => navigate(-1)}
            className="-mx-4 w-auto mb-6"
            rightAction={
              <button
                type="button"
                onClick={() =>
                  openChat({
                    "support-entry": "wallet-setup",
                    screen: "wallet",
                  })
                }
                aria-label="Customer Care"
              >
                <FcOnlineSupport aria-hidden="true" />
              </button>
            }
          />
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
      {isHistoryView ? (
        <WalletHistory
          history={history}
          historyLoading={
            history.length === 0 &&
            ["loading", "refreshing"].includes(walletState.transactionsStatus)
          }
          onBack={() => navigate("/your-wallet", { replace: true })}
          onSelectTransaction={setSelectedTransaction}
        />
      ) : (
        <WalletDashboard
          balance={balance}
          hideBalance={hideBalance}
          onToggleBalance={() => {
            const next = !hideBalance;
            setHideBalance(next);
            localStorage.setItem("hideBalance", JSON.stringify(next));
          }}
          accountNumber={accountNumber}
          bankName={bankName}
          copied={copied}
          onCopy={copyToClipboard}
          history={history}
          historyLoading={
            history.length === 0 &&
            ["loading", "refreshing"].includes(walletState.transactionsStatus)
          }
          onBack={() => navigate(-1)}
          onSeeAll={() => navigate("/wallet-transactions")}
          onSelectTransaction={setSelectedTransaction}
          animateBalance={shouldAnimateBalance}
          onBalanceAnimationEnd={handleBalanceAnimationEnd}
        />
      )}

      <WalletTransactionSheet
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onReportIssue={() => {
          const paymentReference = selectedTransaction?.reference;
          const orderId = selectedTransaction?.orderId;
          const vendorId = selectedTransaction?.vendorId;
          setSelectedTransaction(null);
          openChat({
            "support-entry": "wallet-transaction",
            screen: isHistoryView ? "wallet-transactions" : "wallet",
            ...(orderId ? { "order-id": orderId } : {}),
            ...(vendorId ? { "vendor-id": vendorId } : {}),
            ...(paymentReference
              ? { "payment-reference": paymentReference }
              : {}),
          });
        }}
      />
    </>
  );
}

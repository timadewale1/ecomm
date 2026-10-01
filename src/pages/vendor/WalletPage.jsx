import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Eye,
  EyeOff,
  Info,
  ReceiptText,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { useTawk } from "../../components/Context/TawkProvider";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import AppPageHeader from "../../components/layout/AppPageHeader";
import Loading from "../../components/Loading/Loading";
import WithdrawLoad from "../../components/Loading/WithdrawLoad";
import Paymentsuccess from "../../components/Loading/PaymentSuccess";
import FailedWithdraw from "../../components/Loading/FailedWithdraw";
import SEO from "../../components/Helmet/SEO";
import { appHaptics } from "../../services/haptics";
import {
  createWallet as createWalletOnServer,
  getWalletApiErrorMessage,
  requestVendorPayout,
} from "../../services/walletApi";
import {
  loadVendorWalletTransactions,
  readCachedVendorWalletTransactions,
} from "../../services/vendorWalletTransactions";
import { toWalletDate } from "../../services/walletTransactionUtils";
import "../UserSide/wallet-user.css";
import "./vendor-wallet.css";

const PAYOUT_DAYS = [1, 3, 5];
const PAYOUT_OPEN_HOUR = 2;
const amountFormatter = new Intl.NumberFormat("en-NG", {minimumFractionDigits: 0, maximumFractionDigits: 2});
const balanceFormatter = new Intl.NumberFormat("en-NG", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const shortDate = new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"});
const formatTransactionDate = (value, fallback = "Date unavailable") => {
  const date = toWalletDate(value);
  return date ? shortDate.format(date) : fallback;
};

const nextPayoutWindow = (from = new Date()) => {
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(PAYOUT_OPEN_HOUR, 0, 0, 0);
    if (PAYOUT_DAYS.includes(candidate.getDay()) && candidate > from) return candidate;
  }
  return null;
};

const maskBankAccount = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Not available";
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

function PinPad({value, onPress, disabled}) {
  return (
    <div className="vendor-wallet-pin-pad">
      {["1","2","3","4","5","6","7","8","9","","0","delete"].map((key, index) => (
        <button key={`${key}-${index}`} type="button" disabled={!key || disabled} onClick={() => onPress(key)} aria-label={key === "delete" ? "Delete digit" : key || undefined}>
          {key === "delete" ? <Trash2 /> : key}
        </button>
      ))}
    </div>
  );
}

function TransactionSkeleton() {
  return <div className="user-wallet-transactions-skeleton" aria-label="Loading transactions" aria-busy="true">{[0,1,2].map((row) => <div key={row}><span className="user-wallet-skeleton-icon"/><span className="user-wallet-skeleton-copy"><i/><i/></span><span className="user-wallet-skeleton-amount"/></div>)}</div>;
}

function EmptyTransactions() {
  return <div className="user-wallet-empty"><span className="user-wallet-empty-icon"><ReceiptText/><Clock3/></span><p>Your recent transactions<br/>will show here</p></div>;
}

function TransactionRow({transaction, onClick}) {
  const credit = transaction.type === "credit";
  return (
    <li><button type="button" className="user-wallet-transaction" onClick={onClick}>
      <span className={`user-wallet-transaction-icon user-wallet-transaction-icon--${credit ? "credit" : "debit"}`}>{credit ? <ArrowDownLeft/> : <ArrowUpRight/>}</span>
      <span className="user-wallet-transaction-copy"><strong>{transaction.title}</strong><small>{formatTransactionDate(transaction.createdAt)}</small></span>
      <span className={`user-wallet-transaction-amount user-wallet-transaction-amount--${credit ? "credit" : "debit"}`}>{credit ? "+" : "-"} ₦{amountFormatter.format(transaction.amount)}</span>
    </button></li>
  );
}

export default function WalletPage() {
  const navigate = useNavigate();
  const {vendorData, loading: vendorLoading} = useContext(VendorContext);
  const {openChat} = useTawk();
  const vendorId = vendorData?.vendorId || vendorData?.uid || "";
  const balance = Number(vendorData?.balance || 0);
  const pending = Number(vendorData?.pendingBalance || 0);
  const withdrawalsRequireSupport = vendorData?.isDeactivated === true ||
    vendorData?.accountRestriction?.active === true;
  const historyRequest = useRef(0);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyView, setHistoryView] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [hideBalance, setHideBalance] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hideBalance") || "false"); }
    catch { return false; }
  });
  const [infoOpen, setInfoOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amountMinor, setAmountMinor] = useState("");
  const [withdrawPinOpen, setWithdrawPinOpen] = useState(false);
  const [withdrawPin, setWithdrawPin] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupFirstPin, setSetupFirstPin] = useState("");
  const [setupConfirmPin, setSetupConfirmPin] = useState("");
  const [confirmingSetupPin, setConfirmingSetupPin] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [countdown, setCountdown] = useState("");
  const payoutWindow = PAYOUT_DAYS.includes(new Date().getDay()) && new Date().getHours() >= PAYOUT_OPEN_HOUR;
  const amount = Number(amountMinor || 0) / 100;
  const accountNumber = vendorData?.bankDetails?.accountNumber || "";

  const loadHistory = useCallback(async ({quiet = false} = {}) => {
    if (!vendorId) return;
    const requestId = ++historyRequest.current;
    setHistoryLoading(true);
    try {
      const next = await loadVendorWalletTransactions(vendorId);
      if (requestId !== historyRequest.current) return;
      setHistory(next);
    } catch (error) {
      if (!quiet) toast.error(getWalletApiErrorMessage(error, "Failed to load wallet history"));
    } finally {
      if (requestId === historyRequest.current) setHistoryLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    const cached = readCachedVendorWalletTransactions(vendorId);
    if (cached.length) setHistory(cached);
    void loadHistory({quiet: true});
    return () => { historyRequest.current += 1; };
  }, [loadHistory, vendorId]);

  useEffect(() => {
    if (!vendorLoading && vendorData?.walletSetup === false) setSetupOpen(true);
  }, [vendorData?.walletSetup, vendorLoading]);

  useEffect(() => {
    const tick = () => {
      const target = nextPayoutWindow();
      if (!target) return;
      const diff = Math.max(0, target.getTime() - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor(diff / 3600000) % 24;
      const minutes = Math.floor(diff / 60000) % 60;
      setCountdown(`${days ? `${days}d ` : ""}${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`);
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleBalance = () => {
    const next = !hideBalance;
    setHideBalance(next);
    localStorage.setItem("hideBalance", JSON.stringify(next));
    void appHaptics.selection();
  };

  const createWallet = async () => {
    if (setupLoading) return;
    setSetupLoading(true);
    try {
      const response = await createWalletOnServer({
        accountType: "vendor",
        firstName: vendorData.firstName,
        lastName: vendorData.lastName,
        email: vendorData.email,
        myThriftId: vendorId,
        walletPin: setupFirstPin,
        phoneNumber: vendorData.phoneNumber,
      });
      if (response.status === false) throw new Error(response.message);
      setSetupOpen(false);
      void appHaptics.success();
      toast.success("Wallet created");
    } catch (error) {
      setSetupFirstPin(""); setSetupConfirmPin(""); setConfirmingSetupPin(false);
      void appHaptics.error();
      toast.error(getWalletApiErrorMessage(error, "Failed to create wallet"));
    } finally { setSetupLoading(false); }
  };

  const pressSetupPin = (key) => {
    if (setupLoading) return;
    if (key === "delete") {
      void appHaptics.light();
      if (confirmingSetupPin) setSetupConfirmPin((pin) => pin.slice(0, -1));
      else setSetupFirstPin((pin) => pin.slice(0, -1));
      return;
    }
    const current = confirmingSetupPin ? setupConfirmPin : setupFirstPin;
    if (current.length >= 4) return;
    const next = current + key;
    void (next.length === 4 ? appHaptics.medium() : appHaptics.selection());
    if (!confirmingSetupPin) {
      setSetupFirstPin(next);
      if (next.length === 4) window.setTimeout(() => setConfirmingSetupPin(true), 120);
    } else {
      setSetupConfirmPin(next);
      if (next.length === 4) {
        if (next === setupFirstPin) void createWallet();
        else { void appHaptics.error(); toast.error("PINs do not match"); setSetupConfirmPin(""); }
      }
    }
  };

  const performPayout = async (pin) => {
    if (withdrawalsRequireSupport) {
      setWithdrawPin("");
      setWithdrawPinOpen(false);
      setAmountOpen(false);
      toast.error("Contact support to arrange a withdrawal while your store is restricted.");
      return;
    }
    setWithdrawLoading(true);
    try {
      const response = await requestVendorPayout({vendorId, walletPin: pin, payoutAmount: amount});
      if (response.status === false) throw new Error(response.message);
      setResult({success: true, amount: response.data?.amount || amount, reference: response.data?.transactionReference || ""});
      void appHaptics.success();
      void loadHistory({quiet: true});
    } catch (error) {
      const message = getWalletApiErrorMessage(error, "Withdrawal failed");
      setResult({success: false, error: message});
      void appHaptics.error();
    } finally {
      setWithdrawPin(""); setWithdrawPinOpen(false); setAmountMinor(""); setWithdrawLoading(false);
    }
  };

  const pressWithdrawPin = (key) => {
    if (withdrawLoading) return;
    if (key === "delete") { void appHaptics.light(); setWithdrawPin((pin) => pin.slice(0, -1)); return; }
    if (withdrawPin.length >= 4) return;
    const next = withdrawPin + key;
    setWithdrawPin(next);
    void (next.length === 4 ? appHaptics.medium() : appHaptics.selection());
    if (next.length === 4) void performPayout(next);
  };

  if (vendorLoading || !vendorData) return <Loading />;
  const canWithdraw = payoutWindow && amount >= 100 && amount <= balance;
  const visibleHistory = historyView ? history : history.slice(0, 10);

  return (
    <>
      <SEO title="Vendor wallet - My Thrift" description="Track store earnings and withdraw securely." url="https://www.shopmythrift.store/vendor-wallet" />
      <main className="user-wallet-page vendor-wallet-page">
        <AppPageHeader title={historyView ? "Transaction History" : "Wallet"} onBack={() => historyView ? setHistoryView(false) : navigate(-1)} />
        {!historyView && (
          <>
            <section className="user-wallet-balance-card">
              <div className="user-wallet-balance-main"><p>Available Balance</p><div className="user-wallet-balance-value"><strong>{hideBalance ? "₦••••••" : `₦${balanceFormatter.format(balance)}`}</strong><button type="button" onClick={toggleBalance}>{hideBalance ? <Eye/> : <EyeOff/>}</button></div></div>
              <div className="vendor-wallet-card-footer"><div><span>Pending balance</span><strong>₦{balanceFormatter.format(pending)}</strong></div><button type="button" onClick={() => setInfoOpen(true)} aria-label="About pending balance"><Info/></button></div>
            </section>
            <div className="vendor-wallet-withdraw-row"><button type="button" disabled={!withdrawalsRequireSupport && !payoutWindow} onClick={() => { void appHaptics.medium(); if (withdrawalsRequireSupport) { void openChat({"support-entry": "restricted-vendor-withdrawal", screen: "vendor-wallet"}); } else { setAmountOpen(true); } }}>{withdrawalsRequireSupport ? "Contact support for withdrawal" : payoutWindow ? "Withdraw earnings" : `Withdrawals open in ${countdown}`}</button><small>{withdrawalsRequireSupport ? "You can still fulfil your existing paid orders." : "Withdrawals are processed Monday, Wednesday and Friday."}</small></div>
          </>
        )}
        <section className={`user-wallet-recent ${historyView ? "vendor-wallet-history" : ""}`}>
          <div className="user-wallet-section-heading"><h2>{historyView ? "All transactions" : "Recent transactions"}</h2>{!historyView && history.length > 0 && <button type="button" onClick={() => setHistoryView(true)}>See all</button>}</div>
          {historyLoading && !history.length ? <TransactionSkeleton/> : !visibleHistory.length ? <EmptyTransactions/> : <ul className="user-wallet-transaction-list">{visibleHistory.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onClick={() => setSelectedTransaction(transaction)} />)}</ul>}
        </section>
      </main>

      <AppBottomSheet open={infoOpen} onClose={() => setInfoOpen(false)} height="43dvh" compactTop ariaLabel="Pending balance information">
        <div className="vendor-wallet-sheet-head"><div><h2>Pending balance</h2></div><button onClick={() => setInfoOpen(false)}><X/></button></div>
        <div className="vendor-wallet-sheet-copy"><p>Pending balance contains completed order earnings waiting for the next payout cycle. Payouts are processed every Monday, Wednesday and Friday. Funds cannot be withdrawn until they move into your available balance.</p></div>
      </AppBottomSheet>

      <AppBottomSheet open={amountOpen} onClose={() => setAmountOpen(false)} height="72dvh" compactTop keyboardAware ariaLabel="Withdraw earnings">
        <div className="vendor-wallet-sheet-head"><div><h2>Withdraw earnings</h2></div><button onClick={() => setAmountOpen(false)}><X/></button></div>
        <div className="vendor-wallet-amount-body">
          <label>Amount</label>
          <input inputMode="numeric" pattern="[0-9]*" value={`₦${balanceFormatter.format(amount)}`} onFocus={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)} onClick={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)} onChange={(event) => setAmountMinor(event.target.value.replace(/\D/g, "").slice(0, 12))} aria-label="Withdrawal amount" />
          <dl><div><dt>Withdrawable balance</dt><dd>₦{balanceFormatter.format(balance)}</dd></div><div><dt>Transfer to</dt><dd>{vendorData.bankDetails?.bankName || "Verified bank"}<small>{maskBankAccount(accountNumber)}</small></dd></div></dl>
          <button type="button" disabled={!canWithdraw} onClick={() => { setAmountOpen(false); setWithdrawPinOpen(true); }}>Withdraw {amount > 0 ? `₦${balanceFormatter.format(amount)}` : ""}</button>
          {amount > balance && <p className="vendor-wallet-error">Amount is above your available balance.</p>}
          {amount > 0 && amount < 100 && <p className="vendor-wallet-error">Minimum withdrawal is ₦100.</p>}
        </div>
      </AppBottomSheet>

      <AppBottomSheet open={withdrawPinOpen} onClose={() => setWithdrawPinOpen(false)} height="68dvh" compactTop dismissible={!withdrawLoading} closeOnBackdrop={!withdrawLoading} ariaLabel="Confirm withdrawal PIN">
        <div className="vendor-wallet-sheet-head"><div><h2>Enter your PIN</h2></div><button onClick={() => setWithdrawPinOpen(false)} disabled={withdrawLoading}><X/></button></div>
        <div className="vendor-wallet-pin-body"><div className="vendor-wallet-pin-dots">{[0,1,2,3].map((index) => <span key={index} className={index < withdrawPin.length ? "is-filled" : ""}/>)}</div><PinPad value={withdrawPin} onPress={pressWithdrawPin} disabled={withdrawLoading}/><p><ShieldCheck/>Your PIN is transmitted securely.</p></div>
      </AppBottomSheet>

      <AppBottomSheet open={setupOpen} onClose={() => {}} height="86dvh" compactTop dismissible={false} closeOnBackdrop={false} ariaLabel="Set up vendor wallet" ariaBusy={setupLoading}>
        <div className="vendor-wallet-sheet-head"><div><h2>{confirmingSetupPin ? "Confirm your PIN" : "Secure your wallet"}</h2><p>Add a 4-digit PIN to approve withdrawals.</p></div></div>
        <div className="vendor-wallet-pin-body"><div className="vendor-wallet-pin-dots">{[0,1,2,3].map((index) => <span key={index} className={index < (confirmingSetupPin ? setupConfirmPin : setupFirstPin).length ? "is-filled" : ""}/>)}</div><PinPad value={confirmingSetupPin ? setupConfirmPin : setupFirstPin} onPress={pressSetupPin} disabled={setupLoading}/><p><ShieldCheck/>Never share this PIN with anyone, including support.</p></div>
      </AppBottomSheet>

      <AppBottomSheet open={Boolean(selectedTransaction)} onClose={() => setSelectedTransaction(null)} height="64dvh" compactTop ariaLabel="Transaction details">
        {selectedTransaction && <><div className="vendor-wallet-sheet-head"><div><h2>{selectedTransaction.title}</h2></div><button onClick={() => setSelectedTransaction(null)}><X/></button></div><dl className="vendor-wallet-detail-list"><div><dt>Amount</dt><dd className={selectedTransaction.type === "credit" ? "is-credit" : "is-debit"}>{selectedTransaction.type === "credit" ? "+" : "-"} ₦{amountFormatter.format(selectedTransaction.amount)}</dd></div><div><dt>Date</dt><dd>{formatTransactionDate(selectedTransaction.createdAt, "Unavailable")}</dd></div><div><dt>Status</dt><dd>{selectedTransaction.status}</dd></div><div><dt>Reference</dt><dd>{selectedTransaction.reference || "Unavailable"}</dd></div><div><dt>Description</dt><dd>{selectedTransaction.description}</dd></div></dl><button className="vendor-wallet-report" type="button" onClick={() => openChat({"support-entry":"vendor-wallet-transaction",screen:"vendor-wallet","payment-reference":selectedTransaction.reference || "not-applicable"})}>Report an issue</button></>}
      </AppBottomSheet>

      <AppBottomSheet open={Boolean(result)} onClose={() => setResult(null)} height="58dvh" compactTop ariaLabel="Withdrawal result">
        {result && <><div className="vendor-wallet-sheet-head"><div><h2>{result.success ? "Withdrawal successful" : "Withdrawal failed"}</h2><p>{result.success ? "Your request has been sent to your bank." : "Your wallet was not debited."}</p></div><button onClick={() => setResult(null)}><X/></button></div><div className="vendor-wallet-result">{result.success ? <Paymentsuccess/> : <FailedWithdraw/>}{result.success ? <><strong>₦{balanceFormatter.format(result.amount)}</strong><p>Reference: {result.reference || "Unavailable"}</p></> : <p className="vendor-wallet-error">{result.error}</p>}</div></>}
      </AppBottomSheet>
      {(withdrawLoading || setupLoading) && <WithdrawLoad/>}
    </>
  );
}

import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  ReceiptText,
  X,
} from "lucide-react";
import AppPageHeader from "../../components/layout/AppPageHeader";
import { toWalletDate } from "../../services/walletTransactionUtils";

const toDate = toWalletDate;

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const balanceFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const detailDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getGroupLabel = (value) => {
  const date = toDate(value);
  if (!date) return "Earlier";

  const today = new Date();
  if (isSameDay(date, today)) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replaceAll("/", "-");
};

const getRecentDate = (value) => {
  const date = toDate(value);
  if (!date) return "Date unavailable";
  const time = timeFormatter.format(date);
  if (isSameDay(date, new Date())) return `Today at ${time}`;
  return `${shortDateFormatter.format(date)} at ${time}`;
};

const getHistoryTime = (value) => {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : "Date unavailable";
};

const getDetailDate = (value) => {
  const date = toDate(value);
  if (!date) return "Unavailable";
  const formatted = detailDateFormatter.format(date);
  const [datePart, timePart] = formatted.split(", ");
  return `${datePart.replaceAll("/", "-")}, at ${timePart}`;
};

const groupTransactions = (transactions) => {
  const groups = [];
  transactions.forEach((transaction) => {
    const label = getGroupLabel(transaction.createdAt);
    const previous = groups[groups.length - 1];
    if (previous?.label === label) previous.transactions.push(transaction);
    else groups.push({ label, transactions: [transaction] });
  });
  return groups;
};

function WalletHeader({ title, onBack }) {
  return <AppPageHeader title={title} onBack={onBack} />;
}

function TransactionRow({ transaction, dateMode, onSelect }) {
  const isCredit = transaction.type === "credit";
  const dateText =
    dateMode === "time"
      ? getHistoryTime(transaction.createdAt)
      : getRecentDate(transaction.createdAt);

  return (
    <li>
      <button
        type="button"
        className="user-wallet-transaction"
        onClick={() => onSelect(transaction)}
      >
        <span
          className={`user-wallet-transaction-icon user-wallet-transaction-icon--${
            isCredit ? "credit" : "debit"
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft aria-hidden="true" />
          ) : (
            <ArrowUpRight aria-hidden="true" />
          )}
        </span>
        <span className="user-wallet-transaction-copy">
          <strong>{transaction.title}</strong>
          <small>{dateText}</small>
        </span>
        <span
          className={`user-wallet-transaction-amount user-wallet-transaction-amount--${
            isCredit ? "credit" : "debit"
          }`}
        >
          {isCredit ? "+" : "-"} ₦{amountFormatter.format(transaction.amount)}
        </span>
      </button>
    </li>
  );
}

function EmptyTransactions() {
  return (
    <div className="user-wallet-empty">
      <span className="user-wallet-empty-icon" aria-hidden="true">
        <ReceiptText />
        <Clock3 />
      </span>
      <p>
        Your recent transactions
        <br />
        will show here
      </p>
    </div>
  );
}

function WalletTransactionsSkeleton() {
  return (
    <div className="user-wallet-transactions-skeleton" aria-label="Loading transactions" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div key={row}>
          <span className="user-wallet-skeleton-icon" />
          <span className="user-wallet-skeleton-copy"><i /><i /></span>
          <span className="user-wallet-skeleton-amount" />
        </div>
      ))}
    </div>
  );
}

export function WalletDashboard({
  balance,
  hideBalance,
  onToggleBalance,
  accountNumber,
  bankName,
  copied,
  onCopy,
  history,
  historyLoading = false,
  onBack,
  onSeeAll,
  onSelectTransaction,
  animateBalance,
  onBalanceAnimationEnd,
}) {
  const recentTransactions = history.slice(0, 10);

  return (
    <main className="user-wallet-page">
      <WalletHeader title="Wallet" onBack={onBack} />

      <section className="user-wallet-balance-card" aria-label="Wallet balance">
        <div className="user-wallet-balance-main">
          <p>Current Balance</p>
          <div className="user-wallet-balance-value">
            <strong
              className={animateBalance ? "user-wallet-balance-enter" : undefined}
              onAnimationEnd={animateBalance ? onBalanceAnimationEnd : undefined}
            >
              {hideBalance ? "₦••••••" : `₦${balanceFormatter.format(balance)}`}
            </strong>
            <button
              type="button"
              onClick={onToggleBalance}
              aria-label={hideBalance ? "Show balance" : "Hide balance"}
            >
              {hideBalance ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="user-wallet-account-row">
          <div>
            <span>Account number</span>
            <p>
              {accountNumber || "N/A"}
              {accountNumber && (
                <button type="button" onClick={onCopy} aria-label="Copy account number">
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
              )}
            </p>
          </div>
          <div>
            <span>Bank name</span>
            <p>{bankName || "N/A"}</p>
          </div>
        </div>
      </section>

      <section className="user-wallet-recent" aria-labelledby="recent-transactions-title">
        <div className="user-wallet-section-heading">
          <h2 id="recent-transactions-title">Recent transactions</h2>
          {history.length > 0 && (
            <button type="button" onClick={onSeeAll}>
              See all
            </button>
          )}
        </div>

        {historyLoading ? (
          <WalletTransactionsSkeleton />
        ) : recentTransactions.length === 0 ? (
          <EmptyTransactions />
        ) : (
          <ul className="user-wallet-transaction-list">
            {recentTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                dateMode="recent"
                onSelect={onSelectTransaction}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export function WalletHistory({ history, historyLoading = false, onBack, onSelectTransaction }) {
  const groups = groupTransactions(history);

  return (
    <main className="user-wallet-page user-wallet-history-page">
      <WalletHeader title="Transaction History" onBack={onBack} />
      <div className="user-wallet-history-content">
        {historyLoading ? (
          <WalletTransactionsSkeleton />
        ) : groups.length === 0 ? (
          <EmptyTransactions />
        ) : (
          groups.map((group) => (
            <section className="user-wallet-history-group" key={group.label}>
              <h2>{group.label}</h2>
              <ul className="user-wallet-transaction-list">
                {group.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    dateMode="time"
                    onSelect={onSelectTransaction}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

export function WalletTransactionSheet({ transaction, onClose, onReportIssue }) {
  if (!transaction) return null;
  const isCredit = transaction.type === "credit";

  return (
    <div className="user-wallet-sheet-overlay" onClick={onClose}>
      <section
        className="user-wallet-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-transaction-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="user-wallet-sheet-titlebar">
          <span aria-hidden="true" />
          <h2 id="wallet-transaction-sheet-title">{transaction.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close transaction details">
            <X aria-hidden="true" />
          </button>
        </div>

        <dl className="user-wallet-sheet-details">
          <div>
            <dt>Transaction Amount</dt>
            <dd className={isCredit ? "is-credit" : "is-debit"}>
              {isCredit ? "+" : "-"} ₦{amountFormatter.format(transaction.amount)}
            </dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{transaction.description}</dd>
          </div>
          <div>
            <dt>Transaction Date</dt>
            <dd>{getDetailDate(transaction.createdAt)}</dd>
          </div>
          <div>
            <dt>Transaction Reference</dt>
            <dd className="user-wallet-reference">
              {transaction.reference || "Unavailable"}
            </dd>
          </div>
        </dl>

        <button type="button" className="user-wallet-report" onClick={onReportIssue}>
          Report an Issue
        </button>
      </section>
    </div>
  );
}

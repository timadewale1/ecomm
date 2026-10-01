import React, { useMemo, useState } from "react";
import {
  BadgePercent,
  Ban,
  EllipsisVertical,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";
import moment from "moment";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";

const toDate = (createdAt) => {
  if (typeof createdAt?.toDate === "function") return createdAt.toDate();
  if (typeof createdAt?.seconds === "number") {
    return new Date(createdAt.seconds * 1000);
  }
  const parsed = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const getStatus = (message) => {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("in progress")) return "in-progress";
  if (normalized.includes("shipped")) return "shipped";
  if (normalized.includes("delivered")) return "delivered";
  if (normalized.includes("declined") || normalized.includes("cancelled")) {
    return "declined";
  }
  return null;
};

const getNotificationCopy = (notification, status, isNewItem, isOffer) => {
  const vendorName = notification.vendorName || "A vendor";

  if (notification.title) {
    return {
      title: notification.title,
      body: notification.body || notification.description || "",
    };
  }

  if (isNewItem) {
    return {
      title: `New item by ${vendorName}`,
      body: "",
    };
  }

  if (isOffer) {
    return {
      title: notification.offerTitle || `${vendorName} updated your offer`,
      body: notification.body || notification.message || "",
    };
  }

  if (status === "in-progress") {
    return {
      title: `${vendorName} accepted your order`,
      body: "Your order is being prepared",
    };
  }
  if (status === "shipped") {
    return {
      title: "Your order has been shipped",
      body: "Tap to see your rider’s details",
    };
  }
  if (status === "delivered") {
    return {
      title: "Your order has been delivered",
      body: `Order from ${vendorName}`,
    };
  }
  if (status === "declined") {
    return {
      title: `${vendorName} declined your order`,
      body: "Tap to see why",
    };
  }

  return {
    title: notification.message || "Notification",
    body: notification.body || notification.description || "",
  };
};

const NotificationSource = ({ notification, status, isOffer }) => {
  const vendorImage = notification.vendorCoverImage || notification.vendorImage;
  const vendorName = notification.vendorName || "Vendor";

  if (!status && !isOffer) {
    return vendorImage ? (
      <img
        src={vendorImage}
        alt={`${vendorName} profile`}
        className="notification-source-avatar"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <span className="notification-source-fallback" aria-hidden="true">
        {vendorName.trim().charAt(0).toUpperCase() || "M"}
      </span>
    );
  }

  let Icon = PackageCheck;
  if (status === "shipped") Icon = Truck;
  if (status === "declined") Icon = Ban;
  if (isOffer) Icon = BadgePercent;

  return (
    <span className="notification-source-icon" aria-hidden="true">
      <Icon />
    </span>
  );
};

const NotificationItem = ({ notification, markAsRead, onOpenOptions }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const message = String(notification.message || "");
  const status = getStatus(message);
  const isOffer =
    notification.type === "offer" ||
    notification.type === "offer-message" ||
    /offer/i.test(message);
  const isNewItem =
    notification.type === "vendor" &&
    Boolean(notification.productId || notification.productLink);
  const showProductImage = isNewItem && Boolean(notification.productImage);
  const isUnread = notification.seen !== true;
  const createdAt = useMemo(
    () => toDate(notification.createdAt),
    [notification.createdAt],
  );
  const createdAtIso = useMemo(() => createdAt.toISOString(), [createdAt]);
  const createdAtLabel = useMemo(
    () => moment(createdAt).format("h:mm A"),
    [createdAt],
  );
  const copy = useMemo(
    () => getNotificationCopy(notification, status, isNewItem, isOffer),
    [isNewItem, isOffer, notification, status],
  );

  const handleNotificationClick = () => {
    if (isUnread) void markAsRead(notification.id);

    if (
      notification.type === "order" &&
      (status === "shipped" || status === "declined")
    ) {
      setIsDetailsOpen(true);
      return;
    }

    if (notification.link) {
      navigate(notification.link);
    } else if (notification.productLink) {
      navigate(notification.productLink);
    } else if (notification.productId) {
      navigate(`/product/${notification.productId}`);
    }
  };

  return (
    <>
      <li className="notification-item">
        <button
          type="button"
          className="notification-item-main"
          onClick={handleNotificationClick}
          aria-label={`${copy.title}${isUnread ? ", unread" : ""}`}
        >
          <span
            className={`notification-unread-dot ${isUnread ? "is-visible" : ""}`}
            aria-hidden="true"
          />
          <NotificationSource
            notification={notification}
            status={status}
            isOffer={isOffer}
          />
          <span className="notification-copy">
            <strong>{copy.title}</strong>
            {copy.body && <span className="notification-body">{copy.body}</span>}
            <time dateTime={createdAtIso}>{createdAtLabel}</time>
          </span>
          {showProductImage && (
            <img
              src={notification.productImage}
              alt=""
              className="notification-product-image"
              loading="lazy"
              decoding="async"
            />
          )}
        </button>

        <button
          type="button"
          className="notification-more-button"
          aria-label={`More options for ${copy.title}`}
          onClick={() => onOpenOptions(notification)}
        >
          <EllipsisVertical aria-hidden="true" />
        </button>
      </li>

      {isDetailsOpen ? (
        <Modal
          isOpen
          onRequestClose={() => setIsDetailsOpen(false)}
          contentLabel="Notification details"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                {status === "shipped" ? (
                  <Truck className="text-customRichBrown" />
                ) : status === "declined" ? (
                  <Ban className="text-customRichBrown" />
                ) : null}
              </div>
              <h2 className="font-opensans text-base font-semibold">
                {status === "shipped" ? "Order Shipped" : "Order Declined"}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close notification details"
              onClick={() => setIsDetailsOpen(false)}
            >
              <X className="text-black text-xl" aria-hidden="true" />
            </button>
          </div>

          {status === "declined" && notification.declineReason ? (
            <div>
              <p className="text-xs text-gray-700 font-opensans mb-6">
                We&apos;re sorry! Your order has been declined by{" "}
                {notification.vendorName}.
              </p>
              <p className="text-sm font-opensans text-gray-700">
                <strong>Reason:</strong> {notification.declineReason}
              </p>
              <p className="text-xs font-opensans text-gray-600 italic border-l-2 border-gray-300 pl-3 mt-12">
                Note: Refunds typically take an hour to a day to appear in your
                account, depending on your payment method.
              </p>
            </div>
          ) : status === "shipped" && notification.riderInfo ? (
            <div>
              <p className="text-xs text-gray-700 font-opensans mb-6">
                Your order with {notification.vendorName} has been shipped.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-opensans text-gray-700">
                  <strong>Rider Name:</strong>{" "}
                  {notification.riderInfo.riderName}
                </p>
                <p className="text-xs font-opensans text-gray-700">
                  <strong>Rider Number:</strong>{" "}
                  {notification.riderInfo.riderNumber}
                </p>
                <p className="text-xs font-opensans text-gray-700">
                  <strong>Note:</strong>{" "}
                  {notification.riderInfo.note || "No additional notes"}
                </p>
              </div>
              <p className="text-xs font-opensans text-gray-600 italic border-l-2 border-gray-300 pl-3 mt-12">
                Note: Orders usually take 2–7 days to be shipped, depending on
                your location. Rider information is shown for transparency.
              </p>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
};

export default React.memo(NotificationItem);

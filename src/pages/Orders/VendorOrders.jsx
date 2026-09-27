import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiPackage,
  FiTruck,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import SEO from "../../components/Helmet/SEO";
import { appHaptics } from "../../services/haptics";
import VendorOrderDetailsSheet from "./VendorOrderDetailsSheet";
import useNativePageRefresh from "../../custom-hooks/useNativePageRefresh";
import { refreshVendorOrders } from "../../custom-hooks/orderListener";
import AppPageHeader from "../../components/layout/AppPageHeader";

const MAIN_TABS = [
  {id: "normal", label: "Normal orders"},
  {id: "stockpile", label: "Stockpiles"},
];

const NORMAL_TABS = [
  {id: "new", label: "New"},
  {id: "processing", label: "Processing"},
  {id: "fulfilment", label: "Fulfilment"},
  {id: "completed", label: "Completed"},
  {id: "declined", label: "Declined"},
];

const STOCKPILE_TABS = [
  {id: "new", label: "New additions"},
  {id: "active", label: "Active piles"},
  {id: "delivery", label: "Delivery"},
  {id: "completed", label: "Completed"},
  {id: "declined", label: "Declined"},
];

const EMPTY_ORDERS = Object.freeze([]);

const normalized = (value) => String(value || "").trim().toLowerCase();

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return new Date(value).getTime() || 0;
};

const formatDate = (value) => {
  const millis = toMillis(value);
  if (!millis) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
};

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const isDeclined = (order) =>
  normalized(order.vendorStatus) === "declined" ||
  normalized(order.progressStatus) === "declined";

const isPending = (order) =>
  !isDeclined(order) && normalized(order.vendorStatus) !== "accepted";

const isAccepted = (order) =>
  !isDeclined(order) && normalized(order.vendorStatus) === "accepted";

const isCompleted = (order) =>
  normalized(order.deliveryStatus) === "delivered" ||
  normalized(order.progressStatus) === "delivered" ||
  normalized(order.pickupStatus) === "collected";

const orderMatchesId = (order, orderId) => {
  const target = String(orderId || "").trim();
  if (!target) return false;
  return [order?.id, order?.orderId, order?.displayOrderId]
    .filter(Boolean)
    .some((value) => String(value).trim() === target);
};

const normalBucket = (order) => {
  if (isDeclined(order)) return "declined";
  if (isCompleted(order)) return "completed";
  if (isPending(order)) return "new";
  const delivery = normalized(order.deliveryStatus);
  if (order.kind === "pickup") {
    return order.pickupWindow?.days ? "fulfilment" : "processing";
  }
  if (
    order.vendorHandover?.confirmedAt ||
    ["in_transit", "ready_for_collection"].includes(delivery) ||
    normalized(order.progressStatus) === "shipped" ||
    normalized(order.progressStatus) === "in transit"
  ) {
    return "fulfilment";
  }
  return "processing";
};

const latestOrder = (orders) => [...orders].sort(
  (left, right) =>
    toMillis(right.updatedAt || right.createdAt) -
    toMillis(left.updatedAt || left.createdAt),
)[0] || null;

// A stockpile and an incoming repile have different lifecycles. A pending
// addition must not move an already-established pile out of Active piles.
const stockpileGroupBucket = (group) => {
  const available = group.filter((order) => !isDeclined(order));
  if (!available.length) return "declined";

  // A newly-created pile is not active until its first order is accepted.
  // Existing piles with an accepted order remain active while a repile waits
  // for a decision, which preserves the separate incoming-order lifecycle.
  if (!available.some(isAccepted) && available.some(isPending)) return "new";

  const stateOrder = latestOrder(available.filter((order) => order.stockpile)) ||
    latestOrder(available);
  const hasStockpileLifecycle = Boolean(stateOrder?.stockpile);
  const stockpileStatus = normalized(
    stateOrder?.stockpile?.status || stateOrder?.stockpileStatus,
  );
  const delivery = normalized(
    stateOrder?.stockpile?.deliveryStatus ||
      (!hasStockpileLifecycle ? stateOrder?.deliveryStatus : null),
  );

  if (
    ["completed", "delivered"].includes(stockpileStatus) ||
    delivery === "delivered" ||
    (!hasStockpileLifecycle && available.some(isCompleted))
  ) {
    return "completed";
  }
  if (
    stateOrder?.stockpile?.deliveryActionRequired ||
    stateOrder?.stockpile?.requestedForShipping ||
    [
      "awaiting_delivery_request",
      "closing",
      "preparing_quote",
      "quote_retry",
      "awaiting_delivery_payment",
      "payment_processing",
      "booking",
      "booking_retry",
      "booking_outcome_unknown",
      "booked",
      "in_transit",
    ].includes(stockpileStatus) ||
    ["booking", "booked", "courier_assigned", "in_transit"].includes(delivery)
  ) {
    return "delivery";
  }
  if (
    stateOrder?.stockpile?.isActive === true ||
    stockpileStatus === "active"
  ) {
    return "active";
  }
  if (hasStockpileLifecycle && stockpileStatus === "cancelled") {
    return "declined";
  }
  // A legacy projection may have no canonical status yet. Once its source
  // stockpile is inactive it must never be revived merely because it contains
  // accepted orders; accepted items now belong in the delivery workflow.
  if (hasStockpileLifecycle && stateOrder?.stockpile?.isActive === false) {
    return available.some(isAccepted) ? "delivery" : "declined";
  }
  if (!hasStockpileLifecycle && available.some(isAccepted)) return "active";
  return available.some(isPending) ? "new" : "active";
};

const stockpileRepresentative = (group) =>
  latestOrder(group.filter(isAccepted)) ||
  latestOrder(group.filter((order) => !isDeclined(order))) ||
  latestOrder(group);

const statusMeta = (order, bucket) => {
  if (bucket === "declined") return {label: "Declined", tone: "bg-[#fff0ef] text-[#c43228]", Icon: FiXCircle};
  if (bucket === "completed") return {label: order.kind === "pickup" ? "Collected" : "Delivered", tone: "bg-[#eaf8ef] text-[#167743]", Icon: FiCheckCircle};
  if (bucket === "new") return {label: "Awaiting decision", tone: "bg-[#fff7e8] text-[#a46200]", Icon: FiClock};
  if (bucket === "active") return {label: "Active pile", tone: "bg-[#fff1ed] text-[#e8461b]", Icon: FiPackage};
  if (bucket === "delivery" || bucket === "fulfilment") {
    if (order.stockpile?.deliveryActionRequired) {
      return {label: "Waiting for buyer", tone: "bg-[#fff7e8] text-[#a46200]", Icon: FiUser};
    }
    if (order.kind === "pickup") {
      return {label: "Ready for pickup", tone: "bg-[#eef4ff] text-[#2857a7]", Icon: FiMapPin};
    }
    return {label: "With courier", tone: "bg-[#eef4ff] text-[#2857a7]", Icon: FiTruck};
  }
  return order.kind === "pickup"
    ? {label: "Set pickup window", tone: "bg-[#eaf8ef] text-[#167743]", Icon: FiCalendar}
    : {label: "Preparing parcel", tone: "bg-[#eaf8ef] text-[#167743]", Icon: FiBox};
};

function OrdersSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="animate-pulse rounded-2xl border border-[#eceef1] bg-white p-4">
          <div className="flex gap-3">
            <div className="h-20 w-20 rounded-xl bg-[#eef0f3]" />
            <div className="flex-1 space-y-3 py-1"><div className="h-3 w-2/3 rounded bg-[#eef0f3]" /><div className="h-3 w-1/2 rounded bg-[#eef0f3]" /><div className="h-4 w-1/3 rounded bg-[#eef0f3]" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ mainTab, activeTab }) {
  const stockpile = mainTab === "stockpile";
  const copy = activeTab === "new"
    ? "New paid orders that need your decision will appear here."
    : activeTab === "declined"
      ? "Declined orders remain visible here for a clear history."
      : activeTab === "completed"
        ? `Completed ${stockpile ? "stockpile deliveries" : "orders"} will appear here.`
        : stockpile
          ? "There are no stockpiles at this stage right now."
          : "There are no orders at this stage right now.";
  return (
    <div className="mx-4 mt-10 rounded-2xl bg-[#f7f7f8] px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#ff4d22]"><FiPackage size={22} /></div>
      <h3 className="mt-4 text-[16px] font-bold text-[#111827]">Nothing here yet</h3>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-5 text-[#697386]">{copy}</p>
    </div>
  );
}

function OrderCard({ order, group, bucket, onClick, focused = false }) {
  const meta = statusMeta(order, bucket);
  const image = (group || [order])
    .flatMap((entry) => entry.items || [])
    .find((item) => item.image)?.image;
  const totalItems = (group || [order]).reduce(
    (sum, entry) => sum + Number(entry.itemCount || 0),
    0,
  );
  const total = (group || [order]).reduce(
    (sum, entry) =>
      sum + Number(entry.vendorPayout ?? entry.subtotal ?? 0),
    0,
  );
  const kindLabel = group || order.kind === "stockpile"
    ? "Stockpile"
    : order.kind === "pickup"
      ? "Pickup order"
      : "Delivery order";
  return (
    <button
      type="button"
      onClick={() => {
        void appHaptics.selection();
        onClick();
      }}
      className={`vendor-order-card w-full rounded-2xl border bg-white p-4 text-left shadow-[0_2px_12px_rgba(17,24,39,0.035)] transition-[border-color,box-shadow] duration-300 ${
        focused
          ? "is-focused border-[#ff4d22] shadow-[0_0_0_3px_rgba(255,77,34,0.16)]"
          : "border-[#eceef1]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-bold text-[#111827]">
          {group ? `Stockpile ${String(order.stockpileDocId || "").slice(0, 8)}…` : order.orderId || order.id}
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
          <meta.Icon size={12} /> {meta.label}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f1f2f4]">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[#a9afba]"><FiPackage size={24} /></div>}
          {totalItems > 1 && <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{totalItems}</span>}
        </div>
        <div className="min-w-0 flex-1 flex flex-col py-0.5">
          <p className="truncate text-[15px] font-bold text-[#111827]">{order.buyer?.displayName || "Customer"}</p>
          <p className="mt-1 text-[12px] font-medium text-[#ff4d22]">{kindLabel}</p>
          <p className="mt-0.5 text-[12px] text-[#697386]">{formatDate(order.createdAt)}</p>
          <div className="mt-auto flex items-end justify-between gap-2">
            <div><p className="mt-0.5 text-[15px] font-bold text-[#111827]">{money(total)}</p></div>
            <FiChevronRight className="mb-1 text-[#737b89]" size={18} />
          </div>
        </div>
      </div>
    </button>
  );
}
export default function VendorOrders() {
  const [mainTab, setMainTab] = useState("normal");
  const [normalTab, setNormalTab] = useState("new");
  const [stockpileTab, setStockpileTab] = useState("new");
  const [selected, setSelected] = useState(null);
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const touchStart = useRef(null);
  const focusTimerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const orderState = useSelector((state) => state.orders);
  const orders = orderState?.orders || EMPTY_ORDERS;
  const vendorId = orderState?.ownerVendorId;
  const activeTab = mainTab === "normal" ? normalTab : stockpileTab;
  const miniTabs = mainTab === "normal" ? NORMAL_TABS : STOCKPILE_TABS;

  const refreshOrders = useCallback(async () => {
    if (!vendorId) return;
    await refreshVendorOrders(vendorId);
  }, [vendorId]);

  useNativePageRefresh(refreshOrders, {
    enabled: true,
    verticalOffset: 118,
  });

  const groupedStockpiles = useMemo(() => {
    const groups = new Map();
    orders.filter((order) => order.kind === "stockpile" || order.isStockpile).forEach((order) => {
      const key = order.stockpileDocId || order.orderId || order.id;
      const current = groups.get(key) || [];
      current.push(order);
      groups.set(key, current);
    });
    groups.forEach((group) => group.sort((left, right) => toMillis(left.createdAt) - toMillis(right.createdAt)));
    return groups;
  }, [orders]);

  const rows = useMemo(() => {
    if (mainTab === "normal") {
      return orders
        .filter((order) => order.kind !== "stockpile" && !order.isStockpile)
        .filter((order) => normalBucket(order) === activeTab)
        .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
        .map((order) => ({order, group: null, bucket: activeTab}));
    }
    if (activeTab === "new") {
      return orders
        .filter((order) => order.kind === "stockpile" || order.isStockpile)
        .filter(isPending)
        .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
        .map((order) => {
          const key = order.stockpileDocId || order.orderId || order.id;
          return {
            order,
            cardGroup: [order],
            detailGroup: groupedStockpiles.get(key) || [order],
            bucket: activeTab,
          };
        });
    }
    if (activeTab === "declined") {
      return orders
        .filter((order) => order.kind === "stockpile" || order.isStockpile)
        .filter(isDeclined)
        .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt))
        .map((order) => ({
          order,
          cardGroup: [order],
          detailGroup: [order],
          bucket: activeTab,
        }));
    }
    return [...groupedStockpiles.values()]
      .map((group) => {
        const representative = stockpileRepresentative(group);
        const acceptedGroup = group.filter(isAccepted);
        return {
          order: representative,
          cardGroup: acceptedGroup.length ? acceptedGroup : group.filter((entry) => !isDeclined(entry)),
          detailGroup: group,
          bucket: stockpileGroupBucket(group),
        };
      })
      .filter((row) => row.bucket === activeTab)
      .sort((left, right) => toMillis(right.order.createdAt) - toMillis(left.order.createdAt));
  }, [activeTab, groupedStockpiles, mainTab, orders]);

  useEffect(() => {
    const target = location.state?.focusOrderId;
    if (!target || !orders.length) return;
    const matchingOrder = orders.find((order) => orderMatchesId(order, target));
    if (!matchingOrder) return;

    const stockpile = matchingOrder.kind === "stockpile" || matchingOrder.isStockpile;
    setFocusedOrderId(String(target));
    if (stockpile) {
      const key = matchingOrder.stockpileDocId || matchingOrder.orderId || matchingOrder.id;
      const group = groupedStockpiles.get(key) || [matchingOrder];
      setMainTab("stockpile");
      setStockpileTab(
        isPending(matchingOrder)
          ? "new"
          : isDeclined(matchingOrder)
            ? "declined"
            : stockpileGroupBucket(group),
      );
    } else {
      setMainTab("normal");
      setNormalTab(normalBucket(matchingOrder));
    }
    void appHaptics.selection();

    const nextState = {...(location.state || {})};
    delete nextState.focusOrderId;
    navigate(location.pathname, {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    });
  }, [groupedStockpiles, location.pathname, location.state, navigate, orders]);

  useEffect(() => {
    if (!focusedOrderId) return undefined;
    const matchingRow = rows.some(({order, group, cardGroup, detailGroup}) =>
      (detailGroup || cardGroup || group || [order]).some((entry) =>
        orderMatchesId(entry, focusedOrderId),
      ),
    );
    if (!matchingRow) return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.querySelector(".vendor-order-card.is-focused")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => setFocusedOrderId(null), 2400);
    return () => window.cancelAnimationFrame(frame);
  }, [focusedOrderId, rows]);

  useEffect(() => () => window.clearTimeout(focusTimerRef.current), []);

  const switchMain = (next) => {
    if (next === mainTab) return;
    void appHaptics.selection();
    setMainTab(next);
  };
  const switchMini = (next) => {
    if (next === activeTab) return;
    void appHaptics.selection();
    if (mainTab === "normal") setNormalTab(next);
    else setStockpileTab(next);
  };
  const handleSwipeEnd = (event) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches?.[0];
    const deltaX = touch ? touch.clientX - touchStart.current.x : 0;
    const deltaY = touch ? touch.clientY - touchStart.current.y : 0;
    touchStart.current = null;
    if (Math.abs(deltaX) < 58 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    const index = miniTabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex = deltaX < 0
      ? Math.min(miniTabs.length - 1, index + 1)
      : Math.max(0, index - 1);
    if (nextIndex !== index) switchMini(miniTabs[nextIndex].id);
  };

  const connecting = ["idle", "connecting"].includes(orderState?.status) && !orders.length;

  return (
    <>
      <SEO title="Vendor Orders - My Thrift" description="Manage orders on your My Thrift store" url="https://www.shopmythrift.store/vendor-orders" />
      <main className="min-h-screen bg-[#fafafa] pb-[calc(88px+env(safe-area-inset-bottom,0px))] font-satoshi text-[#111827]">
        <AppPageHeader
          title="Orders"
          showBack={false}
          className="vendor-section-header"
        />

        <section className="px-4 pt-4">
          <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-[#ff4d22] text-center text-white">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/10" />
            <div className="relative flex flex-col items-center text-white">
              <p className="text-[13px] font-medium text-white/90">
                Total in {miniTabs.find((tab) => tab.id === activeTab)?.label?.toLowerCase()}
              </p>
              <p className="mt-1 text-[34px] font-bold leading-none text-white">{rows.length}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 rounded-full bg-[#f1f2f4] p-1">
            {MAIN_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => switchMain(tab.id)} className={`rounded-full py-2.5 text-[13px] font-bold transition ${mainTab === tab.id ? "bg-white text-[#111827] shadow-sm" : "text-[#737b89]"}`}>{tab.label}</button>)}
          </div>
          <div className="-mx-4 mt-3 overflow-x-auto border-b border-[#eceef1] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-6">
              {miniTabs.map((tab) => {
                const count = mainTab === "normal"
                  ? orders.filter((order) => order.kind !== "stockpile" && !order.isStockpile && normalBucket(order) === tab.id).length
                  : tab.id === "new" || tab.id === "declined"
                    ? orders.filter((order) =>
                      (order.kind === "stockpile" || order.isStockpile) &&
                      (tab.id === "new" ? isPending(order) : isDeclined(order))).length
                    : [...groupedStockpiles.values()].filter((group) => stockpileGroupBucket(group) === tab.id).length;
                return <button key={tab.id} type="button" onClick={() => switchMini(tab.id)} className={`relative pb-3 pt-2 text-[12px] font-bold transition ${activeTab === tab.id ? "text-[#ff4d22]" : "text-[#697386]"}`}>{tab.label}{count > 0 && <span className="ml-1.5 text-[#a0a7b2]">{count}</span>}{activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[#ff4d22]" />}</button>;
              })}
            </div>
          </div>
        </section>

        <div
          className="min-h-[65vh] touch-pan-y"
          onTouchStart={(event) => {
            const touch = event.touches?.[0];
            if (touch) touchStart.current = {x: touch.clientX, y: touch.clientY};
          }}
          onTouchEnd={handleSwipeEnd}
          onTouchCancel={() => { touchStart.current = null; }}
        >
          {connecting ? <OrdersSkeleton /> : orderState?.status === "error" && !orders.length ? (
            <div className="mx-4 mt-10 rounded-2xl bg-[#fff2f0] px-5 py-8 text-center"><p className="text-[14px] font-bold text-[#a73427]">Orders could not be loaded</p><p className="mt-2 text-[12px] leading-5 text-[#7a514b]">{orderState?.error || "Check your connection and try again."}</p></div>
          ) : rows.length ? (
            <div className="space-y-3 px-4 py-4">
              {rows.map(({order, group, cardGroup, detailGroup, bucket}) => {
                const orderKey = order.orderId || order.id;
                const key = mainTab === "stockpile" && !["new", "declined"].includes(bucket)
                  ? `pile-${order.stockpileDocId || orderKey}`
                  : `${bucket}-${orderKey}`;
                const visibleGroup = cardGroup || group;
                const focusGroup = detailGroup || visibleGroup || [order];
                return (
                  <OrderCard
                    key={key}
                    order={order}
                    group={visibleGroup}
                    bucket={bucket}
                    focused={Boolean(
                      focusedOrderId &&
                        focusGroup.some((entry) => orderMatchesId(entry, focusedOrderId)),
                    )}
                    onClick={() => setSelected({
                      order,
                      group: detailGroup || visibleGroup || [order],
                      sourceBucket: bucket,
                    })}
                  />
                );
              })}
            </div>
          ) : <EmptyState mainTab={mainTab} activeTab={activeTab} />}
        </div>
      </main>
      <VendorOrderDetailsSheet
        open={Boolean(selected)}
        order={selected?.order || null}
        orders={selected?.group || []}
        sourceBucket={selected?.sourceBucket || null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";

const PRODUCT_BATCH_SIZE = 30;

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const chunk = (values, size) => {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const getProductImage = (product, item) => {
  if (item?.imageUrl || item?.image) return item.imageUrl || item.image;
  if (item?.subProductId) {
    const variant = product?.subProducts?.find(
      (entry) => entry.subProductId === item.subProductId
    );
    if (variant) return variant.images?.[0] || "";
  }
  return product?.coverImageUrl || product?.imageUrls?.[0] || "";
};

const enrichOrders = async (orders) => {
  const productIds = Array.from(
    new Set(
      orders
        .flatMap((order) => order.cartItems || [])
        .map((item) => item?.productId)
        .filter(Boolean)
    )
  );
  if (!productIds.length) return orders;

  const snapshots = await Promise.all(
    chunk(productIds, PRODUCT_BATCH_SIZE).map((ids) =>
      getDocs(
        query(collection(db, "products"), where(documentId(), "in", ids))
      )
    )
  );
  const products = {};
  snapshots.forEach((snapshot) => {
    snapshot.forEach((productDoc) => {
      products[productDoc.id] = productDoc.data();
    });
  });

  return orders.map((order) => ({
    ...order,
    cartItems: (order.cartItems || []).map((item) => {
      const product = products[item.productId] || {};
      return {
        ...item,
        name: item.name || item.productName || product.name || "Product",
        imageUrl: getProductImage(product, item),
      };
    }),
  }));
};

const groupReviewOrders = (orders) => {
  const grouped = new Map();

  orders.forEach((order) => {
    const key =
      order.isStockpile && order.stockpileDocId
        ? `stockpile_${order.stockpileDocId}`
        : `order_${order.id}`;
    const existing = grouped.get(key) || [];
    existing.push(order);
    grouped.set(key, existing);
  });

  return Array.from(grouped.entries())
    .map(([reviewTargetKey, groupedOrders]) => {
      const sorted = [...groupedOrders].sort(
        (left, right) => toMillis(left.createdAt) - toMillis(right.createdAt)
      );
      const isStockpile = reviewTargetKey.startsWith("stockpile_");
      const fulfilledOrders = sorted.filter(
        (order) => order.progressStatus !== "Declined"
      );
      const isDelivered =
        fulfilledOrders.length > 0 &&
        fulfilledOrders.every((order) => order.progressStatus === "Delivered");
      if (!isDelivered) return null;

      const primary = sorted[0];
      return {
        ...primary,
        id: primary.id,
        isStockpile,
        reviewTargetKey,
        stockpileDocId: isStockpile ? primary.stockpileDocId : null,
        orderIds: fulfilledOrders.map((order) => order.id),
        createdAt: primary.createdAt,
        cartItems: fulfilledOrders.flatMap((order) => order.cartItems || []),
      };
    })
    .filter(Boolean)
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
};

export const fetchEligibleReviewOrders = async ({
  userId,
  vendorId,
  reviews = [],
}) => {
  if (!userId || !vendorId) return [];

  const ordersSnapshot = await getDocs(
    query(collection(db, "orders"), where("userId", "==", userId))
  );
  const vendorOrders = ordersSnapshot.docs
    .map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }))
    .filter((order) => order.vendorId === vendorId && !order._isDraft);

  const enriched = await enrichOrders(vendorOrders);
  const grouped = groupReviewOrders(enriched);
  const reviewedTargets = new Set(
    reviews
      .filter((review) => review.userId === userId)
      .flatMap((review) => [
        review.reviewTargetKey,
        review.stockpileDocId ? `stockpile_${review.stockpileDocId}` : null,
        review.orderId ? `order_${review.orderId}` : null,
      ])
      .filter(Boolean)
  );

  return grouped.filter((order) => !reviewedTargets.has(order.reviewTargetKey));
};

export const findRequestedReviewOrder = (orders, searchParams) => {
  const stockpileId = searchParams.get("rateStockpile");
  const orderId = searchParams.get("rateOrder");
  if (stockpileId) {
    return orders.find(
      (order) => order.reviewTargetKey === `stockpile_${stockpileId}`
    );
  }
  if (orderId) {
    return orders.find(
      (order) =>
        order.reviewTargetKey === `order_${orderId}` ||
        order.orderIds?.includes(orderId)
    );
  }
  return null;
};

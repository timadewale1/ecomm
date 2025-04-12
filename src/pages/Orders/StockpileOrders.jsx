// src/components/orders/StockpileOrders.jsx
import React, { useEffect, useState, useMemo } from "react";
import moment from "moment";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { IoCheckmarkDoneCircle } from "react-icons/io5";
import { db } from "../../firebase.config";
import { GiBookPile } from "react-icons/gi";

// Helper function: returns a Tailwind text color class based on progress.
// Assumes startDate and endDate are Firestore Timestamps or Date objects.
const getValidityColor = (startDate, endDate) => {
  if (!startDate || !endDate) return "text-orange-500";
  const start = moment(startDate.toDate ? startDate.toDate() : startDate);
  const end = moment(endDate.toDate ? endDate.toDate() : endDate);
  const now = moment();

  const totalDuration = end.diff(start);
  const elapsed = now.diff(start);
  const fractionElapsed = elapsed / totalDuration;

  if (fractionElapsed >= 0.85) return "text-red-500";
  else if (fractionElapsed >= 0.6) return "text-yellow-500";
  else return "text-gray-900";
};

const StockpileOrders = ({ orders, openModal }) => {
  const [groupedOrders, setGroupedOrders] = useState([]);
  const [stockpileGroupsByDuration, setStockpileGroupsByDuration] = useState(
    {}
  );
  const [durationKeys, setDurationKeys] = useState([]);
  const [productImages, setProductImages] = useState({});
  const [imageIndexes, setImageIndexes] = useState({});

  // 1. Group stockpile orders by stockpileDocId (merging repile orders with their primary order)
  useEffect(() => {
    if (!orders) return;
    // Filter orders that are stockpile orders with a stockpileDocId
    const stockpileOrders = orders.filter(
      (order) => order.isStockpile === true && order.stockpileDocId
    );
    // Group by a combination of vendorId and stockpileDocId
    const groups = stockpileOrders.reduce((acc, order) => {
      const key = `${order.vendorId}-${order.stockpileDocId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(order);
      return acc;
    }, {});

    // Process groups to merge orders into one stockpile group.
    const groupedArray = Object.keys(groups).map((key) => {
      const group = groups[key];
      // Sort so that the first (oldest) order is the primary order
      group.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
      const primary = group[0];
      // Calculate the number of repile orders (orders added after the first)
      const repileCount = group.length - 1;
      const combinedTotal = group.reduce(
        (sum, o) => sum + parseFloat(o.total || 0),
        0
      );
      const combinedSubtotal = group.reduce(
        (sum, o) => sum + parseFloat(o.subtotal || 0),
        0
      );
      return {
        ...primary,
        repileCount,
        combinedTotal,
        combinedSubtotal,
        stockpileDocId: primary.stockpileDocId,
        // Initially use the stockpile-related fields from the order (if any)
        chosenWeeks: primary.chosenWeeks || null,
        endDate: primary.endDate || null,
        startDate: primary.startDate || null,
        // Merge cartItems arrays from all orders in the group
        cartItems: group.flatMap((o) =>
          o.cartItems.map((item) => ({
            ...item,
            _orderId: o.id,
            _orderCreatedAt: o.createdAt,
          }))
        ),
      };
    });
    // Sort grouped stockpiles with the most recent primary order first
    groupedArray.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    // 1.1. For each grouped order, fetch additional stockpile details from the "stockpiles" collection.
    const fetchStockpileData = async () => {
      const updatedGroups = await Promise.all(
        groupedArray.map(async (group) => {
          if (group.stockpileDocId) {
            try {
              const stockpileRef = doc(db, "stockpiles", group.stockpileDocId);
              const stockpileSnap = await getDoc(stockpileRef);
              if (stockpileSnap.exists()) {
                const stockData = stockpileSnap.data();
                return {
                  ...group,
                  // Override or add stockpile fields from the stockpile document
                  startDate: stockData.startDate || group.startDate,
                  endDate: stockData.endDate || group.endDate,
                  chosenWeeks: stockData.chosenWeeks || group.chosenWeeks,
                  isActive: stockData.isActive,
                };
              }
            } catch (err) {
              console.error(
                "Error fetching stockpile document for group:",
                group.stockpileDocId,
                err
              );
            }
          }
          return group;
        })
      );
      setGroupedOrders(updatedGroups);
    };

    fetchStockpileData();
  }, [orders]);

  // 2. Group the merged stockpile orders by their chosenWeeks (i.e. duration)
  useEffect(() => {
    const groupsByDuration = {};
    groupedOrders.forEach((order) => {
      const duration = order.chosenWeeks; // assumed to be number (e.g., 2, 3, 4)
      if (duration !== null && duration !== undefined) {
        if (!groupsByDuration[duration]) groupsByDuration[duration] = [];
        groupsByDuration[duration].push(order);
      }
    });
    // Get the sorted duration keys (ascending order)
    const sortedDurations = Object.keys(groupsByDuration)
      .map((d) => Number(d))
      .sort((a, b) => a - b);
    setStockpileGroupsByDuration(groupsByDuration);
    setDurationKeys(sortedDurations);
  }, [groupedOrders]);

  // 3. Fetch a representative product image for each grouped stockpile order
  useEffect(() => {
    const fetchImages = async () => {
      const images = {};
      for (const group of groupedOrders) {
        if (group.cartItems && group.cartItems.length > 0) {
          const firstItem = group.cartItems[0];
          const productRef = doc(db, "products", firstItem.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const productData = productSnap.data();
            let itemImages = [];
            let variantImages = [];
            if (firstItem.subProductId) {
              const subProduct = productData.subProducts?.find(
                (sp) => sp.subProductId === firstItem.subProductId
              );
              if (subProduct?.images) {
                itemImages = itemImages.concat(subProduct.images);
              }
            }
            if (firstItem.variantAttributes) {
              const variantAttributes = firstItem.variantAttributes;
              const variantsSource = productData.variants || [];
              const matchedVariant = variantsSource.find(
                (v) =>
                  v.color === variantAttributes.color &&
                  v.size === variantAttributes.size
              );
              if (matchedVariant?.images) {
                variantImages = variantImages.concat(matchedVariant.images);
              }
            }
            // Combine and remove duplicates
            itemImages = itemImages.concat(
              variantImages.filter((img) => !itemImages.includes(img))
            );
            if (itemImages.length === 0 && productData.imageUrls) {
              itemImages = itemImages.concat(productData.imageUrls);
            }
            images[group.id] = itemImages;
          }
        }
      }
      setProductImages(images);
    };

    fetchImages();
  }, [groupedOrders]);

  // 4. Cycle images every 4 seconds for each stockpile group
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes((prevIndexes) => {
        const nextIndexes = { ...prevIndexes };
        groupedOrders.forEach((group) => {
          const imageCount = productImages[group.id]?.length || 0;
          if (imageCount > 0) {
            nextIndexes[group.id] =
              ((prevIndexes[group.id] || 0) + 1) % imageCount;
          }
        });
        return nextIndexes;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [groupedOrders, productImages]);

  return (
    <div>
      {durationKeys.map((duration) => (
        <div key={duration} className="mb-6">
          <h2 className="text-sm text-left font-semibold font-opensans text-gray-800 mt-3 mb-3">
            {duration} Weeks Stockpile
          </h2>
          {stockpileGroupsByDuration[duration].map((stockpile) => {
            // isDelivered
            const isDelivered = stockpile.progressStatus === "Delivered";
            const isShipped = stockpile.progressStatus === "Shipped";

            // If you stored the delivered date in e.g. stockpile.deliveredAt:
            // (some field you set in the doc)
            const deliveredDate = stockpile.deliveredAt
              ? moment(
                  stockpile.deliveredAt.toDate
                    ? stockpile.deliveredAt.toDate()
                    : stockpile.deliveredAt
                ).format("DD/MM/YYYY")
              : null;

            // If not delivered, build the normal text:
            const normalText = (
              <span>
                <span className="font-semibold text-customOrange">
                  {stockpile.userInfo?.displayName}
                </span>{" "}
                is currently stockpiling.
              </span>
            );
            const shippedText = (
              <span>
                You have shipped{" "}
                <span className="font-semibold text-customOrange">
                  {stockpile.userInfo?.displayName}
                </span>{" "}
                's stockpile.
              </span>
            );

            // If delivered, build the delivered text:
            const deliveredText = (
              <span className="flex items-center space-x-1">
                <span>
                  <span className="font-semibold text-customOrange">
                    {stockpile.userInfo?.displayName}
                  </span>{" "}
                  's stockpile has been <strong>marked delivered by you</strong>
                  {deliveredDate && (
                    <>
                      {" "}
                      on <strong>{deliveredDate}</strong>.
                    </>
                  )}
                </span>
                <IoCheckmarkDoneCircle className="text-green-600 relative -top-6 text-4xl" />
              </span>
            );

            return (
              <div
                key={stockpile.stockpileDocId}
                className="p-2 bg-gray-100 rounded-lg flex items-center cursor-pointer mb-3"
                onClick={() => openModal(stockpile)}
              >
                <div className="w-16 h-16 flex-shrink-0 mr-3">
                  {productImages[stockpile.id] &&
                  productImages[stockpile.id].length > 0 ? (
                    <img
                      src={
                        productImages[stockpile.id][
                          imageIndexes[stockpile.id] || 0
                        ]
                      }
                      alt="Product"
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  {/* If delivered => show deliveredText, else show normalText */}
                  <p className="text-xs text-gray-900 font-opensans">
                    {isDelivered
                      ? deliveredText
                      : isShipped
                      ? shippedText
                      : normalText}
                  </p>

                  {!isDelivered && !isShipped && stockpile.endDate && (
                    <p className="text-xs font-opensans mt-1">
                      Valid until:{" "}
                      {moment(
                        stockpile.endDate?.toDate
                          ? stockpile.endDate.toDate()
                          : stockpile.endDate
                      ).format("DD/MM/YYYY")}
                    </p>
                  )}

                  {isShipped && stockpile.shippedAt && (
                    <p className="text-xs font-opensans mt-1">
                      Mark as Shipped on:{" "}
                      {moment(
                        stockpile.shippedAt?.toDate
                          ? stockpile.shippedAt.toDate()
                          : stockpile.shippedAt
                      ).format("DD/MM/YYYY")}
                    </p>
                  )}

                  {/* Example: repile count only if not delivered (or you can show either way) */}
                  {!isDelivered && stockpile.repileCount > 0 && (
                    <p className="text-xs bg-customOrange px-2 py-1 rounded-xl w-20 text-center text-white font-opensans mt-1">
                      {`+${stockpile.repileCount} repile${
                        stockpile.repileCount > 1 ? "s" : ""
                      }`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default StockpileOrders;

import React, { useEffect, useState } from "react";
import moment from "moment";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const PendingOrders = ({ orders, openModal }) => {
  const [productImages, setProductImages] = useState({});
  const [imageIndexes, setImageIndexes] = useState({});

  // 1) Fetch product images, including sub-products and variants
  useEffect(() => {
    const fetchImages = async () => {
      const images = {};

      for (const order of orders) {
        if (!images[order.id]) images[order.id] = [];

        for (const item of order.cartItems) {
          const productRef = doc(db, "products", item.productId);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();

            let itemImages = [];
            let variantImages = [];

            // If the item has a sub-product
            if (item.subProductId) {
              const subProduct = productData.subProducts?.find(
                (sp) => sp.subProductId === item.subProductId
              );
              if (subProduct?.images) {
                itemImages = itemImages.concat(subProduct.images);
              }
            }

            // If the item has variant attributes
            if (item.variantAttributes) {
              const variantAttributes = item.variantAttributes;
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

            // Combine subProduct images + variant images
            itemImages = itemImages.concat(
              variantImages.filter((img) => !itemImages.includes(img))
            );

            // Fallback to main product images if none found
            if (itemImages.length === 0 && productData.imageUrls) {
              itemImages = itemImages.concat(productData.imageUrls);
            }

            // Avoid duplicates
            const uniqueImages = itemImages.filter(
              (img) => !images[order.id].includes(img)
            );
            images[order.id] = images[order.id].concat(uniqueImages);
          }
        }
      }

      setProductImages(images);
    };

    fetchImages();
  }, [orders]);

  // 2) Cycle each order’s images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes((prev) => {
        const nextIndexes = { ...prev };
        orders.forEach((order) => {
          const imageCount = productImages[order.id]?.length || 0;
          if (imageCount > 0) {
            nextIndexes[order.id] = ((prev[order.id] || 0) + 1) % imageCount;
          }
        });
        return nextIndexes;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [orders, productImages]);

  // Group orders by creation date
  const groupOrdersByDate = (orders) => {
    const today = [];
    const yesterday = [];
    const thisWeek = [];
    const older = [];

    orders.forEach((order) => {
      const orderDate = moment(order.createdAt.seconds * 1000);
      const now = moment();

      if (orderDate.isSame(now, "day")) {
        today.push(order);
      } else if (orderDate.isSame(now.clone().subtract(1, "day"), "day")) {
        yesterday.push(order);
      } else if (orderDate.isSame(now, "week")) {
        thisWeek.push(order);
      } else {
        older.push(order);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const { today, yesterday, thisWeek, older } = groupOrdersByDate(orders);

  // 3) Helper function to render a group of orders with a title
  const renderOrderGroup = (title, ordersGroup) => {
    if (ordersGroup.length === 0) return null;

    return (
      <div key={title}>
        <h2 className="font-semibold text-right flex text-sm text-black font-opensans mt-3 mb-3">
          {title}
        </h2>
        <ul className="space-y-4">
          {ordersGroup.map((order) => {
            const isStockpile = order.isStockpile;
            const isInitial = isStockpile && !!order.stockpileDuration; // has a valid duration => new stockpile
            const isRepile = isStockpile && !order.stockpileDuration; // stockpile but no duration => repile

            // Decide top-left label
            let topLeftLabel = "Pending Order 🕜";
            if (isStockpile) {
              topLeftLabel = isInitial ? "New Stockpile 🧡 " : "Incoming Pile 🧺";
            }

            const totalItems = order.cartItems.reduce(
              (acc, item) => acc + item.quantity,
              0
            );

            // Decide message text
            let infoText;
            if (isStockpile) {
              if (isInitial) {
                infoText = `${order.userInfo.displayName} wants to create a stockpile for ${order.stockpileDuration} weeks. They added ${totalItems} item(s).`;
              } else {
                infoText = `${order.userInfo.displayName} wants to add more items to their existing pile. They added ${totalItems} item(s).`;
              }
            } else {
              infoText = `You have an order from ${order.userInfo.displayName} (Order ID: ${order.id}) for ${totalItems} items. Please review and process the order.`;
            }

            return (
              <li
                key={order.id}
                className="p-2.5 bg-gray-100 rounded-lg flex cursor-pointer"
                onClick={() => openModal(order)}
              >
                {/* Left image, right text layout */}
                {productImages[order.id] &&
                productImages[order.id].length > 0 ? (
                  <img
                    src={productImages[order.id][imageIndexes[order.id] || 0]}
                    alt="Product"
                    className="w-12 h-12 p-0.5 border-dashed border-customBrown border-[1px] border-opacity-80 object-cover rounded mr-3 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded mr-3 flex-shrink-0" />
                )}

                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-black font-opensans text-xs">
                      {topLeftLabel}
                    </span>
                    <span className="text-xs font-semibold text-black font-opensans">
                      {moment(order.createdAt.seconds * 1000).format("hh:mm A")}
                    </span>
                  </div>
                  <p className="text-xs text-left text-gray-700 font-opensans mt-2 whitespace-pre-line">
                    {infoText}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // 4) Finally render each group
  return (
    <div>
      {renderOrderGroup("Today", today)}
      {renderOrderGroup("Yesterday", yesterday)}
      {renderOrderGroup("This Week", thisWeek)}
      {renderOrderGroup("Older", older)}
    </div>
  );
};

export default PendingOrders;

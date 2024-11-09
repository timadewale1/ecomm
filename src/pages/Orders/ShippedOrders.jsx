// src/components/orders/ShippedOrders.js
import React, { useEffect, useState } from "react";
import moment from "moment";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const ShippedOrders = ({ orders, openModal }) => {
  const [productImages, setProductImages] = useState({});
  const [imageIndexes, setImageIndexes] = useState({});

  // Fetch product images, including sub-products and variants
  useEffect(() => {
    const fetchImages = async () => {
      const images = {};

      // Loop through each order
      for (const order of orders) {
        if (!images[order.id]) images[order.id] = [];

        // Loop through each item in the cart for the order
        for (const item of order.cartItems) {
          const productRef = doc(db, "products", item.productId);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();

            let itemImages = [];
            let variantImages = [];

            // Initialize subProduct and variant
            let subProduct = null;
            let variant = null;

            // If the item has a sub-product, find it
            if (item.subProductId) {
              subProduct = productData.subProducts?.find(
                (sp) => sp.subProductId === item.subProductId
              );
              if (subProduct && subProduct.images) {
                itemImages = itemImages.concat(subProduct.images);
              }
            }

            // If the item has variant attributes, find the variant
            if (item.variantAttributes) {
              const variantAttributes = item.variantAttributes;

              // Determine where to look for variants
              const variantsSource = subProduct
                ? subProduct.variants
                : productData.variants;

              if (variantsSource) {
                variant = variantsSource.find((v) => {
                  // Ensure v.attributes exists
                  if (!v.attributes) {
                    return false;
                  }
                  // Check if all variant attributes match
                  return Object.keys(variantAttributes).every(
                    (key) => variantAttributes[key] === v.attributes[key]
                  );
                });

                if (variant && variant.images) {
                  variantImages = variantImages.concat(variant.images);
                }
              }
            }

            // Combine images from sub-product and variant, avoiding duplicates
            itemImages = itemImages.concat(
              variantImages.filter((img) => !itemImages.includes(img))
            );

            // If no images have been added yet, use main product images
            if (itemImages.length === 0 && productData.imageUrls) {
              itemImages = itemImages.concat(productData.imageUrls);
            }

            // Add images for this specific order item to the order's image list, avoiding duplicates
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

  // Set up interval to cycle images
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes((prevIndexes) => {
        const newIndexes = { ...prevIndexes };
        orders.forEach((order) => {
          const imageCount = productImages[order.id]?.length || 0;
          if (imageCount > 0) {
            newIndexes[order.id] =
              ((prevIndexes[order.id] || 0) + 1) % imageCount;
          }
        });
        return newIndexes;
      });
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [orders, productImages]);

  // Group orders by date
  const groupOrdersByDate = (orders) => {
    const today = [];
    const yesterday = [];
    const thisWeek = [];

    orders.forEach((order) => {
      const orderDate = moment(order.createdAt.seconds * 1000);
      const now = moment();

      if (orderDate.isSame(now, "day")) {
        today.push(order);
      } else if (orderDate.isSame(now.clone().subtract(1, "day"), "day")) {
        yesterday.push(order);
      } else if (orderDate.isSame(now, "week")) {
        thisWeek.push(order);
      }
    });

    return { today, yesterday, thisWeek };
  };

  const { today, yesterday, thisWeek } = groupOrdersByDate(orders);

  // Render each group of orders
  const renderOrderGroup = (title, ordersGroup) =>
    ordersGroup.length > 0 && (
      <div key={title}>
        <h2 className="font-semibold text-right flex text-sm text-black font-opensans mt-3 mb-3">
          {title}
        </h2>
        <ul className="space-y-4">
          {ordersGroup.map((order) => (
            <li
              key={order.id}
              className="p-2 bg-gray-100 rounded-lg flex items-start cursor-pointer"
              onClick={() => openModal(order)}
            >
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span
                    className={`font-semibold text-xs font-opensans ${
                      order.progressStatus === "Delivered"
                        ? "bg-green-100 text-green-800 px-2 py-1 rounded-md"
                        : ""
                    } text-black`}
                  >
                    {order.progressStatus === "Delivered"
                      ? "Fulfilled Order"
                      : "Shipped Order"}
                  </span>
                  <span className="text-xs font-semibold text-black font-opensans">
                    {moment(order.createdAt.seconds * 1000).format("hh:mm A")}
                  </span>
                </div>
                <div className="flex items-center mt-2 justify-center">
                  {productImages[order.id] &&
                  productImages[order.id].length > 0 ? (
                    <img
                      src={productImages[order.id][imageIndexes[order.id] || 0]}
                      alt="Product"
                      className="w-12 h-12 p-0.5 border-dashed border-customBrown border-1 border-opacity-80 object-cover rounded mr-3"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded mr-3" />
                  )}
                  <p className="text-xs text-left text-gray-700 font-opensans mt-2">
                    Order from {order.userInfo.displayName} (Order ID:{" "}
                    {order.id}) for{" "}
                    {order.cartItems.reduce(
                      (acc, item) => acc + item.quantity,
                      0
                    )}{" "}
                    item(s).{" "}
                    {order.progressStatus === "Delivered"
                      ? "This order has been delivered to the customer."
                      : "This order has been shipped to the customer."}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div>
      {renderOrderGroup("Today", today)}
      {renderOrderGroup("Yesterday", yesterday)}
      {renderOrderGroup("This Week", thisWeek)}
    </div>
  );
};

export default ShippedOrders;

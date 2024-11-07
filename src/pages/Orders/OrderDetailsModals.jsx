// src/components/orders/OrderDetailsModal.js
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import moment from "moment";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    const fetchProductImages = async () => {
      const images = {};

      for (const item of order.cartItems) {
        const { productId, subProductId, variantAttributes } = item;

        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();

          // 1. Fetch sub-product image if subProductId exists
          if (subProductId && productData.subProducts) {
            const subProduct = productData.subProducts.find(
              (sp) => sp.subProductId === subProductId
            );

            if (subProduct && subProduct.imageUrls) {
              images[subProductId] = subProduct.imageUrls[0];
              continue; // Skip to the next item if sub-product image is found
            }
          }

          // 2. Fetch variant image if variantAttributes exist
          if (variantAttributes && productData.variants) {
            const variant = productData.variants.find(
              (v) =>
                v.color === variantAttributes.color &&
                v.size === variantAttributes.size
            );

            if (variant && variant.imageUrls) {
              images[
                `${productId}-${variantAttributes.color}-${variantAttributes.size}`
              ] = variant.imageUrls[0];
              continue; // Skip to the next item if variant image is found
            }
          }

          // 3. Fallback to the main product image if no specific variant/sub-product image
          if (productData.imageUrls) {
            images[productId] = productData.imageUrls[0];
          }
        }
      }

      setProductImages(images);
    };

    if (isOpen && order) {
      fetchProductImages();
    }
  }, [isOpen, order]);

  if (!order) {
    return null;
  }

  const { userInfo, cartItems, progressStatus, note, createdAt } = order;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Order Details"
      ariaHideApp={false}
      className="modal-content-order"
      overlayClassName="modal-overlay"
    >
      <div className="space-y-4 p-4" id="vendor-order-modal-content">
        <button
          onClick={onClose}
          className="close-button absolute top-2 right-2 text-2xl font-bold"
        >
          &times;
        </button>

        {/* Product Image for First Item */}
        {cartItems[0].subProductId
          ? productImages[cartItems[0].subProductId] && (
              <div className="w-full flex justify-center mb-4">
                <img
                  src={productImages[cartItems[0].subProductId]}
                  alt="Sub-product"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )
          : cartItems[0].variantAttributes
          ? productImages[
              `${cartItems[0].productId}-${cartItems[0].variantAttributes.color}-${cartItems[0].variantAttributes.size}`
            ] && (
              <div className="w-full flex justify-center mb-4">
                <img
                  src={
                    productImages[
                      `${cartItems[0].productId}-${cartItems[0].variantAttributes.color}-${cartItems[0].variantAttributes.size}`
                    ]
                  }
                  alt="Variant"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )
          : productImages[cartItems[0].productId] && (
              <div className="w-full flex justify-center mb-4">
                <img
                  src={productImages[cartItems[0].productId]}
                  alt="Product"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}

        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Customer Details</h2>
          <div className="text-sm text-gray-700">
            <p>
              <strong>Name:</strong> {userInfo?.displayName || "Unknown User"}
            </p>
            <p>
              <strong>Email:</strong> {userInfo.email || "Not Available"}
            </p>
            <p>
              <strong>Phone:</strong> {userInfo.phoneNumber || "Not Available"}
            </p>
            <p>
              <strong>Location:</strong> {userInfo.address || "Not Available"}
            </p>
            <p>
              <strong>Order ID:</strong> {order.id}
            </p>
            <p>
              <strong>Order Date:</strong>{" "}
              {moment(createdAt.seconds * 1000).format("MMMM Do YYYY, h:mm a")}
            </p>
            {note && (
              <p>
                <strong>Note:</strong> {note}
              </p>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Product Details</h2>
          {cartItems.map((item, index) => (
            <div key={index} className="text-sm text-gray-700 mb-4">
              {item.subProductId
                ? productImages[item.subProductId] && (
                    <img
                      src={productImages[item.subProductId]}
                      alt="Sub-product"
                      className="w-16 h-16 object-cover rounded mb-2"
                    />
                  )
                : item.variantAttributes
                ? productImages[
                    `${item.productId}-${item.variantAttributes.color}-${item.variantAttributes.size}`
                  ] && (
                    <img
                      src={
                        productImages[
                          `${item.productId}-${item.variantAttributes.color}-${item.variantAttributes.size}`
                        ]
                      }
                      alt="Variant"
                      className="w-16 h-16 object-cover rounded mb-2"
                    />
                  )
                : productImages[item.productId] && (
                    <img
                      src={productImages[item.productId]}
                      alt="Product"
                      className="w-16 h-16 object-cover rounded mb-2"
                    />
                  )}
              <p>
                <strong>Product ID:</strong> {item.productId}
              </p>
              <p>
                <strong>Quantity:</strong> {item.quantity}
              </p>
              {item.variantAttributes?.color && (
                <p>
                  <strong>Color:</strong> {item.variantAttributes.color}
                </p>
              )}
              {item.variantAttributes?.size && (
                <p>
                  <strong>Size:</strong> {item.variantAttributes.size}
                </p>
              )}
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`${
                    progressStatus === "Pending"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {progressStatus}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <button
            className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
            onClick={onClose}
          >
            Decline
          </button>
          <button className="bg-customDeepOrange text-white py-2 px-4 rounded-md hover:bg-orange-600">
            Approve
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;

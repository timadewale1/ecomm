// src/components/orders/InProgressOrders.js
import React, { useEffect, useState } from "react";
import moment from "moment";
import { FaChevronDown } from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../firebase.config";
import Modal from "react-modal";
import notifyOrderStatusChange from "../../services/notifyorderstatus";
import { FaTruck } from "react-icons/fa6";
import { RotatingLines } from "react-loader-spinner";
import { MdOutlineClose } from "react-icons/md";

const InProgressOrders = ({ orders, openModal, moveToShipped }) => {
  const [productImages, setProductImages] = useState({});
  const [imageIndexes, setImageIndexes] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderNumber, setRiderNumber] = useState("");
  const [note, setNote] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  useEffect(() => {
    if (isRiderModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isRiderModalOpen]);

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
  const handleSend = async () => {
    if (!riderName || !riderNumber) {
      toast.dismiss();

      toast.error("Please fill in both Rider's Name and Rider's Number.", {
        duration: 3000,
      });
      return;
    }

    setIsSending(true);
    try {
      // Find the order in the orders array
      const order = orders.find((o) => o.id === selectedOrderId);

      if (!order) {
        throw new Error("Order not found in orders array.");
      }

      // Retrieve userId from order.userId or order.userInfo.uid
      const userId = order.userId || order.userInfo?.uid;

      if (!userId) {
        throw new Error("User ID is undefined.");
      }

      // Get vendorName
      let vendorName = order.vendorName;

      if (!vendorName) {
        // Fetch vendor name from Firestore using order.vendorId
        if (order.vendorId) {
          const vendorRef = doc(db, "vendors", order.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            const vendorData = vendorSnap.data();
            vendorName = vendorData.shopName || "Unknown Vendor";
          } else {
            vendorName = "Unknown Vendor";
          }
        } else {
          vendorName = "Unknown Vendor";
        }
      }

      // Fetch vendor cover image
      let vendorCoverImage = null;
      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          vendorCoverImage = vendorSnap.data().coverImageUrl || null;
        }
      }

      // Fetch product image
      let productImage = null;
      if (order.cartItems && order.cartItems.length > 0) {
        const firstItem = order.cartItems[0];
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (firstItem.subProductId) {
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = subProduct?.images?.[0] || null;
          } else {
            productImage = productData.imageUrls?.[0] || null;
          }
        }
      }
      const riderInfoData = {
        riderName,
        riderNumber,
        note,
      };

      // Update order status to "Shipped" in Firestore
      const orderRef = doc(db, "orders", selectedOrderId);
      await updateDoc(orderRef, {
        progressStatus: "Shipped",
        riderInfo: {
          riderName,
          riderNumber,
          note,
        },
      });

      // Notify user about the status update
      await notifyOrderStatusChange(
        userId, // userId from the order
        selectedOrderId, // orderId
        "Shipped", // New status
        vendorName, // Vendor name
        vendorCoverImage, // Vendor cover image URL
        productImage, // Product image URL
        null, // declineReason is null
        riderInfoData // riderInfo
      );

      toast.success("Order successfully updated to 'Shipped'!");
      setIsRiderModalOpen(false);
      setRiderName("");
      setRiderNumber("");
      setNote("");
      setIsDropdownOpen(null);
      setSelectedOrderId(null);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update the order. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const openRiderModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsRiderModalOpen(true);
  };

  const closeRiderModal = () => {
    setIsRiderModalOpen(false);
    setRiderName("");
    setRiderNumber("");
    setNote("");
  };

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
                <div className="flex justify-between">
                  <span className="font-semibold text-black font-opensans text-xs">
                    In Progress Order
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
                    Order from {order.userInfo.displayName} for{" "}
                    {order.cartItems.reduce(
                      (acc, item) => acc + item.quantity,
                      0
                    )}{" "}
                    item(s). Once you’ve completed packaging and shipped this
                    order, please update the status to "Shipped" to keep the
                    customer informed.
                  </p>
                </div>

                {/* Dropdown Menu */}
                <div className="relative flex justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(
                        isDropdownOpen === order.id ? null : order.id
                      );
                    }}
                    className="bg-transparent border-blue-300 border-1 text-blue-300 font-medium font-opensans text-xs rounded-md px-2.5 py-2 flex items-center"
                  >
                    In progress <FaChevronDown className="ml-1" />
                  </button>

                  {/* Dropdown items */}
                  {isDropdownOpen === order.id && (
                    <div
                      className="absolute z-50 bg-white w-36 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mt-6 right-0 p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header Text */}
                      <span className="text-xs text-customRichBrown block text-left font-opensans font-semibold text ml-2">
                        Move to
                      </span>

                      {/* Divider */}
                      <hr className="my-2  text-slate-300" />

                      {/* Option */}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(null); // Close the dropdown
                          openRiderModal(order.id); // Open the modal to enter rider details
                        }}
                        className="block w-full text-left text-sm text-black font-opensans px-2 py-1"
                      >
                        Shipped
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Modal
          isOpen={isRiderModalOpen}
          onRequestClose={closeRiderModal}
          className="modal-content-rider h-auto"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaTruck className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Delivery Details
              </h2>
            </div>
            <MdOutlineClose
              className="text-xl relative -top-2"
              onClick={closeRiderModal}
            />
          </div>
          <div className="space-y-3 mb-4">
            <h1 className="text-xs font-opensans text-black font-medium">
              Rider's Name
            </h1>
            <input
              type="text"
              placeholder="Rider's Name"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              className="w-full p-2 border text-xs rounded h-10 focus:outline-none"
            />
            <h1 className="text-xs font-opensans  text-black font-medium">
              Rider's Number
            </h1>
            <input
              type="number"
              placeholder="Enter Rider's Phone Number"
              value={riderNumber}
              onChange={(e) => setRiderNumber(e.target.value.slice(0, 11))}
              className="w-full p-2 border text-xs h-10 rounded focus:outline-none"
            />

            <textarea
              placeholder="Add a short note here (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border text-xs rounded focus:outline-none"
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSend}
              className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full flex items-center"
              disabled={isSending}
            >
              {isSending ? (
                <RotatingLines strokeColor="white" width="20" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </Modal>
      </div>
    );

  return (
    <div>
      {renderOrderGroup("Today", today)}
      {renderOrderGroup("Yesterday", yesterday)}
      {renderOrderGroup("This Week", thisWeek)}
      {renderOrderGroup("Older", older)}
    </div>
  );
};

export default InProgressOrders;

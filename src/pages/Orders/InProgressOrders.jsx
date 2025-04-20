// src/components/orders/InProgressOrders.js
import React, { useEffect, useState } from "react";
import moment from "moment";
import { FaChevronDown } from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db, functions } from "../../firebase.config";
import Modal from "react-modal";
import notifyOrderStatusChange from "../../services/notifyorderstatus";
import { FaTruck } from "react-icons/fa6";
import { RotatingLines } from "react-loader-spinner";
import { MdOutlineClose } from "react-icons/md";

import { httpsCallable } from "firebase/functions";

import addActivityNote from "../../services/activityNotes";
const InProgressOrders = ({ orders, openModal, moveToShipped }) => {
  const [productImages, setProductImages] = useState({});
  const [imageIndexes, setImageIndexes] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderNumber, setRiderNumber] = useState("");
  const [note, setNote] = useState("");
  const [disableRiderFields, setDisableRiderFields] = useState(false);
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
  const closeRiderModal = () => {
    setIsRiderModalOpen(false);
    setRiderName("");
    setRiderNumber("");
    setNote("");
  };

  const handleSend = async () => {
    /* 0 — simple front‑end validation */
    if (!riderName || !riderNumber) {
      toast.error("Please fill in both Rider's Name and Rider's Number.");
      return;
    }
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) {
      toast.error("Order not found – please refresh the page.");
      return;
    }
    setIsSending(true);
    try {
      /* ------------------------------------------------------------
       * 1 — call Cloud Function to do the heavy lifting
       *     (deploy shipVendorOrder first — see below)
       * ---------------------------------------------------------- */
      const shipFn = httpsCallable(functions, "shipVendorOrder");
      const { data } = await shipFn({
        orderId: order.id,
        riderName,
        riderNumber,
        note,
      });

      if (data.alreadyShipped) {
        toast.success("Order is already marked as shipped ✅");
        onClose();
        return;
      }

      /* ------------------------------------------------------------
       * 2 — UI‑only helpers still run locally
       *     (images, notifications, activity log)
       * ---------------------------------------------------------- */
      /* 2a. vendor name & cover image */
      let vendorName = order.vendorName;
      let vendorCoverImage = null;

      if (!vendorName && order.vendorId) {
        const vRef = doc(db, "vendors", order.vendorId);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data();
          vendorName = vData.shopName || "Unknown Vendor";
          vendorCoverImage = vData.coverImageUrl || null;
        }
      }

      /* 2b. product image for the first cart item */
      let productImage = null;
      if (order.cartItems?.length) {
        const first = order.cartItems[0];
        const pSnap = await getDoc(doc(db, "products", first.productId));
        if (pSnap.exists()) {
          const pd = pSnap.data();
          productImage = first.subProductId
            ? pd.subProducts?.find(
                (sp) => sp.subProductId === first.subProductId
              )?.images?.[0] || null
            : pd.imageUrls?.[0] || null;
        }
      }

      /* 2c. client‑side helper calls */
      await notifyOrderStatusChange(
        order.userId,
        order.id,
        "Shipped",
        vendorName,
        vendorCoverImage,
        productImage,
        null,
        { riderName, riderNumber, note }
      );

      await addActivityNote(
        order.vendorId,
        "Order Shipped 🚚",
        `Order has been shipped. Rider's name is ${riderName}, and they are reachable at ${riderNumber}.`,
        "order"
      );

      /* ------------------------------------------------------------
       * 3 — UI feedback / reset
       * ---------------------------------------------------------- */
      toast.success("Order marked as shipped!");
      setIsRiderModalOpen(false);
      closeRiderModal();
    } catch (err) {
      console.error("shipVendorOrder failed:", err);
      toast.error("Failed to move order to shipping. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const openRiderModal = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    setSelectedOrderId(orderId);

    if (order.kwikJob?.data?.contactUs) {
      // pre-fill from Kwik “contactUs” (or wherever you store it)
      setRiderName("Kwik Delivery");
      setRiderNumber(order.kwikJob.data.contactUs.phone_no);
      setDisableRiderFields(true);
    } else {
      setRiderName("");
      setRiderNumber("");
      setDisableRiderFields(false);
    }
    setIsRiderModalOpen(true);
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
                      className="w-12 h-12 p-0.5 border-dashed border-customBrown border border-opacity-80 object-cover rounded mr-3"
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
                    {order.kwikJob?.data?.pickups?.[0]
                      ?.result_tracking_link && (
                      <span className="ml-1 font-bold ">
                        <a
                          href={
                            order.kwikJob.data.pickups[0].result_tracking_link
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-black  font-opensans"
                          onClick={(e) => e.stopPropagation()} // so it doesn’t also open the modal
                        >
                          This order will be picked up by our rider{" "}
                          <span className="text-xs text-customOrange underline font-opensans">
                            Track Rider
                          </span>
                        </a>
                      </span>
                    )}
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
                    className="bg-transparent border-blue-300 border text-blue-300 font-medium font-opensans text-xs rounded-md px-2.5 py-2 flex items-center"
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
          overlayClassName="modal-overlay backdrop-blur-sm"
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
              disabled={disableRiderFields}
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
              className="w-full p-2 border text-xs h-20  rounded focus:outline-none"
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

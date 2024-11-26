// src/components/orders/OrderDetailsModal.js
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import moment from "moment";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { MdOutlineClose, MdOutlineMail } from "react-icons/md";
import { BsTelephone, BsBoxSeam } from "react-icons/bs";
import { GrNotes } from "react-icons/gr";
import { LiaCoinsSolid } from "react-icons/lia";
import { ImSad2 } from "react-icons/im";
import { FaSmileBeam } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import {
  IoPricetags,
  IoColorPaletteSharp,
  IoLocationOutline,
} from "react-icons/io5";
import notifyOrderStatusChange from "../../services/notifyorderstatus";
import { PiCoinsFill } from "react-icons/pi";
import { IoIosBody, IoMdInformationCircleOutline } from "react-icons/io";
import { FaShoppingBag } from "react-icons/fa";
import { AiFillProduct } from "react-icons/ai";
import { FaRegUser, FaUser, FaTruck } from "react-icons/fa6";
import { GoChevronLeft, GoClockFill } from "react-icons/go";
import toast from "react-hot-toast";
import { IoMdCheckmark } from "react-icons/io";
import { RotatingLines } from "react-loader-spinner";
import { BiCoinStack } from "react-icons/bi";
import { GiStarsStack } from "react-icons/gi";
const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  const [productImages, setProductImages] = useState({});
  const [productDetails, setProductDetails] = useState({});
  const [vendorDeliveryMode, setVendorDeliveryMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] =
    useState(false);
  const [isSupportCallModalOpen, setIsSupportCallModalOpen] = useState(false);
  const [confirmDeliveryChecked, setConfirmDeliveryChecked] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [otherReasonText, setOtherReasonText] = useState("");
  const [isDeclineInfoModalOpen, setIsDeclineInfoModalOpen] = useState(false);
  const userId = order?.userId; // Directly access userId from the order document

  const [vendorName, setVendorName] = useState(
    order?.vendorName || "Your Vendor Name"
  );

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  useEffect(() => {
    const fetchVendorName = async () => {
      if (!order.vendorName && order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          const fetchedVendorName = vendorData.shopName || "Unknown Vendor";

          // Update the local state with the fetched vendor name
          setVendorName(fetchedVendorName);
        }
      } else if (order.vendorName) {
        // If vendorName is already present in the order, use it
        setVendorName(order.vendorName);
      }
    };

    if (isOpen && order) {
      fetchVendorName();
    }
  }, [isOpen, order]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      const images = {};
      const details = {};

      for (const item of order.cartItems) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();

          if (item.subProductId) {
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === item.subProductId
            );
            if (subProduct) {
              images[item.subProductId] = subProduct.images[0];
              details[item.subProductId] = {
                name: productData.name,
                price: productData.price,
                color: subProduct.color,
                size: subProduct.size,
              };
            }
          } else if (item.variantAttributes) {
            images[item.productId] = productData.imageUrls[0];
            details[item.productId] = {
              name: productData.name,
              price: productData.price,
              color: item.variantAttributes.color,
              size: item.variantAttributes.size,
            };
          } else {
            images[item.productId] = productData.imageUrls[0];
            details[item.productId] = {
              name: productData.name,
              price: productData.price,
            };
          }
        }
      }
      setProductImages(images);
      setProductDetails(details);

      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          setVendorDeliveryMode(
            vendorSnap.data().deliveryMode || "Not specified"
          );
        }
      }

      setLoading(false);
    };

    if (isOpen && order) {
      fetchProductDetails();
    }
  }, [isOpen, order]);

  const handleAccept = async () => {
    setAcceptLoading(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { progressStatus: "In Progress" });

      // Fetch vendor cover image
      let vendorCoverImage = null;
      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          vendorCoverImage = vendorSnap.data().coverImageUrl || null;
        }
      }

      // Fetch product image (assuming you want the first product's image)
      let productImage = null;
      if (order.cartItems && order.cartItems.length > 0) {
        const firstItem = order.cartItems[0];
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (firstItem.subProductId) {
            // If subProductId exists, fetch the sub-product image
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = subProduct?.images?.[0] || null;
          } else {
            // Use the main product image
            productImage = productData.imageUrls?.[0] || null;
          }
        }
      }

      // Send notification to the user
      await notifyOrderStatusChange(
        userId, // userId
        order.id, // orderId
        "In Progress", // newStatus
        vendorName, // vendorName
        vendorCoverImage,
        userInfo.email, // Pass user email
        userInfo.displayName, 
        productImage // productImage
      );

      toast.success("Order accepted successfully");
      onClose();
    } catch (error) {
      console.error("Failed to accept the order:", error);
      toast.error("Failed to accept the order");
    } finally {
      setAcceptLoading(false);
    }
  };
  const handleDeclineInfoModal = () => {
    setIsDeclineInfoModalOpen(true);
  };
  const handleDecline = async (reason) => {
    setDeclineLoading(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        progressStatus: "Declined",
        declineReason: reason || "Reason not provided",
      });

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

      // Send notification to the user
      await notifyOrderStatusChange(
        userId, // userId
        order.id, // orderId
        "Declined", // newStatus
        vendorName, // vendorName
        vendorCoverImage, // vendorCoverImage
        productImage, 
        userInfo.email, // Pass user email
        userInfo.displayName, // Pass user name// productImage
        reason  
      );

      toast.success("Order declined successfully");
      setIsDeclineModalOpen(false);
      onClose();
    } catch (error) {
      console.error("Error declining order:", error);
      toast.error("Failed to decline the order");
    } finally {
      setDeclineLoading(false);
    }
  };

  const handleSend = () => {
    if (!declineReason || (declineReason === "Other" && !otherReasonText)) {
      toast.error("Please select or enter a reason for decline.");
      return;
    }
    const finalReason =
      declineReason === "Other" ? otherReasonText : declineReason;
    handleDecline(finalReason);
  };

  const handleProceedCall = () => {
    setIsCallModalOpen(false);
    window.open(`tel:${userInfo.phoneNumber}`, "_self");
  };
  const handleMarkAsDelivered = async () => {
    setDeliverLoading(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { progressStatus: "Delivered" });

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

      // Send notification to the user
      await notifyOrderStatusChange(
        userId, // userId
        order.id, // orderId
        "Delivered", // newStatus
        vendorName,
        userInfo.email, // Pass user email
        userInfo.displayName, // Pass user name // vendorName
        vendorCoverImage, // vendorCoverImage
        productImage // productImage
      );

      toast.success("Order marked as delivered");
      onClose();
    } catch (error) {
      console.error("Failed to mark as delivered:", error);
      toast.error("Failed to mark as delivered");
    } finally {
      setDeliverLoading(false);
      setIsConfirmDeliveryModalOpen(false);
    }
  };

  const handleContactUs = () => {
    setIsSupportCallModalOpen(true);
  };

  const handleProceedCallSupport = () => {
    setIsSupportCallModalOpen(false);
    window.open(`tel:000-009-999`, "_self");
  };
  if (!order) {
    return null;
  }

  const {
    userInfo,
    cartItems,
    progressStatus,
    note,
    createdAt,
    subtotal,
    riderInfo = {},
  } = order;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Order Details"
      ariaHideApp={false}
      className="modal-content-order"
      overlayClassName="modal-overlay"
    >
      <div className="relative h-full pb-12 px-3 overflow-y-auto space-y-4">
        {/* Sticky Header */}
        <div className="sticky -top-1 bg-white z-10 py-4  flex justify-between items-center ">
          <GoChevronLeft
            className="text-2xl cursor-pointer"
            onClick={onClose}
          />
          <h1 className="font-opensans text-black font-semibold text-base">
            Order details
          </h1>
          {progressStatus === "Declined" ? (
            <IoMdInformationCircleOutline
              className="text-xl text-customRichBrown cursor-pointer"
              onClick={handleDeclineInfoModal}
            />
          ) : (
            <BsTelephone
              className={`text-xl cursor-pointer ${
                progressStatus === "Delivered"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() => {
                if (
                  progressStatus === "Pending" ||
                  progressStatus === "Shipped" ||
                  progressStatus === "In Progress"
                ) {
                  setIsCallModalOpen(true);
                } else if (progressStatus === "Delivered") {
                  toast.error("Cannot call, order is already delivered");
                }
              }}
            />
          )}
        </div>
        <Modal
          isOpen={isCallModalOpen}
          onRequestClose={() => setIsCallModalOpen(false)}
          contentLabel="Call Confirmation"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Call Confirmation
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsCallModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            As you prepare to speak with a potential customer, remember to be
            friendly and approachable. You can call them to:
          </p>
          <div className="text-xs text-gray-700 font-opensans mb-6 space-y-4">
            <div>
              <p className="font-semibold font-opensans text-sm text-black">
                1. Confirm their Order:
              </p>
              <p className="font-opensans text-xs">
                Ensure they are aware of the details of their order and that
                everything is correct.
              </p>
            </div>
            <hr className="my-2 border-gray-200" />
            <div>
              <p className="font-semibold font-opensans text-sm text-black">
                2. Notify them about Order Status:
              </p>
              <p className="font-opensans text-xs">
                Provide updates on their order status to keep them informed and
                engaged.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            Always maintain a polite tone throughout the conversation, as this
            reflects our commitment to excellent customer service. Please adhere
            to our communication guidelines to create a positive experience for
            our customers.
          </p>

          <div className="flex justify-end">
            <button
              onClick={handleProceedCall}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
            >
              Proceed
            </button>
          </div>
        </Modal>
        {/* Customer Details */}
        <div className="border border-black rounded-lg py-4 px-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
              <FaUser className="text-customRichBrown" />
            </div>
            <p className="text-sm font-opensans font-medium text-customRichBrown">
              {progressStatus === "Declined"
                ? "Decline Reason"
                : "Customer Details"}
            </p>
          </div>

          <div className="space-y-4">
            {progressStatus === "Declined" ? (
              // Show decline reason if the order is declined
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <GrNotes className="text-gray-500 text-xl" />
                <p className="ml-6 font-opensans text-black text-sm flex-grow">
                  {order.declineReason || "No reason provided"}
                </p>
              </div>
            ) : (
              // Show customer details if the order is not declined
              <>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <FaRegUser className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Name:</p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {loading ? (
                      <Skeleton width={100} />
                    ) : (
                      userInfo?.displayName || "Unknown User"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <MdOutlineMail className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Email:</p>
                  <p
                    className={`ml-6 font-opensans text-black text-sm flex-grow ${
                      progressStatus === "Delivered" ? "blur-sm" : ""
                    }`}
                  >
                    {loading ? (
                      <Skeleton width={150} />
                    ) : (
                      userInfo.email || "Not Available"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <BsTelephone className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Phone:</p>
                  <p
                    className={`ml-6 font-opensans text-black text-sm flex-grow ${
                      progressStatus === "Delivered" ? "blur-sm" : ""
                    }`}
                  >
                    {loading ? (
                      <Skeleton width={120} />
                    ) : (
                      userInfo.phoneNumber || "Not Available"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <IoLocationOutline className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">
                    Location:
                  </p>
                  <p
                    className={`ml-6 font-opensans text-black text-sm flex-grow ${
                      progressStatus === "Delivered" ? "blur-sm" : ""
                    }`}
                  >
                    {loading ? (
                      <Skeleton width={200} />
                    ) : (
                      userInfo.address || "Not Available"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <BsBoxSeam className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">
                    Order ID:
                  </p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {order.id}
                  </p>
                </div>
                {note && (
                  <div className="flex items-start space-x-2 pb-2 border-b border-gray-100">
                    <GrNotes className="text-gray-500 text-xl mt-1" />
                    <p className="text-gray-500 text-sm font-opensans">Note:</p>
                    <p className="ml-6 font-opensans text-black text-sm flex-grow">
                      {note}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {(order.progressStatus === "Shipped" ||
          order.progressStatus === "Delivered") && (
          <div className="border border-black rounded-lg py-4 px-3 mt-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                <FaTruck className="text-customRichBrown" />
              </div>
              <p className="text-sm font-opensans font-medium text-customRichBrown">
                Rider Details
              </p>
            </div>

            <div className="space-y-4">
              {/* Rider Name */}
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <FaRegUser className="text-gray-500 text-xl" />
                <p className="text-gray-500 text-sm font-opensans">
                  Rider Name:
                </p>
                <p className="ml-6 font-opensans text-black text-sm flex-grow">
                  {riderInfo?.riderName || "Not Available"}
                </p>
              </div>

              {/* Rider Phone */}
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <BsTelephone className="text-gray-500 text-xl" />
                <p className="text-gray-500 text-sm font-opensans">
                  Rider Phone:
                </p>
                <p className="ml-6 font-opensans text-black text-sm flex-grow">
                  {riderInfo?.riderNumber || "Not Available"}
                </p>
              </div>

              {/* Rider Note */}
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <GrNotes className="text-gray-500 text-xl" />
                <p className="text-gray-500 text-sm font-opensans">Note:</p>
                <p className="ml-6 font-opensans text-black text-sm flex-grow">
                  {riderInfo?.note || "None"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product Details */}
        <div className="bg-white rounded-lg space-y-6">
          {cartItems.map((item, index) => (
            <div key={index} className="text-sm text-gray-700 mb-4">
              {loading ? (
                <Skeleton height={240} />
              ) : (
                productImages[item.subProductId || item.productId] && (
                  <img
                    src={productImages[item.subProductId || item.productId]}
                    alt="Product Image"
                    className="w-full h-60 p-1 border-opacity-45 border-dashed border-customBrown border-2 object-cover rounded mb-4"
                  />
                )
              )}

              <div className="border border-black rounded-lg py-4 px-3">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                    <AiFillProduct className="text-customRichBrown text-xl" />
                  </div>
                  <p className="ml-2 text-base font-opensans font-medium text-customRichBrown">
                    Product {index + 1}
                  </p>
                </div>

                {/* Product Details */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <AiFillProduct className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Product Name:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={100} />
                      ) : (
                        productDetails[item.subProductId || item.productId]
                          ?.name || "Unknown Product"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoPricetags className="text-green-500 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Price:
                    </p>
                    <p className="ml-10 font-opensans bg-green-100 px-2 h-6 text-black text-sm flex justify-center items-center rounded-md">
                      {loading ? (
                        <Skeleton width={60} />
                      ) : (
                        `₦${
                          productDetails[
                            item.subProductId || item.productId
                          ]?.price.toLocaleString() || "N/A"
                        }`
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <FaShoppingBag className="text-blue-800 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Quantity:
                    </p>
                    <p className="ml-10 font-opensans bg-blue-100 px-2 h-6 rounded-md text-black text-sm flex justify-center items-center">
                      {loading ? <Skeleton width={20} /> : item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoColorPaletteSharp className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Color:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={80} />
                      ) : (
                        productDetails[item.subProductId]?.color ||
                        item.variantAttributes?.color ||
                        "N/A"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoIosBody className="text-blue-800 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Size:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={50} />
                      ) : (
                        productDetails[item.subProductId]?.size ||
                        item.variantAttributes?.size ||
                        "N/A"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <GoClockFill className="text-indigo-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Status:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm">
                      <span
                        className={`${
                          order.progressStatus === "Pending"
                            ? "text-black px-2 bg-yellow-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "In Progress"
                            ? "text-black px-2 bg-blue-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "Shipped"
                            ? "text-black px-2 bg-green-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "Delivered"
                            ? "text-white px-2 bg-green-600 h-6 rounded-md flex justify-center items-center"
                            : "text-black px-2 bg-red-100 h-6 rounded-md flex justify-center items-center"
                        }`}
                      >
                        {loading ? (
                          <Skeleton width={50} />
                        ) : (
                          <>
                            {order.progressStatus === "Delivered" && (
                              <GiStarsStack className="mr-1 text-yellow-300" />
                            )}
                            {order.progressStatus}
                          </>
                        )}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <FaTruck className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Delivery Mode:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={100} />
                      ) : (
                        vendorDeliveryMode || "Not Specified"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <AiFillProduct className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Created At:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm">
                      {moment(createdAt.seconds * 1000).format(
                        "MMMM DD [at] hh:mm A"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border border-black rounded-lg py-4 px-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              <PiCoinsFill className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-base text-customRichBrown font-semibold">
              Balance
            </h2>
          </div>

          <div className="space-y-2 mt-3">
            {cartItems.map((item, index) => {
              const amount =
                (productDetails[item.subProductId || item.productId]?.price ||
                  0) * item.quantity;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-100 pb-2"
                >
                  <div className="flex items-center space-x-2">
                    <BiCoinStack className="text-customOrange" />
                    <p className="font-opensans text-sm text-gray-700">
                      Amount {index + 1}:
                    </p>
                  </div>
                  <p className="font-opensans text-sm text-gray-700">
                    ₦{amount.toLocaleString() || "N/A"}
                  </p>
                </div>
              );
            })}

            {/* Subtotal */}
            <div className="flex items-center justify-end   pt-2 mt-2">
              <LiaCoinsSolid className="text-green-300 text-lg mr-1" />
              <p className="font-opensans text-sm  text-gray-800 mr-6">
                Total:
              </p>
              <p className="font-opensans text-sm rounded-md font-medium bg-green-100 px-2 h-6 text-gray-800">
                ₦{subtotal?.toLocaleString() || "0.00"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          {order.progressStatus === "Pending" && (
            <>
              <button
                onClick={() => setIsDeclineModalOpen(true)}
                className="bg-transparent font-medium text-customOrange text-sm font-opensans py-2.5 px-14 rounded-full border-customBrown border-1"
              >
                {declineLoading ? (
                  <RotatingLines
                    strokeColor="orange"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Decline"
                )}
              </button>
              <button
                onClick={handleAccept}
                className="text-sm font-medium text-white font-opensans py-2.5 px-14 rounded-full bg-customOrange"
                disabled={acceptLoading}
              >
                {acceptLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Accept"
                )}
              </button>
            </>
          )}
        </div>
        <div className="flex justify-between mt-4">
          {progressStatus === "Shipped" && (
            <>
              <button
                onClick={handleContactUs}
                className="bg-transparent font-medium text-customOrange text-xs font-opensans py-2.5 px-8 rounded-full border-customBrown border-1"
              >
                Contact Us
              </button>
              <button
                onClick={() => setIsConfirmDeliveryModalOpen(true)}
                className="text-xs font-medium text-white font-opensans py-2.5 px-8 rounded-full bg-customOrange"
                disabled={deliverLoading}
              >
                {deliverLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Mark as Delivered"
                )}
              </button>
            </>
          )}
        </div>

        {/* Decline Reason Modal */}
        <Modal
          isOpen={isDeclineModalOpen}
          onRequestClose={() => setIsDeclineModalOpen(false)}
          className={`modal-content-reason ${
            declineReason === "Other" ? "h-auto" : "h-[50%]"
          }`}
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <MdCancel className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Reason for decline
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsDeclineModalOpen(false)}
            />
          </div>
          <div className="space-y-3 mb-4">
            {[
              "Out of stock",
              "Delivery Timing",
              "Can't deliver to Location",
              "Other",
            ].map((reason, index) => (
              <div
                key={index}
                className={`cursor-pointer flex items-center text-gray-800 mb-1 ${
                  declineReason === reason
                    ? "border-customOrange"
                    : "border-gray-200"
                }`}
                onClick={() => {
                  setDeclineReason(reason);
                  if (reason !== "Other") setOtherReasonText(""); // Clear otherReasonText if not "Other"
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                    declineReason === reason
                      ? "border-customOrange"
                      : "border-customOrange border-opacity-80"
                  }`}
                >
                  {declineReason === reason && (
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="font-opensans text-black">{reason}</span>
              </div>
            ))}

            {/* Show text input if "Other" is selected */}
            {declineReason === "Other" && (
              <input
                type="text"
                placeholder="Other reason..."
                className="border px-2 h-20 text-xs rounded w-full"
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSend}
              className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full"
              disabled={declineLoading}
            >
              {declineLoading ? (
                <RotatingLines
                  strokeColor="white"
                  strokeWidth="5"
                  animationDuration="0.75"
                  width="20"
                  visible={true}
                />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </Modal>
        <Modal
          isOpen={isConfirmDeliveryModalOpen}
          onRequestClose={() => setIsConfirmDeliveryModalOpen(false)}
          contentLabel="Confirm Delivery"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Confirm Delivery
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsConfirmDeliveryModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            Please confirm that the order has been successfully delivered to the
            customer. Here are some points to ensure successful delivery:
          </p>
          <ul className="list-disc pl-2 text-xs text-gray-700 font-opensans font-medium space-y-2">
            <li className="flex">
              <IoMdCheckmark className="text-green-800 mr-4 text-4xl" /> You
              have spoken to the rider/logistics company, and they have
              confirmed that the order has been delivered.
            </li>

            <li className="flex ">
              <IoMdCheckmark className="text-green-800 mr-4 text-4xl" />
              You received delivery confirmation or a signed proof of delivery
              from the logistics provider.
            </li>
          </ul>
          <p className="text-xs text-gray-700 font-opensans mt-4">
            For more details on marking an order as delivered, please refer to
            our
            <a href="/mythrift.ng" className="text-customOrange underline">
              Order Delivery Guide
            </a>
            .
          </p>
          <div className="flex mt-4 items-center mb-4">
            <input
              type="checkbox"
              checked={confirmDeliveryChecked}
              onChange={() =>
                setConfirmDeliveryChecked(!confirmDeliveryChecked)
              }
              className="mr-2"
            />
            <span className="text-xs font-opensans text-red-500">
              I confirm that the order has been delivered and accept full
              responsibility for this action.
            </span>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleMarkAsDelivered}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
              disabled={!confirmDeliveryChecked || deliverLoading}
            >
              {deliverLoading ? (
                <RotatingLines strokeColor="white" width="20" />
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </Modal>
        <Modal
          isOpen={isDeclineInfoModalOpen}
          onRequestClose={() => setIsDeclineInfoModalOpen(false)}
          contentLabel="Decline Info"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <ImSad2 className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Declined Order
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsDeclineInfoModalOpen(false)}
            />
          </div>
          <div>
            <p className="font-opensans text-sm text-black font-medium">
              Order was declined by you (Vendor). This process cannot be
              reversed!
            </p>
          </div>
        </Modal>
        {/* Support Call Modal */}
        <Modal
          isOpen={isSupportCallModalOpen}
          onRequestClose={() => setIsSupportCallModalOpen(false)}
          contentLabel="Contact Support"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Contact Support
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsSupportCallModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            If you are facing issues with this order, please contact us.
            Recommended reasons to call:
          </p>
          <ul className="text-xs text-gray-700 font-opensans mb-6 list-disc pl-5 space-y-1">
            <li>- Order mishandling or damage.</li>
            <li>- Rider missing or unresponsive.</li>
            <li>- Issues with the delivery location.</li>
            <li>- Delivery delayed beyond the expected timeframe.</li>
          </ul>

          <div className="flex justify-end">
            <button
              onClick={handleProceedCallSupport}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
            >
              Proceed
            </button>
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;

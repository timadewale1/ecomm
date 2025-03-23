import React, { useEffect, useState, useRef } from "react";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  documentId,
} from "firebase/firestore";
import { FaClipboardCheck } from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";
import { MdPendingActions } from "react-icons/md";
import moment from "moment";
import { TbTruckDelivery } from "react-icons/tb";
import { FaTimes } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { MdOutlinePendingActions } from "react-icons/md";
// import { GoChevronLeft } from "react-icons/go";

import Loading from "../../components/Loading/Loading";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { BsFillBoxSeamFill, BsFillFileEarmarkTextFill } from "react-icons/bs";
import Orderpic from "../../Images/orderpic.svg";
import RelatedProducts from "./SimilarProducts";
import ScrollToTop from "../../components/layout/ScrollToTop";
import OrderStepper from "../../components/Order/OrderStepper";
import SEO from "../../components/Helmet/SEO";
const OrdersCentre = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // Selected order for modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [activeProductIndex, setActiveProductIndex] = useState(0); // Track current product in the modal

  const [sampleProduct, setSampleProduct] = useState(null);
  const ordersFetched = useRef(false);
  const location = useLocation();

  const fromPaymentApprove = location.state?.fromPaymentApprove;

  useEffect(() => {
    window.scrollTo(0, 0);
  });

  // Inside your useEffect where you fetch orders
  useEffect(() => {
    if (!userId || ordersFetched.current) return;

    const fetchOrdersAndProducts = async () => {
      try {
        // Fetch orders
        console.log("Fetching orders for userId:", userId);
        const q = query(
          collection(db, "orders"),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched orders:", fetchedOrders);

        // Sort orders by createdAt in descending order
        fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        // Fetch vendor names
        const vendorIds = [
          ...new Set(fetchedOrders.map((order) => order.vendorId)),
        ];

        console.log("Unique vendorIds:", vendorIds);

        const vendorPromises = vendorIds.map((id) =>
          getDoc(doc(db, "vendors", id))
        );
        const vendorSnapshots = await Promise.all(vendorPromises);

        const vendorNames = vendorSnapshots.reduce((acc, vendorDoc) => {
          if (vendorDoc.exists()) {
            console.log(
              `Fetched vendor: ${vendorDoc.id} -> ${vendorDoc.data().shopName}`
            );
            acc[vendorDoc.id] = vendorDoc.data().shopName;
          } else {
            console.warn(`Vendor not found for ID: ${vendorDoc.id}`);
          }
          return acc;
        }, {});

        console.log("Mapped vendor names:", vendorNames);

        // Attach vendor names to orders
        const ordersWithVendors = fetchedOrders.map((order) => ({
          ...order,
          vendorName: vendorNames[order.vendorId] || "Unknown Vendor",
        }));

        console.log("Orders with vendor names:", ordersWithVendors);

        // Fetch product details
        const productIds = new Set();
        ordersWithVendors.forEach((order) => {
          order.cartItems.forEach((item) => {
            productIds.add(item.productId);
          });
        });

        console.log("Unique productIds:", Array.from(productIds));

        const productsRef = collection(db, "products");
        const productsQuery = query(
          productsRef,
          where(documentId(), "in", Array.from(productIds))
        );
        const productsSnapshot = await getDocs(productsQuery);

        const productsData = {};
        productsSnapshot.forEach((doc) => {
          console.log(`Fetched product: ${doc.id} ->`, doc.data());
          productsData[doc.id] = doc.data();
        });

        console.log("Mapped product data:", productsData);

        // Attach product details to cartItems
        const ordersWithProductDetails = ordersWithVendors.map((order) => {
          const cartItemsWithDetails = order.cartItems.map((item) => {
            const productData = productsData[item.productId];
            let imageUrl = "";
            let name = "";
            let price = 0;
            let color = "";
            let size = "";

            if (productData) {
              name = productData.name;
              price = productData.price;

              if (item.subProductId) {
                // Handle subProduct
                const subProduct = productData.subProducts?.find(
                  (sp) => sp.subProductId === item.subProductId
                );
                if (subProduct) {
                  imageUrl = subProduct.images?.[0] || "";
                  color = subProduct.color || "";
                  size = subProduct.size || "";
                  if (subProduct.price) {
                    price = subProduct.price;
                  }
                }
              } else if (item.variantAttributes) {
                // Handle variant
                imageUrl = productData.imageUrls?.[0] || "";
                color = item.variantAttributes.color || "";
                size = item.variantAttributes.size || "";
              } else {
                // Regular product
                imageUrl = productData.coverImageUrl || "";
              }
            }

            return {
              ...item,
              name,
              price,
              imageUrl,
              color,
              size,
            };
          });

          return {
            ...order,
            cartItems: cartItemsWithDetails,
          };
        });

        console.log("Orders with product details:", ordersWithProductDetails);

        setOrders(ordersWithProductDetails);
      } catch (error) {
        console.error("Error fetching orders and products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndProducts();
  }, [userId]);
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setActiveProductIndex(0); // Reset to the first product
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  useEffect(() => {
    if (orders.length === 0) {
      const fetchSampleProduct = async () => {
        try {
          const productsRef = collection(db, "products");
          const q = query(
            productsRef,
            where("stockQuantity", ">", 0),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const productData = querySnapshot.docs[0].data();
            setSampleProduct(productData);
          }
        } catch (error) {
          console.error("Error fetching sample product:", error);
        }
      };

      fetchSampleProduct();
    }
  }, [orders]);
  const openChat = () => {
    if (window.HelpCrunch) {
      console.log("Opening HelpCrunch chat...");
      window.HelpCrunch("openChat");
    } else {
      console.error("HelpCrunch is not initialized.");
    }
  };

  useEffect(() => {
    // Ensure HelpCrunch is fully initialized
    const initializeHelpCrunch = () => {
      if (window.HelpCrunch) {
        window.HelpCrunch("onReady", () => {
          console.log("HelpCrunch is ready.");
          window.HelpCrunch("hideChatWidget"); // Ensure widget is hidden
        });
      } else {
        console.error("HelpCrunch is not loaded.");
      }
    };

    initializeHelpCrunch();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthChecked(true); // Authentication state has been determined
    });

    return () => unsubscribe();
  }, []);
  if (!isAuthChecked) {
    // Authentication state is not yet known show a loading indicator
    return <Loading />;
  }

  const filterOrdersByStatus = (status) => {
    return orders.filter((order) => {
      if (status === "All") return true;
      if (status === "Processing")
        return order.progressStatus === "In Progress";
      if (status === "Pending") return order.progressStatus === "Pending";
      if (status === "Delivered") return order.progressStatus === "Delivered";
      if (status === "Shipped") return order.progressStatus === "Shipped";

      if (status === "Declined") return order.progressStatus === "Declined";
      return false;
    });
  };

  const filteredOrders = filterOrdersByStatus(activeTab);

  const handleBackClick = () => {
    if (fromPaymentApprove) {
      navigate("/profile");
    } else {
      navigate(-1);
    }
  };

  const tabButtons = [
    "All",
    "Processing",
    "Shipped",
    "Delivered",
    "Declined",
    "Pending",
  ];

  return (
    <div>
      <SEO
        title={`Your Orders - My Thrift`}
        description={`View your orders on My Thrift`}
        url={`https://www.shopmythrift.store/user-orders`}
      />
      <ScrollToTop />
      <div className="sticky top-0 pb-2 bg-white w-full z-10">
        <div className="flex p-3 py-3 items-center bg-white h-20 mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <h1 className="text-xl font-opensans ml-5 font-semibold">Orders</h1>
        </div>
        <div className="border-t border-gray-300 my-2"></div>
        {/* Tabs Section (Inside Header) */}
        <div className="flex px-3 py-2 overflow-x-auto">
          <div className="flex space-x-3">
            {tabButtons.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 border h-12 rounded-full ${
                  activeTab === tab
                    ? "bg-customOrange text-xs font-opensans text-white"
                    : "bg-white text-xs font-opensans text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {userId === null ? (
        <div className="flex flex-col items-center justify-center mt-10">
          <div className="bg-gray-200 flex justify-center rounded-full w-32 h-32 p-2">
            <img src={Orderpic} alt="Order" />
          </div>
          <div className="mt-20 flex items-center flex-col justify-center">
            <p className="text-gray-600 font-opensans text-center text-xs">
              Please login to view your order progress status and history.
            </p>
            <button
              className="text-white font-opensans font-semibold h-11 mt-3 mb-14 bg-customOrange rounded-full w-32"
              onClick={() => {
                navigate("/login", { state: { from: location.pathname } });
              }}
            >
              Login
            </button>
          </div>
          {/* Render RelatedProducts when user is not authenticated */}
          {sampleProduct && <RelatedProducts product={sampleProduct} />}
        </div>
      ) : (
        // Existing code to display orders when user is authenticated
        <>
          {loading ? (
            <Loading />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10">
              <div className="bg-gray-200 flex justify-center rounded-full w-32 h-32 p-2">
                <img src={Orderpic} alt="Order" />
              </div>
              <div className="mt-20">
                <p className="text-gray-600 font-opensans text-center text-xs">
                  No order available
                </p>
                <button
                  className="text-white font-opensans font-semibold h-12 mt-3 mb-14 bg-customOrange rounded-full w-32"
                  onClick={() => navigate("/browse-markets")}
                >
                  Shop Now
                </button>
              </div>
              {/* Render RelatedProducts when there are no orders */}
              {sampleProduct && <RelatedProducts product={sampleProduct} />}
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="px-3 py-2">
                <div className="bg-white shadow-lg px-3 py-4 rounded-lg">
                  <div className="flex justify-between  items-start mb-2">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        {order.progressStatus === "Shipped" ? (
                          <>
                            <TbTruckDelivery className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              Shipped
                            </span>
                          </>
                        ) : order.progressStatus === "Declined" ? (
                          <>
                            <FaTimes className="text-white bg-gray-200 h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              Cancelled
                            </span>
                          </>
                        ) : order.progressStatus === "In Progress" ? (
                          <>
                            <IoTimeOutline className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              In Progress
                            </span>
                          </>
                        ) : order.progressStatus === "Pending" ? (
                          <>
                            <MdPendingActions className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              Pending Approval
                            </span>
                          </>
                        ) : order.progressStatus === "Delivered" ? (
                          <>
                            <FaClipboardCheck className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              Delivered
                            </span>
                          </>
                        ) : !order.progressStatus ? (
                          <>
                            <MdOutlinePendingActions className="text-white bg-yellow-300 h-7 w-7 rounded-full p-1 text-lg" />
                            <span className="text-sm text-black font-semibold font-opensans">
                              Pending Approval
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-black font-semibold font-opensans">
                            {order.progressStatus}
                          </span>
                        )}
                      </div>
                      <div className="ml-9">
                        <span className="text-xs text-gray-700 font-opensans">
                          {order.createdAt
                            ? moment(order.createdAt.seconds * 1000).format(
                                "HH:mm, DD/MM/YYYY"
                              )
                            : "Date not available"}
                        </span>
                      </div>

                      {/* Aligning date under the order status */}
                    </div>

                    {/* Vendor name aligned on the right */}
                  </div>
                  <div className="border-t border-gray-300 my-2"></div>
                  <OrderStepper orderStatus={order.progressStatus} />
                  <div className="border-t border-gray-300 my-2"></div>

                  {order.cartItems ? (
                    order.cartItems.map((item, index) => (
                      <div
                        key={index}
                        className={`flex flex-col items-start py-2 border-b ${
                          index === order.cartItems.length - 1 ? "pb-4" : ""
                        }`}
                      >
                        <div className="flex items-center">
                          <img
                            src={
                              item.imageUrl || "https://via.placeholder.com/150"
                            }
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg mr-4"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/150";
                            }}
                          />
                          <div>
                            <h4 className="text-sm font-opensans">
                              {item.name}
                            </h4>
                            <p className="font-opensans text-md mt-2 text-black font-bold">
                              ₦{item.price ? item.price.toLocaleString() : "0"}
                            </p>
                          </div>
                        </div>

                        {/* Render Tap to View button only for the last product */}
                        {index === order.cartItems.length - 1 && (
                          <div className="flex justify-start ml-[77px] mt-2">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="bg-customCream bg-opacity-60 text-xs text-customRichBrown font-opensans font-medium border-2 border-customOrange px-2.5 py-1.5 rounded-full "
                            >
                              Tap to view
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-red-500">
                      No products found in this order.
                    </p>
                  )}

                  <div className="mt-2">
                    <div className="flex justify-end">
                      <span className="text-sm font-opensans font-normal">
                        Order Total:
                      </span>
                      <span className="text-sm font-opensans font-semibold ml-1">
                        ₦{" "}
                        {order.total
                          ? Number(order.total).toLocaleString()
                          : "0"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-white h-full rounded-lg shadow-lg w-full max-w-2xl p-6 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex  items-center mb-4">
              <GoChevronLeft
                onClick={closeModal}
                className="text-2xl cursor-pointer"
              />
              <h2 className="text-lg font-medium font-opensans">
                Order Details
              </h2>
            </div>

            {/* Product Images Carousel */}
            <Swiper
              spaceBetween={10}
              slidesPerView={1}
              onSlideChange={(swiper) =>
                setActiveProductIndex(swiper.activeIndex)
              }
            >
              {selectedOrder.cartItems.map((item, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={item.imageUrl || "https://via.placeholder.com/150"}
                    alt={item.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Dots Navigation */}
            {selectedOrder.cartItems.length > 1 && (
              <div className="flex justify-center mt-2">
                {selectedOrder.cartItems.map((_, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer mx-0.5 rounded-full transition-all duration-300 ${
                      index === activeProductIndex
                        ? "bg-customOrange h-2.5 w-2.5"
                        : "bg-orange-300 h-2 w-2"
                    }`}
                    onClick={() => setActiveProductIndex(index)}
                  />
                ))}
              </div>
            )}

            {/* Product Details */}
            <div className="mt-4">
              {/* Product Details Section */}
              <div className="flex items-center mb-2">
                <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                  <BsFillBoxSeamFill className="text-customRichBrown" />
                </div>
                <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                  Product Details
                </p>
              </div>
              <div className="border-b mb-2"></div>

              <div className="mt-2">
                {[
                  {
                    label: "Item Name:",
                    value: selectedOrder.cartItems[activeProductIndex].name,
                  },
                  {
                    label: "Price:",
                    value: `₦${
                      selectedOrder.cartItems[
                        activeProductIndex
                      ].price?.toLocaleString() || "0"
                    }`,
                  },
                  {
                    label: "Size:",
                    value:
                      selectedOrder.cartItems[activeProductIndex].size || "N/A",
                  },
                  {
                    label: "Color:",
                    value:
                      selectedOrder.cartItems[activeProductIndex].color ||
                      "N/A",
                  },
                  {
                    label: "Quantity:",
                    value:
                      selectedOrder.cartItems[activeProductIndex].quantity || 1,
                  },
                ].map(({ label, value }, index) => (
                  <React.Fragment key={index}>
                    <div className="flex justify-between items-center my-2">
                      <p className="text-sm font-opensans text-black font-semibold text-left w-1/2">
                        {label}
                      </p>
                      <p className="text-sm font-opensans text-black text-center w-1/2">
                        {value}
                      </p>
                    </div>
                    {index < 4 && <div className="border-b my-2"></div>}
                  </React.Fragment>
                ))}
              </div>

              {/* Order Details Section */}
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <BsFillFileEarmarkTextFill className="text-customRichBrown" />
                  </div>
                  <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                    Order Details
                  </p>
                </div>
                <div className="border-b mb-2"></div>

                {[
                  { label: "Order ID:", value: selectedOrder.id },
                  {
                    label: "Vendor Name:",
                    value: selectedOrder.vendorName,
                  },
                  ...(selectedOrder.riderInfo &&
                  selectedOrder.progressStatus === "Shipped"
                    ? [
                        {
                          label: "Rider Name:",
                          value: selectedOrder.riderInfo.riderName,
                        },
                        {
                          label: "Rider Number:",
                          value: selectedOrder.riderInfo.riderNumber,
                        },
                        {
                          label: "Note:",
                          value: selectedOrder.riderInfo.note || "N/A",
                        },
                      ]
                    : []),
                  ...(selectedOrder.declineReason
                    ? [
                        {
                          label: "Decline Reason:",
                          value: selectedOrder.declineReason,
                        },
                      ]
                    : []),
                ].map(({ label, value }, index) => (
                  <React.Fragment key={index}>
                    <div className="flex justify-between items-center my-2">
                      <p className="text-sm font-opensans text-black font-semibold text-left w-1/2">
                        {label}
                      </p>
                      <p className="text-sm font-opensans text-black text-center w-1/2">
                        {value}
                      </p>
                    </div>
                    {index < 4 && <div className="border-b my-2"></div>}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <button
                id="contact-support-tab"
                className=" w-40  px-4 py-2 mt-4 cursor-pointer rounded-lg text-white font-opensans text-sm bg-customOrange mb-3"
                onClick={openChat}
              >
                Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersCentre;

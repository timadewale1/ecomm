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
import Loading from "../../components/Loading/Loading";
import Orderpic from "../../Images/orderpic.svg";
import RelatedProducts from "./SimilarProducts";

const OrdersCentre = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sampleProduct, setSampleProduct] = useState(null);
  const ordersFetched = useRef(false);
  const location = useLocation();

  const fromPaymentApprove = location.state?.fromPaymentApprove;

  // Inside your useEffect where you fetch orders
  useEffect(() => {
    if (!userId || ordersFetched.current) return;

    const fetchOrdersAndProducts = async () => {
      try {
        // Fetch orders
        const q = query(
          collection(db, "orders"),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort orders by createdAt in descending order
        fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        // Fetch vendor names
        const vendorIds = [
          ...new Set(fetchedOrders.map((order) => order.vendorId)),
        ];
        const vendorPromises = vendorIds.map((id) =>
          getDoc(doc(db, "vendors", id))
        );
        const vendorSnapshots = await Promise.all(vendorPromises);

        const vendorNames = vendorSnapshots.reduce((acc, vendorDoc) => {
          if (vendorDoc.exists()) {
            acc[vendorDoc.id] = vendorDoc.data().shopName;
          }
          return acc;
        }, {});

        // Collect all unique productIds
        const productIds = new Set();
        fetchedOrders.forEach((order) => {
          order.cartItems.forEach((item) => {
            productIds.add(item.productId);
          });
        });

        // Fetch product details
        const productsRef = collection(db, "products");
        const productsQuery = query(
          productsRef,
          where(documentId(), "in", Array.from(productIds))
        );
        const productsSnapshot = await getDocs(productsQuery);

        const productsData = {};
        productsSnapshot.forEach((doc) => {
          productsData[doc.id] = doc.data();
        });

        // Attach product details to cartItems
        const ordersWithProductDetails = fetchedOrders.map((order) => {
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
                  // If subProduct has its own price, use it
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

        setOrders(ordersWithProductDetails);
        setVendors(vendorNames);
        ordersFetched.current = true;
      } catch (error) {
        console.error("Error fetching orders and products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndProducts();
  }, [userId]);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const filterOrdersByStatus = (status) => {
    return orders.filter((order) => {
      if (status === "All") return true;
      if (status === "Processing")
        return order.progressStatus === "In Progress";
      if (status === "Pending")
        return order.progressStatus === "Pending";
      if (status === "Delivered")
        return order.progressStatus === "Delivered";
      if (status === "Shipped")
        return order.progressStatus === "Shipped";
      
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

  const tabButtons = ["All", "Processing", "Shipped", "Delivered", "Declined", "Pending"];

  return (
    <div>
      <div className="sticky top-0 pb-2 bg-white w-full z-10">
        <div className="flex p-3 py-3 items-center bg-white h-20 mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={handleBackClick}
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
              <div className="flex justify-between items-start mb-2">
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

                  {/* Aligning date under the order status */}
                  <div className="ml-9">
                    <span className="text-xs text-gray-700 font-opensans">
                      {order.createdAt
                        ? moment(order.createdAt.seconds * 1000).format(
                            "HH:mm, DD/MM/YYYY"
                          )
                        : "Date not available"}
                    </span>
                  </div>
                </div>

                {/* Vendor name aligned on the right */}
                <h1 className="text-sm font-opensans">
                  <span className="text-gray-400 text-sm font-opensans">
                    From:{" "}
                  </span>
                  {vendors[order.vendorId]?.length > 12
                    ? `${vendors[order.vendorId].slice(0, 12)}...`
                    : vendors[order.vendorId] || "Unknown Vendor"}
                </h1>
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              {order.cartItems ? (
                order.cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div className="flex items-center">
                      <img
                        src={item.imageUrl || "https://via.placeholder.com/150"}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/150";
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-opensans">{item.name}</h4>
                        <p className="font-opensans text-md mt-2 text-black font-bold">
                          ₦{item.price ? item.price.toLocaleString() : "0"}
                        </p>
                        <div className="flex items-center space-x-4 text-sm mt-2">
                          <p className="text-black font-semibold font-opensans">
                            <span className="font-normal text-gray-600">
                              Size:
                            </span>{" "}
                            {item.size || "N/A"}
                          </p>
                          <p className="text-black font-semibold font-opensans">
                            <span className="font-normal text-gray-600">
                              Color:
                            </span>{" "}
                            {item.color || "N/A"}
                          </p>
                          <p className="text-black font-semibold font-opensans">
                            <span className="font-normal text-gray-600">
                              Qty:
                            </span>{" "}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
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
                    Sub-Total:
                  </span>
                  <span className="text-sm font-semibold font-opensans ml-1">
                    ₦{" "}
                    {order.subtotal
                      ? Number(order.subtotal).toLocaleString()
                      : "0"}
                  </span>
                </div>
                {order.serviceFee && (
                  <div className="flex justify-end">
                    <span className="text-sm font-opensans font-normal">
                      Service Fee:
                    </span>
                    <span className="text-sm font-opensans font-semibold ml-1">
                      ₦ {Number(order.serviceFee).toLocaleString()}
                    </span>
                  </div>
                )}
                {order.bookingFee && (
                  <div className="flex justify-end">
                    <span className="text-sm font-opensans font-normal">
                      Booking Fee:
                    </span>
                    <span className="text-sm font-opensans font-semibold ml-1">
                      ₦ {Number(order.bookingFee).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-end">
                  <span className="text-sm font-opensans font-normal">
                    Order Total:
                  </span>
                  <span className="text-sm font-opensans font-semibold ml-1">
                    ₦ {order.total ? Number(order.total).toLocaleString() : "0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OrdersCentre;

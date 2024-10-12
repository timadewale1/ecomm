import React, { useEffect, useState, useRef } from "react";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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

  useEffect(() => {
    if (!userId || ordersFetched.current) return;

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort orders by newest first
        fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

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

        setOrders(fetchedOrders);
        setVendors(vendorNames);
        ordersFetched.current = true; // Mark orders as fetched
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  useEffect(() => {
    if (orders.length === 0) {
      const fetchSampleProduct = async () => {
        try {
          const productsRef = collection(db, "products");
          const q = query(productsRef, where("stockQuantity", ">", 0), limit(1));
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
      if (status === "Processing") return order.progressStatus === "In Progress";
      if (status === "Shipped")
        return order.progressStatus === "Out for Delivery";
      if (status === "Completed") return order.progressStatus === "Completed";
      if (status === "Cancelled") return order.progressStatus === "Declined";
      return false;
    });
  };

  const mergeProductVariations = (products) => {
    const mergedProducts = {};

    products.forEach((product) => {
      const key = product.id;

      if (!mergedProducts[key]) {
        mergedProducts[key] = {
          name: product.name,
          price: product.price,
          coverImageUrl: product.coverImageUrl,
          quantities: [],
          sizes: [],
          colors: [],
        };
      }

      mergedProducts[key].quantities.push(product.quantity);
      mergedProducts[key].sizes.push(product.size);
      mergedProducts[key].colors.push(product.color);
    });

    return Object.values(mergedProducts).map((product) => ({
      ...product,
      quantity: product.quantities.reduce((acc, qty) => acc + qty, 0),
      size: Array.from(new Set(product.sizes)).join(", "),
      color: Array.from(new Set(product.colors)).join(", "),
    }));
  };

  const filteredOrders = filterOrdersByStatus(activeTab);

  const tabButtons = ["All", "Processing", "Shipped", "Completed", "Cancelled"];

  return (
    <div>
      <div className="sticky top-0 pb-2 bg-white w-full z-10">
        {/* Header Section */}
        <div className="flex p-3 py-3 items-center bg-white h-20 mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={() => navigate(-1)}
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
                    {order.progressStatus === "Out for Delivery" ? (
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

              {order.products ? (
                mergeProductVariations(Object.values(order.products)).map(
                  (product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <div className="flex items-center">
                        <img
                          src={
                            product.coverImageUrl ||
                            "https://via.placeholder.com/150"
                          }
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg mr-4"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-opensans">
                            {product.name}
                          </h4>
                          <p className="font-opensans text-md mt-2 text-black font-bold">
                            ₦
                            {product.price
                              ? product.price.toLocaleString()
                              : "0"}
                          </p>
                          <div className="flex items-center space-x-4 text-sm mt-2">
                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Size:
                              </span>{" "}
                              {product.size}
                            </p>
                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Color:
                              </span>{" "}
                              {product.color || "N/A"}
                            </p>
                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Qty:
                              </span>{" "}
                              {product.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )
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
                    ₦ {order.subTotal ? order.subTotal.toLocaleString() : "0"}
                  </span>
                </div>
                {order.serviceFee && (
                  <div className="flex justify-end">
                    <span className="text-sm font-opensans font-normal">
                      Service Fee:
                    </span>
                    <span className="text-sm font-opensans font-semibold ml-1">
                      ₦ {order.serviceFee.toLocaleString()}
                    </span>
                  </div>
                )}
                {order.bookingFee && (
                  <div className="flex justify-end">
                    <span className="text-sm font-opensans font-normal">
                      Booking Fee:
                    </span>
                    <span className="text-sm font-opensans font-semibold ml-1">
                      ₦ {order.bookingFee.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-end">
                  <span className="text-sm font-opensans font-normal">
                    Order Total:
                  </span>
                  <span className="text-sm font-opensans font-semibold ml-1">
                    ₦ {order.total ? order.total.toLocaleString() : "0"}
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

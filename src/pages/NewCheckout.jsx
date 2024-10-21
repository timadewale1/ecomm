import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearCart } from "../redux/actions/action";
import useAuth from "../custom-hooks/useAuth";
import { FaPen } from "react-icons/fa";

import { calculateServiceFee } from "../services/utilis";
import { createOrderAndReduceStock } from "../services/Services";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import Loading from "../components/Loading/Loading";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { CiCircleInfo } from "react-icons/ci";
import { RiSecurePaymentFill } from "react-icons/ri";
import { MdOutlineLock, MdSupportAgent } from "react-icons/md";
import { LiaShippingFastSolid, LiaTimesSolid } from "react-icons/lia";
import { FaCheck } from "react-icons/fa6";

const EditDeliveryModal = ({ userInfo, setUserInfo, onClose }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-lg px-3 py-3 rounded-t-2xl ">
      <div className="flex justify-between mt-3 items-center">
        <h2 className="text-xl font-opensans font-semibold">
          Edit Delivery Information
        </h2>
        <LiaTimesSolid className="text-2xl text-black" onClick={onClose} />
      </div>

      <form>
        <div className="flex flex-col mt-8 space-y-3">
          <div>
            <label className="font-opensans text-black">Name</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.displayName}
              onChange={(e) =>
                setUserInfo({ ...userInfo, displayName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Phone Number</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.phoneNumber}
              onChange={(e) =>
                setUserInfo({ ...userInfo, phoneNumber: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Email</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.email}
              onChange={(e) =>
                setUserInfo({ ...userInfo, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Address</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.address}
              onChange={(e) =>
                setUserInfo({ ...userInfo, address: e.target.value })
              }
            />
          </div>
        </div>

        <div className="border-t mt-4 border-gray-300 my-2"></div>

        <div className="flex mt-2 flex-col">
          <button
            type="button"
            className="bg-customOrange text-white h-12 font-semibold rounded-full font-opensans"
            onClick={onClose}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="bg-gray-100 text-black h-12 rounded-full font-semibold font-opensans mt-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const ShopSafelyModal = ({ onClose }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-lg ">
      <div className="bg-white px-3 py-4 w-full rounded-t-2xl max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Shop Safely and Sustainably</h1>
          <LiaTimesSolid
            className="text-2xl ml-2 cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Secure Payment */}
        <div className="flex items-start">
          <div className="w-16 flex flex-col items-center">
            <RiSecurePaymentFill className="text-3xl text-green-700" />
            <FaCheck className="text-green-700 mt-2" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm text-green-700 font-semibold font-opensans">
              Secure Your Payment
            </h3>
            <div className="mt-2">
              <p className="text-sm font-opensans text-black">
                Encrypted Transactions: Your data is always protected.
              </p>

              <p className="text-sm font-opensans text-black">
                Fraud Prevention: Transactions are monitored in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-4 border-gray-300 my-1"></div>

        {/* Security & Privacy */}
        <div className="flex items-start mt-3">
          <div className="w-16 flex flex-col items-center">
            <MdOutlineLock className="text-3xl text-green-700" />
            <FaCheck className="text-green-700 mt-2" />
          </div>
          <div className="ml-4 ">
            <h3 className="text-sm text-green-700 font-semibold font-opensans">
              Security & Privacy
            </h3>
            <div className="mt-2">
              <p className="text-sm font-opensans text-black">
                No Data Sharing: We will never share your information with third
                parties.
              </p>
              <p className="text-md font-opensans text-black">
                Your data is used solely to enhance your experience.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-4 border-gray-300 my-1"></div>

        {/* Secure Shipment */}
        <div className="flex items-start mt-3">
          <div className="w-16 flex flex-col items-center">
            <LiaShippingFastSolid className="text-3xl text-green-700" />
            <FaCheck className="text-green-700 mt-2" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm text-green-700 font-semibold font-opensans">
              Secure Shipment Guarantee
            </h3>
            <div className="mt-2">
              <p className="text-sm font-opensans text-black">
                Escrow Payments: Funds are held securely and released only after
                you confirm delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-4 border-gray-300 my-1"></div>

        {/* Customer Support */}
        <div className="flex items-start mt-3">
          <div className="w-16 flex flex-col items-center">
            <MdSupportAgent className="text-3xl text-green-700" />
            <FaCheck className="text-green-700 mt-2" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm text-green-700 font-semibold font-opensans">
              Customer Support
            </h3>
            <div className="mt-2">
              <p className="text-sm font-opensans text-black">
                Dedicated support team is available to assist with any issues
                related to your order, payment, or delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const Checkout = () => {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const note = searchParams.get("note") || "";

  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [showBookingFeeModal, setShowBookingFeeModal] = useState(false);
  const [vendorsInfo, setVendorsInfo] = useState({});
  const [userInfo, setUserInfo] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    address: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShopSafelyModal, setShowShopSafelyModal] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      toast.error("No vendor selected for checkout.");
      navigate("/latest-cart");
    }
  }, [vendorId, navigate]);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      try {
        if (!vendorId) return;

        const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
        if (vendorDoc.exists()) {
          setVendorsInfo({ [vendorId]: vendorDoc.data() });
        } else {
          console.warn(`Vendor with ID ${vendorId} does not exist.`);
        }
      } catch (error) {
        console.error("Error fetching vendor info:", error);
      }
    };

    fetchVendorInfo();
  }, [vendorId]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserInfo({
            displayName: userDoc.data().displayName || "",
            email: userDoc.data().email || "",
            phoneNumber: userDoc.data().phoneNumber || "",
            address: userDoc.data().address || "",
          });
        } else {
          console.warn("User document does not exist.");
        }
      }
    };

    fetchUserInfo();
  }, [currentUser]);

  const calculateVendorTotals = useCallback(() => {
    const totals = {};
    if (!vendorId || !cart[vendorId]) return totals;

    const vendorCart = cart[vendorId].products;
    let subTotal = 0;

    for (const productKey in vendorCart) {
      const product = vendorCart[productKey];
      subTotal += product.price * product.quantity;
    }

    const vendorMarketPlaceType = vendorsInfo[vendorId]?.marketPlaceType;

    let bookingFee = 0;
    if (vendorMarketPlaceType === "marketplace") {
      bookingFee = parseFloat((subTotal * 0.2).toFixed(2));
    }

    const serviceFee = parseFloat(calculateServiceFee(subTotal));
    const total = parseFloat((subTotal + bookingFee + serviceFee).toFixed(2));

    totals[vendorId] = {
      subTotal: subTotal.toLocaleString(),
      bookingFee: bookingFee.toLocaleString(),
      serviceFee: serviceFee.toLocaleString(),
      total: total.toLocaleString(),
    };

    return totals;
  }, [cart, vendorId, vendorsInfo]);

  const vendorTotals = calculateVendorTotals();

  const handleProceedToPayment = async () => {
    try {
      const userId = currentUser?.uid;
      const vendorCart = cart[vendorId].products;

      const { subTotal, bookingFee, serviceFee, total } =
        vendorTotals[vendorId];

      const orderId = await createOrderAndReduceStock(userId, vendorCart, {
        note,
        userInfo,
        subTotal,
        bookingFee,
        serviceFee,
        total,
      });

      dispatch(clearCart(vendorId));

      toast.success("Order placed successfully!");

      navigate(`/payment-approve?orderId=${orderId}`);

      setTimeout(() => {
        navigate("/user-orders", { state: { fromPaymentApprove: true } });
      }, 2000);
    } catch (error) {
      toast.error("Failed to create order. Please try again.");
      console.error("Error in handleProceedToPayment:", error);
    }
  };

  const handlePaystackPayment = (amount, onSuccessCallback) => {
    if (loading) {
      toast.info("Checking authentication status...");
      return;
    }

    if (!currentUser) {
      toast.error("User is not logged in");
      return;
    }
  };

  const handleVendorPayment = async (paymentType) => {
    const fees = vendorTotals[vendorId];
    let amountToPay = 0;

    if (paymentType === "booking") {
      amountToPay = parseFloat(fees.bookingFee) + parseFloat(fees.serviceFee);
    } else if (paymentType === "full") {
      amountToPay = parseFloat(fees.total);
    }

    handlePaystackPayment(amountToPay, async () => {
      try {
        const userId = currentUser.uid;
        const vendorCart = cart[vendorId].products;

        await createOrderAndReduceStock(userId, vendorId, vendorCart, {
          userInfo,
          paymentType,
        });

        dispatch(clearCart(vendorId));
        toast.success(`Order placed successfully for vendor ${vendorId}!`);

        navigate("/payment-approve", {
          state: { vendorId, totalPrice: fees.total, userInfo },
        });

        setTimeout(() => {
          navigate("/user-orders");
        }, 3000);
      } catch (error) {
        console.error("Error placing order:", error);
        toast.error(
          "An error occurred while placing the order. Please try again."
        );
      }
    });
  };

  const groupProductsById = (products) => {
    const groupedProducts = {};

    for (const productKey in products) {
      const product = products[productKey];
      const id = product.id;

      if (groupedProducts[id]) {
        groupedProducts[id].quantity += product.quantity;

        // Add size if not already present
        if (
          product.selectedSize &&
          !groupedProducts[id].sizes.includes(product.selectedSize)
        ) {
          groupedProducts[id].sizes.push(product.selectedSize);
        }

        // Add color if not already present
        if (
          product.selectedColor &&
          !groupedProducts[id].colors.includes(product.selectedColor)
        ) {
          groupedProducts[id].colors.push(product.selectedColor);
        }
      } else {
        groupedProducts[id] = {
          ...product,
          quantity: product.quantity,
          sizes: product.selectedSize ? [product.selectedSize] : [],
          colors: product.selectedColor ? [product.selectedColor] : [],
        };
      }
    }

    return Object.values(groupedProducts);
  };

  const handleBookingFeePayment = (e) => {
    e.preventDefault();
    window.confirm(
      "The booking fee, exclusive to marketplace vendors, is a 20% charge on your subtotal that guarantees your items are packaged and reserved for pickup. Once the vendor accepts your order, they will securely hold your items, ensuring they're ready for collection at your convenience."
    );
    handleVendorPayment("booking");
  };

  const handleServiceFeeInfo = () => {
    window.confirm(
      "The service fee is a small, dynamic charge that helps cover our operational costs, like keeping the platform running smoothly and ensuring you have the best shopping experience. Rest assured, it’s capped at a maximum amount to keep things fair and transparent. We aim to keep the fee minimal while providing top-notch service!"
    );
  };

  const handleFullDeliveryPayment = (e) => {
    e.preventDefault();
    handleVendorPayment("full");
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  if (!currentUser) {
    return <div>Please log in to view your cart.</div>;
  }

  return (
    <div className="bg-gray-100 pb-12">
      <div className="flex p-3 py-3 items-center sticky top-0 bg-white w-full h-20 shadow-md z-10 mb-3 pb-2">
        <GoChevronLeft
          className="text-3xl cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="text-xl font-opensans ml-5 font-semibold">Checkout</h1>
      </div>
      <div className="px-3">
        <div className="mt-4 px-4 w-full py-4 rounded-lg bg-white ">
          <h1 className="text-black font-semibold font-opensans text-lg ">
            Order Summary
          </h1>
          <div className="border-t border-gray-300 my-2"></div>
          <div className="flex justify-between">
            <label className="block mb-2 font-opensans ">Sub-Total</label>
            <p className="text-lg font-opensans text-black font-semibold">
              ₦{vendorTotals[vendorId]?.subTotal}
            </p>
          </div>

          {vendorsInfo[vendorId]?.marketPlaceType === "marketplace" && (
            <div className="flex justify-between">
              <label className="block mb-2 font-opensans">
                Booking Fee
                <CiCircleInfo
                  className="inline ml-2 text-customOrange cursor-pointer"
                  onClick={handleBookingFeePayment}
                />
              </label>
              <p className="text-lg font-opensans text-black font-semibold">
                ₦{vendorTotals[vendorId]?.bookingFee}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <label className="block mb-2 font-opensans">
              Service Fee
              <CiCircleInfo
                className="inline ml-2 text-customOrange cursor-pointer"
                onClick={handleServiceFeeInfo}
              />
            </label>
            <p className="text-lg font-opensans text-black font-semibold">
              ₦{vendorTotals[vendorId]?.serviceFee}
            </p>
          </div>
          <div className="border-t mt-3 border-gray-300 my-2"></div>
          <div className="flex justify-between mt-2">
            <label className="block mb-2 font-opensans text-lg font-semibold">
              Total
            </label>
            <p className="text-lg font-opensans text-black font-semibold">
              ₦{vendorTotals[vendorId]?.total}
            </p>
          </div>
        </div>

        <div className="mt-2">
          <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
            <div className="flex justify-between items-center">
              <h1 className="text-black font-semibold font-opensans text-lg">
                Delivery Information
              </h1>
              <FaPen
                className="text-black cursor-pointer"
                onClick={() => setShowEditModal(true)}
              />
            </div>

            <div className="border-t border-gray-300 my-2"></div>

            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Name:
              </label>
              <p className="font-opensans text-black">{userInfo.displayName}</p>
            </div>
            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Phone Number:
              </label>
              <p className="font-opensans text-black ">
                {userInfo.phoneNumber}
              </p>
            </div>
            <div className="flex">
              <label className="block mb-2 font-semibold mr-1 font-opensans">
                Email:
              </label>
              <p className="font-opensans text-black">{userInfo.email}</p>
            </div>
            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Address:
              </label>
              <p className="font-opensans text-black ">{userInfo.address}</p>
            </div>
          </div>
        </div>

        <form className="bg-white mt-3 p-3 rounded-lg shadow-md">
          {vendorId && cart[vendorId] && (
            <>
              <div className="flex justify-between">
                <h1 className="text-black font-semibold font-opensans text-lg">
                  Shipment
                </h1>
                <h3 className="text-sm">
                  <span className="text-gray-400 text-sm font-opensans">
                    From:
                  </span>
                  {vendorsInfo[vendorId]?.shopName?.length > 8
                    ? `${vendorsInfo[vendorId]?.shopName.slice(0, 8)}...`
                    : vendorsInfo[vendorId]?.shopName || `Vendor ${vendorId}`}
                </h3>
              </div>

              <div className="mt-2 border-t ">
                {groupProductsById(cart[vendorId].products).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-4 border-b"
                  >
                    <div className="flex items-center">
                      <img
                        src={
                          product.selectedImageUrl ||
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
                          ₦{product.price.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-4 text-sm mt-2 ">
                          <p className="text-black font-semibold font-opensans">
                            <span className="font-normal text-gray-600">
                              Size:
                            </span>{" "}
                            {product.sizes.join(", ") || "N/A"}
                          </p>
                          <p className="text-black font-semibold font-opensans">
                            <span className="font-normal text-gray-600">
                              Color:
                            </span>{" "}
                            {product.colors.join(", ") || "N/A"}
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
                ))}
              </div>
            </>
          )}
        </form>

        <div className="mt-2">
          <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
            <div
              onClick={() => setShowShopSafelyModal(true)}
              className="flex justify-between items-center"
            >
              <h1 className="text-black font-semibold font-opensans text-lg">
                Shop safely and sustainably
              </h1>
              <GoChevronRight className="text-black text-2xl cursor-pointer" />
            </div>

            <div className="border-t border-gray-300 my-2"></div>

            <div className="flex mt-3 -mx-2 space-x-0.5">
              <div className="flex items-center flex-col">
                <RiSecurePaymentFill className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Secure your payment
                </p>
              </div>
              <div className="flex items-center flex-col">
                <MdOutlineLock className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Security & Privacy
                </p>
              </div>
              <div className="flex items-center flex-col">
                <LiaShippingFastSolid className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Secure Shipment Guarantee
                </p>
              </div>
              <div className="flex items-center flex-col">
                <MdSupportAgent className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Customer Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditDeliveryModal
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Shop Safely Modal */}
      {showShopSafelyModal && (
        <ShopSafelyModal onClose={() => setShowShopSafelyModal(false)} />
      )}
      <div className="fixed bottom-0 left-0 right-0 p-3  bg-white shadow-lg">
        <button
          onClick={handleProceedToPayment}
          className="w-full bg-customOrange h-12 text-white text-lg font-semibold font-opensans rounded-full"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );
};

export default Checkout;

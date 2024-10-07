import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearCart, removeFromCart } from "../redux/actions/action";
import useAuth from "../custom-hooks/useAuth";
import { IoLocation } from "react-icons/io5";
import GooglePlacesAutocomplete from "../components/Google";
import { FaInfoCircle, FaAngleLeft } from "react-icons/fa";
import BookingFeeModal from "../components/BookingFee";
import { calculateServiceFee } from "./VendorCompleteProfile/utilis";
import { createOrderAndReduceStock } from "../services/Services";
import { getDoc, doc,  } from "firebase/firestore";
import { db } from "../firebase.config";
import Loading from "../components/Loading/Loading";
const Checkout = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [deliveryInfo, setDeliveryInfo] = useState({ address: "" });
  const [showBookingFeeModal, setShowBookingFeeModal] = useState(false);
  const [vendorsInfo, setVendorsInfo] = useState({}); // Store vendor-specific info

  // Fetch vendor information if needed (e.g., for fee calculations)
  useEffect(() => {
    const fetchVendorsInfo = async () => {
      try {
        const vendorIds = Object.keys(cart);
        const newVendorsInfo = { ...vendorsInfo };

        for (const vendorId of vendorIds) {
          if (!newVendorsInfo[vendorId]) {
            // Assuming you have a function to fetch vendor info
            // Replace with your actual data fetching logic
            const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
            if (vendorDoc.exists()) {
              newVendorsInfo[vendorId] = vendorDoc.data();
            } else {
              console.warn(`Vendor with ID ${vendorId} does not exist.`);
            }
          }
        }

        setVendorsInfo(newVendorsInfo);
      } catch (error) {
        console.error("Error fetching vendors info:", error);
      }
    };

    if (Object.keys(cart).length > 0) {
      fetchVendorsInfo();
    }
  }, [cart]);

  // Calculate total prices per vendor
  const calculateVendorTotals = useCallback(() => {
    const totals = {};

    for (const vendorId in cart) {
      const vendorCart = cart[vendorId].products;
      let subTotal = 0;

      for (const productKey in vendorCart) {
        const product = vendorCart[productKey];
        subTotal += product.price * product.quantity;
      }

      const bookingFee = (subTotal * 0.2).toFixed(2);
      const serviceFee = calculateServiceFee(subTotal);
      const total = (
        parseFloat(subTotal) +
        parseFloat(bookingFee) +
        parseFloat(serviceFee)
      ).toFixed(2);

      totals[vendorId] = {
        subTotal: subTotal.toFixed(2),
        bookingFee,
        serviceFee,
        total,
      };
    }

    return totals;
  }, [cart]);

  const vendorTotals = calculateVendorTotals();

  const handleSelectPlace = (place) => {
    setDeliveryInfo({ ...deliveryInfo, address: place });
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

    // Implement your Paystack payment logic here
    // After successful payment, call onSuccessCallback
  };

  // Handle payment for a specific vendor
  const handleVendorPayment = async (vendorId, paymentType) => {
    // paymentType: 'booking' or 'full'

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
          address: deliveryInfo.address,
          paymentType,
        });

        dispatch(clearCart(vendorId));
        toast.success(`Order placed successfully for vendor ${vendorId}!`);

        // Optionally navigate to a confirmation page
        navigate("/payment-approve", {
          state: { vendorId, totalPrice: fees.total, deliveryInfo },
        });

        // Redirect after a delay
        setTimeout(() => {
          navigate("/newhome");
        }, 3000);
      } catch (error) {
        console.error("Error placing order:", error);
        toast.error(
          "An error occurred while placing the order. Please try again."
        );
      }
    });
  };

  const handleBookingFeePayment = (e, vendorId) => {
    e.preventDefault();
    handleVendorPayment(vendorId, "booking");
  };

  const handleFullDeliveryPayment = (e, vendorId) => {
    e.preventDefault();
    handleVendorPayment(vendorId, "full");
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
          )
            .then((response) => response.json())
            .then((data) => {
              if (data.results && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                setDeliveryInfo({ ...deliveryInfo, address });
              }
            })
            .catch((error) => {
              console.error("Error fetching address:", error);
            });
        },
        (error) => {
          console.error("Error getting current location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  };

  // Calculate overall total if needed
  const calculateOverallTotal = () => {
    let overallTotal = 0;
    for (const vendorId in vendorTotals) {
      overallTotal += parseFloat(vendorTotals[vendorId].total);
    }
    return overallTotal.toFixed(2);
  };

  const overallTotal = calculateOverallTotal();

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
    <div className="p-4">
      <div className="flex items-center mb-4">
        <FaAngleLeft
          className="text-2xl cursor-pointer mr-4"
          onClick={() => navigate(-1)}
        />
        <h1 className="font-ubuntu text-black text-2xl">Checkout</h1>
      </div>
      <form className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold font-ubuntu mb-4">
          Delivery Information
        </h2>
        <div className="relative">
          <label className="block mb-2 font-semibold">Address</label>
          <GooglePlacesAutocomplete onPlaceSelected={handleSelectPlace} />
          <IoLocation
            className="absolute right-3 text-gray-400 top-10 text-xl cursor-pointer"
            onClick={handleGetCurrentLocation}
          />
        </div>

        {/* Iterate over each vendor in the cart */}
        {Object.keys(cart).map((vendorId) => {
          const vendorCart = cart[vendorId].products;
          const fees = vendorTotals[vendorId];
          const vendorInfo = vendorsInfo[vendorId] || {};

          return (
            <div
              key={vendorId}
              className="mt-6 border-t pt-4"
            >
              <h3 className="text-xl font-semibold mb-2">
                Vendor: {vendorInfo.vendorName || `Vendor ${vendorId}`}
              </h3>
              {/* Order Summary */}
              {Object.values(vendorCart).map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center bg-gray-100 w-full border-b py-3 rounded-lg mb-2"
                >
                  <div className="flex items-center">
                    <img
                      src={product.selectedImageUrl || "https://via.placeholder.com/150"}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg mr-4"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                    <div>
                      <h4 className="text-lg font-semibold font-poppins">
                        {product.name}
                      </h4>
                      <p className="text-green-600 font-poppins font-medium text-md">
                        ₦{product.price.toFixed(2)}
                      </p>
                      <p className="text-gray-600 font-poppins font-medium text-xs">
                        Size: {product.selectedSize || product.size}
                      </p>
                      <p className="text-gray-600 font-medium text-xs">
                        Quantity: {product.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Fees and Total */}
              <div className="mt-4">
                <div className="flex justify-between">
                  <label className="block mb-2 font-poppins font-semibold">
                    Sub-Total
                  </label>
                  <p className="text-lg font-poppins text-black font-medium">
                    ₦{fees.subTotal}
                  </p>
                </div>
                <div className="flex justify-between">
                  <label className="block mb-2 font-poppins font-semibold">
                    Booking Fee
                    <FaInfoCircle
                      className="inline ml-2 text-gray-400 cursor-pointer"
                      onClick={() => setShowBookingFeeModal(true)}
                    />
                  </label>
                  <p className="text-lg font-poppins text-black font-medium">
                    ₦{fees.bookingFee}
                  </p>
                </div>
                <div className="flex justify-between">
                  <label className="block mb-2 font-poppins font-semibold">
                    Service Fee
                  </label>
                  <p className="text-lg font-poppins text-black font-medium">
                    ₦{fees.serviceFee}
                  </p>
                </div>
                <div className="flex justify-between mt-2">
                  <label className="block mb-2 font-poppins font-semibold">
                    Total
                  </label>
                  <p className="text-lg font-poppins text-black font-medium">
                    ₦{fees.total}
                  </p>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={(e) => handleBookingFeePayment(e, vendorId)}
                  className="w-1/2 px-4 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-colors duration-300 font-ubuntu"
                >
                  Pay Booking Fee
                </button>
                <button
                  onClick={(e) => handleFullDeliveryPayment(e, vendorId)}
                  className="w-1/2 px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 transition-colors duration-300 font-ubuntu"
                >
                  Pay for Full Delivery
                </button>
              </div>
            </div>
          );
        })}

        {/* Overall Total */}
        {Object.keys(cart).length > 1 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-xl font-semibold mb-2">Overall Total</h3>
            <div className="flex justify-between">
              <label className="block mb-2 font-poppins font-semibold">
                Grand Total
              </label>
              <p className="text-lg font-poppins text-black font-medium">
                ₦{overallTotal}
              </p>
            </div>
          </div>
        )}

        {/* Payment Buttons for Overall Checkout (Optional) */}
        {/* If you prefer to have a single payment option for all vendors combined, you can uncomment and use the following */}
        {Object.keys(cart).length > 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              // Implement overall payment logic here
              toast.info("Please complete payments for each vendor separately.");
            }}
            className="w-full px-4 py-2 mt-6 bg-purple-500 text-white rounded-md shadow-sm hover:bg-purple-600 transition-colors duration-300 font-ubuntu"
          >
            Pay All
          </button>
        )}
      </form>

      {/* Booking Fee Information Modal */}
      {showBookingFeeModal && (
        <BookingFeeModal onClose={() => setShowBookingFeeModal(false)} />
      )}
    </div>
  );
};

export default Checkout;

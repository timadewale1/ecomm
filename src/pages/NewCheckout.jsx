import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearCart } from "../redux/actions/action";
import useAuth from "../custom-hooks/useAuth";
import { IoLocation } from "react-icons/io5";
import GooglePlacesAutocomplete from "../components/Google";
import { FaInfoCircle, FaAngleLeft } from "react-icons/fa";
import BookingFeeModal from "../components/BookingFee";
import { calculateServiceFee } from "./VendorCompleteProfile/utilis";
import { createOrderAndReduceStock } from "../services/Services"; // Import the function

const Checkout = () => {
  const cart = useSelector((state) => state.cart);
  const [totalPrice, setTotalPrice] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser, loading } = useAuth();
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: "",
  });
  const [showBookingFeeModal, setShowBookingFeeModal] = useState(false);

  useEffect(() => {
    const calculateTotalPrice = () => {
      let total = 0;
      for (const productId in cart) {
        total += cart[productId].price * cart[productId].quantity;
      }
      setTotalPrice(total);
    };

    calculateTotalPrice();
  }, [cart]);

  const bookingFee = (totalPrice * 0.2).toFixed(2);
  const serviceFee = calculateServiceFee(totalPrice);
  const total = (parseFloat(totalPrice) + parseFloat(bookingFee) + parseFloat(serviceFee)).toFixed(2);

  const handleSelectPlace = (place) => {
    setDeliveryInfo({ ...deliveryInfo, address: place });
  };

  const handleBookingFeePayment = async (e) => {
    e.preventDefault();

    if (loading) {
      toast.info("Checking authentication status...");
      return;
    }

    if (!currentUser) {
      toast.error("User is not logged in");
      return;
    }

    try {
      const userId = currentUser.uid; // Ensure the userId is defined
      console.log("Placing order for user:", userId);
      console.log("Cart:", cart);
      await createOrderAndReduceStock(userId, cart);
      dispatch(clearCart());
      navigate("/payment-approve", {
        state: { totalPrice, deliveryInfo },
      });
      toast.success(`Order placed successfully!`);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("An error occurred while placing the order. Please try again.");
    }
  };

  const handleFullDeliveryPayment = async (e) => {
    e.preventDefault();

    if (loading) {
      toast.info("Checking authentication status...");
      return;
    }

    if (!currentUser) {
      toast.error("User is not logged in");
      return;
    }

    try {
      const userId = currentUser.uid; // Ensure the userId is defined
      console.log("Placing order for user:", userId);
      console.log("Cart:", cart);
      await createOrderAndReduceStock(userId, cart);
      dispatch(clearCart());
      navigate("/payment-approve", {
        state: { totalPrice, deliveryInfo },
      });
      toast.success(`Order placed successfully!`);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("An error occurred while placing the order. Please try again.");
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Use reverse geocoding to get the address from latitude and longitude
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

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <FaAngleLeft
          className="text-2xl cursor-pointer mr-4"
          onClick={() => navigate(-1)}
        />
        <h1 className="font-ubuntu text-black text-2xl">Checkout</h1>
      </div>
      <form className="bg-white mt-8">
        <h2 className="text-lg font-semibold font-ubuntu mb-2">Order summary</h2>
        {Object.values(cart).map((product) => (
          <div
            key={product.id}
            className="flex justify-between items-center bg-gray-100 w-full border-b py-3 rounded-lg mb-2"
          >
            <div className="flex items-center">
              <img
                src={product.selectedImageUrl}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-lg mr-4"
              />
              <div>
                <h3 className="text-lg font-semibold font-poppins">
                  {product.name}
                </h3>
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
        <div className="mt-4 relative">
          <label className="block mb-2 font-semibold">Address</label>
          <GooglePlacesAutocomplete onPlaceSelected={handleSelectPlace} />
          <IoLocation
            className="absolute right-3 text-gray-400 top-10 text-xl cursor-pointer"
            onClick={handleGetCurrentLocation}
          />
        </div>
        <div className="mt-4 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">Sub-Total</label>
          <p className="text-lg font-poppins text-black font-medium">₦{totalPrice.toFixed(2)}</p>
        </div>
        <div className="mt-1 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">
            Booking Fee
            <FaInfoCircle
              className="inline ml-2 text-gray-400 cursor-pointer"
              onClick={() => setShowBookingFeeModal(true)}
            />
          </label>
          <p className="text-lg font-poppins text-black font-medium">₦{bookingFee}</p>
        </div>
        <div className="mt-1 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">Service Fee</label>
          <p className="text-lg font-poppins text-black font-medium">₦{serviceFee}</p>
        </div>
        <div className="mt-1 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">Total</label>
          <p className="text-lg font-poppins text-black font-medium">₦{total}</p>
        </div>
        <button
          onClick={handleBookingFeePayment}
          className="w-full px-4 py-2 mb-4 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-colors duration-300 font-ubuntu"
        >
          Pay Booking Fee
        </button>
        <button
          onClick={handleFullDeliveryPayment}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 transition-colors duration-300 font-ubuntu"
        >
          Pay for Full Delivery
        </button>
      </form>

      {showBookingFeeModal && (
        <BookingFeeModal onClose={() => setShowBookingFeeModal(false)} />
      )}
    </div>
  );
};

export default Checkout;

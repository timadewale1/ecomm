import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Checkout = () => {
  const cart = useSelector((state) => state.cart);
  const [totalPrice, setTotalPrice] = useState(0);
  const navigate = useNavigate();
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo({ ...deliveryInfo, [name]: value });
  };

  const handleBookingFeePayment = (e) => {
    e.preventDefault();
    navigate("/newcheckout/bookingfee", {
      state: { totalPrice, deliveryInfo },
    });
  };

  const handleFullDeliveryPayment = (e) => {
    e.preventDefault();
    navigate("/newcheckout/fulldelivery", {
      state: { totalPrice, deliveryInfo },
    });
  };

  return (
    <div className="checkout-container">
      <h1 className="text-center font-ubuntu mb-4 text-black text-2xl">
        Checkout
      </h1>
      <form className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Name</label>
          <input
            type="text"
            name="name"
            value={deliveryInfo.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Email</label>
          <input
            type="email"
            name="email"
            value={deliveryInfo.email}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Address</label>
          <input
            type="text"
            name="address"
            value={deliveryInfo.address}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">City</label>
          <input
            type="text"
            name="city"
            value={deliveryInfo.city}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Postal Code</label>
          <input
            type="text"
            name="postalCode"
            value={deliveryInfo.postalCode}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Country</label>
          <input
            type="text"
            name="country"
            value={deliveryInfo.country}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Total Price</label>
          <p className="text-lg font-semibold text-green-600">₦{totalPrice}</p>
        </div>
        {Object.values(cart).map((product) => (
          <div
            key={product.id}
            className="flex justify-between items-center border-b py-2 mb-2"
          >
            <div className="flex items-center">
              <img
                src={product.selectedImageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg mr-4"
              />
              <div>
                <h3 className="text-md font-semibold font-poppins">
                  {product.name}
                </h3>
                <p className="text-green-600 font-lato text-lg">
                  ₦{product.price}
                </p>
                <p className="text-gray-600 font-medium text-xs">
                  Size: {product.selectedSize || product.size}
                </p>
                <p className="text-gray-600 font-medium text-xs">
                  Quantity: {product.quantity}
                </p>
              </div>
            </div>
          </div>
        ))}

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
    </div>
  );
};

export default Checkout;

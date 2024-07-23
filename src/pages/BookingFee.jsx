import React from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import PaystackPop from "@paystack/inline-js";

const BookingFee = () => {
  const location = useLocation();
  const { totalPrice, deliveryInfo } = location.state;
  const bookingFee = (totalPrice * 0.15).toFixed(2);

  const handlePaystackPayment = () => {
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: "public-key",
      email: deliveryInfo.email,
      amount: bookingFee * 100, // Paystack amount is in Kobo
      onSuccess: (transaction) => {
        toast.success(
          `Payment successful! Reference: ${transaction.reference}`
        );
        // Handle post-payment logic here
      },
      onCancel: () => {
        toast.error("Payment cancelled");
      },
    });
  };

  return (
    <div className="booking-fee-container">
      <h1 className="text-center font-ubuntu mb-4 text-black text-2xl">
        Booking Fee Payment
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="mb-4">
          The booking fee is 15% of the total price of the items in your cart.
        </p>
        <p className="text-lg font-semibold text-green-600 mb-4">
          Booking Fee: ₦{bookingFee}
        </p>
        <button
          onClick={handlePaystackPayment}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-colors duration-300 font-ubuntu"
        >
          Pay Booking Fee
        </button>
      </div>
    </div>
  );
};

export default BookingFee;

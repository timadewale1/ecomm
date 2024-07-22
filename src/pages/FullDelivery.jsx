import React from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import PaystackPop from "@paystack/inline-js";

const FullDelivery = () => {
  const location = useLocation();
  const { totalPrice, deliveryInfo } = location.state;

  const handlePaystackPayment = () => {
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: "public-key",
      email: deliveryInfo.email,
      amount: totalPrice * 100, // Paystack amount is in Kobo
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
    <div className="full-delivery-container">
      <h1 className="text-center font-ubuntu mb-4 text-black text-2xl">
        Full Delivery Payment
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-lg font-semibold text-green-600 mb-4">
          Total Price: ₦{totalPrice}
        </p>
        <button
          onClick={handlePaystackPayment}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 transition-colors duration-300 font-ubuntu"
        >
          Pay for Full Delivery
        </button>
      </div>
    </div>
  );
};

export default FullDelivery;

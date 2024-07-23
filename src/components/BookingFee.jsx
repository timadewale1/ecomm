import React from "react";
import { FaTimes } from "react-icons/fa";

const BookingFeeModal = ({ onClose }) => {
  return (
    <div className="fixed p-4 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <FaTimes
          className="absolute top-2 bg-gray-400 rounded-md right-2 text-black cursor-pointer"
          onClick={onClose}
        />
        <h2 className="text-xl font-semibold mb-4">What is Booking Fee?</h2>
        <p className="font-ubuntu text-center">
          The booking fee is a 20% charge of the product subtotal, ensuring
          vendors reserve your items for up to 3 days. If the transaction is not
          completed within this period, the fee is refunded. This fee helps
          maintain inventory and guarantees item availability.
        </p>
      </div>
    </div>
  );
};

export default BookingFeeModal;

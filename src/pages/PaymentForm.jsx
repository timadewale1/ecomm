// PaymentForm.jsx
import React, { useState } from "react";
import CommonSection from "../components/UI/CommonSection";
import Helmet from "../components/Helmet/Helmet";

const PaymentForm = () => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // logic to process payment and place the order
    alert("Order placed! (Simulated for Pay Now with payment form)");
    // Redirect to success page
    // history.push("/order-success");
  };

  return (
    <Helmet title="Payment Form">
      <CommonSection title="Payment Form" />
      <form onSubmit={handleSubmit}>
        <h2>Payment Form</h2>
        <label>
          Card Number:
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
          />
        </label>
        <label>
          Expiry Date:
          <input
            type="text"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            required
          />
        </label>
        <label>
          CVV:
          <input
            type="text"
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            required
          />
        </label>
        <button type="submit">Submit Payment</button>
      </form>
    </Helmet>
  );
};

export default PaymentForm;

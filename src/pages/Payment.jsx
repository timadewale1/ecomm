// // PaymentPage.jsx
// import React, { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import PaymentForm from "./PaymentForm"; // Create a PaymentForm component for payment details
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-toastify";
// import { db } from "../firebase.config"; // Import db and storage from firebase.config
// import { collection, addDoc } from "firebase/firestore";
// import { cartActions } from "../redux/slices/cartSlice";
// import { useDispatch } from "react-redux";
// import Helmet from "../components/Helmet/Helmet";
// import CommonSection from "../components/UI/CommonSection";

// const PaymentPage = () => {
//   const [paymentMethod, setPaymentMethod] = useState(null);
//   const [isPaymentFormSubmitted, setIsPaymentFormSubmitted] = useState(false);
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const handlePayNow = async () => {
//     setPaymentMethod("payNow");
//   };
//   useEffect(() => {
//     // Scroll to the top when the component mounts
//     window.scrollTo(0, 0);
//   }, []);

//   const handlePayOnDelivery = () => {
//     setPaymentMethod("payOnDelivery");
//     placeOrder("Pay on Delivery");
//   };

//   const handlePaymentFormSubmit = async () => {
//     // Additional validation can be added for the payment form fields
//     setIsPaymentFormSubmitted(true);
//     placeOrder("Pay Now");
//   };

//   const placeOrder = async (paymentType) => {
//     // Retrieve order details from session storage
//     const orderDetails = JSON.parse(
//       sessionStorage.getItem("orderDetails") || "{}"
//     );

//     try {
//       const billingInfo = orderDetails?.billingInfo || {};
//       if (!billingInfo || Object.keys(billingInfo).length === 0) {
//         throw new Error("Billing information is missing.");
//       }
//       // Add the order to Firebase Firestore
//       const docRef = await collection(db, "orders");
//       await addDoc(docRef, orderDetails);

//       // Reset the cart after placing the order
//       // dispatch(cartActions.resetCart());

//       // Simulate placing an order
//       toast.success(`Order placed!`);

//       // Clear the order details from session storage
//       sessionStorage.removeItem("orderDetails");

//       // Redirect to home page
//       navigate("/home");
//       dispatch(cartActions.resetCart());
//     } catch (error) {
//       console.error("Error placing order:", error);
//       // Handle error or show a message to the user
//       toast.error(`Error placing order for ${paymentType}. Please try again.`);
//     }
//   };

//   return (
//     <Helmet title="payment page">
//       <CommonSection title="Payment Page" />
//       <div>
//         <h1>Payment Page</h1>
//         <motion.button
//           whileTap={{ scale: 1.2 }}
//           className="buy__btn auth__btn"
//           onClick={handlePayNow}
//         >
//           Pay Now
//         </motion.button>
//         <motion.button
//           whileTap={{ scale: 1.2 }}
//           className="buy__btn auth__btn"
//           onClick={handlePayOnDelivery}
//         >
//           Pay on Delivery
//         </motion.button>

//         {paymentMethod === "payNow" && !isPaymentFormSubmitted && (
//           <PaymentForm onSubmit={handlePaymentFormSubmit} />
//         )}
//       </div>
//     </Helmet>
//   );
// };

// export default PaymentPage;

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { httpsCallable } from "firebase/functions";
import { useDispatch } from "react-redux";
import { clearCart } from "../redux/actions/action";
import Loading from "../components/Loading/Loading";
import { functions } from "../firebase.config";

const PaymentApprove = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVerified, setHasVerified] = useState(false);

  const handlePaymentVerification = async () => {
    console.log("handlePaymentVerification: Function invoked");

    try {
      const params = new URLSearchParams(location.search);
      const reference = params.get("reference");
      console.log("handlePaymentVerification: Extracted reference:", reference);

      if (!reference) {
        console.error("handlePaymentVerification: No reference in URL.");
        setStatus("error");
        setLoading(false);
        return;
      }

      console.log(
        "handlePaymentVerification: Proceeding with verification for reference:",
        reference
      );

      const verifyUrl = `https://mythrift-payments.fly.dev/api/v1/orderStatus/${reference}`;
      console.log(
        "handlePaymentVerification: Making GET request to:",
        verifyUrl
      );

      const response = await axios.get(verifyUrl, {
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_RESOLVE_TOKEN}`,
          Accept: "application/json",
        },
      });

      console.log(
        "handlePaymentVerification: Response received from API:",
        response.data
      );
      const { status: payStatus } = response.data;

      if (payStatus === "success") {
        console.log(
          "handlePaymentVerification: Payment successful, updating order and stock..."
        );

        const updateOrderFn = httpsCallable(
          functions,
          "updateOrderStatusAndStock"
        );
        const result = await updateOrderFn({ reference });
        console.log(
          "handlePaymentVerification: Result from updateOrderStatusAndStock:",
          result.data
        );

        if (result.data && result.data.success) {
          console.log(
            "handlePaymentVerification: Order creation and stock adjustment successful!"
          );

          // Extract vendorId from the result
          const vendorId = result.data.vendorId;
          console.log(
            `handlePaymentVerification: Extracted vendorId: ${vendorId}`
          );

          if (vendorId) {
            console.log(
              `handlePaymentVerification: Dispatching clearCart for vendorId: ${vendorId}`
            );
            dispatch(clearCart(vendorId));

            console.log("handlePaymentVerification: clearCart dispatched");
          } else {
            console.warn(
              "handlePaymentVerification: No vendorId received from backend response"
            );
          }

          setStatus("success");
        } else {
          console.error(
            "handlePaymentVerification: Stock adjustment failed:",
            result.data
          );
          setStatus("error");
        }
      } else {
        console.warn(
          "handlePaymentVerification: Payment not successful, status:",
          payStatus
        );
        setStatus("failed");
      }
    } catch (error) {
      console.error(
        "handlePaymentVerification: Error during verification:",
        error
      );
      setStatus("error");
    } finally {
      console.log("handlePaymentVerification: Final status:", status);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect: Checking hasVerified state");
    if (hasVerified) {
      console.log(
        "useEffect: Already verified, not calling handlePaymentVerification again"
      );
      return;
    }
    console.log(
      "useEffect: Setting hasVerified to true and calling handlePaymentVerification"
    );
    setHasVerified(true);
    handlePaymentVerification();
  }, [hasVerified, location.search]);

  // Handle navigation on success
  useEffect(() => {
    if (status === "success") {
      console.log("Navigating to /user-orders because status is success");
      navigate("/user-orders");
    }
  }, [status, navigate]);

  console.log(
    "PaymentApprove: Render with status:",
    status,
    "and loading:",
    loading
  );

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="font-opensans justify-center flex items-center text-center px-12">
        <p className="text-sm translate-y-60 text-gray-800">
          Payment successful. Order placed successfully.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="font-opensans justify-center flex items-center text-center px-12">
        <p className="text-sm translate-y-60 text-gray-800">
          Payment failed, please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="font-opensans justify-center flex items-center text-center px-12">
      <p className="text-sm translate-y-60 text-gray-800">
        An error occurred. Order flow was lost. Please contact support.
      </p>
    </div>
  );
};

export default PaymentApprove;

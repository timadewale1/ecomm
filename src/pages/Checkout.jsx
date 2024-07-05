import React from "react";

import { Container, Row, Col, Form, FormGroup } from "reactstrap";
import Helmet from "../components/Helmet/Helmet";
import CommonSection from "../components/UI/CommonSection";
import "../styles/checkout.css";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { cartActions } from "../redux/slices/cartSlice";
import { auth, db, storage } from "../firebase.config"; // Import db and storage from firebase.config
import { collection, addDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = auth.currentUser;
  const userId = user ? user.uid : null;

  const cartItems = useSelector((state) =>
    userId ? state.cart.userCarts[userId] : []
  );

  const totalAmount = useSelector((state) =>
    userId ? state.cart.totalAmount : 0
  );
  const totalQuantity =
    cartItems?.reduce((total, item) => total + item.quantity, 0) || 0;

  const [billingInfo, setBillingInfo] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    postalCode: "",
    extraNote: "",
  });
  useEffect(() => {
    // Scroll to the top when the component mounts
    window.scrollTo(0, 0);
  }, []);

  const handleBillingInfoChange = (e) => {
    const { name, value } = e.target;
    setBillingInfo((prevInfo) => ({ ...prevInfo, [name]: value }));
  };

  const handlePlaceOrder = () => {
    if (totalQuantity === 0 || !cartItems || cartItems.length === 0) {
      toast.error(
        "No items in the cart. Pltimease add items before placing an order."
      );
      return;
    }

    // Store the order details in session storage
    const requiredBillingFields = [
      "name",
      "email",
      "phoneNumber",
      "streetAddress",
      "city",
      "postalCode",
    ];

    const isBillingInfoValid = requiredBillingFields.every(
      (field) => billingInfo[field]
    );

    if (!isBillingInfoValid) {
      toast.error("Please fill out all billing information fields.");
      return;
    }
    const orderDetails = {
      userId,
      userEmail: user.email,
      items: cartItems,
      totalAmount,
      totalQuantity,
      billingInfo: {
        ...billingInfo,
        extraNote: billingInfo.extraNote || "", // for extra things to note
        
      },
    };

    // Store the order details in session storage
    sessionStorage.setItem("orderDetails", JSON.stringify(orderDetails));

    // Navigate to the payment page
    navigate("/payment");
  };
  return (
    <Helmet title="Checkout">
      <CommonSection title="checkout"></CommonSection>
      <section>
        <Container>
          <Row>
            <Col lg="8"></Col>
            <h6 className="mb-4 fw-bold">Billing Information</h6>
            <Form className="billing__form">
              <FormGroup className="form__group">
                <input
                  type="text"
                  name="name"
                  placeholder="enter your name"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="email"
                  name="email"
                  placeholder="enter your Email"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="number"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="text"
                  name="streetAddress"
                  placeholder=" street address"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="text"
                  name="city"
                  placeholder="city"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="text"
                  name="postalCode"
                  placeholder="postal Code"
                  onChange={handleBillingInfoChange}
                  required
                />
              </FormGroup>
              <FormGroup className="form__group">
                <input
                  type="text"
                  name="extraNote"
                  placeholder="Extra note for delivery"
                  onChange={(e) =>
                    setBillingInfo((prevInfo) => ({
                      ...prevInfo,
                      extraNote: e.target.value,
                    }))
                  }
                />
              </FormGroup>

              <Col lg="4">
                <div className="checkout__cart">
                  <h6>
                    Total Qty: <span>{totalQuantity} items</span>
                  </h6>
                  <h6>
                    Subtotal: <span>${totalAmount}</span>
                  </h6>
                  <h6>
                    <span>
                      Shipping: <br /> Free shipping
                    </span>
                    <span>$0</span>
                  </h6>
                  <h4>
                    Total Cost: <span>${totalAmount}</span>
                  </h4>
                  <motion.button
                    onClick={handlePlaceOrder}
                    whileTap={{ scale: 1.2 }}
                    className="buy__btn auth__btn w-100"
                  >
                    Place Order
                    {/* <Link to="/payment">Place Order</Link> */}
                  </motion.button>
                </div>
              </Col>
            </Form>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Checkout;

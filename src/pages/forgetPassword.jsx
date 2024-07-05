// ForgetPassword.js
import React, { useState } from "react";
import { auth } from "../firebase.config";
import { sendPasswordResetEmail } from "firebase/auth";

import { toast } from "react-toastify";
import { Form, FormGroup } from "reactstrap";
import "../styles/login.css";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Col } from "reactstrap";
const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    try {
      // Attempt to send the password reset email
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent. Check your inbox!");
      console.log("success");
      navigate("/login");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Handle the case where the email doesn't exist
        toast.error("Email doesn't exist. Please enter a valid email address.");
        console.log("na me");
      } else {
        // Handle other errors
        toast.error("Error sending password reset email. Please try again.");
        console.error(error);
        console.log("na ma");
      }
    }
  };

  return (
    <Helmet title="Login">
      <section>
        <Container>
          <Row>
            <Col lg="6" className="m-auto text-center">
              <h3 className="fw-bold mb-4">Forgot Password</h3>
              <Form className="auth__form" onSubmit={handleResetPassword}>
                <FormGroup className="form__group">
                  <label>Email:</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormGroup>
                <motion.button
                  whileTap={{ scale: 1.2 }}
                  type="submit"
                  className="buy__btn auth__btn"
                >
                  Reset Password
                </motion.button>
                <p>
                  {" "}
                  <Link to="/login">Login</Link>
                </p>
              </Form>
            </Col>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default ForgetPassword;

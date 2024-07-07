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
      
      await sendPasswordResetEmail(auth, email);
      toast.success("A password reset link has been sent to your email. Please check your inbox.");
      console.log("Success: Password reset email sent.");
      navigate("/login");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Handle the case where the email doesn't exist
        toast.error("We couldn't find an account with that email. Please try again.");
        console.log("Error: Email not found.");
      } else {
        // Handle other errors
        toast.error("Something went wrong. Please try again later.");
        console.error(error);
        console.log("Error: Unable to send password reset email.");
      }
    }
  };
  

  return (
    <Helmet title="Login">
      <section>
        <Container>
          <Row>
            <div className="p-8 ">
              <h1 className="font-ubuntu font-semibold mb-4">
                Reset your password
              </h1>
              <h2 className="font-ubuntu text-xl">
                Enter your email address and we will send you a link to reset
                your password
              </h2>
              <Form className="translate-y-5" onSubmit={handleResetPassword}>
                <FormGroup className="">
                  <label className="font-bold mb-1 text-xs">
                    Your email address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    className="w-full h-14 text-gray-500 p-4 rounded-full bg-gray-300"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormGroup>
                <div className="flex  justify-between -translate-y-3">
                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="bg-customOrange w-28 h-14  rounded-full text-white mt-4"
                  >
                    Reset
                  </motion.button>
                  <p className="translate-y-10 underline">
                    {" "}
                    <Link to="/login">Back to Login</Link>
                  </p>
                </div>
              </Form>
            </div>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default ForgetPassword;

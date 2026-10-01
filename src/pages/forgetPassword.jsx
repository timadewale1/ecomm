import React, { useState } from "react";
import { siteUrls } from "../config/siteUrls.mjs";
import { auth } from "../firebase.config";
import { FaAngleLeft } from "react-icons/fa6";
import toast from "react-hot-toast";
import { Form, FormGroup } from "reactstrap";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row } from "reactstrap";
import { MdOutlineEmail } from "react-icons/md";

import { RotatingLines } from "react-loader-spinner";
import { sendPasswordResetEmail } from "firebase/auth";
import SEO from "../components/Helmet/SEO";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const confirm = () => {
      toast.success("If this email has a password account, a reset link will arrive shortly.");
      navigate("/confirm-state");
    };
    try {
      // Auth handles delivery; do not query private profiles to infer existence.
      await sendPasswordResetEmail(auth, cleanEmail, {
        url: siteUrls.appUrl("/reset-password"),
        handleCodeInApp: true,
      });
      confirm();
    } catch (error) {
      if (error?.code === "auth/user-not-found") confirm();
      else {
        console.warn("[password-reset] request failed", { code: error?.code || "unknown" });
        toast.error(error?.code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a moment and try again."
          : error?.code === "auth/network-request-failed"
            ? "Check your connection and try again."
            : "We couldn’t send the reset link. Please try again or contact support.");
      }
    } finally { setLoading(false); }
  };

  return (
    <>
      <SEO
        title={`Password Reset - My Thrift`}
        description={`Reset your password`}
        url={`https://www.shopmythrift.store/forgetpassword`}
      />
      <section className="w-full">
        <Container className="mx-auto w-full max-w-[574px] px-0">
          <Row className="mx-0 w-full">
            <div className="w-full px-4">
              <FaAngleLeft
                className="text-2xl cursor-pointer mb-2"
                onClick={() => navigate(-1)}
              />
              <h1 className="font-ubuntu text-3xl mt-9 font-semibold mb-1">
                Reset your password
              </h1>
              <h2 className="font-ubuntu font-thin text-sm text-gray-400">
                Enter your email address and we will send you a link
              </h2>

              <Form className="translate-y-5" onSubmit={handleResetPassword}>
                <FormGroup className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                    <MdOutlineEmail className="text-2xl text-black" />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  />
                </FormGroup>

                <div className="flex text-center flex-col -translate-y-3">
                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="bg-customOrange w-full mb-2 h-12 font-poppins font-medium rounded-full text-white mt-4 relative"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RotatingLines
                          strokeColor="white"
                          strokeWidth="5"
                          animationDuration="0.75"
                          width="24"
                          visible={true}
                        />
                      </div>
                    ) : (
                      "Reset"
                    )}
                  </motion.button>

                  <p className="text-customOrange text-sm">
                    <Link to="/login">Back to Sign In</Link>
                  </p>
                </div>
              </Form>
            </div>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default ForgetPassword;

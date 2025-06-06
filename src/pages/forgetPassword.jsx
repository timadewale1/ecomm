import React, { useState } from "react";
import { auth, db } from "../firebase.config";
import { FaAngleLeft } from "react-icons/fa6";
import toast from "react-hot-toast";
import { Form, FormGroup } from "reactstrap";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row } from "reactstrap";
import { MdOutlineEmail } from "react-icons/md";
import { getDocs, collection, query, where } from "firebase/firestore";
import { RotatingLines } from "react-loader-spinner";
import { sendPasswordResetEmail } from "firebase/auth";
import SEO from "../components/Helmet/SEO";

// Function to send password reset email with custom redirect URL
const sendPasswordReset = async (email) => {
  const actionCodeSettings = {
    url: "https://shopmythrift.store/reset-password", // Redirect URL
    handleCodeInApp: true,
  };
  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    toast.success("Password reset email sent successfully!");
  } catch (error) {
    console.error("Error sending password reset email:", error);
    toast.error("Failed to send password reset email. Please try again.");
  }
};

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email.");
      return;
    }

    setLoading(true);

    try {
      // Query multiple collections for the email
      const userCollections = ["users", "vendors"]; // Add other collections if necessary
      let emailExists = false;

      for (const collectionName of userCollections) {
        const q = query(
          collection(db, collectionName),
          where("email", "==", email)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          emailExists = true;
          break;
        }
      }

      if (!emailExists) {
        toast.error(
          "We couldn't find an account with that email. Please try again."
        );
      } else {
        await sendPasswordReset(email); // Call the new function with custom redirect
        navigate("/confirm-state");
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SEO 
        title={`Password Reset - My Thrift`} 
        description={`Reset your password`}
        url={`https://www.shopmythrift.store/forgetpassword`} 
      />
      <section>
        <Container>
          <Row>
            <div className="px-3 ">
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
                <div className="flex  text-center flex-col -translate-y-3">
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

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
import {
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
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
  // Firestore fallback to tailor messaging when Auth has no providers for the email
  const lookupEmailPresence = async (emailLower) => {
    // Try both fields because your codebase sometimes stores emailLower, sometimes email
    const checks = [
      { col: "vendors", field: "emailLower" },
      { col: "vendors", field: "email" },
      { col: "users", field: "emailLower" },
      { col: "users", field: "email" },
    ];

    let inVendors = false;
    let inUsers = false;

    for (const { col, field } of checks) {
      const snap = await getDocs(
        query(collection(db, col), where(field, "==", emailLower))
      );
      if (!snap.empty) {
        if (col === "vendors") inVendors = true;
        if (col === "users") inUsers = true;
        // no break; we want both flags if present
      }
    }

    return { inVendors, inUsers };
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email.");
      return;
    }

    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    try {
      // 1) Ask Firebase Auth which providers are linked to this email
      let methods = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, emailLower);
      } catch (err) {
        // Some SDKs throw for unknown users; normalize to []
        if (err?.code === "auth/user-not-found") methods = [];
        else throw err;
      }

      // A) Password exists → send reset
      if (methods.includes("password")) {
        await sendPasswordReset(emailLower);
        navigate("/confirm-state");
        return;
      }

      // B) Federated-only that Auth *does* recognize → guide (no reset)
      if (methods.length > 0) {
        if (methods.includes("google.com") && !methods.includes("password")) {
          toast.error(
            "This account uses Google sign-in and has no password. Please continue with Google, or add a password from Account Settings."
          );
          return;
        }
        if (methods.includes("twitter.com") && !methods.includes("password")) {
          toast.error(
            "This account uses Twitter (X) sign-in and has no password. Please continue with Twitter, or add a password from Account Settings."
          );
          return;
        }
        // Other social-only cases
        const providers = methods
          .filter((m) => m !== "password")
          .map((m) => m.replace(".com", ""))
          .join(", ");
        toast.error(
          `This account uses social sign-in (${providers}). Use your original method or add a password from Account Settings.`
        );
        return;
      }

      // 2) Auth has no providers for this email → Firestore fallback
      const { inVendors, inUsers } = await lookupEmailPresence(emailLower);

      // If we DO see the email in Firestore "users", attempt sending anyway:
      //  - If a password is actually linked (Auth was stale), the email will send.
      //  - If no password is linked, Firebase will reject — we catch and guide.
      if (inUsers) {
        try {
          await sendPasswordReset(emailLower);
          navigate("/confirm-state");
          return;
        } catch (err) {
          // Most likely: no password exists (federated-only or unlinked)
          toast.error(
            "We found your account, but it doesn’t have a password. Please sign in with your original method (e.g., Google or Twitter), or add a password from Account Settings."
          );
          return;
        }
      }

      if (inVendors) {
        // Vendors can have multiple auth setups; still no password resets if none is linked
        try {
          await sendPasswordReset(emailLower);
          navigate("/confirm-state");
          return;
        } catch {
          toast.error(
            "This vendor account doesn’t have a password to reset. Please use your original sign-in method or add a password from Account Settings."
          );
          return;
        }
      }

      // 3) Truly nothing found anywhere
      toast.error(
        "We couldn’t match this email to an account. If you signed up with Google or Twitter, please use that method instead."
      );
    } catch (error) {
      console.error("Error during password reset:", error);
      if (error?.code === "auth/invalid-email") {
        toast.error(
          "That email address looks invalid. Please check and try again."
        );
      } else if (error?.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a bit and try again.");
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
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

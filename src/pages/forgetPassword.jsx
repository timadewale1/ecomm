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

/**
 * Tiny helpers for structured logs
 */
const now = () => new Date().toISOString();
const mkTraceId = () =>
  `reset_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const log = (traceId, step, data = {}) => {
  // One-line log (easy to filter in console)
  console.log(`[PW_RESET][${traceId}][${step}]`, { t: now(), ...data });
};

const logError = (traceId, step, err, extra = {}) => {
  console.error(`[PW_RESET][${traceId}][${step}][ERROR]`, {
    t: now(),
    code: err?.code,
    message: err?.message,
    name: err?.name,
    stack: err?.stack,
    raw: err,
    ...extra,
  });
};

/**
 * IMPORTANT CHANGE:
 * - Don't swallow errors. Re-throw so the caller can handle it.
 * - Also log actionCodeSettings so we can confirm domain, handleCodeInApp, etc.
 */
const sendPasswordReset = async (traceId, email) => {
  const actionCodeSettings = {
    url: "https://shopmythrift.store/reset-password", // your current URL
    handleCodeInApp: true, // your current flag
  };

  log(traceId, "sendPasswordReset:start", {
    email,
    actionCodeSettings,
    authDomain: auth?.app?.options?.authDomain,
    projectId: auth?.app?.options?.projectId,
  });

  const t0 = performance.now();
  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);

    log(traceId, "sendPasswordReset:success", {
      ms: Math.round(performance.now() - t0),
    });

    // NOTE: we DON'T toast here anymore—let the caller decide
    return true;
  } catch (err) {
    logError(traceId, "sendPasswordReset:failed", err, {
      ms: Math.round(performance.now() - t0),
    });

    // Re-throw so UI doesn't pretend it worked
    throw err;
  }
};

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  // Firestore lookup logs: we log each query result so we know what matched
  const lookupEmailPresence = async (traceId, emailLower) => {
    const checks = [
      { col: "vendors", field: "emailLower" },
      { col: "vendors", field: "email" },
      { col: "users", field: "emailLower" },
      { col: "users", field: "email" },
    ];

    let inVendors = false;
    let inUsers = false;

    log(traceId, "firestoreLookup:start", { emailLower, checks });

    const t0 = performance.now();

    for (const { col, field } of checks) {
      const qRef = query(collection(db, col), where(field, "==", emailLower));

      const tQ = performance.now();
      const snap = await getDocs(qRef);

      log(traceId, "firestoreLookup:result", {
        col,
        field,
        matched: !snap.empty,
        size: snap.size,
        ms: Math.round(performance.now() - tQ),
      });

      if (!snap.empty) {
        if (col === "vendors") inVendors = true;
        if (col === "users") inUsers = true;
      }
    }

    log(traceId, "firestoreLookup:done", {
      inVendors,
      inUsers,
      ms: Math.round(performance.now() - t0),
    });

    return { inVendors, inUsers };
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const traceId = mkTraceId();

    const rawEmail = email;
    const emailLower = email.trim().toLowerCase();

    log(traceId, "submit:start", {
      rawEmail,
      emailLower,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
    });

    if (!validateEmail(emailLower)) {
      log(traceId, "submit:invalidEmail", { emailLower });
      toast.error("Invalid email format. Please enter a valid email.");
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Fetch provider methods (Auth truth)
      let methods = [];
      const t0 = performance.now();

      try {
        methods = await fetchSignInMethodsForEmail(auth, emailLower);

        log(traceId, "auth:fetchSignInMethodsForEmail:success", {
          emailLower,
          methods,
          ms: Math.round(performance.now() - t0),
        });
      } catch (err) {
        logError(traceId, "auth:fetchSignInMethodsForEmail:failed", err, {
          emailLower,
          ms: Math.round(performance.now() - t0),
        });

        // Normalize specific case
        if (err?.code === "auth/user-not-found") methods = [];
        else throw err;
      }

      // STEP 2A: Password provider present => send reset
      if (methods.includes("password")) {
        log(traceId, "flow:passwordProviderDetected", { methods });

        await sendPasswordReset(traceId, emailLower);

        toast.success("Password reset email sent (Auth accepted request).");
        log(traceId, "flow:navigateConfirmState");
        navigate("/confirm-state");
        return;
      }

      // STEP 2B: Providers exist but no password => guide
      if (methods.length > 0) {
        log(traceId, "flow:noPasswordProviderButHasProviders", { methods });

        if (methods.includes("google.com")) {
          toast.error(
            "This account uses Google sign-in and has no password. Please continue with Google, or add a password from Account Settings."
          );
          return;
        }

        if (methods.includes("twitter.com")) {
          toast.error(
            "This account uses Twitter (X) sign-in and has no password. Please continue with Twitter, or add a password from Account Settings."
          );
          return;
        }

        const providers = methods
          .filter((m) => m !== "password")
          .map((m) => m.replace(".com", ""))
          .join(", ");

        toast.error(
          `This account uses social sign-in (${providers}). Use your original method or add a password from Account Settings.`
        );
        return;
      }

      // STEP 3: Auth returned [] => Firestore fallback (NOT authoritative)
      log(traceId, "flow:authReturnedNoProviders_fallbackToFirestore", {
        methods,
      });

      const { inVendors, inUsers } = await lookupEmailPresence(
        traceId,
        emailLower
      );

      // Try sending anyway if Firestore shows presence.
      // If this fails, we will finally see the REAL Auth error code in console.
      if (inUsers || inVendors) {
        log(traceId, "flow:firestoreFoundEmail_attemptSendAnyway", {
          inUsers,
          inVendors,
        });

        await sendPasswordReset(traceId, emailLower);

        toast.success("Password reset email sent (Auth accepted request).");
        log(traceId, "flow:navigateConfirmState");
        navigate("/confirm-state");
        return;
      }

      log(traceId, "flow:noAuthNoFirestoreMatch", { inUsers, inVendors });
      toast.error(
        "We couldn’t match this email to an account. If you signed up with Google or Twitter, please use that method instead."
      );
    } catch (err) {
      // CENTRAL error handler — this is the one that matters most.
      logError(traceId, "submit:catch", err);

      // Show EXACT error code to help you debug faster
      const code = err?.code;

      if (code === "auth/invalid-email") {
        toast.error("That email address looks invalid. Please check and try again.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a bit and try again.");
      } else if (code === "auth/unauthorized-continue-uri") {
        toast.error(
          "Reset failed: unauthorized continue URL. Add this domain to Firebase Auth Authorized Domains."
        );
      } else if (code) {
        toast.error(`Reset failed: ${code}`);
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
    } finally {
      log(traceId, "submit:done");
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

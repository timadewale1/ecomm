import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { db, functions } from "../firebase.config";
import { httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import { RotatingLines } from "react-loader-spinner";
import Typewriter from "typewriter-effect";
import { GoChevronLeft } from "react-icons/go";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !password) {
        toast.error("Please fill in all fields.");
        setLoading(false);
        return;
      }

      
      const vendorLoginCallable = httpsCallable(functions, "vendorLogin");
      const response = await vendorLoginCallable({ email, password });
      const data = response.data;
      if (!data.success && data.code === "unverified-email") {
        toast.error("Email not verified. Verification link has been sent.");
        setLoading(false);
        return;
      }

      if (!data.success) {
        // Means the function threw an HttpsError or returned some error status
        // Typically handled by the catch block, but let's handle gracefully:
        toast.error("Unable to log in. Check your email/password.");
        setLoading(false);
        return;
      }

      // 2) If successful, sign in with Email/Password on the client
      await signInWithEmailAndPassword(auth, email, password);

      const user = auth.currentUser;
      if (!user) {
        toast.error("User not found after sign-in.");
        setLoading(false);
        return;
      }

      // 3) Double-check Firestore vendor data
      const docRef = doc(db, "vendors", data.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        if (docSnap.data().isDeactivated) {
          toast.error("Your vendor account is deactivated. Contact support.");
          await auth.signOut();
          setLoading(false);
          return;
        }
        if (!docSnap.data().profileComplete) {
          toast("Please complete your profile.");
          navigate("/complete-profile");
        } else {
          toast.success("Login successful.");
          navigate("/vendordashboard");
        }
      } else {
        // Not found in vendors
        toast.error("This account is already registered as non-vendor.");
        await auth.signOut();
      }
    } catch (error) {
      // HttpsError or Firebase Auth error
      handleSigninError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSigninError = (error) => {
   
    switch (error.code) {
      case "not-found":
        toast.error("Wrong email address or not a vendor.");
        break;
      case "permission-denied":
        toast.error("Account is disabled or deactivated. Contact support.");
        break;
      case "auth/user-not-found":
        toast.error("You have entered a wrong email address.");
        break;
      case "auth/user-disabled":
        toast.error("Your account has been disabled. Contact support.");
        break;
      case "auth/wrong-password":
        toast.error("You have entered a wrong password.");
        break;
      default:
        toast.error("Error signing in: " + error.message);
    }
  };

  return (
    <Helmet title="Vendor Login">
      <section>
        <Container>
          <Row>
            <div className="px-2">
              <Link to="/confirm-state">
                <GoChevronLeft className="text-3xl -translate-y-2 font-normal text-black" />
              </Link>
              <VendorLoginAnimation />
              <div className="flex justify-center text-xl font-ubuntu text-customOrange -translate-y-1">
                <Typewriter
                  options={{
                    strings: ["Showcase your products", "Connect with buyers"],
                    autoStart: true,
                    loop: true,
                    delay: 100,
                    deleteSpeed: 10,
                  }}
                />
              </div>
              <div className="flex justify-center text-xs font-medium text-customOrange -translate-y-2">
                <Typewriter
                  options={{
                    strings: [
                      "and make OWO!",
                      "and make KUDI!",
                      "and make EGO!",
                    ],
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 30,
                  }}
                />
              </div>
              <div className="translate-y-4">
                <div className="mb-2">
                  <h1 className="font-ubuntu text-5xl flex font-semibold text-black">
                    Login{" "}
                    <span className="text-customOrange translate-y-4 text-xl">
                      <p>(Vendor)</p>
                    </span>
                  </h1>
                </div>
                <p className="text-black text-sm font-opensans font-semibold">
                  Please sign in to continue
                </p>
              </div>
              <div className="translate-y-1 mt-6 px-2">
                <Form onSubmit={handleLogin}>
                  <FormGroup className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <MdEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 bg-white text-black font-opensans rounded-md text-sm border border-gray-200 pl-14 focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 bg-white text-black font-opensans rounded-md text-sm border border-gray-200 pl-14 focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FaRegEyeSlash className="text-gray-500 text-xl" />
                      ) : (
                        <FaRegEye className="text-gray-500 text-xl" />
                      )}
                    </div>
                  </FormGroup>
                  <div className="flex justify-end">
                    <Link
                      to="/forgetpassword"
                      className="text-customOrange font-lato text-xs"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full h-12 mt-4 rounded-full flex items-center justify-center bg-customOrange text-white font-semibold font-opensans text-sm hover:bg-orange-600 shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <RotatingLines
                        strokeColor="white"
                        strokeWidth="5"
                        width="30"
                      />
                    ) : (
                      "Login"
                    )}
                  </motion.button>
                </Form>
                <div className="text-center font-opensans text-xs font-light mt-4">
                  <p className="text-gray-900 ">
                    Want to become a vendor?{" "}
                    <button
                      onClick={() => navigate("/vendor-signup")}
                      className="font-normal text-customOrange"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default VendorLogin;

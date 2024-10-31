import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { db } from "../firebase.config";
import { toast } from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { MdPhone } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import Loading from "../components/Loading/Loading";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";
import bcrypt from "bcryptjs";

const VendorLogin = () => {
  const [loginMethod, setLoginMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneNumber = (phone) => /^[0-9]{11}$/.test(phone);
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const auth = getAuth();
      let user;

      if (loginMethod === "email") {
        // Email login logic
        if (!email || !validateEmail(email) || !password) {
          toast.error("Please fill in all fields correctly");
          setLoading(false);
          return;
        }

        // Attempt to sign in with email and password
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        user = userCredential.user;

        await user.reload();

        // Check if the email is verified
        if (!user.emailVerified) {
          setLoading(false);
          toast.error("Please verify your email before logging in.");
          return;
        }
      } else {
        // Phone login logic
        if (!validatePhoneNumber(phoneNumber) || !password) {
          toast.error("Please enter a valid phone number and password.");
          setLoading(false);
          return;
        }

        const vendorQuery = query(
          collection(db, "vendors"),
          where("phoneNumber", "==", phoneNumber)
        );
        const vendorSnapshot = await getDocs(vendorQuery);

        if (vendorSnapshot.empty) {
          toast.error(
            "phone number does not exist, please enter the right number."
          );
          setLoading(false);
          return;
        }

        const vendorData = vendorSnapshot.docs[0].data();

        if (!vendorData.password) {
          toast.error("Password not found in database.");
          setLoading(false);
          return;
        }

        // Compare the entered password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(
          password,
          vendorData.password
        );
        if (!isPasswordMatch) {
          toast.error(
            "Incorrect password, Please try again or use forget password."
          );
          setLoading(false);
          return;
        }

        const emailUserCredential = await signInWithEmailAndPassword(
          auth,
          vendorData.email,
          password
        );
        const emailUser = emailUserCredential.user;
        await emailUser.reload();

        if (emailUser.emailVerified) {
          if (!vendorData.emailVerified) {
            await updateDoc(doc(db, "vendors", vendorSnapshot.docs[0].id), {
              emailVerified: true,
            });
            vendorData.emailVerified = true;
          }
        } else {
          setLoading(false);
          toast.error("Please verify your email before logging in.");
          return;
        }

        user = {
          uid: vendorSnapshot.docs[0].id,
          emailVerified: vendorData.emailVerified,
        };
      }

      // Retrieve vendor document to check role and profile completion
      const docRef = doc(db, "vendors", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().isDeactivated) {
        console.log("Vendor account is deactivated");
        toast.error(
          "Your vendor account is deactivated. Please contact support."
        );
        await auth.signOut(); // Log the vendor out
        setLoading(false); // Stop loading indicator
        return;
      }

      if (docSnap.exists() && docSnap.data().role === "vendor") {
        if (!docSnap.data().profileComplete) {
          toast("Please complete your profile.");
          navigate("/complete-profile");
        } else {
          toast.success("Login successful");
          navigate("/vendordashboard");
        }
      } else {
        toast.error(
          "This account is registered as a user. Please login as a user."
        );
        await auth.signOut();
      }
    } catch (error) {
      handleSigninError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSigninError = (error) => {
    switch (error.code) {
      case "auth/user-not-found":
        toast.error(
          "You have entered a wrong email address, please try again."
        );
        break;
      case "auth/wrong-password":
        toast.error(
          "You have entered a wrong passsword, please try again or use the forgot password option."
        );
        break;
      default:
        toast.error("Error signing up vendor: " + error.message);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (e.target.value) setEmailError(false);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (e.target.value) setPasswordError(false);
  };
  return (
    <Helmet title="Vendor Login">
      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
              <div className="px-3">
                <Link to="/confirm-user-state">
                  <FaAngleLeft className="text-3xl -translate-y-2 font-normal text-black" />
                </Link>
                <VendorLoginAnimation />
                <div className="flex justify-center text-xl text-customOrange -translate-y-1">
                  <Typewriter
                    options={{
                      strings: [
                        "Welcome to the real marketplace!",
                        "Connect with buyers",
                        "Sell your products",
                      ],
                      autoStart: true,
                      loop: true,
                      delay: 100,
                      deleteSpeed: 20,
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
                  <p className="text-black font-semibold">
                    Please sign in to continue
                  </p>

                  {/* Toggle Login Method */}
                  <div className="mb-4 flex justify-center">
                    <button
                      onClick={() => setLoginMethod("email")}
                      className={`mr-4 ${
                        loginMethod === "email"
                          ? "text-customOrange font-bold"
                          : "text-black"
                      }`}
                    >
                      Email Login
                    </button>
                    <button
                      onClick={() => setLoginMethod("phone")}
                      className={`${
                        loginMethod === "phone"
                          ? "text-customOrange font-bold"
                          : "text-black"
                      }`}
                    >
                      Phone Login
                    </button>
                  </div>

                  <Form className="mt-4" onSubmit={handleLogin}>
                    {loginMethod === "email" ? (
                      <FormGroup className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <MdEmail className="text-gray-500 text-xl" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          className={`w-full h-14 ${
                            emailError ? "border-red-500" : "border-none"
                          } bg-gray-300 px-10 mb-1 font-semibold text-gray-800 rounded-lg`}
                          onChange={handleEmailChange}
                        />
                      </FormGroup>
                    ) : (
                      <FormGroup className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <MdPhone className="text-gray-500 text-xl" />
                        </div>
                        <input
                          type="text"
                          placeholder="Enter your phone number"
                          value={phoneNumber}
                          className="w-full h-14 bg-gray-300 px-10 mb-1 font-semibold text-gray-800 rounded-lg"
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </FormGroup>
                    )}

                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full h-14 ${
                          passwordError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 font-semibold text-gray-800 rounded-lg`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={handlePasswordChange}
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
                    <div className="flex justify-end font-semibold">
                      <p className="text-black underline text-xs">
                        <Link to="/forgetpassword">Forgot password?</Link>
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 1.2 }}
                      type="submit"
                      className="glow-button w-full h-14 mt-7 bg-customOrange text-white font-semibold rounded-full"
                      disabled={
                        !(loginMethod === "email" ? email : phoneNumber) ||
                        !password
                      }
                    >
                      Login
                    </motion.button>
                    <div className="text-center font-light mt-2 flex justify-center">
                      <p className="text-gray-700">
                        Want to join our community?{" "}
                        <span className="font-semibold underline text-black">
                          <Link to="/vendor-signup">Sign Up</Link>
                        </span>
                      </p>
                    </div>
                  </Form>
                </div>
              </div>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default VendorLogin;

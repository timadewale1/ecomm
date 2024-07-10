import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { db } from "../firebase.config";
import { toast } from "react-toastify";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import Loading from "../components/Loading/Loading";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validations
    if (!email) {
      setEmailError(true);
      toast.error("Please fill in all fields correctly", {
        className: "custom-toast",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Invalid email format", {
        className: "custom-toast",
      });
      return;
    }

   
    if (!password) {
      toast.error("Please fill in all fields correctly", {
        className: "custom-toast",
      });
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setLoading(false);
        toast.error("Please verify your email before logging in.", {
          className: "custom-toast",
        });
        return;
      }

      // Retrieve the vendor document from Firestore to check role and profile completion
      const docRef = doc(db, "vendors", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().role === "vendor") {
        if (!docSnap.data().profileComplete) {
          toast.info("Please complete your profile.");
          navigate("/complete-profile");
        } else {
          toast.success("Login successful");
          navigate("/vendordashboard");
        }
      } else {
        toast.error("This email is already registered as a user. Please login as a user.");
        await auth.signOut();
      }
    } catch (error) {
      setLoading(false);
      toast.error("Error logging in: " + error.message);
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
                      strings: ["Welcome to the real marketplace!", "Connect with buyers", "Sell your products"],
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
                  <Form className="mt-4" onSubmit={handleLogin}>
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
                        } bg-gray-300 px-10 mb-1 font-semibold text-gray-800 rounded-full`}
                        onChange={handleEmailChange}
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full h-14 ${
                          passwordError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 font-semibold text-gray-800 rounded-full`}
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
                      disabled={!email || !password}
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
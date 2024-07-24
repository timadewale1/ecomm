import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase.config";
import { getDoc, doc } from "firebase/firestore";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { toast } from "react-toastify";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Loading from "../components/Loading/Loading";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const signIn = async (e) => {
    e.preventDefault();

    // Validate email field
    if (!email) {
      setEmailError(true);
      toast.error("Please fill in all fields correctly.", {
        className: "custom-toast",
      });
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      toast.error("Invalid email format.", {
        className: "custom-toast",
      });
      return;
    }

    // Validate password field
    if (!password) {
      toast.error("Please fill in all fields correctly.", {
        className: "custom-toast",
      });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setLoading(false);
        toast.error("Please verify your email before logging in.", {
          className: "custom-toast",
        });
        return;
      }

      // Retrieve user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // Check if the user is a regular user
      if (userData?.role !== "user") {
        await auth.signOut();
        setLoading(false);
        toast.error("This email is already used for a Vendor account!", {
          className: "custom-toast",
        });
        return;
      }

      const Name = userData?.username || "User";
      setLoading(false);
      toast.success(`Hello ${Name}, welcome!`, {
        className: "custom-toast",
      });
      const redirectTo = location.state?.from || "/newhome";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoading(false);
      console.error("Error during sign-in:", error); // Log the error message

      // Provide user-friendly error messages based on Firebase error codes
      let errorMessage = "Unable to login. Please check your credentials and try again.";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with this email. Please sign up.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }

      toast.error(errorMessage, {
        className: "custom-toast",
      });
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
    <Helmet title="User Login">
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
                <LoginAnimation />
                <div className="flex transform text-customOrange -translate-y-10 mb-2 justify-center">
                  <Typewriter
                    options={{
                      strings: ["The Real Marketplace"],
                      autoStart: true,
                      loop: true,
                    }}
                  />
                </div>
                <div className="-translate-y-4">
                  <div className=" ">
                    <h1 className="text-5xl font-semibold font-ubuntu text-black mb-2">
                      Login
                    </h1>
                    <p className="text-black font-semibold">
                      Please sign in to continue
                    </p>
                  </div>
                  <Form className=" " onSubmit={signIn}>
                    <FormGroup className="relative w-full mt-4">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MdEmail className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        className={`w-full h-14 ${
                          emailError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 mb-1 font-semibold text- rounded-lg`}
                        onChange={handleEmailChange}
                      />
                    </FormGroup>

                    <FormGroup className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full h-14 ${
                          passwordError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 font-semibold text- rounded-lg`}
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
                        Don't have an account?{" "}
                        <span className="font-semibold underline text-black">
                          <Link to="/signup">Sign Up</Link>
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

export default Login;

import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../firebase.config";
import { setDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { toast } from "react-toastify";
import SignUpAnimation from "../SignUpAnimation/SignUpAnimation";
import Loading from "../components/Loading/Loading";
import { FaRegUser, FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";
import { MdEmail } from "react-icons/md";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // State for confirm password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for confirm password visibility
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const formatUsername = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const signup = async (e) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      toast.error("All fields are required. Please fill in all fields.", {
        className: "custom-toast",
      });
      return;
    }

    if (/[^a-zA-Z\s]/.test(username)) {
      toast.error("You cannot use numbers as username!", {
        className: "custom-toast",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email.", {
        className: "custom-toast",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please try again.", {
        className: "custom-toast",
      });
      return;
    }

    setLoading(true);
    try {
      // Format username to capitalize only the first letter
      const formattedUsername = formatUsername(username);

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Save user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: formattedUsername,
        email,
        role: "user",
      });

      setLoading(false);
      toast.success("Account created successfully. Please verify your email.", {
        className: "custom-toast",
      });
      navigate("/login");
    } catch (error) {
      setLoading(false);

      // Handle Firebase errors with user-friendly messages
      let errorMessage = "Cannot sign up at the moment. Please try again later.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use. Please use a different email.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please enter a valid email.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Sign up is currently disabled. Please try again later.";
      }

      toast.error(errorMessage, {
        className: "custom-toast",
      });
      console.error("Signup error:", error);
    }
  };

  return (
    <Helmet className="p-4">
      <Container>
        <Row>
          {loading ? (
            <Loading />
          ) : (
            <>
              <SignUpAnimation />
              <div className="flex transform text-customOrange -translate-y-2 mb-2 justify-center">
                <Typewriter
                  options={{
                    strings: ["Welcome to My Thrift", "The Real Market Place!"],
                    autoStart: true,
                    loop: true,
                  }}
                />
              </div>
              <div className="">
                <h1 className="text-5xl font-semibold font-ubuntu text-black mb-4">
                  Sign Up
                </h1>

                <Form className="" onSubmit={signup}>
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FaRegUser className="text-gray-500 text-xl" />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="Username"
                      value={username}
                      className="w-full h-14 text-gray-500 pl-10 rounded-full bg-gray-300"
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <MdEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      required
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      className="w-full h-14 text-gray-500 pl-10 rounded-full bg-gray-300"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      className="w-full h-14 text-gray-500 pl-10 rounded-full bg-gray-300"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <FormGroup className="relative mt-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full h-14 text-gray-500 pl-10 rounded-full bg-gray-300"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <FaRegEyeSlash className="text-gray-500 text-xl" />
                      ) : (
                        <FaRegEye className="text-gray-500 text-xl" />
                      )}
                    </div>
                  </FormGroup>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Password must be at least 8 characters long and contain at
                      least one uppercase letter
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="glow-button w-full h-14 mt-7 bg-customOrange text-white font-semibold rounded-full"
                  >
                    Create account
                  </motion.button>
                  <div className="text-center font-light mt-2 pb-4 flex justify-center">
                    <p className="text-gray-700">
                      Already have an account?{" "}
                      <span className="underline font-semibold text-black">
                        <Link to="/login">Login</Link>
                      </span>
                    </p>
                  </div>
                </Form>
              </div>
            </>
          )}
        </Row>
      </Container>
    </Helmet>
  );
};

export default Signup;

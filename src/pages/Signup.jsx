import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase.config";
import { setDoc, doc, getDocs, collection, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import toast from "react-hot-toast";
import SignUpAnimation from "../SignUpAnimation/SignUpAnimation";
import { FaRegUser, FaRegEyeSlash, FaRegEye, FaInfoCircle, FaCheckCircle } from "react-icons/fa";
import { MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import { Oval, RotatingLines } from "react-loader-spinner";
import PasswordStrengthBar from "react-password-strength-bar";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim().length >= 2) {
        setUsernameLoading(true);
        const formattedUsername = formatUsername(username);
        const q = query(collection(db, "users"), where("username", "==", formattedUsername));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setIsUsernameTaken(true);
          setIsUsernameAvailable(false);
        } else {
          setIsUsernameTaken(false);
          setIsUsernameAvailable(true);
        }
        setUsernameLoading(false);
      } else {
        setIsUsernameTaken(false);
        setIsUsernameAvailable(false);
      }
    };

    checkUsername();
  }, [username]);

  useEffect(() => {
    const handleFocus = () => {
      document.body.classList.add("scroll-lock");
    };

    const handleBlur = () => {
      document.body.classList.remove("scroll-lock");
    };

    const inputs = document.querySelectorAll("input");

    inputs.forEach((input) => {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    });

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      });
    };
  }, []);

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
      toast.error("All fields are required. Please fill in all fields.");
      return;
    }

    if (username.length < 2) {
      toast.error("Username must be at least 2 characters long.");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Invalid email format. Please enter a valid email.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please try again.");
      return;
    }

    if (isUsernameTaken) {
      toast.error("Username is already taken. Please choose another one.");
      return;
    }

    setLoading(true);
    try {
      const formattedUsername = formatUsername(username);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: formattedUsername,
        email,
        role: "user",
      });

      setLoading(false);
      toast.success("Account created successfully. Please verify your email.");
      navigate("/login");
    } catch (error) {
      setLoading(false);
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

      toast.error(errorMessage);
      console.error("Signup error:", error);
    }
  };

  return (
    <Helmet className="p-4">
      <Container>
        <Row>
          <>
            <div className="flex items-center mb-4">
              <div className="flex flex-col items-center flex-grow transform text-customOrange -translate-y-2">
                <SignUpAnimation />
                <Typewriter
                  options={{
                    strings: ["Welcome to My Thrift", "The Real Market Place!"],
                    autoStart: true,
                    loop: true,
                  }}
                />
              </div>
            </div>
            <div className="">
              <div className=" ">
                <h1 className="text-3xl font-extrabold font-lato text-black mb-1">
                  Create an account
                </h1>
                <p className="text-gray-400 mb-1 text-sm font-lato ">
                  Don't stress we have the best thrifted items for you
                </p>
              </div>

              <Form className="mt-4" onSubmit={signup}>
                <FormGroup className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <FaRegUser className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type="text"
                    placeholder="Username"
                    value={username}
                    className={`w-full h-14 text-gray-500 mt-1 pl-14 rounded-full bg-gray-300 ${
                      isUsernameTaken ? "border-2 border-red-500" : isUsernameAvailable ? "border-2 border-green-500" : ""
                    }`}
                    onChange={(e) => setUsername(formatUsername(e.target.value))}
                  />
                  {usernameLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Oval
                        height={24}
                        width={24}
                        color="#4fa94d"
                        visible={true}
                        ariaLabel="oval-loading"
                        secondaryColor="#4fa94d"
                        strokeWidth={2}
                        strokeWidthSecondary={2}
                      />
                    </div>
                  )}
                  {!usernameLoading && isUsernameAvailable && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaCheckCircle className="text-green-500 rounded-full p-1" size={24} />
                    </div>
                  )}
                </FormGroup>
                {isUsernameTaken && (
                  <div className="text-red-500 ratings-text -translate-y-3  flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Username is already taken. Please choose another one.
                  </div>
                )}
                {isUsernameAvailable && !usernameLoading && (
                  <div className="text-green-500 text-xs  flex items-center">
                    {/* <FaCheckCircle className="mr-1" />
                    Username is available. */}
                  </div>
                )}
                <FormGroup className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineEmail className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    className="w-full h-14 text-gray-500 pl-14 rounded-full bg-gray-300"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormGroup>
                {showPasswordCriteria && (
                  <div className="text-red-500 ratings-text mb-2 flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Password must be at least 8 characters long and contain at least one uppercase letter, one digit, and one special character.
                  </div>
                )}
                <FormGroup className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full h-14 text-gray-500 pl-14 rounded-full bg-gray-300"
                    placeholder="Enter password"
                    value={password}
                    onFocus={() => setShowPasswordCriteria(true)}
                    onBlur={() => setShowPasswordCriteria(false)}
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
                {showPasswordCriteria && (
                  <div className="mt-1">
                    <PasswordStrengthBar
                      password={password}
                      minLength={8}
                      barColors={['#ddd', '#ef4836', '#f6b44d', '#2b90ef', '#25c281']}
                      scoreWords={['Too short', 'Weak', 'Okay', ' Very Good', 'Strong']}
                      shortScoreWord="Too short"
                    />
                  </div>
                )}
                <FormGroup className="relative mt-4">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full h-14 text-gray-500 pl-14 rounded-full bg-gray-300"
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? (
                      <FaRegEyeSlash className="text-gray-500 text-xl" />
                    ) : (
                      <FaRegEye className="text-gray-500 text-xl" />
                    )}
                  </div>
                </FormGroup>

                <motion.button
                  type="submit"
                  className="glow-button w-full h-12 mt-4 bg-customOrange text-white font-medium rounded-full flex justify-center items-center"
                >
                  {loading ? (
                    <RotatingLines
                      strokeColor="white"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="30"
                      visible={true}
                    />
                  ) : (
                    "Sign Up"
                  )}
                </motion.button>
                <div className="text-center text-sm font-normal font-lato mt-2 pb-4 flex justify-center">
                  <p className="text-gray-700 text-sm">
                    Already have an account?{" "}
                    <span className="text-customOrange text-sm ">
                      <Link to="/login">Sign In</Link>
                    </span>
                  </p>
                </div>
              </Form>
            </div>
          </>
        </Row>
      </Container>
    </Helmet>
  );
};

export default Signup;

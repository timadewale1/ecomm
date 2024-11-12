import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup, // Import signInWithPopup for popup-based Google sign-in
  onAuthStateChanged,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase.config";
import {
  setDoc,
  doc,
  getDoc, // Use getDoc to retrieve a single document
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import toast from "react-hot-toast";
import SignUpAnimation from "../SignUpAnimation/SignUpAnimation";
import {
  FaRegUser,
  FaRegEyeSlash,
  FaRegEye,
  FaInfoCircle,
  FaCheckCircle,
} from "react-icons/fa";
import { MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import { Oval, RotatingLines } from "react-loader-spinner";
import PasswordStrengthBar from "react-password-strength-bar";
import useAuth from "../custom-hooks/useAuth";

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

  const { currentUser } = useAuth(); // Use the currentUser from the useAuth hook
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is already logged in after popup:", user);
        // Ensure the user is navigated to the newhome page
        navigate("/newhome");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim().length >= 2) {
        setUsernameLoading(true);
        const formattedUsername = formatUsername(username);
        const q = query(
          collection(db, "users"),
          where("username", "==", formattedUsername)
        );
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

  useEffect(() => {
    // This ensures Firebase remembers the user's state after page reload
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is already logged in after redirect:", user);
        navigate("/newhome");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Add user to Firestore with "user" role
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: formattedUsername,
        email,
        role: "user",
        createdAt: new Date(),
        profileComplete: false,
      });

      await sendEmailVerification(user);
      setLoading(false);

      toast.success("Account created successfully. Please verify your email.");
      navigate("/login");
    } catch (error) {
      setLoading(false);
      let errorMessage =
        "Cannot sign up at the moment. Please try again later.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already in use. Please use a different email.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please enter a valid email.";
      }

      toast.error(errorMessage);
      console.error("Signup error:", error);
    }
  };

  // Google sign-up handler using popup
  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      console.log("Opening Google sign-up popup...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("Google user authenticated:", user);

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Add new user to Firestore
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          role: "user",
          createdAt: new Date(),
          profileComplete: false,
        });
        // console.log("New user added to Firestore:", user.displayName);
      } else {
        console.log("User already exists in Firestore");
      }

      toast.success("Signed up with Google successfully!");
      // Ensure redirection to the new home route
      navigate("/newhome");
    } catch (error) {
      console.error("Google Sign-Up Error:", error);
      let errorMessage = "Google Sign-Up failed. Please try again.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account with the same email already exists.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Popup closed before completing sign-up.";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // console.log("User is authenticated, redirecting to dashboard...");
      navigate("/newhome");
    }
  }, [currentUser, navigate]);

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
                {/* Username input */}
                <FormGroup className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <FaRegUser className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type="text"
                    placeholder="Username"
                    value={username}
                    className={`w-full h-14 text-gray-500 mt-1 pl-14 rounded-md bg-gray-300 ${
                      isUsernameTaken
                        ? "border-2 border-red-500"
                        : isUsernameAvailable
                        ? "border-2 border-green-500"
                        : ""
                    }`}
                    onChange={(e) =>
                      setUsername(formatUsername(e.target.value))
                    }
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
                      <FaCheckCircle
                        className="text-green-500 rounded-full p-1"
                        size={24}
                      />
                    </div>
                  )}
                </FormGroup>
                {isUsernameTaken && (
                  <div className="text-red-500 ratings-text -translate-y-3  flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Username is already taken. Please choose another one.
                  </div>
                )}

                {/* Email input */}
                <FormGroup className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineEmail className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    className="w-full h-14 text-gray-500 pl-14 rounded-md bg-gray-300"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormGroup>

                {/* Password input */}
                <FormGroup className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full h-14 text-gray-500 pl-14 rounded-md bg-gray-300"
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

                {/* Password strength bar */}
                {showPasswordCriteria && (
                  <div className="mt-1">
                    <PasswordStrengthBar
                      password={password}
                      minLength={8}
                      barColors={[
                        "#ddd",
                        "#ef4836",
                        "#f6b44d",
                        "#2b90ef",
                        "#25c281",
                      ]}
                      scoreWords={[
                        "Too short",
                        "Weak",
                        "Okay",
                        "Very Good",
                        "Strong",
                      ]}
                      shortScoreWord="Too short"
                    />
                  </div>
                )}

                {/* Confirm password input */}
                <FormGroup className="relative mt-4">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full h-14 text-gray-500 pl-14 rounded-md bg-gray-300"
                    placeholder="Re-type password"
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

                {/* Sign Up button */}
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
                <div className="flex items-center justify-center mt-2 mb-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="mx-4 text-gray-500">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                {/* Google Sign-Up button */}
                <motion.button
                  type="button"
                  className="w-full h-12 mt-2 bg-white border-2 border-gray-300 text-black font-medium rounded-full flex justify-center items-center"
                  onClick={handleGoogleSignUp}
                >
                  <FcGoogle className="mr-2 text-2xl" />
                  Sign up with Google
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

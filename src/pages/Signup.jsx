import React, { useState, useEffect } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { auth, db, functions } from "../firebase.config";
import {
  setDoc,
  doc,
  getDoc,
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
import { MdOutlineClose, MdOutlineDomainVerification, MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import { Oval, RotatingLines } from "react-loader-spinner";
import { useAuth } from "../custom-hooks/useAuth";
import { httpsCallable } from "firebase/functions"; // import from Firebase functions
import Modal from "react-modal";
import SEO from "../components/Helmet/SEO";
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

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false); // State to manage modal visibility

  const handleSignupSuccess = () => {
    setModalOpen(true); // Open the modal on successful signup
  };

  const handleCloseModal = () => {
    setModalOpen(false); // Close the modal
    setUsername(""); // Reset form fields
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    navigate("/login"); // Redirect to login page
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is already logged in after popup:", user);
        navigate("/newhome");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Check if username is available
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
  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const isValidLength = password.length >= 8 && password.length <= 24;
    return hasUppercase && hasSpecialCharacter && hasNumeric && isValidLength;
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
    if (!validatePassword(password)) {
      toast.error(
        "Password must be at least 8 characters, include uppercase, special char, numeric."
      );
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
      // Call the Cloud Function
      const userSignupCallable = httpsCallable(functions, "userSignup");
      const response = await userSignupCallable({
        username: formatUsername(username),
        email,
        password,
      });

      const data = response.data;
      if (data.success) {
        handleSignupSuccess();
      }
    } catch (error) {
      console.error("Signup error from Cloud Function:", error);
      let errorMessage = "Cannot sign up at the moment. Please try again.";
      if (error.code === "already-exists") {
        errorMessage =
          "This email is already in use. Please use a different email.";
      } else if (error.code === "invalid-argument") {
        errorMessage = "Missing required fields.";
      } else if (error.code === "unknown") {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Google sign-up remains purely client-side
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
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          role: "user",
          createdAt: new Date(),
          profileComplete: false,
        });
      } else {
        console.log("User already exists in Firestore");
      }

      toast.success("Signed up with Google successfully!");
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

  return (
    <>
    <SEO 
        title={`Signup - My Thrift`} 
        description={`Get started with an amazing shopping experience on My Thrift!`} 
        url={`https://www.shopmythrift.store/signup`} 
      />
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
            <div>
              <div>
                <h1 className="text-3xl font-extrabold font-lato text-black mb-1">
                  Create an account
                </h1>
                <p className="text-gray-400 mb-1 text-sm font-lato">
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
                    className={`w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange ${
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
                  <div className="text-red-500 ratings-text -translate-y-3 flex items-center">
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
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                  <ul className="text-xs text-gray-600 mt-2">
                    <li
                      className={`${
                        /[A-Z]/.test(password)
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {/[A-Z]/.test(password) ? "✔" : "✘"} At least one
                      uppercase letter
                    </li>
                    <li
                      className={`${
                        /[0-9]/.test(password)
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {/[0-9]/.test(password) ? "✔" : "✘"} At least one numeric
                      character
                    </li>
                    <li
                      className={`${
                        /[!@#$%^&*(),.?":{}|<>]/.test(password)
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✔" : "✘"} At
                      least one special character
                    </li>
                    <li
                      className={`${
                        password.length >= 8 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {password.length >= 8 ? "✔" : "✘"} Minimum length of 8
                      characters
                    </li>
                  </ul>
                )}

                {/* Confirm password input */}
                <FormGroup className="relative mt-4">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                  disabled={loading}
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
                    <span className="text-customOrange text-sm">
                      <Link to="/login">Sign In</Link>
                    </span>
                  </p>
                </div>
              </Form>
            </div>
          </>
        </Row>
      </Container>
      <Modal
        isOpen={modalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Email Verification"
        style={{
          content: {
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            top: "auto",
            borderRadius: "20px 20px 0 0",
            padding: "20px",
            backgroundColor: "#ffffff",
            border: "none",
            height: "35%",
            animation: "slide-up 0.3s ease-in-out",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 3000,
          },
        }}
      >
        <div className="flex flex-col items-center py-2">
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                <MdOutlineDomainVerification className="text-customRichBrown text-lg" />
              </div>
              <h2 className="font-opensans text-lg font-semibold text-customRichBrown">
                Verify Your Email
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-2xl cursor-pointer"
              onClick={handleCloseModal}
            />
          </div>

          <p className="font-opensans mt-1 text-base text-black text-center font-medium leading-6">
            Email sent successfully! Please check your inbox for the
            verification link.
            <br />
            <span className="font-light text-xs font-opensans">
              P.S. If you didn’t receive it, please check your spam or junk
              folder.
            </span>
          </p>
        </div>
      </Modal>
    </>
  );
};

export default Signup;

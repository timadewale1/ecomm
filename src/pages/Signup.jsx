import React, { useState, useEffect } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { auth, db, functions } from "../firebase.config";
import { isBuyerUsernameAvailable } from "../services/accountLookups";
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
import {
  MdOutlineClose,
  MdOutlineDomainVerification,
  MdOutlineEmail,
  MdOutlineLock,
} from "react-icons/md";
import { Oval, RotatingLines } from "react-loader-spinner";
import { httpsCallable } from "firebase/functions"; // import from Firebase functions
import Modal from "react-modal";
import SEO from "../components/Helmet/SEO";
import { FaApple, FaXTwitter } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { fetchAndMergeCart } from "../services/cartMerge";
import { useAppExperience } from "../components/Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../services/appExperience";
import { appHaptics } from "../services/haptics";
import {
  authenticateBuyerWithProvider,
  socialAuthErrorMessage,
} from "../services/buyerSocialAuth";
import { isNativeApp } from "../services/platform";
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
  const dispatch = useDispatch();
  const { selectExperience } = useAppExperience();
  const showAppleAuth =
    isNativeApp || import.meta.env.VITE_ENABLE_APPLE_WEB_AUTH === "true";
  const [modalOpen, setModalOpen] = useState(false); // State to manage modal visibility
  const [verificationEmailSent, setVerificationEmailSent] = useState(true);

  const handleSignupSuccess = (emailWasSent = true) => {
    setVerificationEmailSent(emailWasSent);
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

  // Debounced hint only; no private profile is downloaded or cached.
  useEffect(() => {
    let cancelled = false;
    setIsUsernameTaken(false);
    setIsUsernameAvailable(false);
    setUsernameLoading(false);
    if (username.trim().length < 2) return;
    setUsernameLoading(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isBuyerUsernameAvailable(formatUsername(username));
        if (!cancelled) {
          setIsUsernameTaken(!available);
          setIsUsernameAvailable(available);
        }
      } catch {
        // A failed availability check is neither "taken" nor "available".
      } finally { if (!cancelled) setUsernameLoading(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [username]);

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
        "Password must be at least 8 characters, include uppercase, special char, numeric.",
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
        handleSignupSuccess(data.verificationEmailSent !== false);
      }
    } catch (error) {
      console.error("Signup error from Cloud Function:", error);
      let errorMessage = "Cannot sign up at the moment. Please try again.";
      if (
        error.code === "already-exists" ||
        error.code === "functions/already-exists"
      ) {
        errorMessage =
          "An account already exists for this email. Please sign in to continue or resend verification.";
      } else if (
        error.code === "invalid-argument" ||
        error.code === "functions/invalid-argument"
      ) {
        errorMessage = "Missing required fields.";
      } else if (
        error.code === "unknown" ||
        error.code === "functions/unknown"
      ) {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (providerId, providerLabel) => {
    void appHaptics.medium();
    try {
      setLoading(true);
      const { user, isNewUser } = await authenticateBuyerWithProvider({
        auth,
        db,
        providerId,
      });
      await fetchAndMergeCart(db, user.uid, dispatch);
      await selectExperience(APP_EXPERIENCE.CUSTOMER);
      toast.success(
        isNewUser
          ? `Signed up with ${providerLabel} successfully!`
          : `Signed in with ${providerLabel} successfully!`,
      );
      navigate("/", { replace: true });
    } catch (error) {
      console.error(`${providerLabel} Sign-Up Error:`, error);
      const message = socialAuthErrorMessage(error, providerLabel);
      if (message) toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () =>
    handleSocialSignUp("google.com", "Google");
  const handleAppleSignUp = () => {
    void appHaptics.light();
    toast("Apple sign-in is coming soon.");
  };
  const handleTwitterSignUp = () =>
    handleSocialSignUp("twitter.com", "X");

  return (
    <>
      <SEO
        title={`Signup - My Thrift`}
        description={`Get started with an amazing shopping experience on My Thrift!`}
        url={`https://www.shopmythrift.store/signup`}
      />
      <Container className="mx-auto w-full max-w-[574px] px-0">
        <Row className="mx-0 w-full">
          <>
            <div className="flex w-full items-center mb-4">
              <div className="flex flex-col items-center flex-grow transform text-customOrange -translate-y-2 font-opensans">
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
            <div className="w-full font-opensans">
              <div className="px-4">
                <h1 className="text-3xl font-extrabold font-lato text-black mb-1">
                  Create an account
                </h1>
                <p className="text-gray-400 mb-1 text-sm font-lato">
                  Don't stress we have the best thrifted items for you
                </p>
              </div>

              <Form className="mt-4 px-4 flex flex-col " onSubmit={signup}>
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
                    className={`w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange ${
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
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                <FormGroup className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                    <MdOutlineLock className="text-gray-500 text-xl" />
                  </div>
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                <div className="text-gray-600  font-opensans text-xs mt-2 -mx-1 leading-relaxed">
                  By signing up you agree to our{" "}
                  <span
                    onClick={() => navigate("/terms-and-conditions")}
                    className="text-customOrange font-medium hover:underline cursor-pointer mr-1"
                  >
                    Terms & Conditions
                  </span>
                  and
                  <span
                    onClick={() => navigate("/privacy-policy")}
                    className="text-customOrange font-medium hover:underline cursor-pointer ml-1"
                  >
                    Privacy Policy
                  </span>
                  .
                </div>

                {/* Sign Up button */}
                <motion.button
                  type="submit"
                  className="glow-button w-full h-12 mt-4 bg-customOrange text-white font-medium rounded-xl flex justify-center font-opensans items-center"
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
                  <span className="mx-4 text-sm text-gray-500">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {showAppleAuth && (
                  <motion.button
                    type="button"
                    className="w-full h-12 mt-2 bg-black border-2 border-black font-satoshi text-white font-medium rounded-xl flex justify-center items-center disabled:opacity-60"
                    onClick={handleAppleSignUp}
                    disabled={loading}
                  >
                    <FaApple className="mr-2 text-2xl" />
                    Sign up with Apple
                  </motion.button>
                )}

                {/* Google Sign-Up button */}
                <motion.button
                  type="button"
                  className="w-full h-12 mt-2 bg-white border-2  font-opensans border-gray-100 text-black font-medium rounded-xl flex justify-center items-center"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                >
                  <FcGoogle className="mr-2  text-2xl" />
                  Sign up with Google
                </motion.button>
                <motion.button
                  type="button"
                  className="w-full h-12 mt-2 bg-white border-2 border-gray-100 font-opensans text-black font-medium rounded-xl flex justify-center items-center"
                  onClick={handleTwitterSignUp}
                  disabled={loading}
                >
                  <FaXTwitter className="mr-2 text-xl" />
                  Sign up with X
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
        <div className="flex flex-col items-center py-2 font-opensans">
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                <MdOutlineDomainVerification className="text-customRichBrown text-lg" />
              </div>
              <h2 className="font-opensans text-lg font-semibold text-customRichBrown">
                {verificationEmailSent
                  ? "Verify Your Email"
                  : "Your Account Is Ready"}
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-2xl cursor-pointer"
              onClick={handleCloseModal}
            />
          </div>

          {verificationEmailSent ? (
            <p className="font-opensans mt-1 text-base text-black text-center font-medium leading-6">
              Email sent successfully! Please check your inbox for the
              verification link.
              <br />
              <span className="font-light text-xs font-opensans">
                P.S. If you didn’t receive it, please check your spam or junk
                folder.
              </span>
            </p>
          ) : (
            <p className="font-opensans mt-1 text-base text-black text-center font-medium leading-6">
              Your account was created successfully, but we couldn’t send the
              verification email just now.
              <br />
              <span className="font-light text-xs font-opensans">
                Continue to sign in and request a fresh verification email.
              </span>
            </p>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Signup;

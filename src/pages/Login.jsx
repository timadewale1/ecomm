import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase.config";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import toast from "react-hot-toast";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { setCart } from "../redux/actions/action";
import { RotatingLines } from "react-loader-spinner"; // Import the RotatingLines spinner

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const syncCartWithFirestore = async (userId) => {
    try {
      const localCart = JSON.parse(localStorage.getItem("cart")) || {};
      console.log("Syncing local cart to Firestore: ", localCart);
      await setDoc(doc(db, "carts", userId), { cart: localCart });
    } catch (error) {
      console.error("Error syncing cart with Firestore: ", error);
    }
  };

  const fetchCartFromFirestore = async (userId) => {
    try {
      const cartDoc = await getDoc(doc(db, "carts", userId));
      if (cartDoc.exists()) {
        const cart = cartDoc.data().cart;
        console.log("Fetched cart from Firestore: ", cart);
        dispatch(setCart(cart));
      } else {
        console.log("No cart found in Firestore, initializing empty cart");
        dispatch(setCart({}));
      }
    } catch (error) {
      console.error("Error fetching cart from Firestore: ", error);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();

    // Validate email field
    if (!email) {
      setEmailError(true);
      toast.error("Please fill in all fields correctly.");
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      toast.error("Invalid email format.");
      return;
    }

    // Validate password field
    if (!password) {
      toast.error("Please fill in all fields correctly.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setLoading(false);
        toast.error("Please verify your email before logging in.");
        return;
      }

      // Retrieve user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // Check if the user is a regular user
      if (userData?.role !== "user") {
        await auth.signOut();
        setLoading(false);
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Fetch the cart from Firestore
      await fetchCartFromFirestore(user.uid);

      const Name = userData?.username || "User";
      setLoading(false);
      toast.success(`Hello ${Name}, welcome!`);
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

      toast.error(errorMessage);
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

  // Implementing the scroll-lock feature
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

  return (
    <Helmet title="User Login">
      <section>
        <Container>
          <Row>
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
                  <h1 className="text-3xl font-bold font-lato text-black mb-1">
                    Welcome Back!
                  </h1>
                  <p className="text-gray-400 mb-1 font-lato ">
                    Get thrifted items at amazing deals
                  </p>
                </div>
                <Form className=" " onSubmit={signIn}>
                  <FormGroup className="relative w-full mt-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdOutlineEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      className={`w-full h-14 ${
                        emailError ? "border-red-500" : "border-none"
                      } bg-gray-300 px-14  font-semibold text- rounded-full`}
                      onChange={handleEmailChange}
                    />
                  </FormGroup>

                  <FormGroup className="relative w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdOutlineLock className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full h-14 ${
                        passwordError ? "border-red-500" : "border-none"
                      } bg-gray-300 px-14 font-semibold text- rounded-full`}
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
                  <div className="flex justify-end font-normal">
                    <p className="text-customOrange font-lato text-xs">
                      <Link to="/forgetpassword">Forgot password?</Link>
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    className="glow-button w-full h-12 mt-7 bg-customOrange text-white font-medium rounded-full flex justify-center items-center"
                    disabled={!email || !password}
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
                      "Sign In"
                    )}
                  </motion.button>
                  <div className="text-center font-light font-lato mt-2 flex justify-center">
                    <p className="text-gray-900 text-sm">
                      Don't have an account?{" "}
                      <span className="font-normal  text-customOrange">
                        <Link to="/signup">Sign up</Link>
                      </span>
                    </p>
                  </div>
                </Form>
              </div>
            </div>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Login;

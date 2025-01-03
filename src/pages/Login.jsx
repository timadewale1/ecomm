import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { IoCloseOutline } from "react-icons/io5";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup, // Import signInWithPopup for Google sign-in
} from "firebase/auth";
import { auth, db } from "../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";

import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdOutlineCancel, MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import toast from "react-hot-toast";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc"; // Import Google icon
import { useDispatch } from "react-redux";
import { setCart } from "../redux/actions/action";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";

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
  const mergeCarts = (cart1, cart2) => {
    const mergedCart = { ...cart1 };

    for (const vendorId in cart2) {
      if (mergedCart[vendorId]) {
        // Merge products for the same vendor
        const vendorCart1 = mergedCart[vendorId].products;
        const vendorCart2 = cart2[vendorId].products;

        for (const productKey in vendorCart2) {
          if (vendorCart1[productKey]) {
            // If product exists in both carts, sum quantities
            vendorCart1[productKey].quantity +=
              vendorCart2[productKey].quantity;
          } else {
            // Add new product to vendor's cart
            vendorCart1[productKey] = vendorCart2[productKey];
          }
        }
      } else {
        // Add new vendor to merged cart
        mergedCart[vendorId] = cart2[vendorId];
      }
    }

    return mergedCart;
  };

  const fetchCartFromFirestore = async (userId, localCart) => {
    try {
      const cartDoc = await getDoc(doc(db, "carts", userId));
      let firestoreCart = {};
      if (cartDoc.exists()) {
        firestoreCart = cartDoc.data().cart;
        console.log("Fetched cart from Firestore: ", firestoreCart);
      } else {
        console.log("No cart found in Firestore, initializing empty cart");
      }

      // Merge the carts
      const mergedCart = mergeCarts(firestoreCart, localCart);
      console.log("Merged cart: ", mergedCart);

      // Save the merged cart back to Firestore
      await setDoc(doc(db, "carts", userId), { cart: mergedCart });

      // Update the Redux store and localStorage
      dispatch(setCart(mergedCart));
    } catch (error) {
      console.error("Error fetching or merging cart from Firestore: ", error);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();

    if (!email || !validateEmail(email)) {
      setEmailError(true);
      toast.error("Please fill in all fields correctly.");
      return;
    }

    if (!password) {
      setPasswordError(true);
      toast.error("Please fill in all fields correctly.");
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

      if (!user.emailVerified) {
        setLoading(false);
        toast.error("Please verify your email before logging in.");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (userData?.isDeactivated) {
        await auth.signOut();
        setLoading(false);
        toast.error(
          "Your account has been deactivated. Please contact support."
        );
        return;
      }

      if (userData?.role !== "user") {
        await auth.signOut();
        setLoading(false);
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Retrieve local cart
      const localCart = JSON.parse(localStorage.getItem("cart")) || {};

      // Fetch Firestore cart and merge with local cart
      await fetchCartFromFirestore(user.uid, localCart);

      // Clear localStorage cart since it's now merged and stored in Redux and Firestore
      localStorage.removeItem("cart");

      const Name = userData?.username || "User";
      setLoading(false);
      toast.success(`Hello ${Name}, welcome!`);
      const redirectTo = location.state?.from || "/newhome";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoading(false);
      console.error("Error during sign-in:", error);

      let errorMessage =
        "Unable to login. Please check your credentials and try again.";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with this email. Please sign up.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      }

      toast.error(errorMessage);
    }
  };

  const fetchUserDataWithRetry = async (userRef, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return userDoc.data();
      }
      // Wait before retrying to fetch the document
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("User data not available after multiple attempts");
  };
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the email exists in the 'vendors' collection
      const vendorsRef = collection(db, "vendors");
      const vendorQuery = query(vendorsRef, where("email", "==", user.email));
      const vendorSnapshot = await getDocs(vendorQuery);

      if (!vendorSnapshot.empty) {
        // Email exists in vendors, prevent sign-in
        await auth.signOut();
        setLoading(false);
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Check if the email exists in the 'users' collection with role 'vendor'
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        if (userData.role === "vendor") {
          // Email exists in users with role 'vendor', prevent sign-in
          await auth.signOut();
          setLoading(false);
          toast.error("This email is already used for a Vendor account!");
          return;
        }
      }

      // Proceed to create user document if it doesn't exist
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          profileComplete: false,
          role: "user",
          createdAt: new Date(),
        });
        console.log("New user document created in Firestore");
      }

      // Fetch user cart data or sync it with Firestore
      await fetchCartFromFirestore(user.uid);

      // Navigate to the homepage
      toast.success(`Welcome back ${user.displayName}!`);
      navigate("/newhome");
    } catch (error) {
      setLoading(false);
      console.error("Google Sign-In Error:", error);
      let errorMessage = "Google Sign-In failed. Please try again.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account with the same email already exists.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Popup closed before completing sign-in.";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
            <div className="px-3 md:hidden">
              <Link to={-1}>
                <IoCloseOutline className="text-3xl -translate-y-2 font-normal text-black" />
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
                      className={`w-full h-12 ${
                        emailError ? "border-red-500" : "border-none"
                      } w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange`}
                      onChange={handleEmailChange}
                    />
                  </FormGroup>

                  <FormGroup className="relative w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdOutlineLock className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full h-12 ${
                        passwordError ? "border-red-500" : "border-none"
                      } w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange`}
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
                    className="w-full h-12 mt-4 flex items-center justify-center rounded-full bg-customOrange text-white font-semibold font-opensans text-sm hover:bg-orange-600"
                    disabled={!email || !password}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <RotatingLines
                          strokeColor="white"
                          strokeWidth="5"
                          animationDuration="0.75"
                          width="30"
                          visible={true}
                        />
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </motion.button>

                  {/* OR separator */}
                  <div className="flex items-center justify-center mt-2 mb-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-xs text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>

                  {/* Google Sign-In button */}
                  <motion.button
                    type="button"
                    className="w-full h-12 mt-2 bg-white border-2 border-gray-300 text-black font-medium rounded-full flex justify-center items-center"
                    onClick={handleGoogleSignIn}
                  >
                    <FcGoogle className="mr-2 text-2xl" />
                    Sign in with Google
                  </motion.button>
                </Form>
                <div className="text-center font-light font-lato mt-2 flex justify-center">
                  <p className="text-gray-900 text-sm">
                    Don't have an account?{" "}
                    <span className="font-normal  text-customOrange">
                      <Link to="/signup">Sign up</Link>
                    </span>
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

export default Login;

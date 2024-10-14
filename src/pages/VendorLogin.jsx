import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { db } from "../firebase.config";
import { toast } from "react-hot-toast";  // Make sure this import is added
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import Loading from "../components/Loading/Loading";
import { FaAngleLeft } from "react-icons/fa6";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    setPhoneNumber( value );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
  
    console.log("Login form submitted");
  
    // Validations
    if (!email) {
      setEmailError(true);
      console.log("Email is missing");
      toast.error("Please fill in all fields correctly");
      return;
    }
  
    if (!validateEmail(email)) {
      console.log("Invalid email format");
      toast.error("Invalid email format");
      return;
    }
  
    if (!password) {
      console.log("Password is missing");
      toast.error("Please fill in all fields correctly");
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Attempting to sign in");
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      console.log("User signed in", user);
  
      // Check if email is verified
      if (!user.emailVerified) {
        setLoading(false);
        console.log("Email not verified");
        toast.error("Please verify your email before logging in.");
        return;
      }
  
      // Retrieve the vendor document from Firestore to check role and profile completion
      const docRef = doc(db, "vendors", user.uid);
      const docSnap = await getDoc(docRef);
  
      console.log("Fetched vendor document", docSnap.data());
  
      // Check if the vendor is deactivated
      if (docSnap.exists() && docSnap.data().isDeactivated) {
        console.log("Vendor account is deactivated");
        toast.error("Your vendor account is deactivated. Please contact support.");
        await auth.signOut(); // Log the vendor out
        setLoading(false); // Stop loading indicator
        return;
      }
  
      // Check if the vendor's role is correct and profile is complete
      if (docSnap.exists() && docSnap.data().role === "vendor") {
        if (!docSnap.data().profileComplete) {
          console.log("Profile incomplete");
          toast("Please complete your profile.");
          navigate("/complete-profile");
        } else {
          console.log("Login successful");
          toast.success("Login successful");
          navigate("/vendordashboard");
        }
      } else {
        console.log("Vendor login failed, logging out");
        toast.error("This email is already registered as a user. Please login as a user.");
        await auth.signOut(); // Log the user out
      }
    } catch (error) {
      setLoading(false);
      console.error("Error logging in", error.message);
      toast.error("Error logging in: " + error.message);
    }
  };
  


  return (
    <Helmet title="Vendor Login">
      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
            <div>
              <div className="px-2">
                <Link to="/confirm-user-state">
                  <FaAngleLeft className="text-3xl -translate-y-2 font-extralight text-gray-500" />
                </Link>
                <div className="flex flex-col justify-center items-center">
                <VendorLoginAnimation/>
                </div>
                <p className="text-3xl font-bold text-customBrown mt-4 mb-2">Welcome Back!</p>
                <div className="text-md">
                  Join us and elevate your business to new heights
                </div>

                <div className="translate-y-4">
                  
                  <Form className="mt-4" onSubmit={handleLogin}>
                  <FormGroup className="relative mb-2">
                  <input 
                      className="w-full h-14 text-gray-800 font-normal pl-2 rounded-lg border-2 mb-2 focus:border-customOrange focus:outline-none"
                      type="number"
                        name="phoneNumber"
                        placeholder="Enter Phone Number"
                        value={phoneNumber}
                        maxLength={10}
                        onChange={handleInputChange}
                        required
                      />
                    </FormGroup>

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
                        <span className="font-semibold">
                          <Link to="/vendor-signup" className="no-underline">
                          <p className="text-customOrange">Sign Up</p>
                          </Link>
                        </span>
                      </p>
                    </div>
                  </Form>
                </div>
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

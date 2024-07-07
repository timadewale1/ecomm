import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/login.css";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.config";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { toast } from "react-toastify";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Loading from "../components/Loading/Loading";
import Typical from "react-typical";

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
      toast.error("Please fill in all fields correctly");
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      toast.error("Invalid email format");
      setEmailError(true);
      return;
    }

    // Validate password field
    if (!password) {
      setPasswordError(true);
      toast.error("Please fill in all fields correctly");
      return;
    }

    setLoading(true);

    // Add a delay of 3 seconds before attempting to authenticate
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log(user);
      setLoading(false);
      toast.success("Successfully logged in");
      const redirectTo = location.state?.from || "/newhome";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoading(false);
      console.error("Error during sign-in:", error); // Log the error message
      toast.error(
        "Unable to login. Please check your credentials and try again."
      ); // Show user-friendly message
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
    <Helmet title="Login">
      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
              <div className="px-3">
                {/* animation here */}
                <LoginAnimation />
                <div className="flex transform -translate-y-10 mb-2 justify-center">
                  <Typical
                    steps={["The real market place", 5000, "", 2000]}
                    loop={Infinity}
                    wrapper="h1"
                    className="font-ubuntu italic text-customOrange text-xs font-light"
                  />
                </div>
                <div className="-translate-y-5">
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
                        className={`w-full h-11 ${
                          emailError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 mb-1 font-semibold text- rounded-full`}
                        onChange={handleEmailChange}
                      />
                    </FormGroup>

                    <FormGroup className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full h-11 ${
                          passwordError ? "border-red-500" : "border-none"
                        } bg-gray-300 px-10 font-semibold text- rounded-full`}
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

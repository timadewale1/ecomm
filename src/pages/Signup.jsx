import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row,  Form, FormGroup } from "reactstrap";
import { Link } from "react-router-dom";
import "../styles/login.css";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase.config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import Typical from "react-typical";
import { storage } from "../firebase.config";
import { toast } from "react-toastify";
import { db } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import SignUpAnimation from "../SignUpAnimation/SignUpAnimation";
import Loading from "../components/Loading/Loading";
import { FaRegUser } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";
import { MdEmail } from "react-icons/md";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const signup = async (e) => {
    e.preventDefault();

    if (!username || !email || !password || !file) {
      toast.error("All fields are required. Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const emailExists = await getDoc(doc(db, "users", email));
      if (emailExists.exists()) {
        setLoading(false);
        return toast.error("Email already exists. Please use a different email.");
      }

      // Check password strength
      if (password.length < 8 || !/[A-Z]/.test(password)) {
        setLoading(false);
        return toast.error("Password must be at least 8 characters long and contain at least one uppercase letter.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const storageRef = ref(storage, `images/${Date.now() + username}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        (error) => {
          toast.error("Error uploading image. Please try again.");
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
            // Update user profile
            await updateProfile(user, {
              displayName: username,
              photoURL: downloadURL,
            }).catch((error) => {
              console.error("Error updating profile: ", error);
            });

            // Store user data in Firestore
            const role = isUserAdmin(email) ? "admin" : "user";

            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              displayName: username,
              email,
              photoURL: downloadURL,
              role,
            });
          });
        }
      );
      setLoading(false);

      toast.success("Account created successfully. Please login.");
      navigate("/login");
    } catch (error) {
      setLoading(false);
      if (error.code === "auth/email-already-in-use") {
        return toast.error("Email already exists. Please use a different email.");
      } else {
        toast.error("Cannot sign up at the moment. Please try again later.");
        console.error("Signup error:", error);
      }
    }
  };

  const isUserAdmin = (userEmail) => {
    const adminEmails = ["admin@adetmart.com", "timmyadewale1@gmail.com"];
    return adminEmails.includes(userEmail);
  };

  return (
    <Helmet className="p-4">
      <SignUpAnimation />
      <div className="flex transform -translate-y-2 mb-2 justify-center">
        <Typical
          steps={[
            "Welcome to My Thrift", 4000, // Show "Welcome to My Thrift" and wait for 4 seconds
            "Welcome to My Thrift, ", 500, // Continue typing ", " with a slight delay
            "Welcome to My Thrift, The real market place", 7000, // Then show the full text and wait for 7 seconds
            "", 2000, // Pause for 2 seconds before restarting
          ]}
          loop={Infinity}
          wrapper="h1"
          className="font-ubuntu italic text-customOrange text-xl font-light"
        />
      </div>

      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
              <div className="-translate-y-7">
                <h1 className="text-5xl font-semibold font-ubuntu text-black mb-4">Sign Up</h1>

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
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Password must be at least 8 characters long and contain at least one uppercase letter
                    </p>
                  </div>

                  <FormGroup className="relative">
                    <label
                      htmlFor="file-upload"
                      className="w-44 rounded-full h-14 text-xs bg-black font-semibold text-white flex items-center justify-center cursor-pointer"
                    >
                      Select Profile Picture
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                    />
                  </FormGroup>

                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="glow-button w-full h-14 mt-7 bg-customOrange text-white font-semibold rounded-full"
                  >
                    Create account
                  </motion.button>
                  <div className="text-center font-light mt-2 flex justify-center">
                    <p className="text-gray-700">
                      Already have an account? <span className="underline font-semibold text-black"><Link to="/login">Login</Link></span>
                    </p>
                  </div>
                </Form>
              </div>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Signup;

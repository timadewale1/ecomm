import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Col, Form, FormGroup } from "reactstrap";
import { Link } from "react-router-dom";
import "../styles/login.css";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase.config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";

import { storage } from "../firebase.config";
import { toast } from "react-toastify";
import { db } from "../firebase.config";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const signup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emailExists = await getDoc(doc(db, "users", email));
      if (emailExists.exists()) {
        setLoading(false);
        return toast.error("Email already exists");
      }

      // Check password strength
      if (password.length < 8 || !/[A-Z]/.test(password)) {
        setLoading(false);
        return toast.error(
          "Password must be at least 8 characters long and contain at least one capital letter"
        );
      }
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const storageRef = ref(storage, `images/${Date.now() + username}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        (error) => {
          toast.error(error.message);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
            // upadate user profile
            await updateProfile(user, {
              displayName: username,
              photoURL: downloadURL,
            }).catch((error) => {
              console.error("Error adding document: ", error);
            });

            // store user data in firestore database
            console.log("Before setDoc");
            const role = isUserAdmin(email) ? "admin" : "user";

            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              displayName: username,
              email,
              photoURL: downloadURL,
              role,
            });
            console.log("After setDoc");
          });
        }
      );
      setLoading(false);

      toast.success("Account Created Successfully");
      navigate("/login");
      console.log("done");
    } catch (error) {
      setLoading(false);
      if (error.code === "auth/email-already-in-use") {
        // Email already exists
        return toast.error("Email already exists");
      } else {
        // Handle other errors
        toast.error("An error occurred during signup");
        console.error("Signup error:", error);
      }
    }
  };

  const isUserAdmin = (userEmail) => {
    const adminEmails = ["admin@adetmart.com", "timmyadewale1@gmail.com"];
    return adminEmails.includes(userEmail);
  };

  return (
    <Helmet title="Signup">
      <section>
        <Container>
          <Row>
            {loading ? (
              <Col lg="12" className="text-center">
                <h5 className="fw-bold">Loading</h5>
              </Col>
            ) : (
              <Col lg="6" className="m-auto text-center">
                <h3 className="fw-bold mb-4">Signup</h3>

                <Form className="auth__form" onSubmit={signup}>
                  <FormGroup className="form__group">
                    <input
                      required
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className="form__group">
                    <input
                      required
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className="form__group">
                    <input
                      required
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </FormGroup>
                  <p>
                    Password must be at least 8 characters long and contain at
                    least one capital letter
                  </p>
                  <FormGroup className="form__group">
                    <span>
                      <p>Profile Picture</p>
                    </span>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </FormGroup>

                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="buy__btn auth__btn"
                  >
                    create account
                  </motion.button>
                  <p>
                    Already have an account? <Link to="/login">login</Link>
                  </p>
                </Form>
              </Col>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Signup;

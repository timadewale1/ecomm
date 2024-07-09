import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Retrieve the vendor document from Firestore to check role
      const docRef = doc(db, "vendors", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().role === "vendor") {
        toast.success("Login successful");
        navigate("/vendordashboard");
      } else {
        toast.error("You are not authorized to access this page");
        await auth.signOut();
      }
    } catch (error) {
      toast.error("Error logging in: " + error.message);
    }
  };

  return (
    <div>
      <h2>Vendor Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default VendorLogin;

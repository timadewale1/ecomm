import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { storage, db } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VendorSignup = () => {
  const [vendorData, setVendorData] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
    location: "",
    categories: "",
    image: null,
  });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setVendorData({ ...vendorData, image: e.target.files[0] });
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Initialize Firebase Auth
      const auth = getAuth();

      // Upload image to Firebase Storage
      const imageRef = ref(storage, `vendors/${vendorData.image.name}`);
      await uploadBytes(imageRef, vendorData.image);
      const downloadURL = await getDownloadURL(imageRef);

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        vendorData.email,
        vendorData.password
      );
      const user = userCredential.user;

      // Store vendor data in Firestore under "vendors" collection
      await setDoc(doc(db, "vendors", user.uid), {
        uid: user.uid,
        name: vendorData.name,
        email: vendorData.email,
        shopName: vendorData.shopName,
        location: vendorData.location,
        categories: vendorData.categories,
        imageUrl: downloadURL,
        role: "vendor",
      });

      toast.success("Vendor account created successfully");
      navigate("/vendorlogin");
    } catch (error) {
      toast.error("Error signing up vendor: " + error.message);
    }
  };

  return (
    <div>
      <h2>Vendor Signup</h2>
      <form onSubmit={handleSignup}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          onChange={handleInputChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="shopName"
          placeholder="Shop Name"
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Store Location"
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="categories"
          placeholder="Categories"
          onChange={handleInputChange}
          required
        />
        <input type="file" onChange={handleImageChange} required />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default VendorSignup;

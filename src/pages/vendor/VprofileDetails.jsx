import React, { useEffect, useState } from "react";
import { FaAngleLeft, FaEye, FaEyeSlash, FaPen, FaTimes } from "react-icons/fa";
import { FaRegCircleUser, FaShop } from "react-icons/fa6";
import { GrSecure } from "react-icons/gr";
import { MdEmail } from "react-icons/md";

import useAuth from "../../custom-hooks/useAuth";
import {
  sendEmailVerification,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const VprofileDetails = ({ showDetails, setShowDetails }) => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [editD, setEditD] = useState("");
  const [email, setEmail] = useState("");
  const [editE, setEditE] = useState("");
  const [shopName, setShopName] = useState("");
  const [editS, setEditS] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vendorDoc.exists()) {
            const data = vendorDoc.data();
            setUserData(data);
            setDisplayName(data.firstName + " " + data.lastName);
            setEmail(data.email || "");
            setShopName(data.shopName || "");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleSave = async () => {
    if (editField === "displayName" && /[^a-zA-Z\s]/.test(displayName)) {
      toast.error("You cannot use numbers as username!", {
        className: "custom-toast",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Other profile updates...
      if (editField === "displayName") {
        await updateProfile(auth.currentUser, { displayName });
        await updateDoc(doc(db, "vendors", currentUser.uid), { displayName });
      } else if (editField === "email") {
        await updateEmail(auth.currentUser, email);
        await sendEmailVerification(auth.currentUser);
        await updateDoc(doc(db, "vendors", currentUser.uid), { email: editE });
      } else if (editField === "password") {
        await updatePassword(auth.currentUser, password);
        toast.success("Password updated successfully", {
          className: "custom-toast",
        });
      } else if (editField === "shopName") {
        if (shopName === "") {
          toast.error("Store Name cannot be empty", {
            className: "custom-toast",
          });
          return;
        } else if (shopName.length <= 3) {
          toast.error("Store Name must be more than 3 characters", {
            className: "custom-toast",
          });
          return;
        }
        await updateDoc(doc(db, "vendors", currentUser.uid), {
          shopName: editS,
        });
        toast.success("Store Name has been changed", {
          className: "custom-toast",
        });
      }

      // Update photoURL
      await updateDoc(doc(db, "vendors", currentUser.uid), {
        photoURL: userData.photoURL,
      });

      toast.success("Profile updated successfully", {
        className: "custom-toast",
      });

      setIsEditing(false);
      setEditField("");
    } catch (error) {
      console.log(error);
      toast.error("Error updating profile, try again later", {
        className: "custom-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (field) => {
    setEditField(field);
    setIsEditing(true);
  };

  return (
    <div>
      <div className="flex flex-col p-2 items-center">
        <div className="sticky top-0 bg-white z-10 flex items-center -translate-y-4 justify-between h-24 w-full">
          <div className="flex items-center space-x-2">
            <FaAngleLeft
              className="text-2xl text-black cursor-pointer"
              onClick={() => {
                console.log("Closing Profile Details");
                setShowDetails(false);
              }}
            />
            <h1 className="text-xl font-medium font-ubuntu text-black   ">
              Profile Details
            </h1>
          </div>
        </div>
        <div className="w-full translate-y-14 ">
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              User Name
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <FaRegCircleUser className="text-black text-xl mr-4" />
              <p className="text-size font-medium text-black capitalize w-full">
                {displayName}
              </p>
              <FaPen
                className="text-black cursor-pointer ml-2"
                onClick={() => handleEdit("displayName")}
              />
            </div>
          </div>
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Store Name
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <FaShop className="text-black text-xl mr-4" />
              <p className="text-lg text-black w-full font-medium">
                {shopName}
              </p>
              <FaPen
                className="text-black cursor-pointer ml-2"
                onClick={() => handleEdit("shopName")}
              />
            </div>
          </div>
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className=" text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500  ">
              Email
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <MdEmail className="text-black text-xl mr-4" />
              <p className="text-size text-black w-full font-medium overflow-x-auto">
                {email}
              </p>
              <FaPen
                className="text-black cursor-pointer ml-2"
                onClick={() => handleEdit("email")}
              />
            </div>
          </div>
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Password
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <GrSecure className="text-black text-xl mr-4" />
              <p className="text-lg text-black w-full font-medium">*******</p>
              <FaPen
                className="text-black cursor-pointer ml-2"
                onClick={() => handleEdit("password")}
              />
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-white bg-opacity-50 px-14 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaTimes
              className="absolute top-2 right-2 text-black cursor-pointer"
              onClick={() => setIsEditing(false)}
            />
            <h2 className="text-xl font-semibold mb-4">
              Edit{" "}
              {editField === "displayName"
                ? "Name"
                : editField === "email"
                ? "Email"
                : editField === "shopName"
                ? "Store Name"
                : "Password"}
            </h2>
            {editField === "displayName" && (
              <input
                type="text"
                place={displayName}
                onChange={(e) => setEditD(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            )}
            {editField === "email" && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEditE(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            )}
            {editField === "shopName" && (
              <input
                type="text"
                value={shopName}
                onChange={(e) => setEditS(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            )}
            {editField === "password" && (
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="New Password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <span
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
                <small className="text-gray-500">
                  Password must be at least 8 characters long and include at
                  least one uppercase letter.
                </small>
              </div>
            )}
            {(editField === "email" || editField === "password") && (
              <div className="relative w-full mt-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <span
                  className="absolute right-3 top-3 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                className="bg-customOrange text-white font-semibold px-4 py-2 rounded"
                onClick={handleSave}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VprofileDetails;

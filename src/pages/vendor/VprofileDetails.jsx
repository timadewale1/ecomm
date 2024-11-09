import React, { useEffect, useState } from "react";
import { FaEye, FaEyeSlash, FaPen, FaTimes } from "react-icons/fa";
import { FaShop } from "react-icons/fa6";
import { GrSecure } from "react-icons/gr";
import { MdEmail } from "react-icons/md";
import { ChevronLeft, User } from "lucide-react";

import useAuth from "../../custom-hooks/useAuth";
import {
  sendEmailVerification,
  updateEmail,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Loading from "../../components/Loading/Loading";

const VprofileDetails = ({ showDetails, setShowDetails }) => {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State variables
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  
  // Editable fields
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editShopName, setEditShopName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  
  // Displayed fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");

  // Other state variables
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  

  // Fetch user data on component mount or when currentUser changes
  useEffect(() => {
    setIsLoading(true);
    const fetchUserData = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vendorDoc.exists()) {
            const data = vendorDoc.data();
            setUserData(data);
            setDisplayName(`${data.firstName} ${data.lastName}`);
            setEmail(data.email || "");
            setShopName(data.shopName || "");
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data.", {
            className: "custom-toast",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  // Handle initiating edit mode
  const handleEdit = (field) => {
    setEditField(field);
    if (field === "displayName") {
      setEditDisplayName(displayName);
    } else if (field === "email") {
      setEditEmail(email);
    } else if (field === "shopName") {
      setEditShopName(shopName);
    } else if (field === "password") {
      setEditPassword("");
      setCurrentPassword("");
    }
    setIsEditing(true);
  };

  // Handle saving edits
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (editField === "displayName") {
        // Validate display name
        if (/[^a-zA-Z\s]/.test(editDisplayName)) {
          toast.error("You cannot use numbers or special characters in the name!", {
            className: "custom-toast",
          });
          setIsLoading(false);
          return;
        }

        // Update Firebase Auth displayName
        await updateProfile(auth.currentUser, { displayName: editDisplayName });

        // Assuming firstName and lastName are stored separately in Firestore
        const nameParts = editDisplayName.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        await updateDoc(doc(db, "vendors", currentUser.uid), {
          firstName,
          lastName,
        });

        // Update local state
        setDisplayName(editDisplayName);

        toast.success("Display Name updated successfully!", {
          className: "custom-toast",
        });

      } else if (editField === "email") {
        // Reauthenticate user before updating email
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);

        // Update Firebase Auth email
        await updateEmail(auth.currentUser, editEmail);
        await sendEmailVerification(auth.currentUser);

        // Update Firestore email field
        await updateDoc(doc(db, "vendors", currentUser.uid), {
          email: editEmail,
        });

        // Update local state
        setEmail(editEmail);

        toast.success("Email updated successfully! Please verify your new email.", {
          className: "custom-toast",
        });

      } else if (editField === "shopName") {
        // Validate shop name
        if (editShopName.trim() === "") {
          toast.error("Store Name cannot be empty!", {
            className: "custom-toast",
          });
          setIsLoading(false);
          return;
        } else if (editShopName.trim().length <= 3) {
          toast.error("Store Name must be more than 3 characters!", {
            className: "custom-toast",
          });
          setIsLoading(false);
          return;
        }

        // Update Firestore shopName field
        await updateDoc(doc(db, "vendors", currentUser.uid), {
          shopName: editShopName.trim(),
        });

        // Update local state
        setShopName(editShopName.trim());

        toast.success("Store Name updated successfully!", {
          className: "custom-toast",
        });

      } else if (editField === "password") {
        // Reauthenticate user before updating password
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);

        // Validate new password
        if (editPassword.length < 8) {
          toast.error("Password must be at least 8 characters long!", {
            className: "custom-toast",
          });
          setIsLoading(false);
          return;
        }
        if (!/[A-Z]/.test(editPassword)) {
          toast.error("Password must include at least one uppercase letter!", {
            className: "custom-toast",
          });
          setIsLoading(false);
          return;
        }

        // Update Firebase Auth password
        await updatePassword(auth.currentUser, editPassword);

        toast.success("Password updated successfully!", {
          className: "custom-toast",
        });
      }

      // Close edit modal
      setIsEditing(false);
      setEditField("");
    } catch (error) {
      console.error("Error updating profile:", error);
      // Handle specific Firebase auth errors
      if (error.code === "auth/wrong-password") {
        toast.error("Current password is incorrect!", {
          className: "custom-toast",
        });
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("The email address is already in use by another account!", {
          className: "custom-toast",
        });
      } else {
        toast.error("Error updating profile. Please try again later.", {
          className: "custom-toast",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle closing the edit modal
  const handleCloseEdit = () => {
    setIsEditing(false);
    setEditField("");
  };

  // If user data is loading, you can show a loader or skeleton here
  if (isLoading && !userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
      <Loading/>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex -translate-y-4 h-24 w-full">
          <div className="flex items-center space-x-2">
            <ChevronLeft
              className="text-2xl text-black cursor-pointer"
              onClick={() => {
                console.log("Closing Profile Details");
                setShowDetails(false);
              }}
            />
            <h1 className="text-xl font-medium font-ubuntu text-black">
              Profile Details
            </h1>
          </div>
        </div>

        {/* Profile Information */}
        <div className="w-full mt-4">
          {/* Display Name */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              User Name
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <User className="text-black text-xl mr-4" />
              <p className="text-size font-medium text-black capitalize w-full">
                {displayName}
              </p>
              <FaPen
                className="text-black cursor-pointer ml-2"
                onClick={() => handleEdit("displayName")}
              />
            </div>
          </div>

          {/* Store Name */}
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

          {/* Email */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
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

          {/* Password */}
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

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaTimes
              className="absolute top-2 right-2 text-black cursor-pointer"
              onClick={handleCloseEdit}
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

            {/* Display Name Edit */}
            {editField === "displayName" && (
              <div className="mb-4">
                <label className="block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your display name"
                />
              </div>
            )}

            {/* Email Edit */}
            {editField === "email" && (
              <div className="mb-4">
                <label className="block mb-1">New Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your new email"
                />
              </div>
            )}

            {/* Store Name Edit */}
            {editField === "shopName" && (
              <div className="mb-4">
                <label className="block mb-1">Store Name</label>
                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your store name"
                />
              </div>
            )}

            {/* Password Edit */}
            {editField === "password" && (
              <>
                <div className="mb-4 relative">
                  <label className="block mb-1">New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Enter new password"
                  />
                  <span
                    className="absolute right-3 top-9 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                  <small className="text-gray-500">
                    Password must be at least 8 characters long and include at least one uppercase letter.
                  </small>
                </div>
                <div className="mb-4 relative">
                  <label className="block mb-1">Current Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Enter current password"
                  />
                  <span
                    className="absolute right-3 top-9 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </>
            )}

            {/* For Email and Password, require current password */}
            {(editField === "email" || editField === "password") && (
              <div className="mb-4 relative">
                {editField !== "password" && (
                  <>
                    <label className="block mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter current password"
                    />
                  </>
                )}
              </div>
            )}

            {/* Update Button */}
            <div className="flex justify-end">
              <button
                className="bg-customOrange text-white font-semibold px-4 py-2 rounded disabled:opacity-50"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VprofileDetails;

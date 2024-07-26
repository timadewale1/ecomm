import React, { useEffect, useState } from "react";
import { FaPen, FaTimes, FaAngleLeft, FaEyeSlash, FaEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { toast } from "react-toastify";
import {
  updateProfile,
  updateEmail,
  sendEmailVerification,
  updatePassword,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { FaRegCircleUser, FaShop } from "react-icons/fa6";

const ProfileDetails = ({ userData, setShowDetails }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      setIsLoading(true);
      const fetchUserData = async () => {
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", auth.currentUser.uid));
          if (vendorDoc.exists()) {
            const data = vendorDoc.data();
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
            setEmail(data.email || "");
            setShopName(data.shopName || "");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, []);

  const handleEdit = (field) => {
    setEditField(field);
    setEditValue(userData[field] || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (editField === "firstName") {
        await updateProfile(auth.currentUser, { displayName: `${editValue} ${lastName}` });
        await updateDoc(doc(db, "vendors", auth.currentUser.uid), {
          firstName: editValue,
        });
        setFirstName(editValue);
      } else if (editField === "lastName") {
        await updateProfile(auth.currentUser, { displayName: `${firstName} ${editValue}` });
        await updateDoc(doc(db, "vendors", auth.currentUser.uid), {
          lastName: editValue,
        });
        setLastName(editValue);
      } else if (editField === "email") {
        await updateEmail(auth.currentUser, editValue);
        await sendEmailVerification(auth.currentUser);
        await updateDoc(doc(db, "vendors", auth.currentUser.uid), {
          email: editValue,
        });
        setEmail(editValue);
      } else if (editField === "shopName") {
        await updateDoc(doc(db, "vendors", auth.currentUser.uid), {
          shopName: editValue,
        });
        setShopName(editValue);
      } else if (editField === "password") {
        await updatePassword(auth.currentUser, editValue);
      }

      toast.success("Profile updated successfully", {
        className: "custom-toast",
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Error updating profile, try again later", {
        className: "custom-toast",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col p-2 items-center">
        <FaAngleLeft
          className="text-2xl cursor-pointer self-start"
          onClick={() => setShowDetails(false)}
        />
        <h1 className="text-xl font-medium font-ubuntu text-black">
          Profile Details
        </h1>
        <div className="w-full translate-y-14">
          <ProfileField
            label="First Name"
            value={firstName}
            icon={<FaRegCircleUser className="text-black text-xl mr-4" />}
            onEdit={() => handleEdit("firstName")}
          />
          <ProfileField
            label="Last Name"
            value={lastName}
            icon={<FaRegCircleUser className="text-black text-xl mr-4" />}
            onEdit={() => handleEdit("lastName")}
          />
          <ProfileField
            label="Store Name"
            value={shopName}
            icon={<FaShop className="text-black text-xl mr-4" />}
            onEdit={() => handleEdit("shopName")}
          />
          <ProfileField
            label="Email"
            value={email}
            icon={<MdEmail className="text-black text-xl mr-4" />}
            onEdit={() => handleEdit("email")}
          />
          <ProfileField
            label="Password"
            value="*******"
            icon={<GrSecure className="text-black text-xl mr-4" />}
            onEdit={() => handleEdit("password")}
          />
        </div>
      </div>

      {isEditing && (
        <EditModal
          field={editField}
          value={editValue}
          setValue={setEditValue}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </>
  );
};

const ProfileField = ({ label, value, icon, onEdit }) => (
  <div className="flex flex-col bg-gray-200 rounded-lg items-center w-full mt-6">
    <hr className="w-full border-gray-400" />
    <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
      {label}
    </h1>
    <div className="flex items-center justify-between w-full px-4 py-3">
      {icon}
      <p className="text-size text-black w-full font-medium">{value}</p>
      <FaPen className="text-black cursor-pointer ml-2" onClick={onEdit} />
    </div>
    <hr className="w-full border-gray-400" />
  </div>
);

const EditModal = ({
  field,
  value,
  setValue,
  currentPassword,
  setCurrentPassword,
  showPassword,
  setShowPassword,
  onSave,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-white bg-opacity-50 px-14 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
      <FaTimes className="absolute top-2 right-2 text-black cursor-pointer" onClick={onCancel} />
      <h2 className="text-xl font-semibold mb-4">
        Edit {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : field}
      </h2>
      <InputField
        field={field}
        value={value}
        setValue={setValue}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      {(field === "email" || field === "password") && (
        <div className="relative w-full mt-4">
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button className="bg-customOrange text-white font-semibold px-4 py-2 rounded" onClick={onSave}>
          Update
        </button>
      </div>
    </div>
  </div>
);

const InputField = ({ field, value, setValue, showPassword, setShowPassword }) => {
  if (field === "password") {
    return (
      <div className="relative w-full">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          placeholder="New Password"
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <span className="absolute right-3 top-3 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </span>
        <small className="text-gray-500">
          Password must be at least 8 characters long and include at least one uppercase letter.
        </small>
      </div>
    );
  }

  return (
    <input
      type={field === "email" ? "email" : "text"}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded"
    />
  );
};

export default ProfileDetails;

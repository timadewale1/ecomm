import React, { useState } from "react";
import {
  updateProfile,
  updateEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { toast } from "react-toastify";
import { doc, updateDoc } from "firebase/firestore";
import {
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaCalendarAlt,
  FaAngleLeft,
  FaAngleRight,
} from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { PiAtThin, PiSignOutBold } from "react-icons/pi";
import { MdEmail, MdVerified } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { RiEditFill } from "react-icons/ri";
import { RotatingLines } from "react-loader-spinner";
import { useNavigate } from "react-router-dom";

const ProfileDetails = ({
  currentUser,
  userData,
  setUserData,
  setShowDetails,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [username, setUsername] = useState(userData.username || "");
  const [displayName, setDisplayName] = useState(userData.displayName || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(userData.email || "");
  const [phoneNumber, setPhoneNumber] = useState(userData.phoneNumber || "");
  const [birthday, setBirthday] = useState(userData.birthday || "");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEdit = (field) => {
    setEditField(field);
    if (field === "displayName") {
      const [first, last] = displayName.split(" ");
      setFirstName(first || "");
      setLastName(last || "");
    }
    setIsEditing(true);
  };

  const validateFields = () => {
    if (
      editField === "username" &&
      (!username || /[^a-zA-Z0-9]/.test(username))
    ) {
      toast.error("Username must contain only letters and numbers.");
      return false;
    }
    if (
      editField === "displayName" &&
      (!firstName ||
        !lastName ||
        /[^a-zA-Z\s]/.test(firstName) ||
        /[^a-zA-Z\s]/.test(lastName))
    ) {
      toast.error("First and Last name must contain only letters.");
      return false;
    }
    if (editField === "email" && (!email || !/\S+@\S+\.\S+/.test(email))) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (
      editField === "phoneNumber" &&
      (!phoneNumber || !/^\d{11,}$/.test(phoneNumber))
    ) {
      toast.error("Phone number must be at least 11 digits.");
      return false;
    }
    if (
      (editField === "email" || editField === "password") &&
      !currentPassword
    ) {
      toast.error("Please enter your current password.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    setIsEditing(false);
    setIsLoading(true);

    try {
      if (editField === "username") {
        await updateProfile(auth.currentUser, { displayName: username });
        await updateDoc(doc(db, "users", currentUser.uid), { username });
        setUserData((prev) => ({ ...prev, username }));
      } else if (editField === "displayName") {
        const fullName = `${firstName} ${lastName}`.trim();
        await updateProfile(auth.currentUser, { displayName: fullName });
        await updateDoc(doc(db, "users", currentUser.uid), {
          displayName: fullName,
        });
        setUserData((prev) => ({ ...prev, displayName: fullName }));
      } else if (editField === "email") {
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, email);
        await sendEmailVerification(auth.currentUser);
        await updateDoc(doc(db, "users", currentUser.uid), { email });
        setUserData((prev) => ({ ...prev, email }));
      } else if (editField === "password") {
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, password);
      } else if (editField === "phoneNumber") {
        await updateDoc(doc(db, "users", currentUser.uid), { phoneNumber });
        setUserData((prev) => ({ ...prev, phoneNumber }));
      } else if (editField === "birthday") {
        await updateDoc(doc(db, "users", currentUser.uid), { birthday });
        setUserData((prev) => ({ ...prev, birthday }));
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/login");
    } catch (error) {
      toast.error("Error logging out", { className: "custom-toast" });
    }
  };

  return (
    <div className="flex flex-col p-2 items-center">
      <div className="cursor-pointer self-start flex">
        <FaAngleLeft
          className="text-2xl "
          onClick={() => {
            console.log("Closing Profile Details");
            setShowDetails(false);
          }}
        />
        <h1 className="text-xl font-medium  font-ubuntu text-black ">
          Profile Details
        </h1>
      </div>

      <div className="w-full mt-4">
        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            UserName
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <PiAtThin className="text-black text-xl mr-4" />
            <p className="text-size font-medium font-poppins text-black w-full">
              {username || "Username"}
            </p>
            <MdVerified
              className={`${
                username ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("username")}
            />
          </div>
        </div>

        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Account Name
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <FaRegCircleUser className="text-black text-xl mr-4" />
            <p className="text-size font-medium font-poppins text-black w-full">
              {displayName || "Add Account Name"}
            </p>
            <MdVerified
              className={`${
                displayName ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("displayName")}
            />
          </div>
        </div>

        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Email
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <MdEmail className="text-black text-xl mr-4" />
            <p className="text-size font-medium font-poppins text-black w-full">
              {email}
            </p>
            <MdVerified
              className={`${
                email ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("email")}
            />
          </div>
        </div>

        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Phone Number
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <FaPhone className="text-black text-xl mr-4" />
            <p className="text-size font-poppins font-medium text-black w-full">
              {phoneNumber || "Add Phone Number"}
            </p>
            <MdVerified
              className={`${
                phoneNumber ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("phoneNumber")}
            />
          </div>
        </div>

        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Birthday
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <FaCalendarAlt className="text-black text-xl mr-4" />
            <p className="text-size font-medium font-poppins text-black w-full">
              {birthday}
            </p>
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("birthday")}
            />
          </div>
        </div>

        <div className="flex flex-col bg-gray-200 rounded-lg mb-6 items-center w-full">
          <hr className="w-full border-gray-400" />
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Password
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <GrSecure className="text-black text-xl mr-4" />
            <p className="text-lg text-black w-full font-poppins font-medium">
              *******
            </p>
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("password")}
            />
          </div>
        </div>

        <div
          className="flex flex-col bg-gray-200 rounded-lg items-center w-full mt-6 cursor-pointer"
          onClick={handleLogout}
        >
          <hr className="w-full border-gray-400" />
          <div className="flex items-center justify-between w-full px-4 py-3">
            <PiSignOutBold className="text-red-600 text-xl mr-4" />
            <p className="text-size text-black w-full font-medium">Sign Out</p>
            <FaAngleRight className="text-black text-xl ml-2" />
          </div>
          <hr className="w-full border-gray-400" />
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
              {editField === "username"
                ? "Username"
                : editField === "displayName"
                ? "Account Name"
                : editField === "email"
                ? "Email"
                : editField === "password"
                ? "Password"
                : editField === "phoneNumber"
                ? "Phone Number"
                : "Birthday"}
            </h2>
            {editField === "username" && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />
            )}
            {editField === "displayName" && (
              <>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </>
            )}
            {editField === "email" && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {editField === "phoneNumber" && (
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            )}
            {editField === "birthday" && (
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
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

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <RotatingLines
            strokeColor="orange"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
      )}
    </div>
  );
};

export default ProfileDetails;

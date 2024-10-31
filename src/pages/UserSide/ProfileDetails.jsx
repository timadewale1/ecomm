import React, { useState, useEffect } from "react";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import toast from "react-hot-toast";
import { doc, updateDoc } from "firebase/firestore";
import {
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaCalendarAlt,
  FaAngleLeft,

} from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { PiAtThin } from "react-icons/pi";
import { MdEmail, MdVerified } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { RiEditFill } from "react-icons/ri";
import { RotatingLines } from "react-loader-spinner";
import { useNavigate } from "react-router-dom";
import { FaRegTimesCircle } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";


const ProfileDetails = ({
  currentUser,
  userData,
  setUserData,
  setShowDetails,
}) => {
  useEffect(() => {
    console.log("currentUser:", currentUser);
    console.log("userData:", userData);
  }, [currentUser, userData]);

  

  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [username, setUsername] = useState(userData?.username || "");
  const [displayName, setDisplayName] = useState(userData?.displayName || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || "");
  const [birthday, setBirthday] = useState(userData?.birthday || "");
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
    if (
      editField === "phoneNumber" &&
      (!phoneNumber || !/^\d{11,}$/.test(phoneNumber))
    ) {
      toast.error("Phone number must be at least 11 digits.");
      return false;
    }
    if (editField === "password" && !currentPassword) {
      toast.error("Please enter your current password to reset your password.");
      return false;
    }
    return true;
  };

  const formatName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    setIsLoading(true);

    try {
      if (editField === "username") {
        const formattedUsername = formatName(username);
        await updateProfile(auth.currentUser, {
          displayName: formattedUsername,
        });
        await updateDoc(doc(db, "users", currentUser.uid), {
          username: formattedUsername,
        });
        setUserData((prev) => ({ ...prev, username: formattedUsername }));
        setUsername(formattedUsername);
      } else if (editField === "displayName") {
        const formattedFirstName = formatName(firstName);
        const formattedLastName = formatName(lastName);
        const fullName = `${formattedFirstName} ${formattedLastName}`.trim();
        await updateProfile(auth.currentUser, { displayName: fullName });
        await updateDoc(doc(db, "users", currentUser.uid), {
          displayName: fullName,
        });
        setUserData((prev) => ({ ...prev, displayName: fullName }));
        setDisplayName(fullName);
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
        setPhoneNumber(phoneNumber);
      } else if (editField === "birthday") {
        await updateDoc(doc(db, "users", currentUser.uid), { birthday });
        setUserData((prev) => ({ ...prev, birthday }));
        setBirthday(birthday);
      }

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

 

  return (
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
        
      <div className="w-full ">
        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full ">
         
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            UserName
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <PiAtThin className="text-black text-xl mr-4" />
            <p className="text-size font-normal font-poppins text-black w-full">
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

        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2  items-center w-full">
          
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Account Name
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <FaRegCircleUser className="text-black text-xl mr-4" />
            <p className="text-size font-normal font-poppins text-black w-full">
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

        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Email
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <MdEmail className="text-black text-xl mr-4" />
            <p className="text-size font-normal font-poppins text-black w-full">
              {currentUser.email}
            </p>
            <MdVerified
              className={`${
                currentUser.email ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
          </div>
        </div>

        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
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

        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
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

        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
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

       
      </div>

      {isEditing && (
        <div className="fixed inset-0 border-none rounded-xl bg-customGrey mb-2 px-14 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaRegTimesCircle
              className="absolute top-2 right-2 font-bold text-lg rounded-md text-black cursor-pointer"
              onClick={() => setIsEditing(false)}
            />
            <h2 className="text-xl font-semibold mb-4">
              Edit{" "}
              {editField === "username"
                ? "Username"
                : editField === "displayName"
                ? "Account Name"
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
                onChange={(e) => setUsername(formatName(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />
            )}
            {editField === "displayName" && (
              <>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(formatName(e.target.value))}
                  placeholder="First Name"
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(formatName(e.target.value))}
                  placeholder="Last Name"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </>
            )}
            {editField === "password" && (
              <div className="relative w-72">
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
                <small className="text-gray-500 text-xs">
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
            {editField === "password" && (
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

            <div className="flex justify-end mt-4 relative">
              <button
                className="bg-customOrange text-white text-xs h-9 w-30 font-semibold px-4 py-2 rounded"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="24"
                    visible={true}
                  />
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default ProfileDetails;

import React, { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../firebase.config";
import toast from "react-hot-toast";
import { doc, updateDoc, getDoc } from "firebase/firestore";
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
import { updateUserData } from "../../redux/actions/useractions";
import { NigerianStates } from "../../services/states";
import { CiLocationOn } from "react-icons/ci";
import Loading from "../../components/Loading/Loading";
import { GoChevronLeft } from "react-icons/go";
import Waiting from "../../components/Loading/Waiting";
import Productnotofund from "../../components/Loading/Productnotofund";

const ProfileDetails = ({
  currentUser,

  setShowDetails,
}) => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);

  const [editField, setEditField] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || "");
      setDisplayName(userData.displayName || "");
      setPhoneNumber(userData.phoneNumber || "");
      setBirthday(userData.birthday || "");
      setAddress(userData.address || "");
      setLoading(false);
    } else if (!currentUser) {
      // User is not authenticated
      setLoading(false);
    } else {
      // User is authenticated but userData is not yet available
      setLoading(true);
    }
  }, [userData, currentUser]);

  if (loading) {
    return <Loading />;
  }

  const checkProfileCompletion = async (userId, userData) => {
    const requiredFields = [
      "username",
      "displayName",
      "phoneNumber",
      "address",
    ];
    const isComplete = requiredFields.every((field) => userData[field]);

    if (isComplete) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        profileComplete: true,
      });
    }
  };
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center p-2 justify-center ">
        <div className="sticky top-0 bg-white z-10 flex items-center -translate-y-4 justify-between h-24 w-full">
          <div className="flex items-center space-x-2">
            <GoChevronLeft
              className="text-2xl text-black cursor-pointer"
              onClick={() => {
                setShowDetails(false);
              }}
            />
            <h1 className="text-xl font-medium font-ubuntu text-black   ">
              Profile Details
            </h1>
          </div>
        </div>
        <div className="px-20 flex-col flex justify-center items-center">
          <Productnotofund />
          <p className="text-center text-sm text-gray-800 font-opensans mb-4">
           Oops! You cannot view profile details at the moment because no user is logged in.
          </p>
          <button
            className="bg-customOrange font-opensans text-white px-4 py-2 rounded-full"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

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

    return true;
  };

  const formatName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };
  const handleSave = async () => {
    if (!validateFields()) return;

    if (editField === "address") {
      const stateInAddress = NigerianStates.some((state) =>
        address.endsWith(state)
      );

      if (!stateInAddress) {
        toast.error("Please select a state to complete your address.");
        return;
      }
    }

    setIsLoading(true);

    try {
      let updatedFields = {};
      if (editField === "username") {
        const formattedUsername = formatName(username);
        await updateProfile(auth.currentUser, {
          displayName: formattedUsername,
        });
        await updateDoc(doc(db, "users", currentUser.uid), {
          username: formattedUsername,
        });
        updatedFields.username = formattedUsername;
        setUsername(formattedUsername);
      } else if (editField === "displayName") {
        const formattedFirstName = formatName(firstName);
        const formattedLastName = formatName(lastName);
        const fullName = `${formattedFirstName} ${formattedLastName}`.trim();
        await updateProfile(auth.currentUser, { displayName: fullName });
        await updateDoc(doc(db, "users", currentUser.uid), {
          displayName: fullName,
        });
        updatedFields.displayName = fullName;
        setDisplayName(fullName);
      } else if (editField === "phoneNumber") {
        await updateDoc(doc(db, "users", currentUser.uid), { phoneNumber });
        updatedFields.phoneNumber = phoneNumber;
        setPhoneNumber(phoneNumber);
      } else if (editField === "address") {
        await updateDoc(doc(db, "users", currentUser.uid), { address });
        updatedFields.address = address;
        setAddress(address);
      } else if (editField === "birthday") {
        await updateDoc(doc(db, "users", currentUser.uid), { birthday });
        updatedFields.birthday = birthday;
        setBirthday(birthday);
      }

      // Update Redux store with new user data
      dispatch(updateUserData(updatedFields));

      toast.success("Profile updated successfully");
      await checkProfileCompletion(currentUser.uid, {
        ...userData,
        ...updatedFields,
      });
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
          <GoChevronLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => {
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
            <p className="text-size font-poppins font-normal text-black w-full">
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
            <p className="text-size font-normal font-poppins text-black w-full">
              {birthday || "Add Birthday"}
            </p>
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("birthday")}
            />
          </div>
        </div>
        <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
          <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
            Address
          </h1>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <CiLocationOn className="text-black text-xl mr-4" />
            <p className="text-size font-normal font-poppins text-black w-full">
              {address || "Add Delivery Address"}
            </p>
            <MdVerified
              className={`${
                address ? "text-green-500" : "text-yellow-500"
              } text-2xl ml-2`}
            />
            <RiEditFill
              className="text-black cursor-pointer ml-2 text-2xl"
              onClick={() => handleEdit("address")}
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 border-none rounded-xl bg-customGrey bg-opacity-85 mb-2 px-14 flex items-center modals justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaRegTimesCircle
              className="absolute top-2 right-2 font-bold text-lg rounded-md text-black cursor-pointer"
              onClick={() => setIsEditing(false)}
            />
            <h2 className="text-lg font-opensans font-medium mb-4">
              Edit{" "}
              {editField === "username"
                ? "Username"
                : editField === "displayName"
                ? "Account Name"
                : editField === "phoneNumber"
                ? "Phone Number"
                : editField === "address"
                ? "Address"
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
            {editField === "address" && (
              <>
                {/* Address Input */}
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                  placeholder="Enter your address"
                />

                {/* State Dropdown */}
                <label className="block mb-2 text-sm font-medium text-gray-600">
                  Select State
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                  onChange={(e) => {
                    const selectedState = e.target.value;

                    // Ensure the state is appended or replaced correctly
                    const addressWithoutState = address.replace(
                      new RegExp(`,? ${selectedState}$`),
                      ""
                    );
                    setAddress(
                      `${addressWithoutState}, ${selectedState}`.trim()
                    );
                  }}
                >
                  <option value="" disabled selected>
                    Choose your state
                  </option>
                  {NigerianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex justify-end mt-4 relative">
              <button
                className="bg-customOrange flex justify-center text-white text-xs h-9 w-16  font-semibold font-opensans px-4 py-2 rounded"
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

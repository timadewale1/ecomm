import React, { useEffect, useState } from "react";
import {
  signOut,
  updateProfile,
  updateEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import useAuth from "../../custom-hooks/useAuth";
import {
  FaPen,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaAngleRight,
  FaAngleLeft,
} from "react-icons/fa";
import { TbHomeStar } from "react-icons/tb";
import { GrSecure } from "react-icons/gr";
import { GiClothes } from "react-icons/gi";
import { PiSignOutBold } from "react-icons/pi";
import { FaRegCircleUser, FaShop } from "react-icons/fa6";
import { MdEmail, MdHistory, MdHelpOutline } from "react-icons/md";
import { CiMoneyBill } from "react-icons/ci";

import { RotatingLines } from "react-loader-spinner";
import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";

const VendorProfile = () => {
  const navigate = useNavigate();
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
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [faqModalContent, setFaqModalContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

  const handleEdit = (field) => {
    setEditField(field);
    setIsEditing(true);
  };

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

  // const handleSave = async () => {
  //   if (editField === "displayName" && /[^a-zA-Z\s]/.test(displayName)) {
  //     toast.error("You cannot use numbers as username!", {
  //       className: "custom-toast",
  //     });
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     if (editField === "displayName") {
  //       await updateProfile(auth.currentUser, { displayName });
  //       await updateDoc(doc(db, "users", currentUser.uid), { displayName });
  //       toast.success("Profile updated successfully", {
  //         className: "custom-toast",
  //       });
  //     } else {
  //       const credential = EmailAuthProvider.credential(
  //         auth.currentUser.email,
  //         currentPassword
  //       );
  //       await reauthenticateWithCredential(auth.currentUser, credential);

  //       if (editField === "email") {
  //         await updateEmail(auth.currentUser, email);
  //         await sendEmailVerification(auth.currentUser);
  //         await updateDoc(doc(db, "users", currentUser.uid), { email });
  //       } else if (editField === "password") {
  //         await updatePassword(auth.currentUser, password);
  //         toast.success("Password updated successfully", {
  //           className: "custom-toast",
  //         });
  //       }

  //       toast.success("Profile updated successfully", {
  //         className: "custom-toast",
  //       });
  //     }

  //     setIsEditing(false);
  //     setEditField("");
  //   } catch (error) {
  //     console.log(error);
  //     toast.error("Error updating profile, try again later", {
  //       className: "custom-toast",
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      toast.error("Error logging out", { className: "custom-toast" });
    }
  };

  const handleFaqClick = (content) => {
    setFaqModalContent(content);
  };

  const handleAvatarChange = (newAvatar) => {
    setUserData((prev) => ({ ...prev, photoURL: newAvatar }));
  };

  return (
    <div className="pb-4">
      {!showDetails &&
      !showHistory &&
      !showMetrics &&
      !showFAQs &&
      !showDonations ? (
        <div className="flex flex-col items-center">
          <div className="relative flex justify-center w-full h-full">
            {/* Store Image */}
            <div className="relative w-full h-72">
              {isLoading ? (
                <Skeleton height={288} />
              ) : userData && userData.coverImageUrl ? (
                <img
                  src={userData.coverImageUrl}
                  alt="Store"
                  className="w-full h-full object-cover rounded-b-lg bg-gray-400"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 rounded-b-lg" />
              )}

              {/* User Image */}
              <div className="absolute top-52 left-0">
                {isLoading ? (
                  <Skeleton circle height={144} width={144} />
                ) : userData && userData.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="User"
                    className="rounded-full object-cover h-36 w-36 border-2 border-white bg-gray-400"
                  />
                ) : (
                  <img
                    src="" // You might want to provide a placeholder or default image here
                    alt="User"
                    className="rounded-full h-36 w-36 border-4 border-white"
                  />
                )}
                <div className="absolute top-1 right-1 bg-white p-2 rounded-full">
                  <FaPen
                    className=" text-black cursor-pointer"
                    onClick={() => setIsAvatarModalOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            {isLoading ? (
              <Skeleton width={150} height={24} />
            ) : userData && userData.shopName ? (
              <p className="text-md font-medium text-black capitalize">
                {shopName}
              </p>
            ) : (
              <div className="h-6 bg-gray-300 w-40 mt-10" />
            )}
          </div>
          <div className="w-full mt-12">
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                Personal
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center">
                  <FaRegCircleUser className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Profile Details
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowHistory(!showHistory)}
              >
                <div className="flex items-center">
                  <MdHistory className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Recent Activities
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                Data
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => navigate("")}
              >
                <div className="flex items-center">
                  <TbHomeStar className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    View Ratings
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="w-full h-14 flex bg-gray-200">
              <h1 className="text-xl font-ubuntu font-medium mx-4 translate-y-3 text-black">
                More
              </h1>
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowFAQs(!showFAQs)}
              >
                <div className="flex items-center">
                  <MdHelpOutline className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    FAQs
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div className="flex flex-col items-center w-full">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                onClick={() => setShowDonations(true)}
              >
                <div className="flex items-center">
                  <CiMoneyBill className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Donations
                  </h2>
                </div>
                <FaAngleRight className="text-black" />
              </div>
              <hr className="w-full border-gray-600" />
            </div>
            <div
              className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
              onClick={() => navigate("/explore")}
            >
              <div className="flex items-center">
                <GiClothes className="text-black text-xl mr-4" />
                <h2 className="text-size font-normal text-black capitalize">
                  Declutter
                </h2>
              </div>
              <FaAngleRight className="text-black" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <div className="flex flex-col p-2 -py-80 items-center">
              <FaAngleLeft
                className="text-2xl cursor-pointer self-start"
                onClick={() => setShowDetails(false)}
              />
              <h1 className="text-xl font-medium font-ubuntu text-black">
                Profile Details
              </h1>
              <div className="w-full translate-y-14  mt-4">
                <div className="flex flex-col bg-gray-200 rounded-lg items-center w-full">
                  <hr className="w-full border-gray-400" />
                  <h1 className=" text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500  ">
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
                  <hr className="w-full border-gray-400" />
                </div>
                <div className="flex flex-col bg-gray-200 rounded-lg items-center w-full mt-6">
                  <hr className="w-full border-gray-400" />
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
                  <hr className="w-full border-gray-600" />
                </div>
                <div className="flex flex-col  bg-gray-200 rounded-lg items-center w-full mt-6">
                  <hr className="w-full border-gray-600" />
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
                  <hr className="w-full border-gray-400" />
                </div>
                <div className="flex flex-col bg-gray-200 rounded-lg items-center w-full mt-6">
                  <hr className="w-full border-gray-400" />
                  <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
                    Password
                  </h1>
                  <div className="flex items-center justify-between w-full px-4 py-3">
                    <GrSecure className="text-black text-xl mr-4" />
                    <p className="text-lg text-black w-full font-medium">
                      *******
                    </p>
                    <FaPen
                      className="text-black cursor-pointer ml-2"
                      onClick={() => handleEdit("password")}
                    />
                  </div>
                  <hr className="w-full border-gray-600" />
                </div>

                <div
                  className="flex flex-col bg-gray-200 rounded-lg items-center w-full mt-6 cursor-pointer"
                  onClick={handleLogout}
                >
                  <hr className="w-full border-gray-400" />
                  <div className="flex items-center justify-between w-full px-4 py-3">
                    <PiSignOutBold className="text-red-600 text-xl mr-4" />
                    <p className="text-size text-black w-full font-medium">
                      Sign Out
                    </p>
                    <FaAngleRight className="text-black text-xl ml-2" />
                  </div>
                  <hr className="w-full border-gray-400" />
                </div>
              </div>
            </div>
          )}

          {showHistory && (
            <div className="flex flex-col items-center">
              <FaAngleLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowHistory(false)}
              />
              <h2 className="text-xl font-ubuntu mt-4">Recent Activities</h2>
              {/* Render History content here */}
            </div>
          )}

          {showFAQs && (
            <div className="flex p-2 flex-col items-center">
              <FaAngleLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowFAQs(false)}
              />
              <h2 className="text-xl text-black font-ubuntu">FAQs</h2>
              <div className="w-full mt-4">
                <div className="flex flex-col items-center w-full">
                  <hr className="w-full border-gray-600" />
                  <div
                    className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                    onClick={() => handleFaqClick("What is Booking Fee?")}
                  >
                    <p className="text-lg font-semibold text-black capitalize w-full">
                      What is Booking Fee?
                    </p>
                    <FaAngleRight className="text-black" />
                  </div>
                  <hr className="w-full border-gray-600" />
                </div>
                <div className="flex flex-col items-center w-full mt-2">
                  <hr className="w-full border-gray-600" />
                  <div
                    className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                    onClick={() => handleFaqClick("How do I become a vendor?")}
                  >
                    <p className="text-lg font-semibold text-black capitalize w-full">
                      How do I become a vendor?
                    </p>
                    <FaAngleRight className="text-black" />
                  </div>
                  <hr className="w-full border-gray-600" />
                </div>
              </div>
            </div>
          )}

          {showDonations && (
            <div className="flex flex-col items-center">
              <FaAngleLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowDonations(false)}
              />
              <h2 className="text-xl font-ubuntu">Donations</h2>
              {/* Render Donations content here */}
            </div>
          )}
        </>
      )}

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

      {faqModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaTimes
              className="absolute top-2 right-2 text-black cursor-pointer"
              onClick={() => setFaqModalContent("")}
            />
            <h2 className="text-xl font-semibold mb-4">{faqModalContent}</h2>
            {faqModalContent === "What is Booking Fee?" && (
              <p className="font-ubuntu text-center flex">
                The booking fee is a nominal charge that ensures the reservation
                and secure storage of your selected items until pick-up. This
                fee covers the costs associated with maintaining and managing
                the inventory in the vendor's store. By paying a booking fee,
                you not only guarantee the availability of your desired items
                but also build trust with the vendor, enhancing the likelihood
                of a successful purchase. This fee is an investment in a
                seamless shopping experience, ensuring that your chosen products
                are held exclusively for you until you are ready to collect
                them.
              </p>
            )}
            {faqModalContent === "How do I become a vendor?" && (
              <p className="font-ubuntu text-center flex">
                To become a vendor, start by registering your business on our
                platform. Once your registration is complete, our dedicated team
                will review and vet your application. Upon approval, you will
                gain access to your very own virtual store, where you can list
                and sell your products to a wide audience. This process ensures
                that only reputable businesses are featured on our platform,
                enhancing trust and credibility with potential buyers. By
                becoming a vendor, you can expand your reach, boost sales, and
                grow your business with ease.
              </p>
            )}
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

      {isAvatarModalOpen && (
        <AvatarSelectorModal
          userId={currentUser.uid}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarChange={handleAvatarChange}
        />
      )}
    </div>
  );
};

export default VendorProfile;

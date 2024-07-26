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
import { FaRegCircleUser, FaShop, FaWallet } from "react-icons/fa6";
import { MdEmail, MdHistory, MdHelpOutline } from "react-icons/md";
import { CiMoneyBill } from "react-icons/ci";

import { RotatingLines } from "react-loader-spinner";
import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";
import VendorWallet from "./VendorWallet.jsx";
import VendorHistory from "../vendor/VendorHistory.jsx";
import FAQs from "../vendor/FAQs.jsx";
import Donations from "../vendor/Donations.jsx";
import ProfileDetails from "../vendor/ProfileDetails.jsx";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../../components/Roundedstar.js";

const VendorProfile = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showRatings, setShowRatings] = useState();
  const [editD, setEditD] = useState("");
  const [email, setEmail] = useState("");
  const [editE, setEditE] = useState("");
  const [shopName, setShopName] = useState("");
  const [editS, setEditS] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
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
            setFirstName(data.firstName);
            setLastName(data.lastName);
            setEmail(data.email || "");
            setShopName(data.shopName || "");
            setShowRatings(data.ratings || "");
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
    if (editField === "displayName" && /[^a-zA-Z\s]/.test(editD)) {
      toast.error("You cannot use numbers as username!", {
        className: "custom-toast",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Other profile updates...
      if (editField === "displayName") {
        await updateProfile(auth.currentUser, { displayName: editD });
        await updateDoc(doc(db, "vendors", currentUser.uid), {
          displayName: editD,
        });
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
    } catch (error) {
      console.log(error);
      toast.error("Error updating profile, try again later", {
        className: "custom-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="pb-4 font-ubuntu">
      {
      
      // !showDetails &&
      !showHistory &&
      !showWallet &&
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
                    src="https://www.bing.com/images/search?view=detailV2&ccid=aiDGdmdU&id=6417D69A7F5743CAD85D939EA1B36916DDDEC0D3&thid=OIP.aiDGdmdUAX_iNgRMERipyQHaHF&mediaurl=https%3a%2f%2fwww.pngitem.com%2fpimgs%2fm%2f421-4212617_person-placeholder-image-transparent-hd-png-download.png&cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.6a20c6766754017fe236044c1118a9c9%3frik%3d08De3RZps6Gekw%26pid%3dImgRaw%26r%3d0&exph=822&expw=860&q=placeholder+user+image&simid=608005849113568560&FORM=IRPRST&ck=95210D0525A5F9999897DB0ACDE234C7&selectedIndex=0&itb=0" // You might want to provide a placeholder or default image here
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
              <p className="text-md text-center font-medium text-black capitalize">
                
                {shopName}
              </p>
            ) : (
              <div className="h-6 bg-gray-300 w-40 mt-10" />
            )}
            <div className="flex flex-col items-center translate-y-4">
              {userData && userData.rating && userData.ratingCount ? (
                <>
                  <span>
                    <p>Your Average Rating:</p>
                  </span>

                  <div className="flex justify-center items-center ">
                    <ReactStars
                      count={5}
                      value={userData.rating / userData.ratingCount || 0}
                      size={24}
                      activeColor="#ffd700"
                      emptyIcon={<RoundedStar filled={false} />}
                      filledIcon={<RoundedStar filled={true} />}
                      edit={false} // Make the stars display-only
                    />

                    <span className="text-black font-light text-xs mx-2">
                      {(userData.rating / userData.ratingCount || 0).toFixed(1)}
                    </span>
                  </div>
                  {/* <span className="text-black font-light ratings-text ml-2">({userData.ratingCount || 0})({userData.rating || 0})</span> */}
                </>
              ) : (
                <></>
              )}
            </div>
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
                onClick={() => {
                  setShowWallet(!showWallet);
                  console.log(showWallet);
                }}
              >
                <div className="flex items-center">
                  <FaWallet className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Your Wallet
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
                onClick={() => {
                  setShowHistory(!showHistory);
                  console.log(showHistory);
                }}
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
            <div className="flex flex-col items-center bg-red-300 mx-2 rounded-sm">
              <hr className="w-full border-gray-600" />
              <div
                className="flex items-center py-3 cursor-pointer"
                onClick={() => handleLogout()}
              >
                <div className="flex justify-between items-center">
                  <PiSignOutBold className="text-black text-xl mr-4" />
                  <h2 className="text-size font-normal text-black capitalize">
                    Sign Out
                  </h2>
                </div>
              </div>
              <hr className="w-full border-gray-600" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <ProfileDetails
              userData={{ firstName, lastName, email, shopName }}
              setShowDetails={setShowDetails}
            />
          )}

          {showWallet && <VendorWallet setShowWallet={setShowWallet} />}

          {showHistory && <VendorHistory setShowHistory={setShowHistory} />}

          {showFAQs && (
            <FAQs setShowFAQs={setShowFAQs} handleFaqClick={handleFaqClick} />
          )}

          {showDonations && <Donations setShowDonations={setShowDonations} />}
        </>
      )}

      {/* {faqModalContent && (
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
      )} */}

      {/* {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <RotatingLines
            strokeColor="orange"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
      )} */}

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

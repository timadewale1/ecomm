import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setVendorProfile, setLoading } from "../../redux/vendorProfileSlice";
import { FaShop } from "react-icons/fa6";
import {
  MdDescription,
  MdEmail,
  MdOutlineDryCleaning,
  MdVerified,
} from "react-icons/md";
import { User } from "lucide-react";

import { useAuth } from "../../custom-hooks/useAuth";
import { db } from "../../firebase.config";
import { updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import Loading from "../../components/Loading/Loading";
import { BsBank2 } from "react-icons/bs";
import { BiSolidCategoryAlt } from "react-icons/bi";
import { CiClock1, CiClock2, CiLocationOn } from "react-icons/ci";
import { FaBuilding, FaRegCalendarAlt, FaShippingFast } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import EditFieldModal from "./EditFieldModal"; // Import the modal component
import { GoChevronLeft } from "react-icons/go";
import { RiEditFill } from "react-icons/ri";

const VprofileDetails = ({ showDetails, setShowDetails }) => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  // Access state from Redux
  const { data: userData, loading } = useSelector(
    (state) => state.vendorProfile
  );

  const [editingField, setEditingField] = useState(null); // Track the field being edited
  const [processing, setProcessing] = useState(false);

  // Fetch user data on mount if not already in Redux
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        dispatch(setLoading(true)); // Set loading state
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid)); // Replace with actual UID
          if (vendorDoc.exists()) {
            dispatch(setVendorProfile(vendorDoc.data())); // Save data in Redux
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data.", {
            className: "custom-toast",
          });
        } finally {
          dispatch(setLoading(false)); // Stop loading
        }
      }
    };

    fetchUserData();
  }, [dispatch, currentUser]);
  // If user data is loading, show a loader
  if (loading && !userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <Loading />
      </div>
    );
  }

  const {
    firstName = "",
    lastName = "",
    shopName = "",
    email = "",
    bankDetails = {},
    categories = [],
    Address = "",
    location = { lat: null, lng: null },
    sourcingMarket = "",
    restockFrequency = "",
    wearReadinessRating = 0,
    complexNumber = "",
    description = "",
    marketPlaceType = "",
    daysAvailability = [],
    closeTime = "",
    openTime = "",
    deliveryMode = "",
  } = userData || {}; // Fallback to an empty object if userData is null

  const { accountName, accountNumber, bankName } = bankDetails;
  const categoriesList = categories.map((category) => category).join(", ");
  const daysAvailabilityList = daysAvailability.map((day) => day).join(", ");
  const sourcingOptions = [
    "Yaba Main Market",
    "Tejuosho Bulk",
    "UK/US Thrift Bale",
    "Personal Closet",
  ];
  const restockOptions = ["Daily", "Weekly", "Bi‑Weekly", "Monthly"];
  const handleEdit = async (field, value, coords) => {
    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }
    setProcessing(true);
    try {
      const vendorDocRef = doc(db, "vendors", currentUser.uid);

      let updateObj;
      let newProfile;

      if (field === "Address" && coords) {
        // update both the string and the coords
        updateObj = {
          Address: value,
          location: {
            lat: coords.lat,
            lng: coords.lng,
          },
        };
        newProfile = {
          ...userData,
          Address: value,
          location: { lat: coords.lat, lng: coords.lng },
        };
      } else if (field === "wearReadinessRating") {
        const num = Number(value);
        if (Number.isNaN(num) || num < 1 || num > 10) {
          toast.error("Rating must be between 1 and 10");
          setProcessing(false);
          return;
        }
        updateObj = { wearReadinessRating: num };
        newProfile = { ...userData, wearReadinessRating: num };
      } else {
        // every other field
        updateObj = { [field]: value };
        newProfile = { ...userData, [field]: value };
      }

      // write to Firestore
      await updateDoc(vendorDocRef, updateObj);

      // update Redux once
      dispatch(setVendorProfile(newProfile));

      toast.success(`profile updated successfully!`, {
        className: "custom-toast",
      });
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update. Please try again later.", {
        className: "custom-toast",
      });
    } finally {
      setProcessing(false);
    }
  };

  const sourcingMarketDisplay = Array.isArray(sourcingMarket)
    ? sourcingMarket.join(", ")
    : sourcingMarket;

  return (
    <div className="flex flex-col px-3   pb-12 font-opensans">
      <div className="flex flex-col font-opensans  items-center">
        {/* Header */}
        <div className="sticky  bg-white  flex items-center z-10 justify-between h-24 w-full">
          <div className="flex items-center space-x-2">
            <GoChevronLeft
              className="text-2xl text-black cursor-pointer"
              onClick={() => {
                setShowDetails(false);
              }}
            />
            <h1 className="text-lg font-medium text-black   ">
              Profile Details
            </h1>
          </div>
        </div>

        {/* Profile Information */}
        <div className="w-full space-y-4 ">
          {/* Display Name */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full ">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Display Name
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <User className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {firstName + " " + lastName}
              </p>
              <MdVerified
                className={`${
                  firstName && lastName ? "text-green-500" : "text-yellow-500"
                } text-2xl ml-2`}
              />
            </div>
          </div>

          {/* Store Name */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Store Name
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <FaShop className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {shopName}
              </p>
              <MdVerified
                className={`${
                  shopName ? "text-green-500" : "text-yellow-500"
                } text-2xl ml-2`}
              />
            </div>
          </div>

          {/* Store Description */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Store Description
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <MdDescription className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {description}
              </p>
              <RiEditFill
                className="text-black cursor-pointer ml-2 text-2xl"
                onClick={() =>
                  setEditingField({ field: "description", value: description })
                }
              />
            </div>
          </div>
          <div className="flex flex-col bg-customGrey rounded mb-2 w-full">
            <h1 className="text-xs text-gray-500 pl-6 pt-2">Address</h1>
            <div className="flex items-center justify-between px-4 py-3">
              <CiLocationOn className="text-xl mr-4" />
              <p className="flex-1 text-sm">{Address || "Not set"}</p>
              <RiEditFill
                className="text-xl cursor-pointer"
                onClick={() =>
                  setEditingField({ field: "Address", value: Address })
                }
              />
            </div>
          </div>
          {/* Conditional Render for Marketplace */}
          {marketPlaceType === "marketplace" && (
            <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
              <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
                Complex Number
              </h1>
              <div className="flex items-center justify-between w-full px-4 py-3">
                <FaBuilding className="text-black text-xl mr-4" />
                <p className="text-size font-normal font-poppins text-black w-full">
                  {complexNumber}
                </p>
                <RiEditFill
                  className="text-black cursor-pointer ml-2 text-2xl"
                  onClick={() =>
                    setEditingField({
                      field: "complexNumber",
                      value: complexNumber,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Email
            </h1>
            <div className="flex mt-1 items-center justify-between w-full px-4 py-3">
              <MdEmail className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {email}
              </p>
              <MdVerified
                className={`${
                  email ? "text-green-500" : "text-yellow-500"
                } text-2xl ml-2`}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Bank Details
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <BsBank2 className="text-black text-xl mr-4" />
              <div className=" font-normal space-y-1 font-poppins text-black w-full">
                <p className="text-sm">{bankName}</p>
                <p className="text-sm">{accountName}</p>
                <p className="text-sm">{accountNumber}</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Categories
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <BiSolidCategoryAlt className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {categoriesList}
              </p>
            </div>
          </div>

          {/* Conditional Render for Marketplace Times */}
          {marketPlaceType === "marketplace" && (
            <>
              <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
                <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
                  Opening Time
                </h1>
                <div className="flex items-center justify-between w-full px-4 py-3">
                  <CiClock1 className="text-black text-xl mr-4" />
                  <p className="text-size font-normal font-poppins text-black w-full">
                    {openTime}
                  </p>
                  <RiEditFill
                    className="text-black cursor-pointer ml-2 text-xl"
                    onClick={() =>
                      setEditingField({ field: "openTime", value: openTime })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
                <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
                  Closing Time
                </h1>
                <div className="flex items-center justify-between w-full px-4 py-3">
                  <CiClock2 className="text-black text-xl mr-4" />
                  <p className="text-size font-normal font-poppins text-black w-full">
                    {closeTime}
                  </p>
                  <RiEditFill
                    className="text-black cursor-pointer ml-2 text-2xl"
                    onClick={() =>
                      setEditingField({ field: "closeTime", value: closeTime })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
                <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
                  Days of Availability
                </h1>
                <div className="flex items-center justify-between w-full px-4 py-3">
                  <FaRegCalendarAlt className="text-black text-xl mr-4" />
                  <p className="text-size font-normal font-poppins text-black w-full">
                    {daysAvailabilityList}
                  </p>
                  <RiEditFill
                    className="text-black cursor-pointer ml-2 text-2xl"
                    onClick={() =>
                      setEditingField({
                        field: "daysAvailability",
                        value: daysAvailability,
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}
          {/* Sourcing market */}
          <div className="flex flex-col bg-customGrey rounded mb-2 w-full">
            <h1 className="text-xs text-gray-500 pl-6 pt-2">Sourcing Market</h1>
            <div className="flex items-center justify-between px-4 py-3">
              <FaShop className="text-xl mr-4" />
              <p className="flex-1 font-poppins text-sm">
                 {sourcingMarketDisplay || "Not set"}
              </p>
              <RiEditFill
                className="text-xl cursor-pointer"
                onClick={() =>
                  setEditingField({
                    field: "sourcingMarket",
                    value: sourcingMarket,
                  })
                }
              />
            </div>
          </div>

          {/* Restock frequency */}
          <div className="flex flex-col bg-customGrey rounded mb-2 w-full">
            <h1 className="text-xs text-gray-500 pl-6 pt-2">
              Restock Frequency
            </h1>
            <div className="flex items-center justify-between px-4 py-3">
              <CiClock1 className="text-xl mr-4" />
              <p className="flex-1 font-poppins text-sm">
                {restockFrequency || "Not set"}
              </p>
              <RiEditFill
                className="text-xl cursor-pointer"
                onClick={() =>
                  setEditingField({
                    field: "restockFrequency",
                    value: restockFrequency,
                  })
                }
              />
            </div>
          </div>

          {/* Wear‑readiness rating */}
          <div className="flex flex-col bg-customGrey rounded mb-2 w-full">
            <h1 className="text-xs text-gray-500 pl-6 pt-2">
              Wear‑Readiness Rating&nbsp;( /10 )
            </h1>
            <div className="flex items-center justify-between px-4 py-3">
              <MdOutlineDryCleaning className="text-xl mr-4" />
              <p className="flex-1 font-poppins text-sm">
                {wearReadinessRating ? `${wearReadinessRating}/10` : "Not set"}
              </p>
              <RiEditFill
                className="text-xl cursor-pointer"
                onClick={() =>
                  setEditingField({
                    field: "wearReadinessRating",
                    value: wearReadinessRating,
                  })
                }
              />
            </div>
          </div>

          {/* Delivery Mode */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Delivery Mode
            </h1>
            <div className="flex items-center mt-1 justify-between w-full px-4 py-3">
              <FaShippingFast className="text-black text-xl mr-4" />
              <p className="text-sm font-normal font-poppins text-black w-full">
                {deliveryMode}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Modal */}
      {editingField && (
        <EditFieldModal
          show={!!editingField}
          handleClose={() => setEditingField(null)}
          field={editingField.field}
          currentValue={editingField.value}
          onSave={handleEdit}
          processing={processing}
        />
      )}
    </div>
  );
};

export default VprofileDetails;

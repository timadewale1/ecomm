import React, { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../firebase.config";
import toast from "react-hot-toast";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
import { MdClose, MdEmail, MdVerified } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { RiEditFill } from "react-icons/ri";
import { RotatingLines } from "react-loader-spinner";
import { useNavigate, useLocation } from "react-router-dom";
import { FaRegTimesCircle } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { updateUserData } from "../../redux/actions/useractions";
import { NigerianStates } from "../../services/states";
import { CiLocationOn } from "react-icons/ci";
import Loading from "../../components/Loading/Loading";
import { GoChevronLeft } from "react-icons/go";
import Waiting from "../../components/Loading/Waiting";
import Productnotofund from "../../components/Loading/Productnotofund";
import LocationPicker from "../../components/Location/LocationPicker";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Pencil,
} from "lucide-react";
import "./account-info.css";
import AppPageHeader from "../../components/layout/AppPageHeader";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import { useAuth } from "../../custom-hooks/useAuth";

const ProfileDetails = ({
  currentUser,
  setShowDetails,
  onBack,
  initialEditField = "",
  highlightIncomplete = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(Boolean(initialEditField));
  const dispatch = useDispatch();
  const { updateCurrentUserData } = useAuth();
  const userData = useSelector((state) => state.user.userData);
  const [locationCoords, setLocationCoords] = useState({
    lat: null,
    lng: null,
  });

  const [editField, setEditField] = useState(initialEditField);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const handleBack = () => {
    if (onBack) onBack();
    else if (setShowDetails) setShowDetails(false);
    else navigate(-1);
  };
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Update all state variables
          setUsername(data.username || "");
          setDisplayName(data.displayName || "");
          setPhoneNumber(data.phoneNumber || "");
          setBirthday(data.birthday || "");
          setAddress(data.address || "");
          setLocationCoords({
            lat: data.location?.lat ?? null,
            lng: data.location?.lng ?? null,
          });

          // Update Redux store with fetched user data
          dispatch(updateUserData(data));
          setLoading(false);
        } else {
          console.error("No such user data!");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    if (userData) {
      // If userData from Redux exists, populate all fields
      setUsername(userData.username || "");
      setDisplayName(userData.displayName || "");
      setPhoneNumber(userData.phoneNumber || "");
      setBirthday(userData.birthday || "");
      setAddress(userData.address || "");
      setLocationCoords({
        lat: userData.location?.lat ?? null,
        lng: userData.location?.lng ?? null,
      });
      setLoading(false);
    } else if (!currentUser) {
      setLoading(false);
    } else {
      fetchUserData();
    }
  }, [userData, currentUser, dispatch]);

  useEffect(() => {
    const candidate = String(username || "").trim();
    if (!candidate) {
      setUsernameStatus("idle");
      return undefined;
    }

    if (candidate.length < 2 || /[^a-zA-Z0-9]/.test(candidate)) {
      setUsernameStatus("invalid");
      return undefined;
    }

    let cancelled = false;
    setUsernameStatus("checking");

    const timer = window.setTimeout(async () => {
      try {
        const formattedUsername =
          candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
        const snapshot = await getDocs(
          query(
            collection(db, "users"),
            where("username", "==", formattedUsername),
          ),
        );
        if (cancelled) return;

        const belongsToAnotherUser = snapshot.docs.some(
          (userDoc) => userDoc.id !== currentUser?.uid,
        );
        setUsernameStatus(belongsToAnotherUser ? "taken" : "available");
      } catch (error) {
        console.error("Error checking username availability:", error);
        if (!cancelled) setUsernameStatus("error");
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, currentUser?.uid]);

  if (loading) {
    return <Loading />;
  }
  const nameParts = (s = "") => String(s).trim().split(/\s+/).filter(Boolean);
  const hasFullName = (s = "") =>
    nameParts(s).length >= 2 && !/[^a-zA-Z\s]/.test(String(s).trim());
  const localPhoneNumber = (value = "") => {
    const digits = String(value).replace(/\D/g, "");
    if (digits.startsWith("234")) return digits.slice(3);
    if (digits.startsWith("0")) return digits.slice(1);
    return digits;
  };
  const hasValidPhoneNumber = (value = "") =>
    /^[1-9]\d{9}$/.test(localPhoneNumber(value));
  const hasValidLocation =
    Boolean(address) &&
    typeof locationCoords.lat === "number" &&
    typeof locationCoords.lng === "number";

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
                handleBack();
              }}
            />
            <h1 className="text-xl font-medium font-opensans text-black   ">
              Profile Details
            </h1>
          </div>
        </div>
        <div className="px-20 flex-col flex justify-center items-center">
          <Productnotofund />
          <p className="text-center text-sm text-gray-800 font-opensans mb-4">
            Oops! You cannot view profile details at the moment because no user
            is logged in.
          </p>
          <button
            className="bg-customOrange font-opensans text-white px-4 py-2 rounded-full"
            onClick={() => {
              navigate("/login", { state: { from: location.pathname } });
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }
  //    but it early‐exits if not editing address or map closed:

  const handleEdit = (field) => {
    setEditField(field);
    if (field === "displayName") {
      const parts = nameParts(displayName);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (field === "phoneNumber") {
      setPhoneNumber(localPhoneNumber(phoneNumber));
    }
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setUsername(userData?.username || username);
    setDisplayName(userData?.displayName || displayName);
    setPhoneNumber(userData?.phoneNumber || phoneNumber);
    setBirthday(userData?.birthday || birthday);
    setAddress(userData?.address || address);
    setLocationCoords({
      lat: userData?.location?.lat ?? locationCoords.lat,
      lng: userData?.location?.lng ?? locationCoords.lng,
    });
    setIsEditing(false);
  };

  const validateFields = () => {
    if (
      editField === "username" &&
      (!username || username.length < 2 || /[^a-zA-Z0-9]/.test(username))
    ) {
      toast.error(
        "Username must be at least 2 characters and contain only letters and numbers.",
      );
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
    if (editField === "phoneNumber") {
      if (!hasValidPhoneNumber(phoneNumber)) {
        toast.error(
          "Phone number must be 10 digits and not start with 0. " +
            "E.g. 8123456789"
        );
        return false;
      }
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
      let updatedFields = {};

      if (editField === "username") {
        const formattedUsername = formatName(username);

        // Check for duplicate usernames
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(
          query(usersRef, where("username", "==", formattedUsername))
        );

        const belongsToAnotherUser = querySnapshot.docs.some(
          (userDoc) => userDoc.id !== currentUser.uid,
        );

        if (belongsToAnotherUser) {
          toast.error("Username is already taken. Please choose another.");
          setIsLoading(false);
          return;
        }

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
        // at this point we've already validated it doesn't start with 0
        const formattedNumber = `+234${localPhoneNumber(phoneNumber)}`;

        // write to Firestore
        await updateDoc(doc(db, "users", currentUser.uid), {
          phoneNumber: formattedNumber,
        });

        // update local state & redux
        updatedFields.phoneNumber = formattedNumber;
        setPhoneNumber(formattedNumber);
      } else if (editField === "address") {
        // Defensive check to ensure coordinates exist
        if (!locationCoords.lat || !locationCoords.lng) {
          toast.error("Please select a valid address from suggestions.");
          return;
        }

        await updateDoc(doc(db, "users", currentUser.uid), {
          address, // string value (formatted address)
          location: {
            lat: locationCoords.lat,
            lng: locationCoords.lng,
          },
        });

        updatedFields.address = address;
        updatedFields.location = {
          lat: locationCoords.lat,
          lng: locationCoords.lng,
        };

        setAddress(address);
      } else if (editField === "birthday") {
        await updateDoc(doc(db, "users", currentUser.uid), { birthday });
        updatedFields.birthday = birthday;
        setBirthday(birthday);
      }

      // Update Redux store with new user data
      dispatch(updateUserData(updatedFields));
      updateCurrentUserData(updatedFields);

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

  const usernameIsValid =
    username.length >= 2 && !/[^a-zA-Z0-9]/.test(username);
  const usernameVerification = (() => {
    if (!username) return { kind: "missing", label: "Not verified" };
    if (usernameStatus === "checking") {
      return { kind: "checking", label: "Checking" };
    }
    if (usernameStatus === "taken") {
      return { kind: "missing", label: "Unavailable" };
    }
    if (usernameStatus === "invalid") {
      return { kind: "missing", label: "Not verified" };
    }
    if (usernameStatus === "error") {
      return { kind: "neutral", label: "Check unavailable" };
    }
    return usernameIsValid
      ? { kind: "verified", label: "Available" }
      : { kind: "missing", label: "Not verified" };
  })();

  const detailFields = [
    {
      label: "Username",
      value: username || "Add Username",
      field: "username",
      required: true,
      complete: usernameIsValid,
      verification: usernameVerification,
    },
    {
      label: "Account Name",
      value: displayName || "Add Account Name",
      field: "displayName",
      required: true,
      complete: hasFullName(displayName),
      verification: hasFullName(displayName)
        ? { kind: "verified", label: "Verified" }
        : { kind: "missing", label: "Not verified" },
    },
    {
      label: "Email",
      value: currentUser.email || "No email available",
      field: null,
      required: false,
      complete: Boolean(currentUser.emailVerified),
      verification: currentUser.emailVerified
        ? { kind: "verified", label: "Verified" }
        : { kind: "missing", label: "Not verified" },
    },
    {
      label: "Phone Number",
      value: phoneNumber || "Add Phone Number",
      field: "phoneNumber",
      required: true,
      complete: hasValidPhoneNumber(phoneNumber),
      verification: hasValidPhoneNumber(phoneNumber)
        ? { kind: "verified", label: "Verified" }
        : { kind: "missing", label: "Not verified" },
    },
    {
      label: "Birthday",
      value: birthday && birthday !== "not-set" ? birthday : "Add Birthday",
      field: "birthday",
      required: false,
      complete: true,
      verification: { kind: "neutral", label: "Optional" },
    },
    {
      label: "Address",
      value: address || "Add Delivery Address",
      field: "address",
      required: true,
      complete: hasValidLocation,
      verification: hasValidLocation
        ? { kind: "verified", label: "Verified" }
        : { kind: "missing", label: "Not verified" },
    },
  ];

  const incompleteRequiredFields = detailFields.filter(
    ({ required, complete }) => required && !complete,
  );

  const renderVerification = ({ kind, label }) => (
    <span className={`account-info-status account-info-status--${kind}`}>
      {kind === "checking" ? (
        <LoaderCircle className="account-info-status-spinner" aria-hidden="true" />
      ) : kind === "verified" ? (
        <CheckCircle2 aria-hidden="true" />
      ) : kind === "missing" ? (
        <AlertCircle aria-hidden="true" />
      ) : null}
      <span>{label}</span>
    </span>
  );

  return (
    <main className="account-info-page">
      <AppPageHeader
        title="Account info"
        onBack={handleBack}
        backLabel="Back to settings"
      />

      {highlightIncomplete && (
        <div className="account-info-warning" role="status">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>Complete your account information</strong>
            <p>
              {incompleteRequiredFields.length
                ? "Fill in the highlighted required fields before continuing."
                : "Your required details are filled. Review them and save any correction to refresh your profile status."}
            </p>
          </div>
        </div>
      )}

      <section className="account-info-fields" aria-label="Account information">
        {detailFields.map(
          ({ label, value, field, required, complete, verification }) => {
            const className = [
              "account-info-field",
              !field ? "account-info-field--readonly" : "",
              highlightIncomplete && required && !complete
                ? "account-info-field--missing"
                : "",
            ]
              .filter(Boolean)
              .join(" ");
            const contents = (
              <>
                <span className="account-info-label">{label}</span>
                <span className="account-info-value">{value}</span>
                <span className="account-info-actions">
                  {renderVerification(verification)}
                  {field && <Pencil aria-hidden="true" />}
                </span>
              </>
            );

            return field ? (
              <button
                type="button"
                className={className}
                key={label}
                onClick={() => handleEdit(field)}
                aria-label={`Edit ${label}. ${verification.label}`}
              >
                {contents}
              </button>
            ) : (
              <div className={className} key={label} aria-label={`${label}. ${verification.label}`}>
                {contents}
              </div>
            );
          },
        )}
      </section>

      <AppBottomSheet
        open={isEditing}
        onClose={handleCloseEdit}
        height="min(54dvh, 520px)"
        ariaLabel={`Edit ${editField || "account information"}`}
        ariaBusy={isLoading}
        dismissible={!isLoading}
        closeOnBackdrop={false}
        compactTop
        zIndex={6000}
        surfaceClassName="account-info-edit-sheet"
      >
              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={isLoading}
                className="absolute bg-gray-200 rounded-full p-1 top-4 right-4 text-gray-700 text-xl"
                aria-label="Close editor"
              >
                <MdClose />
              </button>

              {/* Header */}
              <h2 className="account-info-edit-header text-left text-lg font-opensans font-medium">
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

              {/* Form area */}
              <div className="account-info-edit-body px-6 overflow-y-auto flex-1">
                {editField === "username" && (
                  <div className="account-info-edit-control">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(formatName(e.target.value))}
                      className="w-full p-2 font-opensans border border-gray-200 bg-customSoftGray rounded"
                      autoCapitalize="none"
                      autoCorrect="off"
                      aria-describedby="username-availability"
                    />
                    <div
                      id="username-availability"
                      className={`account-info-inline-status account-info-inline-status--${usernameVerification.kind}`}
                      aria-live="polite"
                    >
                      {renderVerification(usernameVerification)}
                    </div>
                  </div>
                )}
                {editField === "displayName" && (
                  <>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(formatName(e.target.value))}
                      placeholder="First Name"
                      className="w-full p-2 border font-opensans border-gray-200 bg-customSoftGray rounded"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(formatName(e.target.value))}
                      placeholder="Last Name"
                      className="w-full p-2 mt-4 border font-opensans border-gray-200 bg-customSoftGray rounded"
                    />
                  </>
                )}
                {editField === "phoneNumber" && (
                  <>
                    {/* Disclaimer */}
                    <p className="text-xs font-opensans text-gray-500 mb-2">
                      Must be exactly 10 digits, no leading 0. E.g.{" "}
                      <code>8123456789</code>
                    </p>
                    <input
                      type="tel"
                      value={localPhoneNumber(phoneNumber)}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full p-2 font-opensans border border-gray-200 bg-customSoftGray rounded"
                    />
                  </>
                )}
                {editField === "birthday" && (
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full p-2 font-opensans border border-gray-200 bg-customSoftGray rounded"
                  />
                )}
                {editField === "address" && (
                  <LocationPicker
                    onLocationSelect={({ lat, lng, address }) => {
                      setLocationCoords({ lat, lng });
                      if (address) setAddress(address);
                    }}
                  />
                )}
              </div>

              {/* Save button pinned at bottom-center */}
              <div className="account-info-edit-footer px-6">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full h-10 -translate-y-8 bg-customOrange text-white font-opensans font-medium rounded-full flex items-center justify-center"
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
      </AppBottomSheet>
    </main>
  );
};

export default ProfileDetails;

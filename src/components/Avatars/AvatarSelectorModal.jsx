import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux"; // <-- for Redux
import { updateDoc, doc } from "firebase/firestore";
import { db, storage } from "../../firebase.config";
import toast from "react-hot-toast";
import { FaRegTimesCircle } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { RotatingLines } from "react-loader-spinner";
import { IoMdImage } from "react-icons/io";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

const diceBearNames = [
  "Liliana",
  "Vivian",
  "Wyatt",
  "George",
  "Christopher",
  "Caleb",
  "Maria",
  "Chase",
  "Christian",
  "Jade",
  "Aiden",
  "Jude",
  "Mason",
  "Eliza",
  "Jessica",
  "Aidan",
  "Nolan",
  "Mackenzie",
  "Ryan",
  "Alexander",
];

const AvatarSelectorModal = ({
  userId, // needed for Firestore updates
  onClose,
  onAvatarChange, // callback to update parent (optional)
  onRemoveAvatar, // callback for removing avatar from Firestore
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);

  // 1) Fetch the user’s data from Redux:
  const userData = useSelector((state) => state.user.userData);

  // 2) Whenever userData changes (or on mount), set up the local preview:
  useEffect(() => {
    if (userData && userData.photoURL) {
      setSelectedAvatar(userData.photoURL);
      const matchedName = findDiceBearNameByUri(userData.photoURL);
      setSelectedName(matchedName);
    } else {
      setSelectedAvatar(null);
      setSelectedName(null);
    }
  }, [userData]);

  // Helper to check if the avatar is a known DiceBear URI:
  const findDiceBearNameByUri = (avatarUri) => {
    for (const name of diceBearNames) {
      const testUri = generateDiceBearDataUri(name);
      if (testUri === avatarUri) {
        return name;
      }
    }
    return null;
  };

  // Generates a DiceBear avatar for each seed name:
  const generateDiceBearDataUri = (seedValue) => {
    const svg = createAvatar(adventurer, {
      seed: seedValue,
      backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
      backgroundType: ["gradientLinear"],
    }).toString();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Called when the user selects a DiceBear avatar
  const handleSelectDiceBearAvatar = (dataUri, name) => {
    setSelectedFile(null);
    setSelectedFilePreview(null);
    setSelectedName(name);
    setSelectedAvatar(dataUri);
  };

  // Called when the user clicks the "upload image" container
  const handleClickImageContainer = () => {
    fileInputRef.current?.click();
  };

  // Reads the file and shows a local preview
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error("File size exceeds 3MB. Please select a smaller image.", {
          className: "custom-toast",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFilePreview(reader.result);
        setSelectedAvatar(reader.result);
        setSelectedName(null); // No DiceBear name overlay for a custom file
      };
      reader.readAsDataURL(file);
      setSelectedFile(file);
    }
  };

  // Saves either the DiceBear URI or the uploaded file to Firestore
  const handleAvatarChange = async () => {
    if (!selectedAvatar) {
      toast.error("Please select an avatar first.", {
        className: "custom-toast",
      });
      return;
    }
    setUploading(true);
    try {
      // If choosing a DiceBear avatar, no file upload needed
      if (selectedFile == null && selectedFilePreview == null) {
        await updateDoc(doc(db, "users", userId), {
          photoURL: selectedAvatar,
        });
        onAvatarChange && onAvatarChange(selectedAvatar);
        toast.success("Avatar updated successfully", {
          className: "custom-toast",
        });
        onClose();
      }
      // If user uploaded a file, upload to Firebase Storage
      else if (selectedFile) {
        const storageRef = ref(
          storage,
          `avatars/${userId}/${selectedFile.name}`
        );
        await uploadBytes(storageRef, selectedFile);
        const downloadURL = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", userId), {
          photoURL: downloadURL,
        });
        onAvatarChange && onAvatarChange(downloadURL);
        toast.success("Profile picture updated successfully", {
          className: "custom-toast",
        });
        onClose();
      }
    } catch (error) {
      toast.error("Error updating avatar. Please try again.", {
        className: "custom-toast",
      });
    } finally {
      setUploading(false);
    }
  };

  // Removes the avatar using the callback prop
  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemoveAvatar();
    } catch (error) {
      toast.error("Error removing avatar. Please try again.", {
        className: "custom-toast",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 modal flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white  rounded-lg  w-full h-full relative font-opensans">
        <FaRegTimesCircle
          className="absolute text-xl top-4 right-4 z-20 text-black cursor-pointer"
          onClick={onClose}
        />
        <div className="flex items-center p2 justify-center ">
          {selectedAvatar ? (
            <div className="w-full h-96 relative">
              <img
                src={selectedAvatar}
                alt="Selected Avatar Preview"
                className="w-full h-96 object-cover  border-2 "
              />
              {selectedName && (
                <div className="absolute font-ubuntu font-semibold top-2 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-60 px-4 py-1 rounded-full text-sm text-black">
                  {selectedName}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-96  bg-gray-200 flex items-center justify-center">
              <p className="text-sm text-gray-500">No avatar selected</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="flex overflow-x-auto -translate-y-8 gap-4 px-4 py-2">
          <div
            className="flex-shrink-0 bg-customCream  cursor-pointer w-20 h-20 rounded-lg border-4 
                       border-white hover:border-green-400 transition-colors 
                       flex items-center justify-center"
            onClick={handleClickImageContainer}
          >
            {selectedFilePreview ? (
              <img
                src={selectedFilePreview}
                alt="Custom Upload Preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <IoMdImage className="text-customBrown text-5xl" />
            )}
          </div>
          {diceBearNames.map((name) => {
            const diceBearUri = generateDiceBearDataUri(name);
            return (
              <div
                key={name}
                className={`flex-shrink-0 cursor-pointer w-20 h-20 rounded-lg overflow-hidden 
                            border-4 border-white hover:border-green-400 transition-colors
                            flex items-center justify-center ${
                              selectedAvatar === diceBearUri
                                ? "border-green-500"
                                : ""
                            }`}
                onClick={() => handleSelectDiceBearAvatar(diceBearUri, name)}
              >
                <img
                  src={diceBearUri}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>
        <div className=" p-6 flex flex-col mt-6 justify-between items-center bg-white w-full">
          <button
            onClick={handleRemove}
            className="border-1 border-customBrown text-red-600 text-sm font-semibold w-80 h-12  mb-4 px-4 rounded-lg flex items-center justify-center"
            disabled={removing}
          >
            {removing ? (
              <RotatingLines
                strokeColor="red"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            ) : (
              "Remove"
            )}
          </button>
          <button
            onClick={handleAvatarChange}
            className="bg-customOrange text-white w-80 h-12 text-sm font-semibold font-opensans px-4 rounded-lg flex items-center justify-center"
            disabled={uploading}
          >
            {uploading ? (
              <RotatingLines
                strokeColor="white"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            ) : (
              "Set as Avatar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectorModal;

import React, { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db, storage } from "../../firebase.config";
import { toast } from "react-toastify";
import avatars from "../../assets/Avatar";
import { FaRegTimesCircle } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { RotatingLines } from "react-loader-spinner";
import { IoMdImage } from "react-icons/io";

const AvatarSelectorModal = ({
  userId,
  onClose,
  onAvatarChange,
  onRemoveAvatar,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async () => {
    if (!selectedAvatar) {
      toast.error("Please select an avatar first.", {
        className: "custom-toast",
      });
      return;
    }

    setUploading(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        photoURL: selectedAvatar,
      });
      onAvatarChange(selectedAvatar);
      toast.success("Avatar updated successfully", {
        className: "custom-toast",
      });
      onClose();
    } catch (error) {
      toast.error("Error updating avatar. Please try again.", {
        className: "custom-toast",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const storageRef = ref(storage, `avatars/${userId}/${file.name}`);
      setUploading(true);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", userId), {
          photoURL: downloadURL,
        });
        onAvatarChange(downloadURL);
        toast.success("Profile picture updated successfully", {
          className: "custom-toast",
        });
        onClose();
      } catch (error) {
        toast.error("Error uploading image. Please try again.", {
          className: "custom-toast",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 modal flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full h-full relative">
        <FaRegTimesCircle
          className="absolute top-4 right-4 text-black cursor-pointer"
          onClick={onClose}
        />
        <h2 className="text-2xl text-center font-opensans mt-4 font-semibold mb-4">
          Select Your Avatar
        </h2>
        <div className="grid grid-cols-3 mt-20  items-center  gap-4">
          {Object.entries(avatars).map(([name, src]) => (
            <div
              key={name}
              className={`cursor-pointer p-2 rounded-full ${
                selectedAvatar === src
                  ? "border-2 border-orange-500 bg-orange-100"
                  : ""
              }`}
              onClick={() => setSelectedAvatar(src)}
            >
              <img
                src={src}
                alt={name}
                className="w-16 h-16 object-cover rounded-full"
              />
            </div>
          ))}
          <label className="cursor-pointer p-2 flex items-center ml-2 justify-center bg-orange-300 rounded-full w-16 h-16">
            <IoMdImage className="text-gray-500 text-2xl" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-center">
          <button
            onClick={onRemoveAvatar}
            className="bg-red-600 text-white font-semibold w-32 h-10 text-xs px-4  rounded-lg"
          >
            Remove
          </button>
          <button
            onClick={handleAvatarChange}
            className="bg-customOrange text-white w-32 h-10 text-xs font-semibold px-4  rounded-lg"
          >
            Save
          </button>
        </div>

        {uploading && (
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
    </div>
  );
};

export default AvatarSelectorModal;

import React, { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db, storage } from "../../firebase.config"; // Import storage from firebase config
import { toast } from "react-toastify";
import avatars from "../../assets/Avatar";
import { FaTimes } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import necessary functions from firebase storage
import { RotatingLines } from "react-loader-spinner";

const AvatarSelectorModal = ({ userId, onClose, onAvatarChange }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async () => {
    if (!selectedAvatar) {
      toast.error("Please select an avatar first.", { className: "custom-toast" });
      return;
    }

    setUploading(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        photoURL: selectedAvatar,
      });
      onAvatarChange(selectedAvatar); // Update the parent component state
      toast.success("Avatar updated successfully", { className: "custom-toast" });
      onClose(); // Close the modal
    } catch (error) {
      toast.error("Error updating avatar. Please try again.", { className: "custom-toast" });
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
        onAvatarChange(downloadURL); // Update the parent component state
        toast.success("Profile picture updated successfully", { className: "custom-toast" });
        onClose(); // Close the modal
      } catch (error) {
        toast.error("Error uploading image. Please try again.", { className: "custom-toast" });
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        <FaTimes className="absolute top-4  rounded-md   bg-gray-400 right-4 text-black cursor-pointer" onClick={onClose} />
        <h2 className="text-xl font-semibold mb-4">Select Your Avatar</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(avatars).map(([name, src]) => (
            <div
              key={name}
              className={`cursor-pointer p-2 ${selectedAvatar === src ? "border-2 border-blue-500" : ""}`}
              onClick={() => setSelectedAvatar(src)}
            >
              <img src={src} alt={name} className="w-16 h-16 object-cover rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 items-center mt-4">
          <label className="bg-customOrange bg-opacity-80 text-white px-4 py-2 rounded-full cursor-pointer inline-block">
            Upload Picture
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <button
            onClick={handleAvatarChange}
            className="bg-customOrange  text-white px-4 py-2 rounded-full"
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

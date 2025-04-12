import React, { useState, useRef } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db, storage } from "../../firebase.config";
import toast from "react-hot-toast";
import avatars from "../../assets/Avatar";
import { FaRegTimesCircle } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { RotatingLines } from "react-loader-spinner";
import { IoMdImage } from "react-icons/io";
import { Swiper, SwiperSlide } from "swiper/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";
import "swiper/css/navigation";

const AvatarSelectorModal = ({
  userId,
  onClose,
  onAvatarChange,
  onRemoveAvatar,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const swiperRef = useRef(null);

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
      if (file.size > 3 * 1024 * 1024) {
        // Check if file size exceeds 3MB
        toast.error("File size exceeds 3MB. Please select a smaller image.", {
          className: "custom-toast",
        });
        return;
      }

      const storageRef = ref(storage, `avatars/${userId}/${file.name}`);
      setUploading(true);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // Call onAvatarChange to update the avatar in VendorProfile component
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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full h-full relative font-opensans">
        <FaRegTimesCircle
          className="absolute top-4 right-4 text-black cursor-pointer"
          onClick={onClose}
        />
        <h2 className="text-2xl text-center font-opensans mt-4 font-semibold mb-4">
          Select Your Avatar
        </h2>

        <Swiper
          modules={[Navigation]}
          spaceBetween={10}
          slidesPerView={1}
          centeredSlides={true}
          loop={true}
          navigation={{
            nextEl: ".ChevronLeft",
            prevEl: ".ChevronRight",
          }}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="mt-40"
        >
          {Object.entries(avatars).map(([name, src]) => (
            <SwiperSlide key={name} data-src={src}>
              <div
                className="cursor-pointer flex justify-center items-center"
                onClick={() => setSelectedAvatar(src)}
              >
                <img
                  src={src}
                  alt={name}
                  className={`w-44 h-44 object-cover rounded-full ${
                    selectedAvatar === src
                      ? "p-4 border border-customBrown"
                      : ""
                  }`}
                />
              </div>
            </SwiperSlide>
          ))}

          <div
            className="absolute top-1/2 left-1 transform -translate-y-1/2 cursor-pointer bg-gray-200 p-3 rounded-full shadow-md z-10"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeft className="text-3xl text-black" />
          </div>
          <div
            className="absolute top-1/2 right-1 transform -translate-y-1/2 cursor-pointer bg-gray-200 p-3 rounded-full shadow-md z-10"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRight className="text-3xl text-black" />
          </div>
        </Swiper>

        <label className="cursor-pointer p-2 flex items-center justify-center border border-customBrown  bg-gray-100 rounded-full w-16 h-16 mt-16 mx-auto ">
          <IoMdImage className="text-gray-500 text-3xl" />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-center bg-white w-full">
          <button
            onClick={onRemoveAvatar}
            className="border border-red-600 text-red-600 font-semibold w-32 h-10 text-xs px-4 rounded-full"
          >
            Remove
          </button>
          <button
            onClick={handleAvatarChange}
            className="bg-customOrange text-white w-32 h-10 text-xs font-semibold px-4 rounded-full flex items-center justify-center"
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
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectorModal;

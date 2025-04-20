import React, { useState } from "react";
import LocationPicker from "./LocationPicker";
import { RotatingLines } from "react-loader-spinner";
import { FaLocationPinLock } from "react-icons/fa6";

const MissingLocationModal = ({ onLocationUpdate, isLoading }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  const handleSave = () => {
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng && selectedLocation.Address) {
      onLocationUpdate(selectedLocation);
    }
  };

  const isDisabled = !selectedLocation || !selectedLocation.lat || !selectedLocation.lng || !selectedLocation.address;

  return (
    <div className="fixed modal-overlay inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white px-6 py-24 rounded-lg w-[100%] h-full shadow-lg">
        <div className="flex items-center mb-6">
          <FaLocationPinLock className="text-2xl text-customRichBrown mr-2" />
          <h2 className="text-3xl text-center font-semibold font-ubuntu text-black">
            Update Your Address
          </h2>
        </div>
        <p className="text-sm mb-4 font-opensans text-gray-600">
          To serve your store better and ensure our riders can reach you without issues,
          please update your current delivery address.
        </p>

        <LocationPicker onLocationSelect={handleLocationSelect} />

        <div className="flex font-opensans justify-center mt-28 ">
          <button
            className={`${
              isDisabled || isLoading ? "opacity-50 w-full cursor-not-allowed rounded-full" : ""
            } bg-customOrange text-white font-semibold w-full flex justify-center px-4 py-2 rounded-full font-opensans`}
            onClick={handleSave}
            disabled={isDisabled || isLoading}
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
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingLocationModal;

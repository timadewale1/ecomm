import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";
import LocationPicker from "../../components/Location/LocationPicker";

const DAYS_OF_WEEK = [
  { label: "Monday", value: "Monday" },
  { label: "Tuesday", value: "Tuesday" },
  { label: "Wednesday", value: "Wednesday" },
  { label: "Thursday", value: "Thursday" },
  { label: "Friday", value: "Friday" },
  { label: "Saturday", value: "Saturday" },
  { label: "Sunday", value: "Sunday" },
];

const PREDEFINED_OPTIONS = [
  { label: "All Days", value: "All Days" },
  { label: "Only Weekdays", value: "Only Weekdays" },
  { label: "Only Weekends", value: "Only Weekends" },
];

const EditFieldModal = ({
  show,
  handleClose,
  field,
  currentValue,
  processing,
  onSave,
}) => {
  // Local state for the edited value
  const [value, setValue] = useState(currentValue);
  // For Address, capture lat/lng
  const [locationCoords, setLocationCoords] = useState({
    lat: null,
    lng: null,
  });

  // Whenever the modal opens (show=true) or the field changes, reset local state
  useEffect(() => {
    setValue(currentValue);
    if (field === "Address") {
      // clear coords when re-opening Address
      setLocationCoords({ lat: null, lng: null });
    }
  }, [currentValue, field]);

  // Save handler: validation per field, then call onSave
  const handleSave = () => {
    if (field === "daysAvailability") {
      if (!Array.isArray(value) || value.length === 0) {
        alert("Please select at least one day.");
        return;
      }
    }
    if (field === "Address") {
      // require lat & lng
      if (!locationCoords.lat || !locationCoords.lng) {
        alert("Please pick a location on the map.");
        return;
      }
      // Address needs the string + coords
      onSave(field, value, locationCoords);
    } else {
      onSave(field, value);
    }
    handleClose();
  };

  // Build the list of time options every :00 and :30
  const timeOptions = Array.from({ length: 24 }, (_, hour) => {
    const h = hour < 10 ? `0${hour}` : hour;
    return [`${h}:00`, `${h}:30`];
  }).flat();

  // Predefined day-sets
  const handlePredefinedSelection = (opt) => {
    if (opt === "All Days") {
      setValue(DAYS_OF_WEEK.map((d) => d.value));
    } else if (opt === "Only Weekdays") {
      setValue(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    } else {
      setValue(["Saturday", "Sunday"]);
    }
  };

  // Toggle a single day in daysAvailability
  const handleDayToggle = (day) =>
    setValue((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  // Depending on the field, render the appropriate input
  const renderInputField = () => {
    // Time dropdowns
    if (field === "openTime" || field === "closeTime") {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-customOrange"
        >
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      );
    }

    // Days of week multi-select
    if (field === "daysAvailability") {
      return (
        <>
          <div className="mb-4">
            <h6 className="font-medium mb-2">Predefined Options</h6>
            {PREDEFINED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`px-2 py-2 rounded-lg text-xs mr-1 ${
                  (opt.value === "All Days" &&
                    Array.isArray(value) &&
                    value.length === 7) ||
                  (opt.value === "Only Weekdays" &&
                    JSON.stringify(value) ===
                      JSON.stringify([
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                      ])) ||
                  (opt.value === "Only Weekends" &&
                    JSON.stringify(value) ===
                      JSON.stringify(["Saturday", "Sunday"]))
                    ? "bg-customOrange text-white"
                    : "bg-gray-200 text-black"
                }`}
                onClick={() => handlePredefinedSelection(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div>
            <h6 className="font-medium mb-2">Select Days</h6>
            <div className="grid grid-cols-3 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  className={`px-3 py-2 rounded-lg text-xs ${
                    Array.isArray(value) && value.includes(day.value)
                      ? "bg-customOrange text-white"
                      : "bg-gray-200 text-black"
                  }`}
                  onClick={() => handleDayToggle(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    // Address uses your LocationPicker
    if (field === "Address") {
      return (
        <LocationPicker
          initialAddress={value}
          onLocationSelect={({ address, lat, lng }) => {
            setValue(address);
            setLocationCoords({ lat, lng });
          }}
        />
      );
    }

    // Fallback: free-form textarea
    return (
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:ring-customOrange"
      />
    );
  };

  // Compute a friendly title to display
  const title =
    field === "openTime"
      ? "Opening Time"
      : field === "closeTime"
      ? "Closing Time"
      : field === "daysAvailability"
      ? "Days of Availability"
      : field === "complexNumber"
      ? "Complex Number"
      : field === "Address"
      ? "Address"
      : "Description";

  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">{`Edit ${title}`}</h3>
        <label className="block mb-2 font-medium">{title}</label>
        {renderInputField()}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              processing ||
              (field === "Address" &&
                (!locationCoords.lat || !locationCoords.lng))
            }
            className={`px-4 py-2 rounded-lg text-white flex items-center justify-center ${
              processing ||
              (field === "Address" &&
                (!locationCoords.lat || !locationCoords.lng))
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-customOrange"
            }`}
          >
            {processing ? (
              <Lottie className="w-6 h-6" animationData={LoadState} loop />
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFieldModal;

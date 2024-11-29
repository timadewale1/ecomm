import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";

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

const EditFieldModal = ({ show, handleClose, field, currentValue, processing, onSave }) => {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue); // Reset value when modal opens
  }, [currentValue]);

  const handleSave = () => {
    if (field === "daysAvailability" && value.length === 0) {
      alert("Please select at least one day.");
      return;
    }
    onSave(field, value);
    handleClose();
  };

  const timeOptions = Array.from({ length: 24 }, (_, hour) => {
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return [`${formattedHour}:00`, `${formattedHour}:30`];
  }).flat();

  const handlePredefinedSelection = (option) => {
    if (option === "All Days") {
      setValue(DAYS_OF_WEEK.map((day) => day.value));
    } else if (option === "Only Weekdays") {
      setValue(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    } else if (option === "Only Weekends") {
      setValue(["Saturday", "Sunday"]);
    }
  };

  const handleDayToggle = (day) => {
    setValue((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const renderInputField = () => {
    if (field === "openTime" || field === "closeTime") {
      return (
        <select
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-customOrange"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {timeOptions.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      );
    }

    if (field === "daysAvailability") {
      return (
        <>
          <div className="mb-4">
            <h6 className="font-medium mb-2">Predefined Options</h6>
            {PREDEFINED_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`px-2 py-2 rounded-lg text-xs font-medium mr-1 ${
                  (option.value === "All Days" && value.length === 7) ||
                  (option.value === "Only Weekdays" &&
                    JSON.stringify(value) ===
                      JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])) ||
                  (option.value === "Only Weekends" &&
                    JSON.stringify(value) === JSON.stringify(["Saturday", "Sunday"]))
                    ? "bg-customOrange text-white"
                    : "bg-gray-200 text-black"
                }`}
                onClick={() => handlePredefinedSelection(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div>
            <h6 className="font-medium mb-2">Select Days</h6>
            <div className="grid grid-cols-3 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    value.includes(day.value)
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

    return (
      <textarea
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-customOrange"
      />
    );
  };

  const title =
    field === "openTime"
      ? "Opening Time"
      : field === "closeTime"
      ? "Closing Time"
      : field === "daysAvailability"
      ? "Days of Availability"
      : field === "complexNumber"
      ? "Complex Number"
      : "Description";

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold">{`Edit ${title}`}</h3>
        </div>
        <div className="mb-4">
          <form>
            <label className="block mb-2 text-sm font-medium text-gray-700">{title}</label>
            {renderInputField()}
          </form>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleClose}
            className="bg-gray-200 text-black px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-customOrange text-white px-4 py-2 rounded-lg"
          >
            {processing ? (
              <Lottie
                className="w-4 h-4 text-white"
                animationData={LoadState}
                loop={true}
                autoplay={true}
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

export default EditFieldModal;

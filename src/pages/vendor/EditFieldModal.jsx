import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";

const EditFieldModal = ({ show, handleClose, field, currentValue, processing, onSave }) => {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    onSave(field, value); // Pass the updated value to the parent handler
    handleClose(); // Close the modal
  };

  // Time options for dropdown
  const timeOptions = Array.from({ length: 24 }, (_, hour) => {
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return [`${formattedHour}:00`, `${formattedHour}:30`];
  }).flat();

  // Day availability options
  const dayOptions = [
    "All Days",
    "Only Weekdays",
    "Only Weekends",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Render input dynamically based on the field
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
        <select
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-customOrange"
          value={value}
          onChange={(e) => setValue([...e.target.selectedOptions].map(option => option.value))}
          multiple
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-customOrange"
      />
    );
  };

  const title = field === "openTime" ? "Opening Time" : field === "closeTime" ? "Closing Time" : field === "daysAvailability" ? "Days of Availability" : field === "complexNumber" ? "Complex Number" : "Description"

  return (
    <Modal className="h-fit" show={show} onHide={handleClose} centered>
      <Modal.Header>
        <Modal.Title>Edit {title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            {title}
          </label>
          {renderInputField()} 
        </form>
      </Modal.Body>
      <Modal.Footer>
        <div
          onClick={handleClose}
          className="bg-customSoftGray text-black w-20 h-10 rounded-xl items-center justify-center flex"
        >
          Cancel
        </div>
        <div
          onClick={handleSave}
          className="bg-customOrange text-white w-20 h-10 rounded-xl items-center justify-center flex"
        >
          
            Save
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default EditFieldModal;

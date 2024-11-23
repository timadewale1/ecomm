import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

const EditFieldModal = ({ show, handleClose, field, currentValue, onSave }) => {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    onSave(field, value); // Pass the updated value to the parent handler
    handleClose(); // Close the modal
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit {field}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            {field}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-customOrange"
          />
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          className="bg-customOrange text-white"
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditFieldModal;

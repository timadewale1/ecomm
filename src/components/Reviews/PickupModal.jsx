// src/components/vendor/PickupPromptModal.jsx
import React, { useState } from "react";
import Modal from "react-modal";
import { MdClose } from "react-icons/md";
import LocationPicker from "../Location/LocationPicker";
import { FaHandshakeSimple } from "react-icons/fa6";
Modal.setAppElement("#root");

const PickupPromptModal = ({ isOpen, onClose, onAnswer }) => {
  // step can be "ask" or "picker"
  const [step, setStep] = useState("ask");
  // answer tracks whether they picked "yes" or "no"
  const [answer, setAnswer] = useState(null);

  const handleYes = () => {
    setAnswer(true);
    setStep("picker");
  };

  const handleNo = async () => {
    setAnswer(false);
    // immediately record "no" and close
    await onAnswer(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      onRequestClose={() => {}}
      contentLabel="Pickup Prompt"
      style={{
        content: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: "auto",
          borderRadius: "20px 20px 0 0",
          padding: "16px",
          backgroundColor: "#ffffff",
          border: "none",
          height: step === "ask" ? "50%" : "80%",
          animation: "slide-up 0.3s ease-in-out",
          overflow: "hidden",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          zIndex: 3000,
        },
      }}
    >
      <div className="flex flex-col h-full">
        {/* close button */}

        {step === "ask" && (
          <div className="flex-1  flex flex-col justify-center items-center px-4">
            <FaHandshakeSimple className="text-9xl -translate-y-12 text-customRichBrown" />
            <h2 className="font-opensans text-lg font-semibold mb-4 text-center">
              Do you offer pickup for your store?
            </h2>
            <div className="flex space-x-4">
              <button
                onClick={handleNo}
                className="px-6 py-2 border border-customRichBrown text-customRichBrown rounded-full font-opensans"
              >
                No
              </button>
              <button
                onClick={handleYes}
                className="px-6 py-2 bg-customOrange text-white rounded-full font-opensans"
              >
                Yes
              </button>
            </div>
          </div>
        )}

        {step === "picker" && answer === true && (
          <div className="flex-1 flex flex-col px-4 pt-2">
            <h2 className="font-opensans text-lg font-semibold mb-1">
              Where will buyers pick up?
            </h2>
            <p className="text-xs mt-3 font-opensans text-gray-600 mb-3">
              This pickup location is where you'll meet buyers who choose to
              collect their order directly from you. It can be somewhere outside
              your house like your gate, curb, or a nearby public
              place somewhere you’re comfortable meeting people.
            </p>
            <hr className="border-gray-300 mb-4" />
            <p className="text-xs font-opensans text-gray-600 mb-3">
              <strong>Note:</strong> This is <u>not</u> the same as your main
              delivery address. We’ll still use the address you provided earlier
              to arrange delivery with our logistics partners.
            </p>
            <p className="text-xs font-satoshi text-customOrange font-semibold mb-4">
              We strongly advise against using your exact home address as your
              pickup location to prevent doxxing or privacy issues.
            </p>
           
            <div className="flex-1">
              <LocationPicker
                initialAddress=""
                onLocationSelect={async ({ address, lat, lng }) => {
                  await onAnswer(true, { address, lat, lng });
                  onClose();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PickupPromptModal;

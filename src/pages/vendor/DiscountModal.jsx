import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { MdOutlineClose } from "react-icons/md";

// Define a preset list of in-app discounts
const PRESET_IN_APP_DISCOUNTS = [
  { id: "1", name: "Summer Sale 20%", discountValue: 20, endDate: new Date() },
  { id: "2", name: "Black Friday 50%", discountValue: 50, endDate: new Date() },
  { id: "3", name: "Cyber Monday 30%", discountValue: 30, endDate: new Date() },
];

const DiscountModal = ({ isOpen, onRequestClose, handleSaveDiscount }) => {
  const [selectedDiscount, setSelectedDiscount] = useState(
    PRESET_IN_APP_DISCOUNTS[0]
  ); // Default selection
  const [actualPrice, setActualPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [percentageCut, setPercentageCut] = useState(0);
  const [subtractiveValue, setSubtractiveValue] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Automatically update discount price based on selected discount
  useEffect(() => {
    if (actualPrice && selectedDiscount) {
      const price = parseFloat(actualPrice);
      if (!isNaN(price) && price > 0) {
        const discountAmount = (price * selectedDiscount.discountValue) / 100;
        const discountedPrice = price - discountAmount;

        setDiscountPrice(discountedPrice.toFixed(2));
        setPercentageCut(selectedDiscount.discountValue);
        setSubtractiveValue(discountAmount.toFixed(2));
      }
    }
  }, [actualPrice, selectedDiscount]);

  // Format price like a banking app
  const formatToCurrency = (value) => {
    let numericValue = value.replace(/\D/g, ""); // Remove non-digits
    return (numericValue / 100).toFixed(2); // Ensure two decimal places
  };

  // When user clicks "Save Discount"
  const handleDiscountSaveClick = () => {
    console.log("🚀 [DiscountModal] handleDiscountSaveClick fired");

    const discountDetails = {
      discountType: `inApp-${selectedDiscount.id}`,
      selectedDiscount,
      actualPrice: parseFloat(actualPrice),
      discountPrice: parseFloat(discountPrice),
      percentageCut: parseFloat(percentageCut),
      subtractiveValue: parseFloat(subtractiveValue),
    };

    console.log(
      "➡️ [DiscountModal] Passing discountDetails to parent:",
      discountDetails
    );
    handleSaveDiscount(discountDetails);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="discount-modal"
      overlayClassName="modal-overlay"
    >
      <div className="flex items-center border-b border-gray-200 px-2 py-2 justify-between">
        <h2 className="font-opensans text-lg text-customRichBrown font-semibold">
          In-App Discount
        </h2>
        <MdOutlineClose
          className="text-black text-xl cursor-pointer"
          onClick={onRequestClose}
        />
      </div>

      <div className="py-4 px-2 overflow-y-auto max-h-[90vh]">
        {/* Dropdown for In-App Discounts (Preset Options) */}
        <div className="relative">
          <label className="block text-sm font-medium font-opensans text-customRichBrown">
            Select an In-App Discount
          </label>
          <button
            className="bg-white w-full text-left text-black text-sm font-opensans border-gray-100 border-2 px-4 py-2 rounded-lg"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            {`In-App Discount: ${selectedDiscount?.name}`}
          </button>

          {/* Dropdown with preset discount options */}
          {isDropdownOpen && (
            <div className="absolute z-50 bg-white w-full rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mt-2 right-0 p-3">
              {PRESET_IN_APP_DISCOUNTS.map((discount) => (
                <button
                  key={discount.id}
                  onClick={() => {
                    setSelectedDiscount(discount);
                    setIsDropdownOpen(false);
                  }}
                  className="block w-full text-left text-sm text-black font-opensans px-2 py-1 hover:bg-gray-100 rounded-md"
                >
                  {discount.name} (Valid until {discount.endDate.toDateString()}
                  )
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price input fields */}
        <div className="mt-4">
          <label className="block text-sm font-medium font-opensans mt-4 text-customRichBrown">
            Initial Price
          </label>
          <input
            type="text"
            value={actualPrice}
            onChange={(e) => setActualPrice(formatToCurrency(e.target.value))}
            className="w-full text-right border-2 font-opensans text-gray-800 border-gray-100 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-customOrange"
            placeholder="0.00"
          />

          <label className="block text-sm font-medium font-opensans mt-4 text-customRichBrown">
            Discount Price (Auto-Calculated)
          </label>
          <input
            type="text"
            value={discountPrice}
            readOnly
            className="w-full text-right bg-gray-100 border-2 font-opensans text-gray-800 border-gray-100 rounded-md px-4 py-2"
          />
        </div>

        {/* Calculated Fields */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-customRichBrown font-opensans font-medium">
              Percentage Off
            </label>
            <div className="w-full border-2 rounded-md px-2 py-2 bg-gray-50 font-opensans font-medium text-black text-sm border-gray-100 text-right">
              {percentageCut}%
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-customRichBrown font-opensans font-medium">
              Subtractive Value
            </label>
            <div className="w-full border-2 rounded-md px-2 py-2 bg-gray-50 font-opensans font-medium text-black text-sm border-gray-100 text-right">
              ₦{subtractiveValue}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleDiscountSaveClick}
            className="bg-customOrange text-white w-full px-4 py-3 rounded-full font-opensans font-medium text-sm hover:bg-orange-700"
          >
            Save Discount
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DiscountModal;

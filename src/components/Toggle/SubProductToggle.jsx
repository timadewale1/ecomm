import { LuBadgeInfo } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";

export default function VariationsToggle({
  hasVariations,
  setHasVariations,
  onInfo,
  subProductsCount = 0,
  onAddMore, // ← new callback for the PLUS button
}) {
  /* toggle on/off */
  const handleToggle = () => setHasVariations(!hasVariations);

  return (
    <div>
      {/* top row: label + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LuBadgeInfo
            className="w-5 h-5 text-customBrown cursor-pointer"
            onClick={onInfo}
          />
          <span className="font-opensans font-medium text-sm text-black">
            Does this product have variations?
          </span>
        </div>

        <div
          className={`w-11 h-5 flex items-center rounded-full cursor-pointer
            ${hasVariations ? "bg-customOrange/10" : "bg-gray-200"}
            transition-colors duration-300`}
          onClick={handleToggle}
        >
          <div
            className={`h-5 w-5 rounded-full shadow-md transform
              ${hasVariations ? "bg-customOrange translate-x-6" : "bg-white"}
              transition-transform duration-300`}
          />
        </div>
      </div>

      {/* status badge + plus-button (only when variations exist) */}
      {hasVariations && subProductsCount > 0 && (
        <div className="flex justify-end items-center mt-4 space-x-2">
          <span className="bg-customOrange text-white text-xs px-2 py-0.5 rounded-md font-opensans">
            {subProductsCount} saved
          </span>

          <button
            type="button"
            onClick={onAddMore}
            className="p-1 rounded-full bg-customOrange/10 hover:bg-customOrange/20 transition-colors"
            title="Add another variation"
          >
            <FiPlus className="w-4 h-4 text-customOrange" />
          </button>
        </div>
      )}
    </div>
  );
}

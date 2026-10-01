import { GoTrash } from "react-icons/go";
import { appHaptics } from "../../services/haptics";

/* tiny helper – cuts freebies text to 20 chars */
const truncate = (txt, n = 20) =>
  txt.length <= n ? txt : txt.slice(0, n) + "…";

export default function DiscountToggle({
  runDiscount,
  setRunDiscount,
  discountDetails = null, // { percentageCut, freebieText, … }
  onClearDiscount, // optional callback
}) {
  const handleToggle = () => {
    void appHaptics.selection();
    /* turning OFF clears discount */
    if (runDiscount && onClearDiscount) onClearDiscount();
    setRunDiscount(!runDiscount);
  };

  /* derive short label */
  let badge = null;
  if (discountDetails) {
    if (
      discountDetails.discountType?.startsWith("inApp") ||
      discountDetails.discountType === "personal-monetary"
    ) {
      badge = `${discountDetails.percentageCut}% off`;
    } else if (discountDetails.discountType === "personal-freebies") {
      badge = truncate(discountDetails.freebieText ?? "");
    }
  }

  return (
    <div className="flex items-center justify-between">
      {/* label */}
      <span className="font-satoshi font-medium text-sm text-black">
        Run a discount on this product?
      </span>

      {/* toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={runDiscount}
        aria-label="Run a discount on this product"
        className={`w-11 h-6 shrink-0 flex items-center rounded-full cursor-pointer
        ${runDiscount ? "bg-customOrange/10" : "bg-gray-200"}
        transition-colors duration-300`}
        onClick={handleToggle}
      >
        <div
          className={`h-5 w-5 rounded-full shadow-md transform
          ${runDiscount ? "bg-customOrange translate-x-6" : "bg-white"}
          transition-transform duration-300`}
        />
      </button>

      {/* summary pill + trash (only when discount already saved) */}
      {runDiscount && badge && (
        <div className="ml-3 flex items-center space-x-1">
          <span
            className={`font-opensans text-xs px-2 py-0.5 rounded-full ${
              discountDetails.discountType === "personal-freebies"
                ? "bg-customOrange text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {badge}
          </span>

          {onClearDiscount && (
            <button
              type="button"
              onClick={() => {
                void appHaptics.selection();
                onClearDiscount();
              }}
              aria-label="Remove discount"
            >
              <GoTrash className="w-4 h-4 text-red-600" title="Remove discount" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

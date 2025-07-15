import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import { MdClose } from "react-icons/md";
import LoadState from "../../Animations/loadinganimation.json";
import LocationPicker from "../../components/Location/LocationPicker";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const PREDEFINED_OPTIONS = [
  { label: "All Days", value: "ALL" },
  { label: "Only Weekdays", value: "WK" },
  { label: "Only Weekends", value: "WE" },
];
const SOURCING_OPTIONS = [
  "Yaba Market",
  "Tejuosho Market",
  "My closet",
  "SHEIN",
  "Alibaba",
  
  "Katangua Market",
  "Aswani Market",
  "Oshodi Market",
  "Balogun Market",
  "Bali Market",
  "Mushin Market",
  "Ajah Market",
  "Badagry Market",
  "Dugbe Market",
  "Ahia Ohuru (New Market)",
  "Ariaria International Market",
  "Onitsha Main Market",
  "Ogbete Main Market",
  "Oil Mill Market",
  "Mile One Market",
  "Mile Three Market",
  "Mile Two Market",
  "Choba Market",
  "Itam Market",
  "Akpan Andem Market",
  "Wuse Market",
  "Karimo Market",
  "Mararaba Market",
  "Sabon Gari Market",
  "Kantin Kwari Market",
  "Kasuwar Barci Market",
  "Tudun Wada Market",
  "Monday Market",
];

const RESTOCK_OPTIONS = ["Daily", "Weekly", "Bi‑Weekly", "Monthly"];
const TIME_OPTS = Array.from({ length: 24 }, (_, h) => [
  `${h.toString().padStart(2, "0")}:00`,
  `${h.toString().padStart(2, "0")}:30`,
]).flat();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const EditFieldModal = ({
  show,
  handleClose,
  field,
  currentValue,
  processing,
  onSave,
}) => {
  /* ------------ local state ------------ */
  const [value, setValue] = useState(currentValue);
  const [coords, setCoords] = useState({ lat: null, lng: null });

  /* ------------ reset when open -------- */
  useEffect(() => {
    setValue(currentValue);
    if (field === "Address") setCoords({ lat: null, lng: null });
  }, [currentValue, field]);
  const ratingLocked = field === "wearReadinessRating" && currentValue;

  /* ------------ helpers ---------------- */
  const titleMap = {
    openTime: "Opening Time",
    closeTime: "Closing Time",
    daysAvailability: "Days of Availability",
    complexNumber: "Complex Number",
    Address: "Address",
    sourcingMarket: "Sourcing Market",
    restockFrequency: "Restock Frequency",
    wearReadinessRating: "Wear‑Readiness Rating",
    description: "Description",
  };
  const title = titleMap[field] ?? "Edit";

  const predefinedHandler = (code) => {
    if (code === "ALL") setValue([...DAYS_OF_WEEK]);
    else if (code === "WK") setValue(DAYS_OF_WEEK.slice(0, 5));
    else setValue(DAYS_OF_WEEK.slice(5));
  };

  const toggleDay = (day) =>
    setValue((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  const orangeChip = (active) =>
    `inline-block rounded-full px-3 py-1 text-xs font-medium 
   border ${
     active
       ? "bg-customOrange text-white border-customOrange"
       : "border-gray-300"
   }`;
  const RESTOCK_OPTIONS = [
    "Daily",
    "Every 3 days",
    "Every 4 days",
    "Weekly",
    "Every 2 weeks",
  ];
  /* ------------ validation + save ------ */
  const save = () => {
    if (field === "daysAvailability" && (!value || value.length === 0))
      return alert("Pick at least one day.");
    if (field === "Address" && (!coords.lat || !coords.lng))
      return alert("Choose a location on the map.");
    if (field === "wearReadinessRating") {
      const num = Number(value);
      if (Number.isNaN(num) || num < 1 || num > 10)
        return alert("Rating must be 1 – 10");
      onSave(field, num);
    } else if (field === "Address") {
      onSave(field, value, coords);
    } else {
      onSave(field, value);
    }
    handleClose();
  };
  const helperText = {
    sourcingMarket:
      "Shoppers love to know where you thrift from, makes them feel involved in the process.",
    restockFrequency:
      "Let your customers know when to check in- encourage them to also follow your store.",
    wearReadinessRating:
      "This field is how wear ready your clothes are, if Ade buys your item can he use it immediately without washing? this field input is allowed only once you cant edit and it is subject to reduction if feedback from customers say otherwise.",
  }[field];

  /* ------------ field‑specific UI ------ */
  const inputUI = () => {
    if (field === "openTime" || field === "closeTime")
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-customOrange"
        >
          {TIME_OPTS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      );

    if (field === "daysAvailability")
      return (
        <>
          <div className="mb-4 space-x-2">
            {PREDEFINED_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => predefinedHandler(o.value)}
                className={`text-xs px-2 py-1 rounded-lg ${
                  (o.value === "ALL" && value?.length === 7) ||
                  (o.value === "WK" &&
                    JSON.stringify(value) ===
                      JSON.stringify(DAYS_OF_WEEK.slice(0, 5))) ||
                  (o.value === "WE" &&
                    JSON.stringify(value) ===
                      JSON.stringify(DAYS_OF_WEEK.slice(5)))
                    ? "bg-customOrange text-white"
                    : "bg-gray-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`text-xs px-3 py-2 rounded-lg ${
                  value?.includes(d)
                    ? "bg-customOrange text-white"
                    : "bg-gray-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </>
      );
    if (field === "restockFrequency") {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-customOrange"
        >
          <option value="">How often do you restock?</option>
          {RESTOCK_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    if (field === "Address")
      return (
        <LocationPicker
          initialAddress={value}
          onLocationSelect={({ address, lat, lng }) => {
            setValue(address);
            setCoords({ lat, lng });
          }}
        />
      );
    if (field === "sourcingMarket") {
      const max = 4;

      return (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-gray-500">
              Pick up to <strong>{max}</strong> markets you usually thrift from.
            </p>

            {/* CLEAR button */}
            {Array.isArray(value) && value.length > 0 && (
              <button
                onClick={() => setValue([])}
                className="text-[11px] text-customOrange font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {SOURCING_OPTIONS.map((opt) => {
              const active = Array.isArray(value) && value.includes(opt);
              const disabled =
                !active && Array.isArray(value) && value.length >= max;

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (active) {
                      setValue((prev) => prev.filter((o) => o !== opt));
                    } else if (!disabled) {
                      setValue((prev = []) => [...prev, opt]);
                    }
                  }}
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium border
                ${
                  active
                    ? "bg-customOrange text-white border-customOrange"
                    : disabled
                    ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                    : "border-gray-300"
                }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      );
    }

    if (field === "wearReadinessRating")
      return ratingLocked ? (
        <p className="text-sm text-gray-700">{currentValue} / 10 (locked)</p>
      ) : (
        <input
          type="number"
          min="1"
          max="10"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-customOrange"
        />
      );

    /* description / fallback */
    return (
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        className="w-full px-3 py-2 resize-none focus:outline-none border rounded-lg scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      />
    );
  };

  /* ------------ animation shell -------- */
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* dimmed backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-40"
            onClick={handleClose}
          />

          {/* sliding sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[5000] bg-white rounded-t-2xl p-6 pb-8 shadow-2xl"
          >
            {/* close icon */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 bg-gray-200 p-1 rounded-full text-xl text-gray-600"
            >
              <MdClose />
            </button>

            <h3 className="text-lg font-semibold mb-4">{`Edit ${title}`}</h3>
            {inputUI()}
            {helperText && (
              <>
                <hr className="border-gray-100 my-2 " />
                <p className="text-[11px] font-opensans text-customRichBrown mb-4">
                  {helperText}
                </p>
              </>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={save}
                disabled={
                  processing ||
                  ratingLocked ||
                  (field === "Address" && (!coords.lat || !coords.lng))
                }
                className={`px-4 py-2 rounded-lg text-white flex items-center justify-center ${
                  processing ||
                  (field === "Address" && (!coords.lat || !coords.lng))
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditFieldModal;

import React, { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { RotatingLines } from "react-loader-spinner";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import NativePickerField from "../../components/Form/NativePickerField";
import "./vendor-edit-field.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SOURCING_OPTIONS = [
  "Yaba Market", "Tejuosho Market", "My closet", "SHEIN", "Alibaba",
  "Katangua Market", "Aswani Market", "Oshodi Market", "Balogun Market",
  "Bali Market", "Mushin Market", "Ajah Market", "Badagry Market",
  "Dugbe Market", "Ahia Ohuru (New Market)", "Ariaria International Market",
  "Onitsha Main Market", "Ogbete Main Market", "Oil Mill Market",
  "Mile One Market", "Mile Three Market", "Mile Two Market", "Choba Market",
  "Itam Market", "Akpan Andem Market", "Wuse Market", "Karimo Market",
  "Mararaba Market", "Sabon Gari Market", "Kantin Kwari Market",
  "Kasuwar Barci Market", "Tudun Wada Market", "Monday Market",
];
const RESTOCK_OPTIONS = ["Daily", "Every 3 days", "Every 4 days", "Weekly", "Every 2 weeks", "Monthly"];
const TIME_OPTIONS = Array.from({length: 48}, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, "0");
  return `${hour}:${index % 2 ? "30" : "00"}`;
});
const POLICY_OPTIONS = [
  ["NO_RETURNS", "All sales final — no returns"],
  ["NO_RETURNS_AFTER_24HRS", "No returns after 24 hours of delivery"],
  ["NO_RETURNS_IF_CORRECT_ITEM", "No returns if the item matches the order"],
  ["NO_RETURNS_SIZE_COLOR", "No returns for buyer size or colour mistakes"],
  ["RETURNS_EXCHANGE_ONLY", "Returns accepted — exchange only"],
  ["RETURNS_REFUND_IF_DEFECT", "Return and refund if defective or misdescribed"],
  ["RETURNS_REFUND_FLEX", "Flexible returns and refunds"],
].map(([value, label]) => ({value, label}));

const TITLES = {
  description: "Store description",
  returnPolicy: "Return / refund policy",
  sourcingMarket: "Sourcing markets",
  restockFrequency: "Restock frequency",
  wearReadinessRating: "Wear readiness",
  complexNumber: "Complex number",
  daysAvailability: "Available days",
  openTime: "Opening time",
  closeTime: "Closing time",
};

export default function EditFieldModal({show, handleClose, field, currentValue, processing, onSave}) {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue, field, show]);

  const save = async () => {
    if (processing || !TITLES[field]) return;
    await onSave(field, value);
  };

  const renderInput = () => {
    if (field === "returnPolicy") {
      return (
        <>
          <NativePickerField title="Return policy" value={value?.type || "NO_RETURNS"} options={POLICY_OPTIONS} onChange={(type) => setValue((current) => ({...(current || {}), type}))} className="vendor-edit-picker" />
          <label className="vendor-edit-policy-notes" htmlFor="vendor-return-policy-notes">
            <span>Policy notes <small>(optional)</small></span>
            <textarea id="vendor-return-policy-notes" rows={3} maxLength={200} value={value?.notes || ""} onChange={(event) => setValue((current) => ({...(current || {}), notes: event.target.value}))} placeholder="Add any store-specific return instructions buyers should know" />
          </label>
          <div className="vendor-edit-notice"><Info /><div><strong>How returns work on My Thrift</strong><p>Your store policy tells buyers when you normally accept a return, exchange or refund. It does not replace My Thrift Buyer Protection. A buyer can still report an order that arrives damaged, unusable, incomplete, counterfeit, or materially different from the listing. My Thrift will review the order details and available evidence before deciding the appropriate resolution. Buyers should raise an issue from their order or contact support instead of arranging a return outside the app.</p></div></div>
        </>
      );
    }
    if (field === "sourcingMarket") {
      return <NativePickerField title="Sourcing markets" value={Array.isArray(value) ? value : []} options={SOURCING_OPTIONS} onChange={setValue} multiple searchable className="vendor-edit-picker" />;
    }
    if (field === "daysAvailability") {
      return <NativePickerField title="Available days" value={Array.isArray(value) ? value : []} options={DAYS} onChange={setValue} multiple className="vendor-edit-picker" />;
    }
    if (field === "restockFrequency") {
      return <NativePickerField title="Restock frequency" value={value} options={RESTOCK_OPTIONS} onChange={setValue} className="vendor-edit-picker" />;
    }
    if (field === "openTime" || field === "closeTime") {
      return <NativePickerField title={TITLES[field]} value={value} options={TIME_OPTIONS} onChange={setValue} className="vendor-edit-picker" />;
    }
    if (field === "wearReadinessRating") {
      return <NativePickerField title="Wear readiness" value={String(value || "")} options={Array.from({length: 10}, (_, index) => ({value: String(index + 1), label: `${index + 1}/10`}))} onChange={setValue} className="vendor-edit-picker" />;
    }
    if (field === "complexNumber") {
      return <input value={value || ""} maxLength={100} onChange={(event) => setValue(event.target.value)} placeholder="Complex or stall number" />;
    }
    return (
      <>
        <textarea rows={6} maxLength={1000} value={value || ""} onChange={(event) => setValue(event.target.value)} placeholder="Tell buyers what makes your store special" />
        <small className="vendor-edit-count">{String(value || "").length}/1000</small>
      </>
    );
  };

  const saveDisabled = processing || !TITLES[field] ||
    (field === "description" && String(value || "").trim().length < 20) ||
    (field === "daysAvailability" && !value?.length) ||
    (field === "sourcingMarket" && value?.length > 4);

  if (!TITLES[field]) return null;

  return (
    <AppBottomSheet open={show} onClose={handleClose} dismissible={!processing} closeOnBackdrop={!processing} height="62dvh" compactTop keyboardAware ariaLabel={TITLES[field] || "Edit profile"} ariaBusy={processing}>
      <div className="vendor-edit-head">
        <div><h2>{TITLES[field] || "Edit profile"}</h2><p>Changes are saved securely to your store.</p></div>
        <button type="button" onClick={handleClose} disabled={processing} aria-label="Close"><X /></button>
      </div>
      <div className="vendor-edit-body">{renderInput()}</div>
      <div className="vendor-edit-footer">
        <button type="button" onClick={save} disabled={saveDisabled}>{processing ? <RotatingLines strokeColor="#fff" width="20" /> : "Save changes"}</button>
      </div>
    </AppBottomSheet>
  );
}

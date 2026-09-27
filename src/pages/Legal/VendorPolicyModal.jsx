import React from "react";
import { LuPackage, LuX } from "react-icons/lu";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import "./policy-bottom-sheet.css";

const copy = {
  NONE: {
    heading: "Return / Refund Policy",
    body: "This vendor hasn’t published a return policy.",
  },
  NO_RETURNS: {
    heading: "All Sales Final – No Returns",
    body: "Once the item leaves the vendor, no returns or refunds are accepted.",
  },
  NO_RETURNS_AFTER_24HRS: {
    heading: "No Returns After 24 Hours",
    body: "Inspect your item immediately on delivery or pick-up. After 24 hours, all sales are final.",
  },
  NO_RETURNS_IF_CORRECT_ITEM: {
    heading: "No Returns if Item Matches Order",
    body: "If the correct item, size, colour and condition were supplied, returns and refunds are not accepted.",
  },
  NO_RETURNS_SIZE_COLOR: {
    heading: "No Returns for Size or Colour Errors",
    body: "Double-check measurements and colour before buying. The vendor will not accept returns caused by customer selection mistakes.",
  },
  RETURNS_EXCHANGE_ONLY: {
    heading: "Returns – Exchange Only",
    body: "Items can be sent back within 3 days for an exchange or store credit. Cash refunds are not issued.",
  },
  RETURNS_REFUND_IF_DEFECT: {
    heading: "Returns & Full Refund if Defective",
    body: "If the item is damaged, faulty or not as described, return it within 3 days for inspection and a full refund.",
  },
  RETURNS_REFUND_FLEX: {
    heading: "Flexible Returns & Refunds",
    body: "Contact the vendor within 3 days of receipt and they’ll work with you to arrange a return or refund.",
  },
};

export default function VendorPolicyModal({
  show,
  onClose,
  policy = { type: "NONE", notes: "" },
}) {
  const template = copy[policy?.type] ?? copy.NONE;

  return (
    <AppBottomSheet
      open={show}
      onClose={onClose}
      height="64dvh"
      ariaLabel="Vendor return policy"
    >
      <div className="policy-bottom-sheet">
        <header className="policy-bottom-sheet-header">
          <div>
            <span>Store policy</span>
            <h2>{template.heading}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close return policy">
            <LuX />
          </button>
        </header>

        <div className="policy-bottom-sheet-body">
          <div className="policy-bottom-sheet-icon" aria-hidden="true"><LuPackage /></div>
          <p>{template.body}</p>

          {policy?.notes && (
            <section className="policy-bottom-sheet-notes">
              <h3>Vendor’s additional details</h3>
              <p>{policy.notes}</p>
            </section>
          )}

          <div className="policy-bottom-sheet-callout">
            My Thrift Buyer Protection still applies to eligible issues such as an item arriving damaged, missing or not as described.
          </div>
        </div>
      </div>
    </AppBottomSheet>
  );
}

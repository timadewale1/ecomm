import React from "react";
import { LuShieldCheck, LuX } from "react-icons/lu";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import "./policy-bottom-sheet.css";

export default function BuyerProtectionModal({ show, onClose }) {
  return (
    <AppBottomSheet
      open={show}
      onClose={onClose}
      height="68dvh"
      ariaLabel="My Thrift buyer protection"
    >
      <div className="policy-bottom-sheet">
        <header className="policy-bottom-sheet-header">
          <div>
            <span>Shop with confidence</span>
            <h2>My Thrift Buyer Protection</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close buyer protection">
            <LuX />
          </button>
        </header>

        <div className="policy-bottom-sheet-body">
          <div className="policy-bottom-sheet-icon is-protection" aria-hidden="true"><LuShieldCheck /></div>
          <p>
            Buyer Protection helps keep your purchase safe if an order is missing, damaged or not as described.
          </p>

          <section className="policy-bottom-sheet-section">
            <h3>How it protects you</h3>
            <ul>
              <li>Eligible issues are reviewed and verified by My Thrift.</li>
              <li>You may qualify for a refund when an order is not delivered or an item is missing.</li>
              <li>For stockpiles, protection continues while your items are stored with the vendor until you request delivery.</li>
            </ul>
          </section>

          <section className="policy-bottom-sheet-section">
            <h3>Stockpile fees</h3>
            <p>
              You can add products to an active stockpile without another Buyer Protection fee. The current base fee is ₦1,200; stockpiles above ₦20,000 increase by 5% for each additional ₦10,000 increment.
            </p>
          </section>

          <div className="policy-bottom-sheet-callout">
            If something goes wrong, contact My Thrift support promptly and keep your order details and evidence available for verification.
          </div>
        </div>
      </div>
    </AppBottomSheet>
  );
}

// src/components/Wallet/WalletSetupModal.jsx

import React from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import WalletAnim from "../Loading/WalletAnim";

Modal.setAppElement("#root");

const WalletSetupModal = ({ isOpen }) => {
  const navigate = useNavigate();

  const handleSetup = () => {
    navigate("/vendor-wallet");
  };

  return (
    <Modal
      isOpen={isOpen}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      onRequestClose={() => {}}
      contentLabel="Set Up Your Wallet"
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
          height: "88%",
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
      <div className="flex flex-col h-full px-4">
        {/* Animated Illustration */}
        <div className="flex justify-center h-40 -translate-y-8 ">
          <WalletAnim/>
        </div>

        {/* Header */}
        <h2 className="font-satoshi -translate-y-24 text-xl font-semibold text-gray-800 mb-3">
          Introducing Wallets!
        </h2>
        <div className="border -translate-y-24 border-gray-200 mb-4"></div>

        {/* Info */}
        <div className="flex-1 -translate-y-24 text-gray-700  font-opensans space-y-3 mb-4">
          <p className="text-sm">
            You now have full control over how and when you receive your payouts
            — no more guessing or delays.
          </p>
          <p className="text-sm">
            Withdrawals are available every{" "}
            <span className="text-customOrange font-medium">
              Monday, Wednesday, and Friday
            </span>
            . On those days, you can withdraw your funds anytime that works for
            you and get credited instantly.
          </p>
          <p className="text-sm">
            As you accept new orders, your{" "}
            <span className="text-customOrange font-medium">
              pending balance
            </span>{" "}
            updates in real-time — so even if it’s not yet withdrawable, it’s
            already on the way.
          </p>
          <p className="text-sm italic">
            Your withdrawable balance is the amount that’s fully available for
            transfer — and can only be sent to your linked bank account.
          </p>
          <p className="text-sm">
            We hope it makes your payout experience much better.
          </p>
        </div>

        {/* Button always at bottom */}
        <button
          onClick={handleSetup}
          className="mt-auto px-6 py-2.5 -translate-y-20   w-full text-sm font-opensans bg-customOrange text-white font-medium rounded-full"
        >
          Set Up Wallet
        </button>
      </div>
    </Modal>
  );
};

export default WalletSetupModal;

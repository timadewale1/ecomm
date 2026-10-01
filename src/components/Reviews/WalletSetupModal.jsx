import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import WalletAnim from "../Loading/WalletAnim";
import AppBottomSheet from "../layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const WalletSetupModal = ({ isOpen }) => {
  const navigate = useNavigate();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      void appHaptics.medium();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSetup = () => {
    void appHaptics.selection();
    navigate("/vendor-wallet");
  };

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={() => {}}
      height="70dvh"
      ariaLabel="Set up your vendor wallet"
      closeOnBackdrop={false}
      dismissible={false}
      compactTop
      zIndex={5000}
    >
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-5 font-satoshi">
        <div className="flex h-24 shrink-0 justify-center overflow-hidden">
          <WalletAnim />
        </div>

        <header className="shrink-0 border-b border-gray-200 pb-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Introducing Wallets!
          </h2>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4 text-sm leading-5 text-gray-700">
          <p>
            You now have full control over how and when you receive your
            payouts—no more guessing or delays.
          </p>
          <p>
            Withdrawals are available every{" "}
            <span className="font-medium text-customOrange">
              Monday, Wednesday, and Friday
            </span>
            . On those days, you can withdraw your funds whenever works for you
            and get credited instantly.
          </p>
          <p>
            As you accept new orders, your{" "}
            <span className="font-medium text-customOrange">
              pending balance
            </span>{" "}
            updates in real time. Even when it is not yet withdrawable, it is
            already on the way.
          </p>
          <p className="italic">
            Your withdrawable balance is the amount fully available for
            transfer and can only be sent to your linked bank account.
          </p>
          <p>We hope it makes your payout experience much better.</p>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white pt-3">
          <button
            type="button"
            onClick={handleSetup}
            className="h-12 w-full rounded-md bg-customOrange px-6 text-sm font-medium text-white active:opacity-90"
          >
            Set Up Wallet
          </button>
        </div>
      </div>
    </AppBottomSheet>
  );
};

export default WalletSetupModal;

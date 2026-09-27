import React from "react";
import { GoChevronLeft } from "react-icons/go";
import AppBottomSheet from "./AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const Modal = ({ isOpen, onClose, children, busy = false }) => {
  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      variant="fullscreen"
      ariaLabel="Add Product"
      ariaBusy={busy}
      dismissible={!busy}
      closeOnBackdrop={!busy}
      zIndex={4200}
      surfaceClassName="font-satoshi"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3">
          <button
            type="button"
            aria-label="Close Add Product"
            disabled={busy}
            onClick={() => {
              void appHaptics.selection();
              onClose?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-950 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <GoChevronLeft className="h-7 w-7" />
          </button>

          <h2 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-medium text-gray-950">
            Add Product
          </h2>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="min-h-0 flex-1 overflow-hidden px-2 pt-3">{children}</div>
      </div>
    </AppBottomSheet>
  );
};

export default Modal;

import React from "react";
import { Trash2, X } from "lucide-react";
import AppBottomSheet from "./AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const VendorProductModal = ({ isOpen, onClose, children, footer, onDel }) => (
  <AppBottomSheet
    open={isOpen}
    onClose={onClose}
    height="94dvh"
    compactTop
    ariaLabel="Product details"
    zIndex={4100}
    surfaceClassName="vendor-product-sheet font-satoshi"
  >
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="vendor-product-sheet__header relative z-20 mt-5 flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3">
        <button
          type="button"
          aria-label="Close product details"
          onClick={() => {
            void appHaptics.selection();
            onClose?.();
          }}
          className="vendor-product-sheet__header-button grid h-10 w-10 place-items-center rounded-full text-gray-950 active:bg-gray-100"
        >
          <X className="h-6 w-6" strokeWidth={1.8} />
        </button>

        <h2 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-semibold text-gray-950">
          Product details
        </h2>

        <button
          type="button"
          aria-label="Delete product"
          onClick={() => {
            void appHaptics.warning();
            onDel?.();
          }}
          className="vendor-product-sheet__header-button is-danger grid h-10 w-10 place-items-center rounded-full text-red-600 active:bg-red-50"
        >
          <Trash2 className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </header>

      <div
        className={`min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 pt-3 ${
          footer ? "pb-4" : "pb-5"
        }`}
      >
        {children}
      </div>
      {footer ? (
        <footer className="relative z-30 shrink-0 border-t border-gray-100 bg-white px-3 py-3 shadow-[0_-10px_24px_rgba(17,24,39,0.06)]">
          {footer}
        </footer>
      ) : null}
    </div>
  </AppBottomSheet>
);

export default VendorProductModal;

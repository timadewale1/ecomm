import React from "react";
import { FiX } from "react-icons/fi";
import { IoCheckmark } from "react-icons/io5";
import AppBottomSheet from "../../../components/layout/AppBottomSheet";
import { appHaptics } from "../../../services/haptics";

export default function PaletteColorSheet({
  open,
  onClose,
  swatches,
  selectedKey,
  onSelect,
}) {
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="58dvh"
      ariaLabel="Choose colour"
      compactTop
      zIndex={5700}
      surfaceClassName="font-satoshi"
    >
      <div className="flex min-h-0 flex-1 flex-col pt-5">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
          <div>
            <p className="text-xs font-medium text-customOrange">
              Product option
            </p>
            <h2 className="mt-0.5 text-[19px] font-semibold text-gray-950">
              Choose colour
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              void appHaptics.selection();
              onClose?.();
            }}
            aria-label="Close colour picker"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
          <div className="grid grid-cols-4 gap-x-4 gap-y-5">
            {(swatches || []).map((swatch) => {
              const selected = swatch.key === selectedKey;
              return (
                <button
                  key={swatch.key}
                  type="button"
                  onClick={() => onSelect?.(swatch.key)}
                  aria-pressed={selected}
                  className="flex min-w-0 flex-col items-center"
                >
                  <span
                    className={[
                      "relative h-11 w-11 rounded-full shadow-sm",
                      swatch.needsBorder ? "border border-gray-200" : "",
                      selected ? "ring-2 ring-customOrange ring-offset-2" : "",
                    ].join(" ")}
                    style={{ background: swatch.css }}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <IoCheckmark className="text-xl text-white drop-shadow" />
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 max-w-full truncate text-xs text-gray-700">
                    {swatch.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppBottomSheet>
  );
}

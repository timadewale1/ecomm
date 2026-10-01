import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import { appHaptics } from "../../services/haptics";
import { acquireScrollLock } from "../../services/scrollLock";

const clampIndex = (index, length) => {
  if (!length) return 0;
  return Math.max(0, Math.min(Number(index) || 0, length - 1));
};

export default function VendorProductImageViewer({
  open,
  images = [],
  index = 0,
  productName = "Product",
  onIndexChange,
  onClose,
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const validImages = images.filter(Boolean);
  const activeIndex = clampIndex(index, validImages.length);
  const activeImage = validImages[activeIndex];

  useEffect(() => {
    if (!open) return undefined;

    const releaseScrollLock = acquireScrollLock("VendorProductImageViewer");
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      releaseScrollLock();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open || !activeImage || typeof document === "undefined") return null;

  const move = (direction) => {
    if (validImages.length < 2) return;
    void appHaptics.selection();
    const next =
      (activeIndex + direction + validImages.length) % validImages.length;
    onIndexChange?.(next);
  };

  const close = () => {
    void appHaptics.selection();
    onClose?.();
  };

  return createPortal(
    <div
      className="vendor-product-image-viewer font-satoshi"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image ${activeIndex + 1}`}
      data-native-back-block
    >
      <header className="vendor-product-image-viewer__header">
        <button type="button" onClick={close} aria-label="Close image viewer">
          <LuX aria-hidden="true" />
        </button>
        <strong>
          {validImages.length > 1
            ? `${activeIndex + 1} of ${validImages.length}`
            : productName}
        </strong>
        <span aria-hidden="true" />
      </header>

      <div className="vendor-product-image-viewer__stage">
        <img src={activeImage} alt={`${productName} ${activeIndex + 1}`} />
      </div>

      {validImages.length > 1 && (
        <>
          <button
            type="button"
            className="vendor-product-image-viewer__nav is-previous"
            onClick={() => move(-1)}
            aria-label="Previous product image"
          >
            <LuChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="vendor-product-image-viewer__nav is-next"
            onClick={() => move(1)}
            aria-label="Next product image"
          >
            <LuChevronRight aria-hidden="true" />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

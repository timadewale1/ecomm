import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import SafeImg from "../../services/safeImg";
import {
  getProductColorSwatches,
  normalizeColorKeyForSwatch,
} from "../../services/colorutils";

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AddToCartVariantSheet({
  open,
  onClose,

  product,
  variants = [],
 confirmLabel = "Add to Cart",
  // display
  title = "Add to Cart",
  imageUrl,
  priceText = "",
  prevPriceText = "",

  // initial values from parent
  initialSwatchKey = "",
  initialSize = "",
  initialRawColor = "",
  initialQty = 1,

  // callback when user confirms
  onConfirm, // ({ swatchKey, size, rawColor, qty }) => void
}) {
  const swatches = useMemo(
    () => getProductColorSwatches(product, { source: "variants" }) || [],
    [product],
  );

  const derivedInitialSwatchKey = useMemo(() => {
    if (initialSwatchKey) return initialSwatchKey;
    if (initialRawColor) return normalizeColorKeyForSwatch(initialRawColor);
    return "";
  }, [initialSwatchKey, initialRawColor]);

  const [swatchKey, setSwatchKey] = useState(derivedInitialSwatchKey);
  const [size, setSize] = useState(initialSize || "");
  const [rawColor, setRawColor] = useState(initialRawColor || "");
  const [qty, setQty] = useState(Math.max(1, num(initialQty)));

  // sizes displayed in the modal
  const allSizes = useMemo(() => {
    return uniq((variants || []).map((v) => String(v?.size || "").trim()).filter(Boolean));
  }, [variants]);

  const sizesForSwatch = useMemo(() => {
    if (!swatchKey) return allSizes;
    const sizes = (variants || [])
      .filter((v) => normalizeColorKeyForSwatch(v?.color) === swatchKey)
      .map((v) => String(v?.size || "").trim())
      .filter(Boolean);
    return uniq(sizes);
  }, [variants, swatchKey, allSizes]);

  const findVariantBySwatchAndSize = (k, s) => {
    if (!k || !s) return null;
    return (
      (variants || []).find(
        (v) =>
          String(v?.size || "").trim() === String(s).trim() &&
          normalizeColorKeyForSwatch(v?.color) === k,
      ) || null
    );
  };

  const selectedVariant = useMemo(() => {
    if (!swatchKey || !size) return null;
    return findVariantBySwatchAndSize(swatchKey, size);
  }, [swatchKey, size, variants]);

  const maxStock = useMemo(() => {
    // If variant selected, use variant stock
    if (selectedVariant) return Math.max(0, num(selectedVariant.stock));
    // fallback to main product stock if needed
    return Math.max(0, num(product?.stockQuantity ?? product?.stock ?? 0));
  }, [selectedVariant, product]);

  const canInc = qty < maxStock;
  const canDec = qty > 1;

  const missingColor = !swatchKey;
  const missingSize = !size;
  const outOfStock = swatchKey && size && maxStock <= 0;

  const canSubmit = !missingColor && !missingSize && !outOfStock && qty >= 1 && qty <= maxStock;

  useEffect(() => {
    if (!open) return;
    // reset whenever sheet opens
    setSwatchKey(derivedInitialSwatchKey);
    setSize(initialSize || "");
    setRawColor(initialRawColor || "");
    setQty(Math.max(1, num(initialQty)));
  }, [open, derivedInitialSwatchKey, initialSize, initialRawColor, initialQty]);

  // when swatch changes, reset size + rawColor (same behaviour as your page)
  useEffect(() => {
    if (!open) return;
    setSize("");
    setRawColor("");
    // keep qty as-is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swatchKey]);

  // when size changes under a swatch, resolve the RAW DB color from the matching variant row
  useEffect(() => {
    if (!open) return;
    if (!swatchKey || !size) return;
    const v = findVariantBySwatchAndSize(swatchKey, size);
    if (v?.color) setRawColor(v.color);
  }, [open, swatchKey, size, variants]);

  const close = () => onClose?.();

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm?.({
      swatchKey,
      size,
      rawColor,
      qty,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9000] bg-black"
            onClick={close}
          />

          {/* sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110) close();
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[9100] bg-white rounded-t-3xl shadow-2xl"
          >
            {/* handle */}
            <div className="pt-3 pb-2 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* header */}
            <div className="relative mt-2 px-5 pb-3">
              <h3 className="textbase font-opensans font-semibold text-gray-900 text-center">
                {title}
              </h3>
              <button
                onClick={close}
                className="absolute right-4 top-0 p-2 text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <IoMdClose size={20} />
              </button>
            </div>

            {/* content */}
            <div className="px-5 pb-4 max-h-[72vh] overflow-y-auto">
              {/* product row */}
              <div className="flex items-center gap-3">
                <div className="w-20 h-24 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  <SafeImg
                    src={imageUrl || product?.coverImageUrl || product?.imageUrl}
                    alt="Product image"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-opensans font-semibold text-black truncate">
                    {product?.name || "Item"}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5">
                    {prevPriceText ? (
                      <span className="text-xs font-opensans text-gray-400 line-through">
                        {prevPriceText}
                      </span>
                    ) : null}
                    {priceText ? (
                      <span className="text-base font-opensans text-black font-semibold">
                        {priceText}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* colour */}
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-opensans font-semibold text-black">
                    Colour
                  </p>
                  {missingColor ? (
                    <span className="text-[11px] font-opensans text-gray-400">
                      (select one)
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-3 mt-2 overflow-x-auto no-scrollbar py-1">
                  {swatches.map((sw) => {
                    const active = swatchKey === sw.key;
                    return (
                      <button
                        key={sw.key}
                        type="button"
                        onClick={() =>
                          setSwatchKey((prev) => (prev === sw.key ? "" : sw.key))
                        }
                        className="flex flex-col items-center shrink-0"
                      >
                        <div
                          className={[
                            "w-9 h-9 rounded-full",
                            sw.needsBorder ? "border border-gray-200" : "",
                            active ? "ring-2 ring-black mx-1 ring-offset-2" : "",
                          ].join(" ")}
                          style={sw.style}
                        />
                        <span className="mt-1 text-[11px] font-opensans text-gray-700 whitespace-nowrap">
                          {sw.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* size */}
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-opensans font-semibold text-black">
                    Size
                  </p>
                  {missingSize ? (
                    <span className="text-[11px] font-opensans text-gray-400">
                      (select one)
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {(sizesForSwatch || []).map((s) => {
                    // only show out-of-stock once a colour context exists (same as your page logic)
                    const hasColorContext = Boolean(swatchKey);
                    const v = hasColorContext ? findVariantBySwatchAndSize(swatchKey, s) : null;
                    const inStock = !hasColorContext ? true : num(v?.stock) > 0;

                    const active = String(size) === String(s) && inStock;

                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!inStock}
                        onClick={() => setSize(String(s))}
                        className={[
                          "h-9 px-4 rounded-lg border text-xs font-opensans font-semibold relative",
                          active
                            ? "bg-customOrange text-white border-customOrange"
                            : inStock
                              ? "bg-white text-black border-gray-200"
                              : "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* quantity */}
              <div className="mt-4">
                <p className="text-sm font-opensans font-semibold text-black mb-2">
                  Quantity
                </p>

                <div className="inline-flex items-center bg-gray-100 rounded-lg px-3 py-2">
                  <button
                    type="button"
                    onClick={() => canDec && setQty((q) => Math.max(1, q - 1))}
                    disabled={!canDec}
                    className={`p-1 ${!canDec ? "opacity-40 cursor-not-allowed" : ""}`}
                    aria-label="Decrease quantity"
                  >
                    <GoChevronLeft className="text-xl" />
                  </button>

                  <span className="w-10 text-center font-opensans text-sm">
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => canInc && setQty((q) => Math.min(maxStock, q + 1))}
                    disabled={!canInc}
                    className={`p-1 ${!canInc ? "opacity-40 cursor-not-allowed" : ""}`}
                    aria-label="Increase quantity"
                  >
                    <GoChevronRight className="text-xl" />
                  </button>
                </div>

                {/* stock hint */}
                {swatchKey && size ? (
                  <p className="mt-2 text-[11px] font-opensans text-gray-500">
                    {outOfStock ? "Out of stock for this option." : `Stock: ${maxStock}`}
                  </p>
                ) : null}
              </div>

              {/* bottom button like screenshot */}
              <div className="mt-6 pb-5">
                <button
  onClick={handleConfirm}
  disabled={!canSubmit}
  className={`w-full h-12 rounded-xl font-opensans font-semibold transition
    ${canSubmit ? "bg-customOrange text-white" : "bg-gray-200 text-gray-500"}
  `}
>
  {confirmLabel}
</button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

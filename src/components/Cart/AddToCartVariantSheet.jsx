import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import SafeImg from "../../services/safeImg";
import AppBottomSheet from "../layout/AppBottomSheet";
import { getProductColorSwatches } from "../../services/colorutils";
import {
  getSwatchSelectionKey,
  getVariantSwatchSelectionKey,
  hasPurchasableVariantForSize,
  hasPurchasableVariantForSwatch,
  isVariantSizeHidden,
  resolveCurrentVariantSelection,
  resolvePurchasableVariantChoice,
  resolveSinglePurchasableVariant,
  resolveSinglePurchasableVariantForSwatch,
  resolveVariantByRawSelection,
} from "../../services/productVariantSelection";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const hasValue = (value) => String(value ?? "").trim().length > 0;

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
  const hideVariantSize = isVariantSizeHidden(product);

  const derivedInitialSwatchKey = useMemo(() => {
    if (String(initialRawColor ?? "").trim()) {
      return getVariantSwatchSelectionKey(initialRawColor);
    }
    if (initialSwatchKey) return initialSwatchKey;
    return "";
  }, [initialSwatchKey, initialRawColor]);

  const initialVariant = useMemo(() => {
    const hasInitialColor = hasValue(initialRawColor);
    const hasInitialSize = hasValue(initialSize);
    const hasInitialSwatch = Boolean(derivedInitialSwatchKey);

    if (hasInitialColor && hasInitialSize) {
      const exact = resolveVariantByRawSelection(variants, {
        color: initialRawColor,
        size: initialSize,
      });
      // Both raw values identify a concrete persisted choice. If it has gone
      // stale or become ambiguous, show it as invalid; never remap it.
      return exact;
    }

    if (hasInitialSwatch && hasInitialSize) {
      const matchingChoice = resolvePurchasableVariantChoice(variants, {
        swatchKey: derivedInitialSwatchKey,
        size: initialSize,
      });
      if (matchingChoice) return matchingChoice;
    }

    if (hideVariantSize && hasInitialSwatch && !hasInitialSize) {
      const matchingColour = resolveSinglePurchasableVariantForSwatch(
        variants,
        derivedInitialSwatchKey,
      );
      if (matchingColour) return matchingColour;
    }

    // Never replace an explicit, stale selection with another physical row.
    if (hasInitialColor || hasInitialSize || hasInitialSwatch) return null;
    return resolveSinglePurchasableVariant(variants);
  }, [
    derivedInitialSwatchKey,
    hideVariantSize,
    initialRawColor,
    initialSize,
    variants,
  ]);

  const [swatchKey, setSwatchKey] = useState(
    initialVariant?.swatchKey || derivedInitialSwatchKey,
  );
  const [size, setSize] = useState(initialVariant?.size ?? initialSize ?? "");
  const [rawColor, setRawColor] = useState(
    initialVariant?.color ?? initialRawColor ?? "",
  );
  const [qty, setQty] = useState(Math.max(1, num(initialQty)));
  const sheetSessionRef = useRef({ open: false, productId: "" });
  const sheetProductId = String(product?.id || product?.productId || "");

  // Keep the first exact raw representation for each operational size. The
  // selected descriptor below still supplies the untouched database value.
  const allSizes = useMemo(() => {
    const seen = new Set();
    const result = [];

    for (const variant of variants || []) {
      const rawSize = variant?.size;
      const key = String(rawSize ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(rawSize);
    }

    return result;
  }, [variants]);

  const selectedDescriptor = useMemo(() => {
    return resolveCurrentVariantSelection(variants, {
      rawColor,
      size,
      swatchKey,
    });
  }, [rawColor, size, swatchKey, variants]);

  const selectedVariant = selectedDescriptor?.variant || null;

  const maxStock = useMemo(() => {
    return selectedDescriptor ? Math.max(0, selectedDescriptor.stock) : 0;
  }, [selectedDescriptor]);

  const canInc = qty < maxStock;
  const canDec = qty > 1;

  const missingColor = !swatchKey;
  const missingSize = !hasValue(size);
  const outOfStock =
    swatchKey && hasValue(size) && (!selectedVariant || maxStock <= 0);

  const canSubmit =
    !missingColor &&
    !missingSize &&
    Boolean(selectedVariant) &&
    !outOfStock &&
    qty >= 1 &&
    qty <= maxStock;

  useEffect(() => {
    const previous = sheetSessionRef.current;
    const shouldReset =
      open && (!previous.open || previous.productId !== sheetProductId);
    sheetSessionRef.current = { open, productId: sheetProductId };

    if (!shouldReset) return;
    const requestedQty = Math.max(1, num(initialQty));

    setSwatchKey(initialVariant?.swatchKey || derivedInitialSwatchKey);
    setSize(initialVariant?.size ?? initialSize ?? "");
    setRawColor(initialVariant?.color ?? initialRawColor ?? "");
    setQty(
      initialVariant?.stock > 0
        ? Math.min(requestedQty, initialVariant.stock)
        : requestedQty,
    );
  }, [
    derivedInitialSwatchKey,
    initialQty,
    initialRawColor,
    initialSize,
    initialVariant,
    open,
    sheetProductId,
  ]);

  useEffect(() => {
    if (!open || !selectedVariant) return;
    const selectedStock = Math.max(0, num(selectedVariant.stock));
    if (selectedStock > 0) {
      setQty((current) => Math.min(Math.max(1, current), selectedStock));
    }
  }, [open, selectedVariant]);

  const swatchIsAvailable = (key) => {
    if (hideVariantSize) {
      return Boolean(resolveSinglePurchasableVariantForSwatch(variants, key));
    }
    if (hasValue(size)) {
      return Boolean(
        resolvePurchasableVariantChoice(variants, {
          swatchKey: key,
          size,
        }),
      );
    }
    return hasPurchasableVariantForSwatch(variants, key);
  };

  const sizeIsAvailable = (candidateSize) => {
    if (swatchKey) {
      return Boolean(
        resolvePurchasableVariantChoice(variants, {
          swatchKey,
          size: candidateSize,
        }),
      );
    }
    return hasPurchasableVariantForSize(variants, candidateSize);
  };

  const handleSwatchSelect = (key) => {
    if (swatchKey === key) {
      setSwatchKey("");
      setSize("");
      setRawColor("");
      return;
    }

    if (hideVariantSize) {
      const match = resolveSinglePurchasableVariantForSwatch(variants, key);
      if (!match) return;
      setSwatchKey(match.swatchKey);
      setSize(match.size);
      setRawColor(match.color);
      setQty((current) => Math.min(Math.max(1, current), match.stock));
      return;
    }

    if (hasValue(size)) {
      const match = resolvePurchasableVariantChoice(variants, {
        swatchKey: key,
        size,
      });
      if (match) {
        setSwatchKey(match.swatchKey);
        setSize(match.size);
        setRawColor(match.color);
        setQty((current) => Math.min(Math.max(1, current), match.stock));
        return;
      }
    }

    setSwatchKey(key);
    setSize("");
    setRawColor("");
  };

  const handleSizeSelect = (nextSize) => {
    if (Object.is(size, nextSize)) {
      setSize("");
      setRawColor("");
      return;
    }

    if (!swatchKey) {
      setSize(nextSize);
      setRawColor("");
      return;
    }

    const match = resolvePurchasableVariantChoice(variants, {
      swatchKey,
      size: nextSize,
    });
    if (!match) return;

    setSize(match.size);
    setRawColor(match.color);
    setQty((current) => Math.min(Math.max(1, current), match.stock));
  };

  const close = () => onClose?.();

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm?.({
      swatchKey,
      size: selectedDescriptor.size,
      rawColor: selectedDescriptor.color,
      qty,
    });
  };

  return (
    <AppBottomSheet
      open={open}
      onClose={close}
      height="auto"
      ariaLabel={title}
      zIndex={9000}
      backdropClassName="bg-black/60"
      surfaceStyle={{
        borderTopLeftRadius: "24px",
        borderTopRightRadius: "24px",
      }}
      compactTop
    >
          <div className="pt-5">
            {/* header */}
            <div className="relative px-5 pb-3">
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
                    const optionKey = getSwatchSelectionKey(sw);
                    const active = swatchKey === optionKey;
                    const inStock = swatchIsAvailable(optionKey);
                    return (
                      <button
                        key={optionKey}
                        type="button"
                        disabled={!inStock && !active}
                        onClick={() => handleSwatchSelect(optionKey)}
                        className={`flex flex-col items-center shrink-0 ${
                          inStock || active
                            ? ""
                            : "cursor-not-allowed opacity-35"
                        }`}
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
              {!hideVariantSize && <div className="mt-4">
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
                  {allSizes.map((s) => {
                    const inStock = sizeIsAvailable(s);

                    const active = Object.is(size, s);

                    return (
                      <button
                        key={`${typeof s}:${String(s)}`}
                        type="button"
                        disabled={!inStock && !active}
                        onClick={() => handleSizeSelect(s)}
                        className={[
                          "h-9 px-4 rounded-lg border text-xs font-opensans font-semibold relative",
                          active
                            ? "bg-customOrange text-white border-customOrange"
                            : inStock || active
                              ? "bg-white text-black border-gray-200"
                              : "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>}

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
                {swatchKey && hasValue(size) ? (
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
          </div>
    </AppBottomSheet>
  );
}

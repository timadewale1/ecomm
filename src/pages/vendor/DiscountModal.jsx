import React, { useEffect, useMemo, useState } from "react";
import { FiInfo, FiTag, FiX } from "react-icons/fi";
import { IoGiftOutline } from "react-icons/io5";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../firebase.config";
import NativePickerField from "../../components/Form/NativePickerField";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const FREEBIE_OPTIONS = [
  "Buy one, get one free",
  "Buy two, get one free",
  "Buy and get a surprise gift",
  "Free accessory with purchase",
];

const toPickerLabel = (discount) => {
  if (!discount?.startDate || !discount?.endDate) return discount?.name || "Discount";
  const start = new Date(discount.startDate.seconds * 1000).toLocaleDateString();
  const end = new Date(discount.endDate.seconds * 1000).toLocaleDateString();
  return `${discount.name} · ${start}–${end}`;
};

const DiscountModal = ({
  isOpen,
  onRequestClose,
  handleSaveDiscount,
  initialPriceValue,
  initialPriceLocked = false,
}) => {
  const [inAppDiscounts, setInAppDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [initialPrice, setInitialPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [subtractiveValue, setSubtractiveValue] = useState("");
  const [percentageCut, setPercentageCut] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [personalDiscountSubtype, setPersonalDiscountSubtype] =
    useState("monetary");
  const [freebieText, setFreebieText] = useState("");
  const [isDiscountInfoModalOpen, setIsDiscountInfoModalOpen] = useState(false);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (
      !isOpen ||
      initialPriceValue === undefined ||
      initialPriceValue === null
    ) {
      return;
    }
    const numericPrice = Number(initialPriceValue);
    setInitialPrice(
      Number.isFinite(numericPrice) && numericPrice >= 0
        ? numericPrice.toFixed(2)
        : "",
    );
  }, [initialPriceValue, isOpen]);

  useEffect(() => {
    let active = true;
    const fetchDiscounts = async () => {
      setIsLoadingDiscounts(true);
      try {
        const discountsQuery = query(
          collection(db, "inAppDiscounts"),
          where("isActive", "==", true),
        );
        const querySnapshot = await getDocs(discountsQuery);
        if (!active) return;
        const discounts = querySnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        discounts.push({ id: "personal", name: "Create your own discount" });
        setInAppDiscounts(discounts);
        setSelectedDiscount((current) => current || discounts[0] || null);
        if (discounts[0]) {
          setDiscountType(
            discounts[0].id === "personal"
              ? "personal-monetary"
              : `inApp-${discounts[0].id}`,
          );
        }
      } catch (error) {
        console.error("Error fetching in-app discounts:", error);
        if (active) toast.error("We couldn’t load the discount options.");
      } finally {
        if (active) setIsLoadingDiscounts(false);
      }
    };
    void fetchDiscounts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const price = parseFloat(initialPrice);
    const discounted = parseFloat(discountPrice);
    if (
      Number.isFinite(price) &&
      Number.isFinite(discounted) &&
      price > 0 &&
      discounted < price
    ) {
      const saved = price - discounted;
      setSubtractiveValue(saved.toFixed(2));
      setPercentageCut(String(Math.round((saved / price) * 100)));
    } else {
      setSubtractiveValue("");
      setPercentageCut("");
    }
  }, [initialPrice, discountPrice]);

  const pickerOptions = useMemo(
    () =>
      inAppDiscounts.map((discount) => ({
        label: toPickerLabel(discount),
        value: discount.id,
      })),
    [inAppDiscounts],
  );

  const formatToCurrency = (value) => {
    const numericValue = String(value || "").replace(/\D/g, "");
    return numericValue ? (numericValue / 100).toFixed(2) : "";
  };

  const selectDiscount = (discountId) => {
    const next = inAppDiscounts.find((discount) => discount.id === discountId);
    if (!next) return;
    setSelectedDiscount(next);
    if (next.id === "personal") {
      setDiscountType(`personal-${personalDiscountSubtype}`);
    } else {
      setDiscountType(`inApp-${next.id}`);
    }
  };

  const selectPersonalSubtype = (value) => {
    setPersonalDiscountSubtype(value);
    setDiscountType(`personal-${value}`);
    if (value !== "freebies") setFreebieText("");
  };

  const isMonetary =
    Boolean(selectedDiscount) &&
    (discountType.startsWith("inApp") || discountType === "personal-monetary");
  const isFreebies = discountType === "personal-freebies";

  let errorMessage = "";
  if (!selectedDiscount) {
    errorMessage = "Choose a discount option.";
  } else if (isMonetary) {
    if (!initialPrice.trim()) {
      errorMessage = "Enter the item’s original price.";
    } else if (!discountPrice.trim()) {
      errorMessage = "Enter the price customers will pay.";
    } else if (parseFloat(discountPrice) < 300) {
      errorMessage = "The discounted price must be at least ₦300.";
    } else if (parseFloat(discountPrice) >= parseFloat(initialPrice)) {
      errorMessage = "The discounted price must be lower than the original price.";
    }
  } else if (isFreebies && !freebieText.trim()) {
    errorMessage = "Choose the freebie customers will receive.";
  }
  const isFormValid = !errorMessage;

  const requestClose = (cancelled = true) => {
    if (isSaving) return;
    setIsDiscountInfoModalOpen(false);
    void appHaptics.selection();
    onRequestClose?.(cancelled);
  };

  const handleDiscountSaveClick = async () => {
    if (!isFormValid) {
      void appHaptics.warning();
      toast.error(errorMessage);
      return;
    }

    let discountDetails;
    if (selectedDiscount.id !== "personal") {
      discountDetails = {
        discountType: `inApp-${selectedDiscount.id}`,
        selectedDiscount,
        initialPrice: parseFloat(initialPrice),
        discountPrice: parseFloat(discountPrice),
        subtractiveValue: parseFloat(subtractiveValue),
        percentageCut: parseFloat(percentageCut),
      };
    } else if (personalDiscountSubtype === "monetary") {
      discountDetails = {
        discountType: "personal-monetary",
        initialPrice: parseFloat(initialPrice),
        discountPrice: parseFloat(discountPrice),
        subtractiveValue: parseFloat(subtractiveValue),
        percentageCut: parseFloat(percentageCut),
      };
    } else {
      discountDetails = {
        discountType: "personal-freebies",
        freebieText,
      };
    }

    setIsSaving(true);
    try {
      await handleSaveDiscount(discountDetails);
      void appHaptics.success();
      onRequestClose?.(false);
    } catch (error) {
      void appHaptics.error();
      // The persistence owner presents the user-facing error. Keeping the
      // sheet open lets the vendor retry without rebuilding their discount.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AppBottomSheet
        open={isOpen}
        onClose={() => requestClose(true)}
        dismissible={!isSaving}
        closeOnBackdrop={!isSaving}
        height="76dvh"
        ariaLabel="Add a discount"
        compactTop
        zIndex={4700}
        surfaceClassName="font-satoshi"
      >
        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pb-2.5">
            <div>
              <p className="text-xs font-medium text-customOrange">Optional offer</p>
              <h2 className="mt-0.5 text-[19px] font-semibold text-gray-950">
                Add a discount
              </h2>
            </div>
            <button
              type="button"
              onClick={() => requestClose(true)}
              aria-label="Close discount"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 pt-3">
            <section>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Discount option
              </label>
              <NativePickerField
                title="Discount option"
                value={selectedDiscount?.id || ""}
                options={pickerOptions}
                onChange={selectDiscount}
                placeholder={isLoadingDiscounts ? "Loading discounts…" : "Choose a discount"}
                disabled={isLoadingDiscounts || !pickerOptions.length}
                className="min-h-12 rounded-xl border border-gray-200 px-4 text-[15px] shadow-sm"
              />
            </section>

            {selectedDiscount?.id === "personal" && (
              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    Personal discount type
                  </label>
                  <button
                    type="button"
                    aria-label="About personal discounts"
                    onClick={() => {
                      void appHaptics.selection();
                      setIsDiscountInfoModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500"
                  >
                    <FiInfo className="h-4 w-4" />
                    How it works
                  </button>
                </div>
                <NativePickerField
                  title="Personal discount type"
                  value={personalDiscountSubtype}
                  options={[
                    { label: "Reduce the price", value: "monetary" },
                    { label: "Add a freebie", value: "freebies" },
                  ]}
                  onChange={selectPersonalSubtype}
                  className="min-h-12 rounded-xl border border-gray-200 px-4 text-[15px] shadow-sm"
                />
              </section>
            )}

            {isMonetary && (
              <section className="rounded-2xl bg-gray-50 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-customOrange">
                    <FiTag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950">Set the offer price</h3>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">
                      Customers see the saving automatically. The discounted price cannot be below ₦300.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600">Original price</span>
                    <span className="flex h-12 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-customOrange">
                      <span className="mr-1 text-gray-500">₦</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={initialPrice}
                        onChange={(event) => setInitialPrice(formatToCurrency(event.target.value))}
                        readOnly={initialPriceLocked}
                        aria-readonly={initialPriceLocked}
                        className={`min-w-0 flex-1 border-0 bg-transparent text-right text-[15px] outline-none ring-0 ${
                          initialPriceLocked
                            ? "cursor-not-allowed text-gray-500"
                            : "text-gray-950"
                        }`}
                        placeholder="0.00"
                      />
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600">Customer pays</span>
                    <span className="flex h-12 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-customOrange">
                      <span className="mr-1 text-gray-500">₦</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={discountPrice}
                        onChange={(event) => setDiscountPrice(formatToCurrency(event.target.value))}
                        className="min-w-0 flex-1 border-0 bg-transparent text-right text-[15px] text-gray-950 outline-none ring-0"
                        placeholder="0.00"
                      />
                    </span>
                  </label>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-green-700">Customer saves</span>
                    <strong className="mt-1 block text-base font-semibold text-green-800">
                      {subtractiveValue ? `₦${subtractiveValue}` : "—"}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-orange-700">Discount</span>
                    <strong className="mt-1 block text-base font-semibold text-customOrange">
                      {percentageCut ? `${percentageCut}% off` : "—"}
                    </strong>
                  </div>
                </div>
              </section>
            )}

            {isFreebies && (
              <section className="rounded-2xl bg-orange-50 p-3.5">
                <div className="mb-2.5 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-customOrange shadow-sm">
                    <IoGiftOutline className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950">Choose the freebie</h3>
                    <p className="mt-0.5 text-xs leading-5 text-gray-600">
                      This wording appears with the product so customers know exactly what they receive.
                    </p>
                  </div>
                </div>
                <NativePickerField
                  title="Freebie offer"
                  value={freebieText}
                  options={FREEBIE_OPTIONS}
                  onChange={setFreebieText}
                  placeholder="Select a freebie"
                  className="min-h-12 rounded-xl border border-orange-100 px-4 text-[15px] shadow-sm"
                />
              </section>
            )}

            {errorMessage && (initialPrice || discountPrice || freebieText) && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <button
              type="button"
              onClick={handleDiscountSaveClick}
              disabled={!isFormValid || isSaving}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-customOrange text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(249,83,30,0.22)] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              {isSaving ? (
                <span
                  aria-label="Saving discount"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white/45 border-t-white"
                />
              ) : (
                "Save discount"
              )}
            </button>
          </div>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        open={isDiscountInfoModalOpen}
        onClose={() => setIsDiscountInfoModalOpen(false)}
        height="48dvh"
        ariaLabel="Personal discount details"
        compactTop
        zIndex={4900}
        surfaceClassName="font-satoshi"
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-customOrange">Discount guide</p>
              <h2 className="mt-0.5 text-lg font-semibold text-gray-950">Personal discounts</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                void appHaptics.selection();
                setIsDiscountInfoModalOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              aria-label="Close discount guide"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>
          <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto text-sm leading-6 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-950">Reduce the price</h3>
              <p>Set the original amount and a lower selling price. My Thrift calculates and displays both the amount saved and percentage off.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Add a freebie</h3>
              <p>Keep the product price unchanged and attach one clear gift offer. Choose from the provided options so the promise is consistent and easy for buyers to understand.</p>
            </div>
          </div>
        </div>
      </AppBottomSheet>
    </>
  );
};

export default DiscountModal;

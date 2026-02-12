import React, { useMemo, useState } from "react";
import { IoMdArrowForward, IoMdClose } from "react-icons/io";
import { CiCircleInfo } from "react-icons/ci";
import { motion, AnimatePresence } from "framer-motion";

// --- Helper Functions ---
const toTitleCase = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const safeText = (v) => {
  const s = String(v ?? "").trim();
  return s ? s : "";
};
const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const asDate = (ts) => {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate(); // Firestore Timestamp
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

const timeAgo = (date) => {
  const d = asDate(date);
  if (!d) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const deriveSizeText = (product) => {
  if (!product) return "";
  if (product.size) {
    const parts = String(product.size)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} - ${parts[parts.length - 1]}`;
  }
  if (Array.isArray(product.variants) && product.variants.length) {
    const sizes = Array.from(
      new Set(
        product.variants
          .map((v) => v?.size)
          .filter(Boolean)
          .map((s) => String(s).trim()),
      ),
    );
    if (!sizes.length) return "";
    if (sizes.length === 1) return sizes[0];
    return `${sizes[0]} - ${sizes[sizes.length - 1]}`;
  }
  return "";
};

const InfoRow = ({
  label,
  value,
  showInfoIcon = false,
  isDescription = false,
  onMore,
}) => {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between py-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-opensans text-gray-500">{label}</span>
        {showInfoIcon && <CiCircleInfo className="text-gray-400 text-md" />}
      </div>

      <div className="text-sm font-opensans text-black text-right max-w-[65%] leading-tight">
        {isDescription ? (
          <span>
            {value}{" "}
            {onMore && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMore();
                }}
                className="font-bold text-black cursor-pointer ml-1"
              >
                ...more
              </span>
            )}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
};

const DetailsModal = ({ data, onClose, onOpenDefect }) => {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) onClose();
        }}
        className="fixed bottom-0 left-0 right-0 z-[9000] bg-white rounded-t-3xl shadow-2xl h-[45vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="pt-4 pb-2 cursor-grab active:cursor-grabbing flex justify-center w-full">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="relative text-center px-5 mb-2 shrink-0">
          <h3 className="text-lg font-normal font-satoshi text-gray-800">
            About this Item
          </h3>
          <button
            onClick={onClose}
            className="absolute right-5 top-0 text-gray-400 hover:text-gray-600 p-1"
          >
            <IoMdClose size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="flex flex-col gap-1">
            <InfoRow
              label="Condition"
              value={data.condition}
              showInfoIcon={true}
            />

            {/* ✅ DEFECT (right below Condition) */}
            {data.defectText && (
              <div
                className="flex items-start justify-between py-1 cursor-pointer"
                onClick={onOpenDefect}
                role="button"
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm font-opensans text-red-600">
                    Defect
                  </span>

                  {/* clickable info icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDefect();
                    }}
                    className="p-0.5"
                    aria-label="View defect details"
                  >
                    <CiCircleInfo className="text-red-500 text-md" />
                  </button>
                </div>

                <div className="text-sm font-opensans text-red-700 text-right max-w-[65%] leading-tight">
                  {data.defectText}
                </div>
              </div>
            )}

            <InfoRow label="Category" value={data.category} />
            <InfoRow label="Product Type" value={data.productType} />
            <InfoRow label="Sub Type" value={data.subType} />
            <InfoRow label="Size" value={data.sizeText} />
            <InfoRow label="Quantity" value={data.stockText} />

            {/* Full Description */}
            <div className="flex items-start justify-between gap-2 py-2 mt-2">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-satoshi text-gray-500">
                  Description
                </span>
              </div>
              <p className="text-sm font-satoshi text-black leading-relaxed text-right whitespace-pre-wrap max-w-[70%]">
                {data.rawDesc}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default function AboutThisItem({
  product,
  showSize = true,
  className = "",
  onOpenDefect, // ✅ NEW (opens the defect modal in ProductDetailPage)
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const data = useMemo(() => {
    const condition = safeText(product?.condition);
    const category = safeText(product?.category);
    const productType = safeText(product?.productType);
    const subType = safeText(product?.subType);
    const uploaded = timeAgo(product?.createdAt);
    const sizeText = showSize ? deriveSizeText(product) : "";
    const rawDesc = safeText(product?.description);
    const stockQty = safeNumber(product?.stockQuantity);
    const stockText =
      stockQty === null
        ? ""
        : stockQty <= 0
          ? "Out of stock"
          : `${stockQty} in stock`;

    // ✅ defect logic
    const conditionLower = String(product?.condition || "").toLowerCase();
    const hasDefectByCondition = conditionLower.includes("defect");
    const defectDesc = safeText(product?.defectDescription);
    const defectText =
      defectDesc || (hasDefectByCondition ? "This item has a disclosed defect." : "");

    // description preview
    const previewDesc = rawDesc.length > 35 ? rawDesc.slice(0, 35) : rawDesc;
    const hasMore = rawDesc.length > 35;

    return {
      condition: condition ? toTitleCase(condition.replace(/:$/, "")) : "",
      category: category ? toTitleCase(category) : "",
      productType: productType ? toTitleCase(productType) : "",
      subType: subType ? toTitleCase(subType) : "",
      uploaded,
      stockQty,
      stockText,
      sizeText,
      rawDesc,
      previewDesc,
      hasMore,

      defectText, // ✅ NEW
    };
  }, [product, showSize]);

  const hasAnything =
    data.condition ||
    data.category ||
    data.productType ||
    data.stockText ||
    data.sizeText ||
    data.rawDesc ||
    data.defectText;

  if (!hasAnything) return null;

  // ✅ Open defect modal from parent; also close this sheet if it’s open
  const openDefect = () => {
    setIsModalOpen(false);
    onOpenDefect?.();
  };

  return (
    <>
      <div className={`py-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-opensans font-semibold text-black">
            About this item
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gray-100 h-10 w-10 flex justify-center items-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <IoMdArrowForward className="text-xl text-gray-700" />
          </button>
        </div>

        {/* Preview List */}
        <div className="flex flex-col">
          <InfoRow
            label="Condition"
            value={data.condition}
            showInfoIcon={true}
          />

          {/* ✅ DEFECT IN PREVIEW (right below Condition) */}
          {data.defectText && (
            <div className="flex items-start justify-between py-1">
              <div className="flex items-center gap-1">
                <span className="text-sm font-opensans text-red-600">
                  Defect
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDefect();
                  }}
                  className="p-0.5"
                  aria-label="View defect details"
                >
                  <CiCircleInfo className="text-red-500 text-md" />
                </button>
              </div>

              <div
                className="text-sm font-opensans text-red-700 text-right max-w-[65%] leading-tight cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openDefect();
                }}
                role="button"
              >
                {data.defectText}
              </div>
            </div>
          )}

          <InfoRow label="Size" value={data.sizeText} />
          <InfoRow label="Quantity" value={data.stockText} />

          <InfoRow
            label="Description"
            value={data.previewDesc}
            isDescription={true}
            onMore={data.hasMore ? () => setIsModalOpen(true) : null}
          />
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <DetailsModal
            data={data}
            onClose={() => setIsModalOpen(false)}
            onOpenDefect={openDefect} // ✅ opens ProductDetailPage defect modal
          />
        )}
      </AnimatePresence>
    </>
  );
}

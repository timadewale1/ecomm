import React from "react";
import {
  BadgePercent,
  Boxes,
  Eye,
  EyeOff,
  PackagePlus,
  Pencil,
  ScanSearch,
  Trash2,
} from "lucide-react";
import AppBottomSheet from "../layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const ActionButton = ({ icon: Icon, label, detail, danger = false, onClick }) => (
  <button
    type="button"
    onClick={() => {
      void (danger ? appHaptics.warning() : appHaptics.selection());
      onClick?.();
    }}
    className={`flex min-h-[58px] w-full items-center gap-3 border-b border-gray-100 px-1 text-left last:border-0 ${
      danger ? "text-red-600" : "text-gray-950"
    }`}
  >
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
        danger ? "bg-red-50" : "bg-gray-100"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <strong className="block text-[15px] font-semibold leading-5">{label}</strong>
      {detail && (
        <small className="mt-0.5 block text-xs font-normal leading-4 text-gray-500">
          {detail}
        </small>
      )}
    </span>
  </button>
);

export default function VendorProductActionsSheet({
  product,
  open,
  onClose,
  onView,
  onEdit,
  onStock,
  onDiscount,
  onPublish,
  onSelectMultiple,
  onDelete,
}) {
  if (!product) return null;
  const isOutOfStock = Number(product.stockQuantity || 0) <= 0;
  const hasDiscount = Boolean(product.discount);

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="min(72dvh, 590px)"
      compactTop
      ariaLabel={`Actions for ${product.name || "product"}`}
      zIndex={4050}
      surfaceClassName="font-satoshi"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-7">
        <div className="mb-2 flex items-center gap-3 border-b border-gray-100 pb-4">
          {product.coverImageUrl || product.imageUrls?.[0] ? (
            <img
              src={product.coverImageUrl || product.imageUrls[0]}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl bg-gray-100 object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500">
              <Boxes className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold text-gray-950">
              {product.name || "Product actions"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Choose what you want to do</p>
          </div>
        </div>

        <ActionButton icon={ScanSearch} label="View product details" onClick={onView} />
        <ActionButton
          icon={Pencil}
          label="Edit product"
          detail={Number(product.editCount || 0) > 0 ? "This product has used its available edit" : null}
          onClick={onEdit}
        />
        <ActionButton
          icon={isOutOfStock ? PackagePlus : Boxes}
          label={isOutOfStock ? "Restock product" : "Mark as sold out"}
          onClick={onStock}
        />
        <ActionButton
          icon={BadgePercent}
          label={hasDiscount ? "Remove discount" : "Start a discount"}
          onClick={onDiscount}
        />
        <ActionButton
          icon={product.published ? EyeOff : Eye}
          label={product.published ? "Unpublish product" : "Publish product"}
          onClick={onPublish}
        />
        <ActionButton
          icon={Boxes}
          label="Select multiple products"
          detail="Manage several products together"
          onClick={onSelectMultiple}
        />
        <ActionButton icon={Trash2} label="Delete product" danger onClick={onDelete} />
      </div>
    </AppBottomSheet>
  );
}

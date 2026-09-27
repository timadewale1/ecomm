import React from "react";
import { BiSolidImageAdd } from "react-icons/bi";
import { FiLoader, FiPlus } from "react-icons/fi";
import { GoTrash } from "react-icons/go";
import { TiCameraOutline } from "react-icons/ti";
import NativeImageInput from "../../../components/Inputs/NativeImageInput";

export default function ProductImagesSection({
  images,
  currentIndex,
  carouselRef,
  disabled,
  invalid,
  maxImages,
  onScroll,
  onRemove,
  onDotClick,
  onUpload,
  onPick,
}) {
  return (
    <div
      data-add-product-field="images"
      className={`mb-4 scroll-mt-16 rounded-lg ${
        invalid ? "ring-2 ring-inset ring-red-500" : ""
      }`}
    >
      <h3 className="mb-2 flex items-center text-md font-semibold text-black font-satoshi">
        <TiCameraOutline className="mr-2 h-5 w-5 text-xl font-medium text-black" />
        Upload Image
      </h3>

      <div className="flex flex-col items-center">
        <div
          ref={carouselRef}
          className="relative flex h-80 w-full snap-x snap-mandatory space-x-4 overflow-x-scroll"
          style={{ scrollBehavior: "smooth" }}
          onScroll={onScroll}
        >
          {images.length > 0 ? (
            images.map((image, index) => (
              <div
                key={image?.id || image?.preview || image?.file?.name || index}
                className={`relative h-full w-full flex-shrink-0 snap-center rounded-md border-2 border-dashed border-customBrown border-opacity-30 ${
                  index === currentIndex ? "opacity-100" : "opacity-65"
                } transition-opacity duration-300`}
              >
                <img
                  src={image?.preview || image}
                  alt={`Product ${index + 1}`}
                  className={`h-full w-full rounded-md object-cover ${
                    image?.status === "preparing" ? "scale-[1.02] blur-[2px]" : ""
                  }`}
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm font-satoshi">
                    Main image
                  </span>
                )}
                {image?.status === "preparing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-md bg-white/65 backdrop-blur-[1px]">
                    <span className="absolute inset-x-6 top-1/2 h-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-orange-200/70 to-transparent blur-xl motion-safe:animate-pulse" />
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-customOrange shadow-lg">
                      <FiLoader className="h-5 w-5 animate-spin" />
                    </span>
                    <span className="relative mt-3 text-sm font-semibold text-gray-900 font-satoshi">
                      Preparing image
                    </span>
                    <span className="relative mt-1 text-xs text-gray-600 font-satoshi">
                      Keeping the original dimensions
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={disabled || image?.status === "preparing"}
                  aria-label={`Remove product image ${index + 1}`}
                  className="absolute right-2 top-2 rounded-full bg-customBrown p-1 text-white disabled:opacity-40"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(index);
                  }}
                >
                  <GoTrash className="h-4 w-4 text-white" />
                </button>
              </div>
            ))
          ) : (
            <button
              type="button"
              disabled={disabled}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-customBrown border-opacity-30 disabled:cursor-wait"
              onClick={onPick}
            >
              <BiSolidImageAdd className="h-16 w-16 text-customOrange opacity-20" />
              <span className="px-10 text-center text-xs font-light text-customOrange opacity-90 font-satoshi">
                Upload product images here. Large photos are optimised
                automatically.
              </span>
            </button>
          )}

          <NativeImageInput
            id="coverFileInput"
            accept="image/*"
            onChange={onUpload}
            multiple
            nativeMaxFiles={Math.max(1, maxImages - images.length)}
            disabled={disabled}
            className="hidden"
          />
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex justify-center">
          {images.map((image, index) => (
            <button
              key={image?.id || image?.preview || image?.file?.name || index}
              type="button"
              aria-label={`Show product image ${index + 1}`}
              className={`mx-0.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "h-2.5 w-2.5 bg-customOrange"
                  : "h-2 w-2 bg-orange-300"
              }`}
              onClick={() => onDotClick(index)}
            />
          ))}
        </div>
      )}

      <div className="mt-2 flex justify-end">
        {images.length < maxImages && (
          <button
            type="button"
            disabled={disabled}
            onClick={onPick}
            className="flex items-center font-semibold text-customOrange disabled:cursor-wait disabled:opacity-50"
          >
            <FiPlus className="text-xl" />
            <span className="ml-1 text-sm font-satoshi">Add Another Image</span>
          </button>
        )}
        <NativeImageInput
          id="imageUpload"
          accept="image/*"
          multiple
          nativeMaxFiles={Math.max(1, maxImages - images.length)}
          onChange={onUpload}
          disabled={disabled}
          className="hidden"
        />
      </div>
    </div>
  );
}

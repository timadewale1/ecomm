import React from "react";
import { RotatingLines } from "react-loader-spinner";

export default function ProductPublishProgress({ active, imageTask }) {
  if (!active) return null;

  const isUploading = imageTask?.phase === "uploading";

  return (
    <div
      className="fixed inset-0 z-[5200] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label={
        isUploading ? "Uploading product images" : "Optimising product images"
      }
    >
      <div className="flex w-full max-w-[280px] flex-col items-center rounded-2xl bg-white px-5 py-6 text-center shadow-2xl font-satoshi">
        <RotatingLines
          strokeColor="#f9531e"
          strokeWidth="4"
          animationDuration="0.75"
          width="40"
          visible
        />
        <p className="mt-3 text-[15px] font-semibold text-gray-950">
          {isUploading ? "Uploading product images" : "Optimising your images"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {imageTask?.total
            ? `Image ${imageTask.current} of ${imageTask.total}`
            : "Please wait…"}
        </p>
        {isUploading && (
          <div className="mt-3 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-customOrange transition-[width] duration-150"
                style={{ width: `${imageTask?.percent || 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              {imageTask?.percent || 0}% · Keep this screen open while your
              listing is saved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

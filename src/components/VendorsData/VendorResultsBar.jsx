import React from "react";

function plusBucket(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x) || x <= 0) return "0";

  if (x < 10) return String(x);
  if (x < 100) return `${Math.floor(x / 10) * 10}+`;
  if (x < 1000) return `${Math.floor(x / 100) * 100}+`;
  if (x < 1000000) return `${Math.floor(x / 100) / 10}k+`;
  return `${Math.floor(x / 100000) / 10}m+`;
}

export default function VendorResultsBar({ total, loading }) {
  const resultsText =
    !loading && typeof total === "number" ? `${plusBucket(total)} vendors` : "";

  if (!resultsText) return null;

  return (
    <div className="mt-3">
      <p className="mt-5 text-[16px] font-opensans text-gray-500">
        {resultsText}
      </p>
    </div>
  );
}

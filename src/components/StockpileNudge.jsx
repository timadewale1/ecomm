import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { exitStockpileMode } from "../redux/reducers/stockpileSlice";
import { getPublicVendor } from "../services/publicVendors";
import { IoCloseOutline } from "react-icons/io5";

const StockpileNudge = () => {
  const isActive = useSelector((state) => state.stockpile.isActive);
  const vendorId = useSelector((state) => state.stockpile.vendorId);
  const dispatch = useDispatch();
  const [vendorName, setVendorName] = useState("");

  useEffect(() => {
    let alive = true;
    setVendorName("");
    if (isActive && vendorId) {
      (async () => {
        try {
          const vendor = await getPublicVendor(vendorId);
          if (alive && vendor) {
            setVendorName(vendor.shopName);
          }
        } catch (err) {
          console.error("Failed to fetch vendor name:", err);
        }
      })();
    }
    return () => { alive = false; };
  }, [isActive, vendorId]);

  if (!isActive) return null;

  const handleExit = () => {
    const confirmed = window.confirm(
      "Leave repile mode? Your existing stockpile will remain active."
    );
    if (confirmed) {
      dispatch(exitStockpileMode());
    }
  };

  return (
    <div
      className="fixed left-1/2 z-[8050] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-gray-950/90 px-3 py-2 text-white shadow-lg backdrop-blur-md"
      style={{
        top: "calc(var(--app-safe-top, env(safe-area-inset-top, 0px)) + 10px)",
      }}
      role="status"
      aria-live="polite"
    >
      <span className="min-w-0 truncate text-xs font-satoshi">
        Repiling from <strong className="font-medium">{vendorName || "this store"}</strong>
      </span>
      <button
        type="button"
        className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15"
        onClick={handleExit}
        aria-label="Leave repile mode"
      >
        <IoCloseOutline
          className="h-5 w-5 text-white"
          title="Exit repile mode"
        />
      </button>
    </div>
  );
};

export default StockpileNudge;

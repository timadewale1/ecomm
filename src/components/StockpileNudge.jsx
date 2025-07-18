import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { exitStockpileMode } from "../redux/reducers/stockpileSlice";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import { IoCloseOutline } from "react-icons/io5";

const StockpileNudge = () => {
  const isActive = useSelector((state) => state.stockpile.isActive);
  const vendorId = useSelector((state) => state.stockpile.vendorId);
  const dispatch = useDispatch();
  const [vendorName, setVendorName] = useState("");

  useEffect(() => {
    if (isActive && vendorId) {
      (async () => {
        try {
          const snap = await getDoc(doc(db, "vendors", vendorId));
          if (snap.exists()) {
            setVendorName(snap.data().shopName);
          }
        } catch (err) {
          console.error("Failed to fetch vendor name:", err);
        }
      })();
    }
  }, [isActive, vendorId]);

  if (!isActive) return null;

  const handleExit = () => {
    const confirmed = window.confirm(
      "Are you sure you want to exit stockpile mode? This will clear your current pile."
    );
    if (confirmed) {
      dispatch(exitStockpileMode());
    }
  };

  return (
    <div
      className="fixed top-4 left-1/2 transform w-60 -translate-x-1/2 z-50
                        bg-white bg-opacity-30 backdrop-blur-sm rounded-full
                        px-3 py-1 flex items-center text-center space-x-2 shadow-md"
    >
      <span className="text-xs font-opensans">
        You are repiling from <strong>{vendorName}</strong>
      </span>
      <div className="flex items-center bg-gray-800 px-0.5 py-0.5 rounded-full justify-center ml-auto">
        <IoCloseOutline
          className="w-5 h-5 cursor-pointer text-white"
          onClick={handleExit}
          title="Exit repile mode"
        />
      </div>
    </div>
  );
};

export default StockpileNudge;

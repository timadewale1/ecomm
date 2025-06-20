// src/components/NotificationPermissionBanner.jsx
import React, { useState, useEffect } from "react";

export default function NotificationPermissionBanner({ onEnable }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // only show banner if user hasn't granted/denied yet
    // AND we're in a PWA (display-mode: standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone && Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-customOrange text-white flex items-center justify-between px-4 py-2 z-50 shadow-md">
      <div className="text-xs font-opensans">
        🔔 Want to stay up to date? Enable push notifications!
      </div>
      <div className="flex items-center ml-4 space-x-2">
        <button
          onClick={() => {
            onEnable();
            setVisible(false);
          }}
          className="bg-white text-customOrange font-opensans font-semibold px-3 py-1 rounded-full hover:bg-gray-100 transition"
        >
          Enable
        </button>
      </div>
    </div>
  );
}

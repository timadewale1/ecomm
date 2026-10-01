import React, { useEffect, useMemo, useState } from "react";
import Joyride, { EVENTS, STATUS } from "react-joyride";
import { createPendingApprovalTourSteps } from "../../services/tourSteps";
import { appHaptics } from "../../services/haptics";

const keyForVendor = (vendorId) =>
  `mythrift_vendor_catalogue_tour_v1:${vendorId}`;

export default function VendorTour({ vendorId, enabled }) {
  const [run, setRun] = useState(false);
  const steps = useMemo(() => createPendingApprovalTourSteps(), []);

  useEffect(() => {
    if (!enabled || !vendorId) return undefined;

    const storageKey = keyForVendor(vendorId);
    if (window.localStorage.getItem(storageKey) === "completed") {
      return undefined;
    }

    // Let the dashboard and its fixed action button finish mounting so every
    // Joyride target exists before the first measurement.
    const timer = window.setTimeout(() => {
      setRun(true);
      void appHaptics.light();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [enabled, vendorId]);

  const handleJoyrideCallback = ({ status, type }) => {
    if (type === EVENTS.STEP_AFTER) {
      void appHaptics.selection();
    }
    if (![STATUS.FINISHED, STATUS.SKIPPED].includes(status)) return;
    window.localStorage.setItem(keyForVendor(vendorId), "completed");
    setRun(false);
    void (status === STATUS.FINISHED
      ? appHaptics.success()
      : appHaptics.light());
  };

  if (!enabled || !vendorId) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      scrollToFirstStep
      callback={handleJoyrideCallback}
      locale={{
        back: "Back",
        close: "Done",
        last: "Start listing",
        next: "Next",
        skip: "Skip tour",
      }}
      styles={{
        options: {
          backgroundColor: "#ffffff",
          overlayColor: "rgba(17, 24, 39, 0.62)",
          primaryColor: "#f9531e",
          textColor: "#111827",
          width: 334,
          zIndex: 12000,
        },
        tooltip: {
          border: "1px solid rgba(17, 24, 39, 0.06)",
          borderRadius: 22,
          boxShadow: "0 24px 64px rgba(17, 24, 39, 0.22)",
          fontFamily: "Satoshi, sans-serif",
          padding: 20,
        },
        tooltipTitle: {
          color: "#111827",
          fontFamily: "Satoshi, sans-serif",
          fontSize: 18,
          fontWeight: 650,
          lineHeight: 1.25,
          textAlign: "left",
        },
        tooltipContent: {
          color: "#4b5563",
          fontFamily: "Satoshi, sans-serif",
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.5,
          padding: "10px 0 18px",
          textAlign: "left",
        },
        tooltipFooter: {
          alignItems: "center",
          borderTop: "1px solid #f3f4f6",
          gap: 8,
          marginTop: 0,
          paddingTop: 14,
        },
        buttonNext: {
          backgroundColor: "#f9531e",
          borderRadius: 12,
          boxShadow: "0 8px 18px rgba(249, 83, 30, 0.22)",
          fontFamily: "Satoshi, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          minHeight: 40,
          padding: "9px 18px",
        },
        buttonBack: {
          color: "#4b5563",
          fontFamily: "Satoshi, sans-serif",
          fontSize: 14,
          fontWeight: 500,
          marginLeft: 0,
        },
        buttonSkip: {
          color: "#6b7280",
          fontFamily: "Satoshi, sans-serif",
          fontSize: 13,
          fontWeight: 500,
        },
        spotlight: {
          borderRadius: 16,
        },
      }}
    />
  );
}

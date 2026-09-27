import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PRODUCT_JOURNEY_CHANGE_EVENT,
  getProductJourneyDepth,
  getProductJourneyOptions,
  productJourneyInternals,
  trackProductJourneyTransition,
} from "../services/productJourney";
import { appHaptics } from "../services/haptics";
import { nativeNavigationHistory } from "../services/nativeNavigationHistory";

export function useProductJourneyTracker() {
  const location = useLocation();
  const previousRef = useRef(null);

  useEffect(() => {
    const current = {
      location,
      index: productJourneyInternals.currentHistoryIndex(),
    };

    trackProductJourneyTransition({
      previous: previousRef.current,
      current,
    });

    previousRef.current = current;
  }, [location]);
}

export function useProductJourneyOptions(pathname) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    window.addEventListener(PRODUCT_JOURNEY_CHANGE_EVENT, update);
    return () => window.removeEventListener(PRODUCT_JOURNEY_CHANGE_EVENT, update);
  }, []);

  return useMemo(
    () => getProductJourneyOptions({ pathname }),
    [pathname, revision],
  );
}

export function useProductJourneyHistory(pathname) {
  const navigate = useNavigate();
  const journeyOptions = useProductJourneyOptions(pathname);
  const [historyFallbackOpen, setHistoryFallbackOpen] = useState(false);

  const returnToJourneyOption = useCallback(
    (option) => {
      const depth = getProductJourneyDepth(option);
      if (!depth) return;

      setHistoryFallbackOpen(false);
      appHaptics.selection();
      navigate(-depth);
    },
    [navigate],
  );

  const openProductJourneyHistory = useCallback(async () => {
    if (!journeyOptions.length) return;

    if (!nativeNavigationHistory.isAvailable()) {
      setHistoryFallbackOpen(true);
      return;
    }

    try {
      const result = await nativeNavigationHistory.present({
        title: "Browsing history",
        message: "Choose where you want to return.",
        options: journeyOptions,
      });
      if (result?.cancelled || !result?.selectedId) return;

      const selected = journeyOptions.find(
        (option) => option.id === result.selectedId,
      );
      if (selected) returnToJourneyOption(selected);
    } catch (error) {
      console.warn("[product-history] Native selector unavailable:", error);
      setHistoryFallbackOpen(true);
    }
  }, [journeyOptions, returnToJourneyOption]);

  return {
    journeyOptions,
    historyFallbackOpen,
    closeHistoryFallback: () => setHistoryFallbackOpen(false),
    openProductJourneyHistory,
    returnToJourneyOption,
  };
}

import { useEffect, useRef } from "react";
import { track } from "./signals";

export function useCardImpression({ kind, productId, vendorId, surface, enabled = true }) {
  const ref = useRef(null);
  const firedRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (firedRef.current) return;

          timerRef.current = setTimeout(() => {
            if (firedRef.current) return;
            firedRef.current = true;

            if (kind === "product" && productId) {
              track("product_impression", { productId, vendorId }, { surface });
            } else if (kind === "vendor" && vendorId) {
              track("vendor_impression", { vendorId }, { surface });
            }
          }, 1000);
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    obs.observe(el);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      obs.disconnect();
    };
  }, [kind, productId, vendorId, surface, enabled]);

  return ref;
}

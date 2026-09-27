import { useEffect, useRef } from "react";
import { track } from "./signals";

export function useCardImpression({
  kind,
  productId,
  vendorId,
  surface,
  enabled = true,

  // V2 attribution
  requestId,
  position,
  algorithmVersion,
  candidateSource,
}) {
  const ref = useRef(null);

  const firedRef = useRef(false);

  const timerRef = useRef(null);

  useEffect(() => {
    // Reset whenever this card becomes a different recommendation.
    firedRef.current = false;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) return;

    const el = ref.current;

    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) return;

        const qualified =
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.5;

        if (qualified) {
          if (firedRef.current) return;

          if (timerRef.current) return;

          timerRef.current = setTimeout(() => {
            timerRef.current = null;

            if (firedRef.current) {
              return;
            }

            firedRef.current = true;

            if (
              kind === "product" &&
              productId
            ) {
              track(
                "product_impression",
                {
                  productId,
                  vendorId,
                },
                {
                  surface,

                  feedRequestId:
                    requestId ||
                    undefined,

                  position:
                    Number.isFinite(
                      Number(position),
                    )
                      ? Number(position)
                      : undefined,

                  algorithmVersion:
                    algorithmVersion ||
                    undefined,

                  candidateSource:
                    candidateSource ||
                    undefined,
                },
              );
            } else if (
              kind === "vendor" &&
              vendorId
            ) {
              track(
                "vendor_impression",
                {
                  vendorId,
                },
                {
                  surface,
                },
              );
            }
          }, 1000);
        } else {
          if (timerRef.current) {
            clearTimeout(
              timerRef.current,
            );

            timerRef.current = null;
          }
        }
      },
      {
        threshold: [0, 0.5, 1],
      },
    );

    obs.observe(el);

    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current,
        );

        timerRef.current = null;
      }

      obs.disconnect();
    };
  }, [
    kind,
    productId,
    vendorId,
    surface,
    enabled,
    requestId,
    position,
    algorithmVersion,
    candidateSource,
  ]);

  return ref;
}
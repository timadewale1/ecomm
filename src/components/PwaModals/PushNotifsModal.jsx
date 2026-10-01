import React, { useEffect, useRef, useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import AppBottomSheet from "../layout/AppBottomSheet";

const IframeModal = ({ show, onClose, url }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (show) setIframeLoading(true);
  }, [show, url]);

  /** Scrolls to the hash (if any) inside a same-origin iframe. */
  const handleIframeLoad = () => {
    setIframeLoading(false);

    try {
      const hash = url?.split("#")[1];
      if (!hash) return;

      const iframeDocument = iframeRef.current?.contentDocument;
      iframeDocument?.getElementById(hash)?.scrollIntoView({
        behavior: "smooth",
      });
    } catch (error) {
      // Cross-origin frames intentionally do not expose their document.
      console.warn("Iframe scroll failed:", error);
    }
  };

  return (
    <AppBottomSheet
      open={show}
      onClose={onClose}
      height="85dvh"
      ariaLabel="Information"
      zIndex={9900}
      compactTop
      backdropClassName="bg-black/50 backdrop-blur-sm"
      surfaceClassName="mx-auto max-w-3xl pt-5"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {iframeLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <RotatingLines
              strokeColor="#f9531e"
              strokeWidth="3"
              animationDuration="0.75"
              width="30"
              visible
            />
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          title="Embedded page"
          className="h-full w-full border-0"
          onLoad={handleIframeLoad}
        />
      </div>

      <div
        className="shrink-0 px-4 pt-3"
        style={{
          paddingBottom:
            "calc(12px + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-xl bg-customOrange text-base font-medium text-white font-opensans"
        >
          Close
        </button>
      </div>
    </AppBottomSheet>
  );
};

export default IframeModal;

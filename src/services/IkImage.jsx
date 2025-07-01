import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { getImageKitUrl } from "./imageKit";

const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function IkImage({ src, alt = "", className = "" }) {
  if (!src) {
    console.warn("No src provided to IkImage");
    return (
      <img
        src={PLACEHOLDER}
        alt={alt}
        className={`object-cover ${className}`}
      />
    );
  }

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "100px",
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  const getQuality = () => {
    if (typeof navigator.connection === "undefined") return 75;
    const { effectiveType } = navigator.connection;
    return effectiveType === "2g" ? 50 : effectiveType === "3g" ? 65 : 75;
  };

  const quality = getQuality();
  const base = getImageKitUrl(src);
  console.log("IkImage base URL:", base);

  // Generate URLs with transformations
  const tiny = base.includes("?")
    ? `${base}&tr=w-40,q-30,bl-4,f-auto,lqip=inline`
    : `${base}?tr=w-40,q-30,bl-4,f-auto,lqip=inline`;
  const srcSet = [
    `${base}&tr=w-400,q-${quality},f-auto 400w`,
    `${base}&tr=w-800,q-${quality},f-auto 800w`,
    `${base}&tr=w-1200,q-${quality},f-auto 1200w`,
    `${base}&tr=w-1600,q-${quality},f-auto 1600w`,
  ].join(", ");
  const sizes = "(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw";

  useEffect(() => {
    let timer;
    if (inView && !loaded) {
      const startTime = performance.now();
      timer = setTimeout(() => {
        const loadTime = performance.now() - startTime;
        // Show placeholder only if load takes > 200ms or network is slow
        if (
          loadTime > 200 ||
          (navigator.connection &&
            ["2g", "3g"].includes(navigator.connection.effectiveType))
        ) {
          setShowPlaceholder(true);
        } else {
          setShowPlaceholder(false);
          setLoaded(true); // Skip placeholder if load is fast
        }
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [inView, loaded]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-gray-100 rounded-lg ${className}`}
    >
      {showPlaceholder && (
        <img
          src={tiny}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover scale-110 blur-sm
          transition-opacity duration-300 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
          onError={(e) => {
            console.error("Tiny image load error:", e, "URL:", tiny);
            setError("Failed to load tiny image");
          }}
        />
      )}
      {inView && (
        <img
          src={
            base.includes("?")
              ? `${base}&tr=w-800,q-${quality},f-auto`
              : `${base}?tr=w-800,q-${quality},f-auto`
          }
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          onLoad={() => {
            console.log("Image loaded successfully:", base);
            setLoaded(true);
            setError(null); // Clear error on successful load
            setShowPlaceholder(false); // Ensure placeholder hides
          }}
          onError={(e) => {
            console.error(
              "Image load error:",
              e,
              "URL:",
              base.includes("?")
                ? `${base}&tr=w-800,q-${quality},f-auto`
                : `${base}?tr=w-800,q-${quality},f-auto`
            );
            setError("Failed to load image");
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
          ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {error && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}

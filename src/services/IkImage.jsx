import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { getImageKitUrl } from "./imageKit";

const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/*  ❗  Early–return if src is missing */
export default function IkImage({ src, alt = "", className = "" }) {
  if (!src) {
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

  const base = getImageKitUrl(src);
  const tiny = `${base}?tr=w-20,q-10,bl-4,f-auto,lqpr=0.6`;
  const srcSet = [
    `${base}?tr=w-200,q-50,f-auto 200w`,
    `${base}?tr=w-400,q-50,f-auto 400w`,
    `${base}?tr=w-600,q-50,f-auto 600w`,
    `${base}?tr=w-800,q-50,f-auto 800w`,
  ].join(", ");

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-gray-100 rounded-lg ${className}`}
    >
      {/* blurred placeholder */}
      <img
        src={tiny}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover scale-110 blur-sm
        transition-opacity duration-300 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* real image */}
      {inView && (
        <img
          src={`${base}?tr=w-400,q-50,f-auto`}
          srcSet={srcSet}
          sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw"
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
          ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { getImageKitUrl } from "./imageKit";

const IkImage = ({ src, alt, className = "" }) => {
  const [loaded, setLoaded] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "100px" });

  /* Build ImageKit URLs */
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
      {/* ultra-small blurred placeholder */}
      <img
        src={tiny}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover scale-110 blur-sm
          transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
      />

      {/* real image (loaded only when in view) */}
      {inView && (
        <img
          src={`${base}?tr=w-400,q-50,f-auto`}
          srcSet={srcSet}
          sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw"
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
            ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

export default IkImage;

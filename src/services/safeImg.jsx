/* components/SafeImg.jsx */
import { useState } from "react";
import { CiImageOff } from "react-icons/ci";

export default function SafeImg({ src, alt = "", className = "" }) {
  const [failed, setFailed] = useState(!src);     // true if no URL

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <CiImageOff className="text-5xl text-gray-400" aria-label={alt} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""                /* prevent alt text from showing */
      aria-label={alt}      /* keep it accessible */
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none"; // hide browser icon
        setFailed(true);                        // flip to fallback
      }}
      loading="lazy"
    />
  );
}

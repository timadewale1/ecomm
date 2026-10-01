import React, { useState } from "react";
import { IoMdContact } from "react-icons/io";

export default function ChatAvatar({src, className = "h-12 w-12", name = ""}) {
  const [failedSource, setFailedSource] = useState(null);
  const source = typeof src === "string" ? src.trim() : "";
  return source && source !== failedSource ? (
    <img
      src={source}
      alt={name ? `${name}'s profile image` : ""}
      className={`flex-none rounded-full object-cover ${className}`}
      decoding="async"
      onError={() => setFailedSource(source)}
    />
  ) : (
    <IoMdContact className={`flex-none text-gray-300 ${className}`} aria-hidden="true" />
  );
}

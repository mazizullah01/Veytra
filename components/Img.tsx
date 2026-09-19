"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Neutral local placeholder used whenever a remote image fails to load. */
export const FALLBACK_IMAGE = "/images/placeholder.jpg";

/**
 * Thin next/image wrapper that swaps to a neutral placeholder on error,
 * so a dead URL never renders a broken image.
 */
export default function Img({ src, alt, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Image
      {...props}
      src={failed ? FALLBACK_IMAGE : src}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

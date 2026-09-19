"use client";

import { useState } from "react";
import Img from "./Img";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const gallery = images.length > 1 ? images : [images[0], images[0]];
  const [active, setActive] = useState(0);

  return (
    <div className="gallery">
      <div className="gallery__thumbs">
        {gallery.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={`gallery__thumb ${index === active ? "is-active" : ""}`}
            onClick={() => setActive(index)}
            aria-label={`View image ${index + 1} of ${gallery.length}`}
            aria-current={index === active}
          >
            <Img src={image} alt="" fill sizes="84px" />
          </button>
        ))}
      </div>

      <div className="gallery__main">
        <Img
          key={gallery[active]}
          src={gallery[active]}
          alt={name}
          fill
          sizes="(max-width: 960px) 100vw, 55vw"
          priority
        />
      </div>
    </div>
  );
}

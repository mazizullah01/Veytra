"use client";

import { useEffect, useState } from "react";
import { HERO_IMAGES } from "@/lib/data";
import Img from "./Img";
import HeroContent, { ScrollCue } from "./HeroContent";

/**
 * Client fallback hero: an auto-rotating crossfade slideshow.
 * Used when no hero video is present.
 */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % HERO_IMAGES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="hero">
      {HERO_IMAGES.map((src, index) => (
        <div
          key={src}
          className={`hero__slide ${index === active ? "is-active" : ""}`}
          aria-hidden={index !== active}
        >
          <Img
            src={src}
            alt="VELOUR collection"
            fill
            sizes="100vw"
            priority={index === 0}
          />
        </div>
      ))}

      <div className="hero__overlay" />
      <HeroContent />

      <div className="hero__dots" aria-hidden>
        {HERO_IMAGES.map((src, index) => (
          <span
            key={src}
            className={`hero__dot ${index === active ? "is-active" : ""}`}
          />
        ))}
      </div>

      <ScrollCue />
    </section>
  );
}

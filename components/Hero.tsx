import { existsSync } from "node:fs";
import path from "node:path";
import HeroContent, { ScrollCue } from "./HeroContent";
import HeroSlideshow from "./HeroSlideshow";

/**
 * Hero, server component.
 *
 * If `public/videos/hero.mp4` exists (put there by transcoding a provided video
 * with ffmpeg — 1080p H.264, no audio, +faststart, poster at
 * public/images/hero-poster.jpg) we render a muted/looping video background.
 * Otherwise we fall back to an auto-rotating slideshow (client component).
 */
const HAS_HERO_VIDEO = existsSync(
  path.join(process.cwd(), "public", "videos", "hero.mp4"),
);

export default function Hero() {
  if (!HAS_HERO_VIDEO) return <HeroSlideshow />;

  return (
    <section className="hero">
      <video
        className="hero__media"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-poster.jpg"
        preload="metadata"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <div className="hero__overlay" />
      <HeroContent />
      <ScrollCue />
    </section>
  );
}

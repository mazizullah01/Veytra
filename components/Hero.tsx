import HeroContent, { ScrollCue } from "./HeroContent";

export default function Hero() {
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

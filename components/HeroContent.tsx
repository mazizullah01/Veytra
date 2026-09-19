import AppLink from "./AppLink";
import { ArrowDownIcon } from "./Icons";

/**
 * Hero copy + CTAs. Shared by the video hero and the slideshow fallback.
 * Server component (AppLink is the only client leaf).
 */
export default function HeroContent() {
  return (
    <div className="hero__content">
      <span className="eyebrow eyebrow--light hero__eyebrow">
        Autumn / Winter Collection
      </span>
      <h1 className="hero__title">
        <span className="hero-line">Quiet luxury,</span>
        <span className="hero-line">made to last.</span>
      </h1>
      <p className="hero__sub">
        Elevated essentials in considered fabrics — tailored for the everyday,
        designed to be worn for years.
      </p>
      <div className="hero__cta">
        <AppLink href="/women" className="btn btn--light">
          <span>Shop Women</span>
        </AppLink>
        <AppLink href="/men" className="btn btn--light">
          <span>Shop Men</span>
        </AppLink>
      </div>
    </div>
  );
}

export function ScrollCue() {
  return (
    <a href="#featured" className="hero__scroll" aria-label="Scroll to content">
      <span>Scroll</span>
      <ArrowDownIcon size={18} />
    </a>
  );
}

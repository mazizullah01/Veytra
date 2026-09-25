import CategoryCard from "@/components/CategoryCard";
import Hero from "@/components/Hero";
import Img from "@/components/Img";
import Newsletter from "@/components/Newsletter";
import ProductGrid from "@/components/ProductGrid";
import Reveal from "@/components/Reveal";
import AppLink from "@/components/AppLink";
import { getFeatured, getNewArrivals, getTrending } from "@/lib/api";

export default async function HomePage() {
  const [featured, newArrivals, trending] = await Promise.all([
    getFeatured(8),
    getNewArrivals(8),
    getTrending(4),
  ]);

  return (
    <>
      <Hero />

      {/* ------------------------------------------------ category highlights */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Shop by category</span>
                <h2>Two wardrobes, one philosophy.</h2>
              </div>
              <AppLink href="/women" className="section-head__link">
                View all
              </AppLink>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="category-grid">
              <CategoryCard
                href="/women"
                title="Women"
                blurb="The women's edit"
                image="/images/products/oversized-wool-coat-1.jpg"
                priority
              />
              <CategoryCard
                href="/men"
                title="Men"
                blurb="The men's edit"
                image="/images/products/tailored-wool-overcoat-1.jpg"
                priority
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- featured grid */}
      <section className="section section--alt" id="featured">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Featured</span>
                <h2>This season&apos;s essentials.</h2>
              </div>
              <AppLink href="/women" className="section-head__link">
                Shop all
              </AppLink>
            </div>
          </Reveal>
          <ProductGrid products={featured} priorityCount={4} />
        </div>
      </section>

      {/* ------------------------------------------------------ promo banner */}
      <section className="section section--tight">
        <div className="container">
          <Reveal>
            <div className="promo promo--dark">
              <div>
                <span className="eyebrow eyebrow--light">Limited time</span>
                <h2>Winter Sale — up to 40% off</h2>
                <p style={{ color: "rgba(255,255,255,0.72)", maxWidth: "42ch" }}>
                  Selected coats, knitwear and tailoring, reduced for the season.
                  While stock lasts.
                </p>
                <AppLink href="/women?sort=price-asc" className="btn btn--light">
                  <span>Shop the sale</span>
                </AppLink>
              </div>
              <div className="promo__media">
                <Img
                  src="/images/products/oversized-wool-coat-2.jpg"
                  alt="Winter sale selection"
                  fill
                  sizes="(max-width: 820px) 100vw, 45vw"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- new arrivals */}
      <section className="section" id="new">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Just landed</span>
                <h2>New arrivals.</h2>
              </div>
              <AppLink href="/men" className="section-head__link">
                Shop new in
              </AppLink>
            </div>
          </Reveal>
          <ProductGrid products={newArrivals} />
        </div>
      </section>

      {/* ----------------------------------------------------------- trending */}
      <section className="section section--alt" id="trending">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Most wanted</span>
                <h2>Trending now.</h2>
              </div>
              <AppLink href="/women" className="section-head__link">
                Explore
              </AppLink>
            </div>
          </Reveal>
          <ProductGrid products={trending} className="grid-products--3" />
        </div>
      </section>

      {/* ------------------------------------------------- shipping promo strip */}
      <section className="section section--tight">
        <div className="container">
          <Reveal>
            <div className="promo">
              <div className="promo__media">
                <Img
                  src="/images/products/unstructured-linen-blazer-2.jpg"
                  alt="Complimentary shipping"
                  fill
                  sizes="(max-width: 820px) 100vw, 45vw"
                />
              </div>
              <div>
                <span className="eyebrow">Always included</span>
                <h2>Free shipping over $75</h2>
                <p style={{ color: "var(--ink-soft)", maxWidth: "42ch" }}>
                  Complimentary worldwide delivery and free returns within 30
                  days. No minimum on exchanges.
                </p>
                <AppLink href="/women" className="btn btn--outline">
                  <span>Start shopping</span>
                </AppLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Newsletter />
    </>
  );
}

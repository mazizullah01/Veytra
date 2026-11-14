import AppLink from "@/components/AppLink";
import ProductGrid from "@/components/ProductGrid";
import Reveal from "@/components/Reveal";
import { searchStore } from "@/lib/ai-search";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const { matches, related, summary } = query ? await searchStore(query) : { matches: [], related: [], summary: "" };
  const total = matches.length + related.length;

  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">AI Search</span>
        <h1>{query ? `“${query}”` : "Search"}</h1>
        <p>
          {query
            ? `${total} result${total === 1 ? "" : "s"} · ${summary}`
            : "Search like the stylist — try “blue shirt”, “summer coat” or “men’s trousers”."}
        </p>
      </header>

      <section className="section section--tight">
        {query && matches.length > 0 && (
          <>
            <div className="section-head" style={{ marginBottom: "1.25rem" }}>
              <div className="section-head__text">
                <span className="eyebrow">Best matches</span>
                <h2>Closest to your search</h2>
              </div>
            </div>
            <ProductGrid products={matches} />
          </>
        )}

        {query && related.length > 0 && (
          <div style={{ marginTop: matches.length ? "3rem" : 0 }}>
            <div className="section-head" style={{ marginBottom: "1.25rem" }}>
              <div className="section-head__text">
                <span className="eyebrow">Similar from Veytra</span>
                <h2>You may also like</h2>
              </div>
            </div>
            <ProductGrid products={related} />
          </div>
        )}

        {query && total === 0 && (
          <Reveal>
            <div className="empty-state">
              <h2>No matches for “{query}”</h2>
              <p className="muted">
                Try a product type (“shirt”, “coat”), a color (“blue shirt”), or browse the full collection.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <AppLink href="/women" className="btn btn--solid">
                  <span>Shop Women</span>
                </AppLink>
                <AppLink href="/men" className="btn btn--outline">
                  <span>Shop Men</span>
                </AppLink>
              </div>
            </div>
          </Reveal>
        )}

        {!query && (
          <Reveal>
            <div className="empty-state">
              <h2>What are you looking for?</h2>
              <p className="muted">
                Try “blue shirt”, “summer coat”, “knitwear” or “men’s trousers”.
              </p>
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}

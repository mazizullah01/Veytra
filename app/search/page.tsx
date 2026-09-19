import AppLink from "@/components/AppLink";
import ProductGrid from "@/components/ProductGrid";
import Reveal from "@/components/Reveal";
import { getProducts } from "@/lib/api";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const results = query ? await getProducts({ query }) : [];

  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Search</span>
        <h1>{query ? `“${query}”` : "Search"}</h1>
        <p>
          {query
            ? `${results.length} result${results.length === 1 ? "" : "s"} found`
            : "Use the search icon above to find pieces by name, category or fabric."}
        </p>
      </header>

      <section className="section section--tight">
        {query && results.length > 0 && <ProductGrid products={results} />}

        {query && results.length === 0 && (
          <Reveal>
            <div className="empty-state">
              <h2>No matches for “{query}”</h2>
              <p className="muted">
                Try a different term, or explore the full collection.
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
                Try “coat”, “dress”, “knitwear” or “shirt”.
              </p>
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}

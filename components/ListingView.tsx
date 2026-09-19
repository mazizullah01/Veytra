import FilterPills from "./FilterPills";
import ProductGrid from "./ProductGrid";
import Reveal from "./Reveal";
import SortSelect from "./SortSelect";
import { getProducts, type SortKey } from "@/lib/api";
import { subcategoriesFor, type Category } from "@/lib/data";

interface ListingViewProps {
  category: Category;
  sub?: string;
  sort: SortKey;
}

const COPY: Record<Category, { title: string; description: string }> = {
  women: {
    title: "Women",
    description:
      "Tailoring, knitwear and dresses in considered fabrics — made to layer, made to last.",
  },
  men: {
    title: "Men",
    description:
      "Outerwear, shirting and knitwear built on clean lines and honest materials.",
  },
};

/**
 * Shared listing UI for /women and /men. Filter + sort state arrives from the
 * URL (searchParams) so every view is shareable and server-renderable.
 */
export default async function ListingView({
  category,
  sub,
  sort,
}: ListingViewProps) {
  const [products, subcategories] = await Promise.all([
    getProducts({ category, subcategory: sub, sort }),
    Promise.resolve(subcategoriesFor(category)),
  ]);

  const copy = COPY[category];

  return (
    <>
      <div className="container">
        <header className="page-head">
          <span className="eyebrow">
            {sub ? `${copy.title} · ${sub}` : `Collection · ${copy.title}`}
          </span>
          <h1>{sub ?? copy.title}</h1>
          <p>{copy.description}</p>
        </header>

        <div className="listing-toolbar">
          <FilterPills
            basePath={`/${category}`}
            subcategories={subcategories}
            active={sub}
            sort={sort}
          />
          <div className="toolbar-right">
            <span className="result-count">
              {products.length} item{products.length === 1 ? "" : "s"}
            </span>
            <SortSelect basePath={`/${category}`} sub={sub} sort={sort} />
          </div>
        </div>
      </div>

      <section className="section section--tight">
        <div className="container">
          {products.length > 0 ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <Reveal>
              <div className="empty-state">
                <h2>Nothing here yet</h2>
                <p className="muted">
                  We couldn&apos;t find products in this category.
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}

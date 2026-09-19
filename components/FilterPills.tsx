import AppLink from "./AppLink";
import type { SortKey } from "@/lib/api";

interface FilterPillsProps {
  basePath: string;
  subcategories: string[];
  active?: string;
  sort: SortKey;
}

function href(basePath: string, sub: string | undefined, sort: SortKey) {
  const params = new URLSearchParams();
  if (sub) params.set("sub", sub);
  if (sort !== "featured") params.set("sort", sort);
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

/** Subcategory filter pills. Rendered as links so filtering is shareable/SEO-friendly. */
export default function FilterPills({
  basePath,
  subcategories,
  active,
  sort,
}: FilterPillsProps) {
  return (
    <div className="filter-pills">
      <AppLink
        href={href(basePath, undefined, sort)}
        className={`pill ${!active ? "is-active" : ""}`}
      >
        All
      </AppLink>
      {subcategories.map((sub) => (
        <AppLink
          key={sub}
          href={href(basePath, sub, sort)}
          className={`pill ${active === sub ? "is-active" : ""}`}
        >
          {sub}
        </AppLink>
      ))}
    </div>
  );
}

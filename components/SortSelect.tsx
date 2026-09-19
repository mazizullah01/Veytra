"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ChangeEvent } from "react";
import type { SortKey } from "@/lib/api";

interface SortSelectProps {
  basePath: string;
  sub?: string;
  sort: SortKey;
}

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

export default function SortSelect({ basePath, sub, sort }: SortSelectProps) {
  const router = useRouter();

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams();
    if (sub) params.set("sub", sub);
    const next = event.target.value;
    if (next !== "featured") params.set("sort", next);
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}` as Route, { scroll: false });
  };

  return (
    <div className="sort">
      <label htmlFor="sort-select">Sort</label>
      <select id="sort-select" value={sort} onChange={onChange}>
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

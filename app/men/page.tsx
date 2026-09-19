import ListingView from "@/components/ListingView";
import { parseSort } from "@/lib/api";

export const metadata = { title: "Men" };

export default async function MenPage({ searchParams }: PageProps<"/men">) {
  const params = await searchParams;
  const sub = typeof params.sub === "string" ? params.sub : undefined;
  const sort = parseSort(params.sort);

  return <ListingView category="men" sub={sub} sort={sort} />;
}

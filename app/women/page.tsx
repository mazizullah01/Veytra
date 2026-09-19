import ListingView from "@/components/ListingView";
import { parseSort } from "@/lib/api";

export const metadata = { title: "Women" };

export default async function WomenPage({ searchParams }: PageProps<"/women">) {
  const params = await searchParams;
  const sub = typeof params.sub === "string" ? params.sub : undefined;
  const sort = parseSort(params.sort);

  return <ListingView category="women" sub={sub} sort={sort} />;
}

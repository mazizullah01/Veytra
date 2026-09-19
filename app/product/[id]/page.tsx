import { notFound } from "next/navigation";
import AppLink from "@/components/AppLink";
import AddToCart from "@/components/AddToCart";
import ProductGallery from "@/components/ProductGallery";
import ProductGrid from "@/components/ProductGrid";
import Reveal from "@/components/Reveal";
import { RefreshIcon, ShieldIcon, TruckIcon } from "@/components/Icons";
import { getProductById, getRelated } from "@/lib/api";
import { PRODUCTS } from "@/lib/data";
import { money } from "@/lib/format";

export async function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const related = await getRelated(id, 4);
  const onSale =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;
  const discount = onSale
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;

  return (
    <>
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <AppLink href="/">Home</AppLink>
          <span>/</span>
          <AppLink href={`/${product.category}`}>
            {product.category === "women" ? "Women" : "Men"}
          </AppLink>
          <span>/</span>
          <span className="muted">{product.name}</span>
        </nav>

        <div className="pdp">
          <ProductGallery images={product.images} name={product.name} />

          <div className="pdp__info">
            <span className="eyebrow">
              {product.category === "women" ? "Women" : "Men"} ·{" "}
              {product.subcategory}
            </span>
            <h1 className="pdp__title">{product.name}</h1>

            <div className="pdp__price">
              <span>{money(product.price)}</span>
              {onSale && (
                <>
                  <span className="pdp__compare">
                    {money(product.compareAtPrice as number)}
                  </span>
                  <span className="pdp__save">Save {discount}%</span>
                </>
              )}
            </div>

            <p className="pdp__desc">{product.description}</p>

            <AddToCart product={product} />

            <div className="pdp__assurances">
              <span className="pdp__assurance">
                <TruckIcon size={18} /> Free shipping over $75 — dispatched in
                24h
              </span>
              <span className="pdp__assurance">
                <RefreshIcon size={18} /> Free returns within 30 days
              </span>
              <span className="pdp__assurance">
                <ShieldIcon size={18} /> Secure checkout & buyer protection
              </span>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <div className="section-head__text">
                  <span className="eyebrow">You may also like</span>
                  <h2>Complete the look.</h2>
                </div>
                <AppLink
                  href={`/${product.category}`}
                  className="section-head__link"
                >
                  Shop {product.category}
                </AppLink>
              </div>
            </Reveal>
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}

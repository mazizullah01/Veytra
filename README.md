# Veytra

A premium, minimal fashion storefront — Next.js (App Router) + TypeScript +
React. No Tailwind, no icon libraries, no UI kits: the whole design system lives
in one documented global stylesheet.

> Demo store. Cart and checkout are fully functional on the client (cart persists
> in `localStorage`); payments, auth and emails are intentionally not wired up.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + type-check
npm run start    # serve the production build
npm run lint
```

## Routes

| Route           | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `/`             | Hero, category highlights, featured / new / trending grids, promos, newsletter |
| `/women`, `/men`| Listing with URL-driven filters + sort (`?sub=…&sort=…`)                     |
| `/search?q=…`   | Search results                                                              |
| `/product/[id]` | Gallery, size selector, quantity, add to cart, related products             |
| `/cart`         | Line items, quantity edit, order summary                                    |
| `/checkout`     | Validated demo checkout → confirmation with a fake order number             |
| `/login`        | Tabbed sign in / create account (UI only)                                   |
| `/about`, `/contact`, `/privacy` | Static content pages                                          |

## Structure

```
app/                         routes, layout, globals.css (the design system)
components/                  shared + page-level components (server by default)
  ├─ Navbar, Footer, Hero, HeroContent
  ├─ ProductCard, ProductGrid, ProductGallery, AddToCart, CategoryCard
  ├─ CartView, CheckoutView, LoginView, ContactForm    (client interactivity)
  ├─ Reveal (IntersectionObserver) · Toaster (toasts) · Img (onError fallback)
  └─ Icons (inline SVGs, no library)
lib/
  ├─ data.ts                 Product interface, CATEGORIES,
  │                          PRODUCTS, subcategoriesFor()
  ├─ generated-products.ts   imported listings — regenerated, never hand-edited
  ├─ api.ts                  ***the backend-swap seam*** (async service layer)
  ├─ store.tsx               cart context + localStorage persistence
  └─ format.ts               money()
scripts/import-listings.mjs  CSV → optimized images → lib/generated-products.ts
incoming/                    listings-template.csv, README.md, images/ drop folder
public/images/               placeholder.jpg, hero-poster.jpg, products/
```

## Swapping the mock backend for real endpoints

All catalogue reads go through **`lib/api.ts`** — pages never touch the data
array directly. Each function (`getProducts`, `getProductById`, `getFeatured`,
`getNewArrivals`, `getTrending`, `getRelated`) already returns a `Promise`, so
replacing the in-memory implementation with `fetch` calls requires **zero page
changes**:

```ts
export async function getProducts(params: ProductQuery = {}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(`${API_URL}/products?${qs}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to load products");
  return (await res.json()) as Product[];
}
```

The cart is isolated in `lib/store.tsx` and can likewise be pointed at a cart
API without touching components. `ProductCard`, `ProductGrid`, `ListingView`
and the detail page all consume the same types, so the contract is stable.

## Importing listings

The active catalogue comes from `app/assets/videos/listings.csv`, with photos
from `app/assets/images/`. To regenerate it:

```bash
npm run import-listings
```

The importer preserves listing prices, descriptions, categories and flags, and
writes optimized photos to `public/images/products/`. Exact CSV filenames are
preferred; older PNG names fall back to `<product-slug>-1.jpg` and
`<product-slug>-2.jpg`. Only imported products appear in the storefront.

## Hero video

The hero plays `public/videos/hero.mp4` on a muted autoplay loop, copied from
`app/assets/videos/hero.mp4`. Its poster is extracted from the supplied video.
To refresh these assets after replacing the source:

```bash
cp app/assets/videos/hero.mp4 public/videos/hero.mp4
ffmpeg -y -i app/assets/videos/hero.mp4 -frames:v 1 -update 1 public/images/hero-poster.jpg
```

## Design system

- **Palette** — warm off-white `#faf8f5`, near-black `#16130f`, taupe/stone
  accents, hairline borders `#e5e0da`.
- **Type** — Cormorant Garamond (display serif) + Inter (body), loaded via
  `<link>` in `app/layout.tsx`.
- **Motion** — IntersectionObserver fade-up reveals, staggered hero entrance,
  hover image crossfade, button fill-sweep. All motion respects
  `prefers-reduced-motion`.
- **Responsive** — mobile-first; grids collapse 4 → 3 → 2 → 1, nav switches to a
  slide-in drawer under 820px.

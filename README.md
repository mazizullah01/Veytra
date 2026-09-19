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
  ├─ Navbar, Footer, Hero, HeroSlideshow, HeroContent
  ├─ ProductCard, ProductGrid, ProductGallery, AddToCart, CategoryCard
  ├─ CartView, CheckoutView, LoginView, ContactForm    (client interactivity)
  ├─ Reveal (IntersectionObserver) · Toaster (toasts) · Img (onError fallback)
  └─ Icons (inline SVGs, no library)
lib/
  ├─ data.ts                 Product interface, BASE_PRODUCTS (24 demo), CATEGORIES,
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

See [`incoming/README.md`](incoming/README.md). In short:

```bash
cp incoming/listings-template.csv incoming/listings.csv
# fill rows + drop photos into incoming/images/
npm run import-listings
```

The importer validates rows, skips invalid ones with reasons, optimizes images
via macOS `sips` (max 1400px JPEG) into `public/images/products/`, uses a
placeholder for missing files, and regenerates `lib/generated-products.ts`
wholesale (idempotent).

By default `PRODUCTS = BASE_PRODUCTS + GENERATED_PRODUCTS`. To show **only**
imported listings, flip the single documented line in `lib/data.ts`.

## Adding a hero video

Provide a video file, then transcode it to `public/videos/hero.mp4`
(1080p H.264, no audio, faststart) and extract a poster frame to
`public/images/hero-poster.jpg`. `components/Hero.tsx` detects the file at build
time and automatically switches from the image slideshow fallback to the muted
autoplay video hero. Example:

```bash
ffmpeg -i source.mov -vf "scale=-2:1080" -c:v libx264 -profile:v high \
  -an -movflags +faststart public/videos/hero.mp4
ffmpeg -i source.mov -vf "scale=-2:1080" -frames:v 1 public/images/hero-poster.jpg
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

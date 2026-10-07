# Veytra

A premium, minimal fashion storefront — Next.js (App Router) + TypeScript +
React. No Tailwind, no icon libraries, no UI kits: the whole design system lives
in one documented global stylesheet.

> InsForge powers authentication, products, carts and orders. Stripe-hosted
> Checkout runs in Sandbox mode; signed webhooks confirm payment.

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
| `/checkout`     | Authenticated checkout → pending order → Stripe payment             |
| `/login`        | InsForge sign in / create account                                   |
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

## Backend and Stripe Sandbox payments

InsForge powers authentication, products, carts, orders and `/profile`.
Local SDK credentials are in `.env.local`; CLI credentials are in
`.insforge/project.json`. Neither file should be committed.

Checkout creates a pending/unpaid order with `payment_method = 'stripe'`, then
opens `/payment/[orderId]`. The authenticated server endpoint creates a
Stripe-hosted Checkout Session using the saved database total in USD. The
return page retrieves the session server-side and displays its status; only a
signed `checkout.session.completed` webhook confirms the order in the database.
Customers cannot update payment or order status directly. Duplicate webhooks
preserve later shipping/delivery states. Cancelling or declining payment leaves
the order pending/unpaid; the profile provides a link to retry payment.

Required server environment variables:

- `STRIPE_SECRET_KEY`: a Sandbox `sk_test_…` key. Live keys are rejected.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for this app’s webhook endpoint.
- `INSFORGE_API_KEY`: server-only admin key used for webhook/order-session writes.
- `NEXT_PUBLIC_APP_URL`: the app origin, e.g. `https://b3ddvdt8.insforge.site`.
  If `APP_URL` is already configured, it takes precedence.
- Existing `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY`.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` may hold a Sandbox `pk_test_…` key, but
Stripe-hosted Checkout redirects do not require it. Never prefix secret or
webhook keys with `NEXT_PUBLIC_`.

Register a Stripe Sandbox webhook destination at
`https://<app-origin>/api/stripe/webhook` for `checkout.session.completed` and
put its signing secret into `STRIPE_WEBHOOK_SECRET`. Local testing can use
`stripe listen --forward-to localhost:3100/api/stripe/webhook`, with the CLI’s
signing secret. The deployed endpoint needs its own signing secret.

Verify locally:

```bash
node --test tests/stripe.test.mjs
npm run lint
npm run build
npm run start -- --port 3100
```

Full acceptance requires a verified test login and a real Sandbox Checkout:
use card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC.
Check pending/unpaid/stripe in the database before payment, then confirmed/paid
in the database and profile after the signed webhook. Check the payment in the
Stripe Sandbox dashboard. Also cancel one Checkout and use declined card
`4000 0000 0000 0002` for another; both orders must remain pending/unpaid.
Unit tests exercise signed webhook security with mocked provider/database
calls; they do not replace this full Sandbox acceptance run.

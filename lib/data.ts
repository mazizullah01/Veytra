import { GENERATED_PRODUCTS } from "./generated-products";

/**
 * Domain model for the storefront.
 *
 * NOTE: images is an ordered tuple — index 0 is the primary image, index 1 is
 * the hover image used by ProductCard. A missing second image falls back to the
 * first at render time.
 */
export interface Product {
  id: string;
  name: string;
  category: "women" | "men";
  subcategory: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  sizes: string[];
  images: string[];
  featured?: boolean;
  isNew?: boolean;
  trending?: boolean;
}

export type Category = Product["category"];

/** Build a stable Unsplash URL for a given photo id. */
export const unsplash = (id: string, w = 900): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Large hero imagery (kept separate from products). */
export const HERO_IMAGES = [
  unsplash("photo-1490481651871-ab68de25d43d", 1600),
  unsplash("photo-1485968579580-b6d095142e6e", 1600),
  unsplash("photo-1539533018447-63fcce2678e3", 1600),
];

/**
 * Curated subcategory order, per category. `subcategoriesFor()` uses this as the
 * preferred ordering but only surfaces subcategories that actually have products
 * in the ACTIVE catalogue (demo + imported), so filter pills never lead nowhere.
 */
export const CATEGORIES: Record<Category, string[]> = {
  women: ["Dresses", "Knitwear", "Outerwear", "Tops", "Trousers", "Skirts"],
  men: ["Outerwear", "Shirts", "Knitwear", "T-Shirts", "Trousers", "Suits"],
};

export const SIZES = ["XS", "S", "M", "L", "XL"] as const;

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

/** 24 hand-written demo products (~even split women / men). */
export const BASE_PRODUCTS: Product[] = [
  // ---------------------------------------------------------------- WOMEN ---
  {
    id: "silk-column-midi-dress",
    name: "Silk Column Midi Dress",
    category: "women",
    subcategory: "Dresses",
    price: 189,
    compareAtPrice: 240,
    description:
      "A fluid column silhouette cut from sand-washed silk with a subtle sheen. Bias-finished neckline, concealed back zip and a gently weighted hem that moves with you.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1594633312681-425c7b97ccd1"),
      unsplash("photo-1496747611176-843222e1e57c"),
    ],
    featured: true,
    trending: true,
  },
  {
    id: "ribbed-knit-sweater",
    name: "Ribbed Knit Sweater",
    category: "women",
    subcategory: "Knitwear",
    price: 128,
    description:
      "A relaxed crewneck knitted from a soft merino-cotton blend. Dropped shoulders and a ribbed finish make it the effortless layer you reach for daily.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1576566588028-4147f3842f27"),
      unsplash("photo-1434389677669-e08b4cac3105"),
    ],
    featured: true,
  },
  {
    id: "wool-blend-overcoat",
    name: "Wool Blend Overcoat",
    category: "women",
    subcategory: "Outerwear",
    price: 349,
    compareAtPrice: 420,
    description:
      "A double-faced wool blend overcoat with a clean notch lapel and dropped shoulder. Fully lined with a concealed placket for a quiet, structured line.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1485968579580-b6d095142e6e"),
      unsplash("photo-1539533018447-63fcce2678e3"),
    ],
    featured: true,
    isNew: true,
  },
  {
    id: "poplin-shirt",
    name: "Crisp Poplin Shirt",
    category: "women",
    subcategory: "Tops",
    price: 98,
    description:
      "Crafted from long-staple cotton poplin with a slightly oversized cut. Mother-of-pearl buttons and a curved hem that tucks or drapes with equal ease.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1525507119028-ed4c629a60a3"),
      unsplash("photo-1529139574466-a303027c1d8b"),
    ],
  },
  {
    id: "pleated-wide-leg-trousers",
    name: "Pleated Wide-Leg Trousers",
    category: "women",
    subcategory: "Trousers",
    price: 145,
    description:
      "High-rise trousers with a single front pleat and a fluid wide leg. Cut from a crease-resistant twill that holds its shape from desk to dinner.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1509631179647-0177331693ae"),
      unsplash("photo-1490481651871-ab68de25d43d"),
    ],
    trending: true,
  },
  {
    id: "satin-slip-dress",
    name: "Satin Slip Dress",
    category: "women",
    subcategory: "Dresses",
    price: 165,
    description:
      "A minimal slip in liquid satin with adjustable straps and a delicate cowl neck. Designed to layer or stand alone.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1496747611176-843222e1e57c"),
      unsplash("photo-1594633312681-425c7b97ccd1"),
    ],
    isNew: true,
  },
  {
    id: "cashmere-crewneck",
    name: "Cashmere Crewneck",
    category: "women",
    subcategory: "Knitwear",
    price: 245,
    compareAtPrice: 295,
    description:
      "Pure Grade-A cashmere in a classic crewneck. Lightweight yet warm, with a refined hand-feel that only improves with wear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1515886657613-9f3515b0c78f"),
      unsplash("photo-1576566588028-4147f3842f27"),
    ],
  },
  {
    id: "faux-leather-trench",
    name: "Faux Leather Trench",
    category: "women",
    subcategory: "Outerwear",
    price: 289,
    description:
      "A longline trench in a supple faux leather with tonal topstitching. Belted waist, storm flap and a dramatic sweep.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1551028719-00167b16eac5"),
      unsplash("photo-1554412933-514a83d2f3c8"),
    ],
    isNew: true,
    trending: true,
  },
  {
    id: "cotton-turtleneck-top",
    name: "Cotton Turtleneck Top",
    category: "women",
    subcategory: "Tops",
    price: 78,
    description:
      "A second-skin turtleneck in fine ribbed cotton. The perfect base layer under tailoring or knitwear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1596755094514-f87e34085b2c"),
      unsplash("photo-1434389677669-e08b4cac3105"),
    ],
  },
  {
    id: "a-line-midi-skirt",
    name: "A-Line Midi Skirt",
    category: "women",
    subcategory: "Skirts",
    price: 118,
    description:
      "A softly structured A-line skirt in a matte crepe, finishing just below the calf with a hidden side zip.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1529139574466-a303027c1d8b"),
      unsplash("photo-1594633312681-425c7b97ccd1"),
    ],
  },
  {
    id: "tailored-blazer-dress",
    name: "Tailored Blazer Dress",
    category: "women",
    subcategory: "Dresses",
    price: 219,
    compareAtPrice: 265,
    description:
      "A sharp single-breasted blazer dress with padded shoulders and a nipped waist. Considered enough for evening, easy enough for the office.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1554568218-0f1715e72254"),
      unsplash("photo-1555529669-e69e7aa0ba9a"),
    ],
    featured: true,
  },
  {
    id: "bias-cut-linen-skirt",
    name: "Bias-Cut Linen Skirt",
    category: "women",
    subcategory: "Skirts",
    price: 105,
    description:
      "Cut on the bias from European linen for a fluid, body-skimming drape. Finished with a soft elasticated waist.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1520975954732-35dd22299614"),
      unsplash("photo-1591369822096-ffd140ec948f"),
    ],
  },

  // ------------------------------------------------------------------ MEN ---
  {
    id: "merino-crewneck-sweater",
    name: "Merino Crewneck Sweater",
    category: "men",
    subcategory: "Knitwear",
    price: 138,
    description:
      "Fine-gauge extra-fine merino in a trim crewneck. Breathable, temperature-regulating and finished with ribbed cuffs and hem.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1611312449408-fcece27cdbb7"),
      unsplash("photo-1552374196-c4e7ffc6e126"),
    ],
    featured: true,
  },
  {
    id: "slim-stretch-jeans",
    name: "Slim Stretch Jeans",
    category: "men",
    subcategory: "Trousers",
    price: 118,
    compareAtPrice: 145,
    description:
      "A clean slim jean in comfort-stretch denim with a mid-rise and a deep indigo wash that fades beautifully.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1542272604-787c3835535d"),
      unsplash("photo-1520975954732-35dd22299614"),
    ],
    trending: true,
  },
  {
    id: "wool-overcoat",
    name: "Wool Overcoat",
    category: "men",
    subcategory: "Outerwear",
    price: 425,
    description:
      "A tailored overcoat in a heavyweight wool blend. Structured shoulders, concealed placket and a full satin lining.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1539533018447-63fcce2678e3"),
      unsplash("photo-1551028719-00167b16eac5"),
    ],
    featured: true,
    isNew: true,
  },
  {
    id: "oxford-button-down-shirt",
    name: "Oxford Button-Down Shirt",
    category: "men",
    subcategory: "Shirts",
    price: 98,
    description:
      "Woven from durable oxford cotton with a button-down collar and a gently tapered body. A wardrobe cornerstone.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1596755094514-f87e34085b2c"),
      unsplash("photo-1591047139829-d91aecb6caea"),
    ],
  },
  {
    id: "heavyweight-cotton-tshirt",
    name: "Heavyweight Cotton T-Shirt",
    category: "men",
    subcategory: "T-Shirts",
    price: 48,
    description:
      "A 240gsm organic cotton tee with a boxy fit, ribbed collar and reinforced shoulder seams that hold their shape.",
    sizes: ["S", "M", "L", "XL"],
    images: [
      unsplash("photo-1521572163474-6864f9cf17ab"),
      unsplash("photo-1507003211169-0a1dd7228f2d"),
    ],
    trending: true,
  },
  {
    id: "leather-biker-jacket",
    name: "Leather Biker Jacket",
    category: "men",
    subcategory: "Outerwear",
    price: 489,
    compareAtPrice: 560,
    description:
      "A classic asymmetrical biker in supple lambskin. Notch lapels, zipped cuffs and a lived-in patina from the first wear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1551028719-00167b16eac5"),
      unsplash("photo-1555529669-e69e7aa0ba9a"),
    ],
    featured: true,
  },
  {
    id: "twill-chino-trousers",
    name: "Twill Chino Trousers",
    category: "men",
    subcategory: "Trousers",
    price: 108,
    description:
      "Garment-dyed cotton twill with a slim-straight leg and a comfortable mid-rise. Finished with horn-effect buttons.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1552374196-c4e7ffc6e126"),
      unsplash("photo-1542272604-787c3835535d"),
    ],
  },
  {
    id: "flannel-overshirt",
    name: "Brushed Flannel Overshirt",
    category: "men",
    subcategory: "Shirts",
    price: 128,
    description:
      "A brushed cotton flannel cut roomy enough to layer. Twin chest pockets and a soft, broken-in hand.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1591047139829-d91aecb6caea"),
      unsplash("photo-1554412933-514a83d2f3c8"),
    ],
    isNew: true,
  },
  {
    id: "ribbed-knit-polo",
    name: "Ribbed Knit Polo",
    category: "men",
    subcategory: "Knitwear",
    price: 115,
    description:
      "A long-sleeve polo knitted in a chunky rib with a three-button placket. Smart enough for the office, relaxed enough for the weekend.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1552374196-c4e7ffc6e126"),
      unsplash("photo-1521572163474-6864f9cf17ab"),
    ],
  },
  {
    id: "tailored-wool-suit-jacket",
    name: "Tailored Wool Suit Jacket",
    category: "men",
    subcategory: "Suits",
    price: 385,
    compareAtPrice: 450,
    description:
      "A half-canvassed suit jacket in a breathable wool-mohair blend. Soft shoulder, two-button front and a clean, modern lapel.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1507003211169-0a1dd7228f2d"),
      unsplash("photo-1539533018447-63fcce2678e3"),
    ],
    featured: true,
  },
  {
    id: "linen-camp-collar-shirt",
    name: "Linen Camp-Collar Shirt",
    category: "men",
    subcategory: "Shirts",
    price: 88,
    description:
      "Washed European linen with an open camp collar and a relaxed body. Made for warm days and late evenings.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1554412933-514a83d2f3c8"),
      unsplash("photo-1596755094514-f87e34085b2c"),
    ],
    isNew: true,
  },
  {
    id: "pleated-wool-trousers",
    name: "Pleated Wool Trousers",
    category: "men",
    subcategory: "Trousers",
    price: 165,
    description:
      "Single-pleat trousers in a tropical wool suiting with a tapered leg and a clean waistband. Unlined for year-round wear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1555529669-e69e7aa0ba9a"),
      unsplash("photo-1542272604-787c3835535d"),
    ],
    isNew: true,
  },
];

/**
 * The single active catalogue consumed by the whole app.
 *
 * DEMO + IMPORTED (default):
 *   PRODUCTS = BASE_PRODUCTS + GENERATED_PRODUCTS
 *
 * IMPORTED-ONLY (switch with one line when you want user listings to replace
 * the demo catalogue entirely — everything else keeps working unchanged):
 */
export const PRODUCTS: Product[] = [...BASE_PRODUCTS, ...GENERATED_PRODUCTS];
// export const PRODUCTS: Product[] = [...GENERATED_PRODUCTS];

/**
 * Subcategories for a category, derived from the ACTIVE catalogue:
 * curated CATEGORIES order first, then any extras (e.g. imported) alphabetically.
 * Only subcategories that actually contain products are returned.
 */
export function subcategoriesFor(category: Category): string[] {
  const curated = CATEGORIES[category];
  const present = new Set(
    PRODUCTS.filter((p) => p.category === category).map((p) => p.subcategory),
  );
  const ordered = curated.filter((sub) => present.has(sub));
  const extras = [...present].filter((sub) => !curated.includes(sub)).sort();
  return [...ordered, ...extras];
}

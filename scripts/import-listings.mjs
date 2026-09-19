#!/usr/bin/env node
/**
 * ============================================================================
 *  VELOUR — listings import pipeline
 * ============================================================================
 *
 * Reads  incoming/listings.csv  + photos from  incoming/images/
 * Writes public/images/products/<id>-1.jpg | <id>-2.jpg (optimized)
 * And regenerates  lib/generated-products.ts  wholesale.
 *
 * Usage:
 *   1. cp incoming/listings-template.csv incoming/listings.csv
 *   2. fill one row per product, drop photos into incoming/images/
 *   3. npm run import-listings
 *
 * Dependency-free. Safe to re-run: output is fully regenerated each time.
 * ============================================================================
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CSV_PATH = path.join(ROOT, "incoming", "listings.csv");
const IMAGES_SRC = path.join(ROOT, "incoming", "images");
const IMAGES_OUT = path.join(ROOT, "public", "images", "products");
const TS_OUT = path.join(ROOT, "lib", "generated-products.ts");

const PLACEHOLDER = "/images/placeholder.jpg";
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];
const MAX_IMAGE_DIMENSION = 1400;

const COLUMNS = [
  "name",
  "category",
  "subcategory",
  "price",
  "compareAtPrice",
  "description",
  "sizes",
  "image1",
  "image2",
  "featured",
  "isNew",
  "trending",
];

const log = (...args) => console.log(...args);
const warn = (...args) => console.warn("  !", ...args);

/* ------------------------------------------------------------------ CSV --- */

/** Quote-aware CSV parser: handles embedded commas, quotes and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignore; handled by \n
    } else {
      field += char;
    }
  }

  // flush the final field / row (file may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/* --------------------------------------------------------------- helpers --- */

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isYes(value) {
  return ["yes", "y", "true", "1"].includes(String(value).trim().toLowerCase());
}

function parsePrice(value) {
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function csvEscapeForComment(value) {
  return String(value).replace(/\r?\n/g, " ");
}

/* ---------------------------------------------------------------- images --- */

function optimizeImage(sourceName, outputBase) {
  if (!sourceName) return null;

  // basename only — never allow path traversal from the CSV
  const safeName = path.basename(sourceName.trim());
  const sourcePath = path.join(IMAGES_SRC, safeName);

  if (!existsSync(sourcePath)) {
    warn(`image not found: incoming/images/${safeName} (using placeholder)`);
    return null;
  }

  const outputPath = `${outputBase}.jpg`;

  if (process.platform === "darwin") {
    try {
      execFileSync(
        "sips",
        ["-Z", String(MAX_IMAGE_DIMENSION), "-s", "format", "jpeg", sourcePath, "--out", outputPath],
        { stdio: "ignore" },
      );
      return `/images/products/${path.basename(outputPath)}`;
    } catch {
      warn(`sips failed for ${safeName}; copying original instead`);
    }
  }

  // Fallback (non-macOS): copy as-is
  try {
    copyFileSync(sourcePath, outputPath);
    return `/images/products/${path.basename(outputPath)}`;
  } catch {
    warn(`could not process ${safeName}; using placeholder`);
    return null;
  }
}

/* ------------------------------------------------------------------- main --- */

function main() {
  if (!existsSync(CSV_PATH)) {
    log("");
    log("No incoming/listings.csv found — nothing to import.");
    log("");
    log("To add products:");
    log("  1. cp incoming/listings-template.csv incoming/listings.csv");
    log("  2. Fill one row per product (see incoming/README.md).");
    log("  3. Drop photos into incoming/images/.");
    log("  4. npm run import-listings");
    log("");
    return;
  }

  mkdirSync(IMAGES_OUT, { recursive: true });

  const rows = parseCsv(readFileSync(CSV_PATH, "utf8")).filter(
    (row) => row.some((cell) => String(cell).trim() !== ""),
  );

  if (rows.length === 0) {
    log("listings.csv is empty — writing an empty catalogue.");
  }

  // header -> index map (case-insensitive, trimmed)
  const normalizedColumns = COLUMNS.map((column) => column.toLowerCase());
  const header = (rows.shift() ?? []).map((cell) =>
    String(cell).trim().toLowerCase(),
  );

  const missingColumns = normalizedColumns.filter(
    (column) => !header.includes(column),
  );
  if (missingColumns.length > 0) {
    console.error(
      `\nHeader is missing required column(s): ${missingColumns.join(", ")}`,
    );
    console.error(`Expected order/columns: ${COLUMNS.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  const index = Object.fromEntries(
    COLUMNS.map((column, i) => [
      column,
      header.indexOf(normalizedColumns[i]),
    ]),
  );
  const get = (row, column) => String(row[index[column]] ?? "").trim();

  const products = [];
  const usedIds = new Set();
  let skipped = 0;
  let placeholderCount = 0;

  rows.forEach((row, rowIndex) => {
    const lineNumber = rowIndex + 2; // +1 header, +1 1-based
    const name = get(row, "name");
    const category = get(row, "category").toLowerCase();
    const subcategory = get(row, "subcategory");
    const price = parsePrice(get(row, "price"));
    const image1 = get(row, "image1");
    const image2 = get(row, "image2");

    const errors = [];
    if (!name) errors.push("name is required");
    if (category !== "women" && category !== "men")
      errors.push('category must be "women" or "men"');
    if (!subcategory) errors.push("subcategory is required");
    if (price === null) errors.push("price must be a positive number");
    if (!image1) errors.push("image1 is required");

    if (errors.length > 0) {
      skipped += 1;
      warn(`row ${lineNumber} skipped: ${errors.join("; ")}`);
      return;
    }

    // collision-safe id
    const baseId = slugify(name) || `listing-${lineNumber}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const outputBase = path.join(IMAGES_OUT, id);
    const primary = optimizeImage(image1, `${outputBase}-1`);
    if (!primary) placeholderCount += 1;
    const secondary = optimizeImage(image2, `${outputBase}-2`) ?? primary ?? PLACEHOLDER;

    const sizesRaw = get(row, "sizes");
    const sizes = sizesRaw
      ? sizesRaw
          .split("|")
          .map((size) => size.trim())
          .filter(Boolean)
      : DEFAULT_SIZES;

    const compareAtPrice = parsePrice(get(row, "compareAtPrice"));

    const product = {
      id,
      name,
      category,
      subcategory,
      price,
      ...(compareAtPrice && compareAtPrice > price ? { compareAtPrice } : {}),
      description: get(row, "description"),
      sizes,
      images: [primary ?? PLACEHOLDER, secondary],
      ...(isYes(get(row, "featured")) ? { featured: true } : {}),
      ...(isYes(get(row, "isNew")) ? { isNew: true } : {}),
      ...(isYes(get(row, "trending")) ? { trending: true } : {}),
    };

    products.push(product);
  });

  writeFileSync(TS_OUT, renderTs(products), "utf8");

  log("");
  log(`Imported ${products.length} product(s) → lib/generated-products.ts`);
  if (skipped > 0) log(`Skipped ${skipped} invalid row(s).`);
  if (placeholderCount > 0)
    log(`Used the neutral placeholder for ${placeholderCount} missing image(s).`);
  log(`Optimized images → public/images/products/`);
  log("");
}

/** Renders the generated TypeScript module. */
function renderTs(products) {
  const entries = products
    .map((product) => {
      const lines = [
        `    id: ${JSON.stringify(product.id)},`,
        `    name: ${JSON.stringify(product.name)},`,
        `    category: ${JSON.stringify(product.category)},`,
        `    subcategory: ${JSON.stringify(product.subcategory)},`,
        `    price: ${product.price},`,
      ];
      if (product.compareAtPrice !== undefined)
        lines.push(`    compareAtPrice: ${product.compareAtPrice},`);
      if (product.description)
        lines.push(
          `    description: ${JSON.stringify(csvEscapeForComment(product.description))},`,
        );
      lines.push(`    sizes: ${JSON.stringify(product.sizes)},`);
      lines.push(`    images: ${JSON.stringify(product.images)},`);
      if (product.featured) lines.push(`    featured: true,`);
      if (product.isNew) lines.push(`    isNew: true,`);
      if (product.trending) lines.push(`    trending: true,`);
      return `  {\n${lines.join("\n")}\n  },`;
    })
    .join("\n");

  return `import type { Product } from "./data";

/**
 * AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerated in full by \`npm run import-listings\`
 * (scripts/import-listings.mjs) from incoming/listings.csv + incoming/images/.
 * \`lib/data.ts\` merges this array into PRODUCTS.
 */
export const GENERATED_PRODUCTS: Product[] = [
${entries}
];
`;
}

main();

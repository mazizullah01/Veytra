# Incoming listings

Drop your products here, then run the importer.

## Workflow

```bash
cp incoming/listings-template.csv incoming/listings.csv
# edit incoming/listings.csv — one row per product
# drop your photos into incoming/images/
npm run import-listings
```

The importer:

- validates every row and **skips invalid ones with a clear reason** (it never
  crashes on bad input)
- optimizes images to JPEG, max 1400px, and writes them to
  `public/images/products/<id>-1.jpg` and `<id>-2.jpg` (macOS `sips`)
- uses a neutral placeholder for rows whose image file is missing
- regenerates `lib/generated-products.ts` from scratch on every run

## Columns (in order)

| Column           | Required | Notes                                                                 |
| ---------------- | :------: | --------------------------------------------------------------------- |
| `name`           |   yes    | Product name. Used to generate the URL slug / id.                     |
| `category`       |   yes    | `women` or `men`.                                                     |
| `subcategory`    |   yes    | e.g. `Dresses`, `Outerwear`. Becomes a filter pill on listing pages.  |
| `price`          |   yes    | Positive number, no currency symbol.                                  |
| `compareAtPrice` |    no    | Original price (shown struck through) — must be greater than `price`. |
| `description`    |    no    | Plain text. Wrap in double quotes if it contains commas.              |
| `sizes`          |    no    | `|`-separated, e.g. `XS|S|M|L|XL`. Defaults to `XS,S,M,L,XL`.        |
| `image1`         |   yes    | Filename inside `incoming/images/` (e.g. `coat.jpg`).                 |
| `image2`         |    no    | Hover image filename. Falls back to `image1`.                         |
| `featured`       |    no    | `yes` / `no` (default `no`).                                          |
| `isNew`          |    no    | `yes` / `no` (default `no`).                                          |
| `trending`       |    no    | `yes` / `no` (default `no`).                                          |

## Notes

- Duplicate names get a `-2`, `-3`… suffix automatically.
- `lib/generated-products.ts` is **never hand-edited** — it is overwritten on
  every import.
- To show only imported products (hide the demo catalogue), switch the one
  documented line in `lib/data.ts`, or pass an empty CSV to reset the catalogue.

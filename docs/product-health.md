# Product Health & AI Diagnosis

Owner dashboard for return rates, deterministic health scores, and Gemini-assisted issue diagnosis.

## Access

1. Set `ADMIN_EMAILS=your@email.com` in `.env.local` and InsForge deploy env (comma-separated for multiple owners).
2. Sign in with that email.
3. Open `/admin/product-health`.

Non-admins are redirected home (admin APIs return 404).

## Customer returns

- From **Profile → Order history**, paid eligible orders show **Request return**.
- Customers pick items, qty, reason, and optional notes.
- Return rate analytics count **completed** return quantities only (not pending requests).
- Owner updates return status via `PATCH /api/admin/returns` (`approved` → `completed`, etc.).

## Reviews

- PDP includes a public review list and signed-in submit form.
- One review per user/product; used as diagnosis input only (never invented).

## Scoring (deterministic)

- Sold = paid order item quantities (excludes unpaid / canceled).
- Returned = completed return item quantities.
- `returnRate = returned / sold * 100` (Insufficient Data when sold &lt; 5).
- Health score blends return rate, volume, negative review rate, avg rating, and repeated-issue weight.
- Thresholds: Healthy 90–100, Monitor 70–89, Needs Attention 50–69, Critical &lt;50.

## AI diagnosis

- Uses `GEMINI_API_KEY` to classify feedback into ranked issues + suggested owner actions.
- Cached in `product_health_insights` by feedback hash; recomputes when feedback changes.
- On Gemini failure: metrics + reason aggregates only — no fake diagnoses.
- No auto-refunds and no automatic product edits.

## Alerts

Critical health / high return rate opens a deduped alert (`product_health_alerts`). Acknowledge or dismiss from the product drilldown.

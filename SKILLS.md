# SKILLS.md — VELOUR / Codex Working Guide

## Purpose
This file gives Codex a compact, reusable set of project rules so it can work efficiently, avoid unnecessary refactors, reduce repeated context, and save tokens.

Codex should read this file first before making changes.

---

## 1. Project Context

Project: **VELOUR**

Main stack:
- Next.js
- TypeScript
- InsForge backend
- Stripe Sandbox/Test Mode for payments

Existing backend features are already implemented:
- Authentication
- Products
- Cart
- Orders
- `/profile`

Primary backend references:
- `prompts/05_backend_database_and_auth.md`
- README → Backend section

Do not rebuild existing functionality unless a task explicitly requires it.

---

## 2. Core Working Rules

Always follow these rules:

1. Make the **smallest possible change** that satisfies the task.
2. Do **not** refactor unrelated files.
3. Do **not** redesign existing UI unless explicitly requested.
4. Preserve existing VELOUR styles, layout, spacing, typography, and components.
5. Reuse existing utilities, SDK clients, auth helpers, components, and patterns.
6. Before creating a new helper/component/API route, check whether an equivalent already exists.
7. Do not rename files, routes, variables, or components unless required.
8. Do not rewrite whole files when a small patch is enough.
9. Avoid adding new dependencies unless necessary.
10. Do not duplicate environment variables or existing configuration.
11. Prefer server-side logic for sensitive operations.
12. Never hard-code secrets.
13. Do not commit `.env`, `.env.local`, API keys, tokens, or secrets.
14. Keep comments short and useful.
15. Run validation only after the relevant implementation is complete.

---

## 3. Token-Saving / Context Rules

To reduce token usage:

- Read only files relevant to the current task.
- Do not repeatedly reread large files after their relevant structure is understood.
- Prefer targeted searches for:
  - component names
  - route names
  - database calls
  - env variable names
  - order/payment fields
- Do not dump entire large files into output unless necessary.
- Summarize findings internally before editing.
- When reporting completion, mention:
  - files changed
  - important behavior changed
  - tests/build result
  - anything the user must configure manually
- Do not provide long explanations unless requested.

When debugging:
1. Identify the actual failing layer.
2. Inspect only the files/logs related to that layer.
3. Fix the root cause.
4. Re-run the smallest relevant check.
5. Run the full build only after the fix is stable.

---

## 4. Editing Strategy

Before editing:
1. Inspect current implementation.
2. Identify the minimum files required.
3. Reuse existing project patterns.
4. Confirm whether the feature already partially exists.

During editing:
- Keep diffs small.
- Preserve existing naming conventions.
- Preserve existing formatting style.
- Avoid introducing abstractions for one-time logic.
- Do not change working code just to make it “cleaner”.

After editing:
- Check TypeScript errors.
- Check imports.
- Check route paths.
- Check environment variable names.
- Run:
  `npm run build`

If the build fails:
- Fix only errors related to the current task unless an unrelated pre-existing error blocks verification.
- Clearly state if a failure is pre-existing.

---

## 5. Stripe Payment Rules

VELOUR uses **Stripe Sandbox/Test Mode**.

Environment variables:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production/deployment, `NEXT_PUBLIC_APP_URL` must be the deployed VELOUR URL.

### Security

Never expose these to client-side code:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Only the publishable key may be public:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Never allow the browser to directly set:
- `payment_status = 'paid'`
- `status = 'confirmed'`

A payment is considered valid only after Stripe verifies it.

---

## 6. Stripe Checkout Flow

Required order flow:

```text
pending + unpaid
      ↓
Stripe Checkout
      ↓
successful payment
      ↓
confirmed + paid
      ↓
shipped
      ↓
delivered
```

### Place Order

When the user clicks **Place Order**:

Create the InsForge order first:

```text
status = pending
payment_status = unpaid
payment_method = stripe
```

Then redirect to:

```text
/payment/<orderId>
```

Do not change unrelated cart/order behavior.

---

## 7. Payment Page

Route:

```text
/payment/[orderId]
```

Requirements:
- User must be authenticated.
- Fetch the real order from InsForge.
- Verify order ownership.
- Read total from the database.
- Never trust a payment amount sent by the browser.
- Show the real order total.
- Show a **Pay with Stripe** button.

When clicked:
- Call a server-side endpoint/action.
- Create a Stripe Checkout Session.
- Redirect to `session.url`.

Do not build a custom card form unless explicitly requested.

---

## 8. Stripe Checkout Session

Create the session server-side.

Required concepts:

```ts
mode: "payment"
```

Use the real order total from InsForge.

Convert amount into Stripe's smallest currency unit:

```text
49.99 USD → 4999
```

Attach the VELOUR order ID:

```ts
metadata: {
  orderId: order.id
}

client_reference_id: order.id
```

Success URL:

```text
${APP_URL}/payment/return?session_id={CHECKOUT_SESSION_ID}
```

Cancel URL:

```text
${APP_URL}/payment/<orderId>?cancelled=true
```

---

## 9. Stripe Webhook

Preferred route:

```text
/api/stripe/webhook
```

Verify webhook signatures using:

```text
STRIPE_WEBHOOK_SECRET
```

Handle at minimum:

```text
checkout.session.completed
```

After Stripe confirms payment:
1. Read `session.metadata.orderId`.
2. Confirm `session.payment_status === 'paid'`.
3. Find the matching InsForge order.
4. If not already paid, update:

```text
payment_status = paid
status = confirmed
```

Webhook handling must be idempotent.

Repeated webhook events must not:
- create duplicate orders
- duplicate side effects
- corrupt status

The webhook is the authoritative payment confirmation mechanism.

---

## 10. Payment Return Page

Route:

```text
/payment/return
```

Read:

```text
session_id
```

Retrieve the Stripe Checkout Session server-side.

Do not mark an order paid merely because the user reached this page.

If Stripe confirms payment, display:
- Payment successful
- Real VELOUR order ID
- Paid status
- Confirmed order status
- Link to `/profile`

If payment is not confirmed, show pending/failed state.

---

## 11. Profile Orders

Route:

```text
/profile
```

Preserve existing UI.

Show payment badge:
- Paid
- Unpaid

Status tracker:

```text
pending → confirmed → shipped → delivered
```

Do not redesign the profile page unless explicitly requested.

---

## 12. InsForge Rules

Existing InsForge integration should be reused.

Do not:
- create a second backend client
- duplicate auth logic
- duplicate order-fetching logic
- bypass existing SDK patterns

For database changes, use the existing InsForge CLI/project migration pattern.

Order fields required for Stripe:

```text
payment_status text default 'unpaid'
payment_method text default 'stripe'
```

Users must retain permission to read their own orders.

Sensitive payment-state updates must be performed server-side.

---

## 13. Authentication Rules

For protected payment/order routes:
- Require authentication.
- Verify that the order belongs to the authenticated user.
- Never trust `userId` supplied by the browser.
- Derive authenticated user identity from the existing server-side auth/session mechanism.

---

## 14. Environment Variables

Before adding a new environment variable:
1. Search the codebase for an existing equivalent.
2. Reuse it if appropriate.

Expected Stripe variables:

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

Never print full secret values in logs or responses.

---

## 15. Test Cards

Stripe Sandbox success:

```text
4242 4242 4242 4242
```

Use:
- Any future expiry
- Any 3-digit CVC
- Valid test name/address values

Example failed payment:

```text
4000 0000 0000 0002
```

A failed/cancelled payment must leave the VELOUR order:

```text
status = pending
payment_status = unpaid
```

---

## 16. Required Verification

For payment-related tasks, verify:

1. `npm run build`
2. Login works.
3. Add product to cart.
4. Checkout works.
5. Place Order creates:
   - `status = pending`
   - `payment_status = unpaid`
   - `payment_method = stripe`
6. `/payment/<orderId>` loads correctly.
7. Stripe Checkout opens.
8. Successful sandbox payment completes.
9. Webhook is received.
10. Database becomes:
    - `payment_status = paid`
    - `status = confirmed`
11. `/profile` shows:
    - Paid
    - Confirmed
12. Cancelled payment remains pending/unpaid.
13. Failed payment remains pending/unpaid.

Do not claim full E2E verification if a required external credential, deployment URL, or webhook configuration is unavailable.

---

## 17. UI Rules

VELOUR already has an established design.

When implementing features:
- reuse existing buttons
- reuse existing typography
- reuse existing cards
- reuse existing spacing
- reuse existing form styles
- reuse existing responsive patterns

Do not introduce a new visual system.

For loading/error/success states, match existing VELOUR patterns.

---

## 18. Code Quality

Prefer:
- simple readable functions
- explicit validation
- small diffs
- existing project conventions

Avoid:
- premature abstractions
- large helper layers
- unnecessary packages
- duplicated API clients
- duplicated types
- excessive comments
- broad rewrites

Use TypeScript types already present in the project whenever possible.

---

## 19. Error Handling

For payment APIs, handle:
- unauthenticated user
- missing order
- order owned by another user
- already-paid order
- invalid amount
- missing Stripe environment variables
- Stripe API failure
- cancelled checkout
- invalid webhook signature
- missing webhook metadata
- duplicate webhook delivery

Do not expose sensitive error details or secrets to users.

---

## 20. Git / Change Discipline

Before finishing:
- Review `git diff`.
- Ensure only task-related files changed.
- Remove debug logs.
- Remove temporary files.
- Do not modify lockfiles unless dependency changes require it.
- Do not commit secrets.

Use concise commit messages, for example:

```text
feat: add Stripe checkout flow
fix: verify Stripe webhook payments
fix: show payment status on orders
```

---

## 21. Response Format After Completing a Task

Keep the final response concise.

Use this format:

```text
Done.

Changed:
- <file>: <short description>
- <file>: <short description>

Verification:
- npm run build: passed
- <other relevant check>: passed

Manual setup still required:
- <only if applicable>
```

Do not provide a long tutorial unless requested.

---

## 22. Priority Order

When instructions conflict, follow this priority:

1. Current user request
2. Security requirements
3. Existing project architecture
4. This `SKILLS.md`
5. General cleanup/refactoring preferences

If the requested change can be completed without touching unrelated code, do so.

---

## 23. Golden Rule

**Understand first, change minimally, verify fully.**

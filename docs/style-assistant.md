# Veytra AI Fashion Stylist

The floating stylist is mounted once in `app/layout.tsx` inside the existing providers. It uses the site's typography, neutral colors, product links and image component. No Stripe, checkout or authentication code was changed.

## Setup and free-tier constraint

The workspace has `@google/genai` installed. Configure these server-only variables in `.env.local` (and in the hosting environment when deploying):

```
GEMINI_API_KEY=your-key-from-google-ai-studio
GEMINI_FREE_TIER_CONFIRMED=true
```

Set the confirmation only after checking that the key's Google AI Studio project is Free tier and billing is disabled. A model name/API key does not prove the billing tier, and there is no per-generation free-only billing switch. The route fails closed until both settings exist. It never enables billing, uses Vertex, switches models, or falls back to paid services. It pins `gemini-3.8-flash`, which has published free text input/output pricing. Keep billing disabled to prevent paid API usage. Quotas and model availability are controlled by Google and may change.

References: https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash and https://ai.google.dev/gemini-api/docs/billing . Google's free service may use submitted content to improve its products. Customers are told that chat messages go to Google and to avoid personal details.

Restart `npm run dev` after changing environment variables. Do not paste API keys in chat, commit them, or add a `NEXT_PUBLIC_` prefix.

## Files and flow

- `app/api/chat/route.ts`: canonical validated, rate-limited endpoint; improved from the Gemini handler originally present under `/api/style-assistant`.
- `app/api/style-assistant/route.ts`: compatibility export of the canonical handler.
- `lib/style-assistant/gemini.ts`: server-only provider call, multilingual instructions, history, public product grounding, timeout and single attempt.
- `lib/style-assistant/ai-input.ts`: streamed body limit, strict message/history roles, basic identifier redaction.
- `lib/style-assistant/ai-limits.ts`: session and IP limits, global quota guard, concurrency limit and provider cooldown.
- `components/style-assistant/StyleAssistant.tsx`, `AssistantPanel.tsx`, `style-assistant.module.css`: lazy floating panel, keyboard controls, quick suggestions, in-memory history, trusted product cards, clear/minimize and retry without duplicate messages.
- `lib/style-assistant/types.ts`: shared response format, welcome and outfit/color/sizing/casual/wedding suggestions.
- Existing `rules.ts`, `search.ts` and `lib/api.ts` retrieve bounded real products using the public InsForge SDK/RLS client. Rules select catalog candidates; they do not restrict open-ended Gemini fashion advice.
- Existing `faq.ts` provides published store policies locally. Account questions link to `/profile` without querying private data or calling Gemini. The old order helper is not used by this chat endpoint.
- `.env.example`: documents server-only Gemini settings without credentials.
- `tests/style-assistant.test.mjs`: validation, quota, privacy, model payload and real catalog-query structure tests with controlled dependencies.

The endpoint accepts `{message, history?, context?}`. History is at most eight text turns, 1,200 characters per turn and 6,000 characters total; new messages are at most 600 characters. Request bodies are capped at 32 KiB while streaming. Client history is further truncated. No chat history is persisted to a database, localStorage or sessionStorage. Clear chat, reload, or an authentication change clears the in-memory conversation. Minimize preserves it.

Only public product names/prices/sizes/IDs are supplied as catalog context. The model cannot create clickable links: product card links are built from actual retrieved records. Product sizes are catalog options, not live quantities. A catalog timeout does not block general styling advice. Current and recent English, Urdu and Roman Urdu messages are forwarded to Gemini for conversation context. Private account-related turns are excluded; obvious emails, long numbers, UUID references and API-key patterns are redacted. Redaction is best effort, not a guarantee of removing all personal data: names or freeform addresses may be unrecognizable. Never supply private account records to the model.

Limits are five requests/minute separately per session and per forwarded IP, ten requests/minute and 100/day globally per running instance, and two concurrent generations. Gemini 429 responses trigger a 60-second cooldown and Retry-After. Automatic SDK retries, tools, grounding, paid fallbacks and model switching are disabled. These limits are deliberately conservative and do not represent Google's actual allowance. In-memory limits reset on restart and are not shared across deployment instances. For multi-instance public hosting, configure shared edge rate limits and trusted-proxy IP normalization; do not treat caller-supplied forwarded headers as authenticated identity. No customer account identifier is sent to Gemini.

## Test

1. Configure the two variables above, restart `npm run dev`, and open http://localhost:3000.
2. Open “Veytra AI Fashion Stylist” on any page. Ask “What should I wear to a summer wedding?” then “Make it more casual.” Test Urdu and Roman Urdu too.
3. Ask “I have black skin tone; will this suit me?” and “What colors go with olive?” Advice should continue naturally without treating skin tone as a product color.
4. Ask “Show me men's shirts” or “Recommend a casual outfit.” Check any returned cards against the real product pages and USD prices. Missing catalog matches should not prevent general advice.
5. Ask “Where is my order?” The response should link to your account without including order records or invoking Gemini.
6. Clear chat, minimize/reopen, try a phone-sized viewport, and navigate to another page. Retry an error: the user message should appear only once.
7. `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Automated provider tests stub Gemini to avoid billing/quota and assert the actual SDK payload, error paths and privacy boundary. A live request to Gemini 3.8 Flash succeeded with the locally configured key and LOW thinking level. Gemini 2.5 Flash rejected the new user key with 404, so the integration now pins 3.8 Flash. This implementation does not deploy the site.

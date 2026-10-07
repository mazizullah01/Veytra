// Exercise real route handlers and Stripe signature verification with an in-memory DB.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import Stripe from 'stripe';
const moduleRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const orderId = '12345678-1234-1234-1234-123456789abc';
let order, writes, calls, user, session, createdParams;
const stripe = new Stripe('sk_test_unit_tests_only');
const signedSecret = 'whsec_unit_tests_only';
const cache = {};
function database() {
  return { from() {
    let changes = null; const filters = [];
    const query = {
      select() { return query; },
      update(value) { changes = value; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      is(key, value) { filters.push([key, value]); return query; },
      async maybeSingle() {
        if (!order || filters.some(([key, value]) => order[key] !== value)) return { data: null, error: null };
        if (changes) { writes++; Object.assign(order, changes); }
        return { data: { ...order }, error: null };
      },
      single() { return query.maybeSingle(); },
    }; return query;
  } };
}
const sdk = {
  createClient() { return { auth: { async getCurrentUser() { return { data: { user }, error: null }; } }, database: database() }; },
  createAdminClient() { return { database: database() }; },
};
const fakeStripe = function () {
  return { webhooks: stripe.webhooks, checkout: { sessions: {
    async retrieve() { calls++; return { ...session }; },
    async create(params) { calls++; createdParams = params; return { ...session, status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_test_example' }; },
  } } };
};
function load(relative) {
  const filename = path.join(root, relative);
  if (cache[filename]) return cache[filename].exports;
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const compiledModule = { exports: {} }; cache[filename] = compiledModule;
  const scopedRequire = name => {
    if (name === 'server-only') return {};
    if (name === 'stripe') return fakeStripe;
    if (name === '@insforge/sdk') return sdk;
    if (name === '@/lib/stripe-server') return load('lib/stripe-server.ts');
    return moduleRequire(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(scopedRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const helpers = load('lib/stripe-server.ts');
const webhook = load('app/api/stripe/webhook/route.ts');
const checkout = load('app/api/stripe/create-checkout-session/route.ts');
const status = load('app/api/stripe/payment-status/route.ts');
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit_tests_only';
  process.env.STRIPE_WEBHOOK_SECRET = signedSecret;
  process.env.INSFORGE_API_KEY = 'unit_test_admin';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3100';
  user = { id: 'owner', email: 'test@example.invalid' };
  order = { id: orderId, user_id: 'owner', total: '49.99', status: 'pending', payment_status: 'unpaid', payment_method: 'stripe', stripe_session_id: 'cs_test_example' };
  session = { id: 'cs_test_example', livemode: false, mode: 'payment', payment_status: 'paid', status: 'complete', metadata: { orderId, userId: 'owner' }, client_reference_id: orderId, currency: 'usd', amount_total: 4999 };
  writes = 0; calls = 0; createdParams = null;
});
function webhookRequest(overrides = {}, signatureValid = true, type = 'checkout.session.completed') {
  const payload = JSON.stringify({ id: 'evt_test', type, livemode: false, data: { object: { ...session, ...overrides } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: signedSecret });
  return new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signatureValid ? signature : 'invalid' } });
}
function checkoutRequest(extra = {}, authenticated = true) {
  return new Request('http://localhost/api/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify({ orderId, ...extra }), headers: authenticated ? { Authorization: 'Bearer unit_test_token' } : {} });
}
test('USD conversion is exact and rejects invalid amounts', () => {
  for (const [value, expected] of [['49.99', 4999], ['0.50', 50], ['128', 12800], [19.9, 1990]]) assert.equal(helpers.usdCents(value), expected);
  for (const value of ['-1', '1.001', 'NaN', '1e4', '0', '1000000']) assert.throws(() => helpers.usdCents(value));
});
test('invalid signature never writes an order', async () => {
  assert.equal((await webhook.POST(webhookRequest({}, false))).status, 400); assert.equal(writes, 0);
});
test('unpaid and failed payment events never confirm orders', async () => {
  assert.equal((await webhook.POST(webhookRequest({ payment_status: 'unpaid' }))).status, 200);
  assert.equal((await webhook.POST(webhookRequest({}, true, 'payment_intent.payment_failed'))).status, 200);
  assert.equal(order.payment_status, 'unpaid'); assert.equal(writes, 0);
});
test('paid signed event confirms once; duplicate preserves shipped status', async () => {
  assert.equal((await webhook.POST(webhookRequest())).status, 200);
  assert.equal(order.payment_status, 'paid'); assert.equal(order.status, 'confirmed'); assert.equal(writes, 1);
  order.status = 'shipped';
  assert.equal((await webhook.POST(webhookRequest())).status, 200); assert.equal(order.status, 'shipped'); assert.equal(writes, 1);
});
test('wrong amount, currency, owner or session cannot confirm payment', async () => {
  for (const mismatch of [{ amount_total: 1 }, { currency: 'eur' }, { id: 'cs_test_other' }, { metadata: { orderId, userId: 'attacker' } }, { livemode: true }]) {
    assert.equal((await webhook.POST(webhookRequest(mismatch))).status, 409);
  }
  assert.equal(writes, 0);
});
test('checkout requires login and order ownership', async () => {
  assert.equal((await checkout.POST(checkoutRequest({}, false))).status, 401);
  user = { id: 'attacker' };
  assert.equal((await checkout.POST(checkoutRequest())).status, 404);
  assert.equal(calls, 0);
});
test('checkout ignores browser amount and reuses an open session', async () => {
  order.stripe_session_id = null;
  assert.equal((await checkout.POST(checkoutRequest({ amount: 1 }))).status, 200);
  assert.equal(createdParams.line_items[0].price_data.unit_amount, 4999);
  assert.equal(createdParams.client_reference_id, orderId);
  assert.equal(createdParams.metadata.orderId, orderId);
  assert.equal(order.stripe_session_id, session.id);
  session = { ...session, status: 'open', payment_status: 'unpaid', url: 'https://checkout.stripe.com/c/pay/example' };
  createdParams = null;
  assert.equal((await checkout.POST(checkoutRequest())).status, 200); assert.equal(createdParams, null);
});
test('paid order rejects further checkout', async () => {
  order.payment_status = 'paid'; order.status = 'confirmed';
  assert.equal((await checkout.POST(checkoutRequest())).status, 409); assert.equal(calls, 0);
});
test('return status is authenticated, read-only and waits for webhook', async () => {
  const url = 'http://localhost/api/stripe/payment-status?session_id=cs_test_example';
  assert.equal((await status.GET(new Request(url))).status, 401); assert.equal(calls, 0);
  const response = await status.GET(new Request(url, { headers: { Authorization: 'Bearer unit_test_token' } }));
  const result = await response.json();
  assert.equal(result.stripePaid, true); assert.equal(result.paymentStatus, 'unpaid'); assert.equal(result.status, 'pending'); assert.equal(writes, 0);
});

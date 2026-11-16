import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const moduleRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = {};

function load(relative, extras = {}) {
  const filename = path.join(root, relative);
  if (cache[filename] && !extras.force && !extras.geminiFail && extras.geminiText === undefined) {
    return cache[filename].exports;
  }
  if (extras.force) delete cache[filename];
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  cache[filename] = compiledModule;
  const scopedRequire = (name) => {
    if (name === "server-only") return {};
    if (name === "@/lib/product-health") return load("lib/product-health.ts");
    if (name === "@/lib/product-health/ai-diagnosis") return load("lib/product-health/ai-diagnosis.ts");
    if (name === "@/lib/admin") return load("lib/admin.ts");
    if (name === "@insforge/sdk") {
      return {
        createClient() {
          return {
            auth: {
              async getCurrentUser() {
                return { data: { user: extras.user ?? null }, error: extras.user ? null : { message: "no" } };
              },
            },
          };
        },
        createAdminClient() {
          return { database: {} };
        },
      };
    }
    if (name === "@google/genai") {
      return {
        ThinkingLevel: { MINIMAL: "MINIMAL" },
        GoogleGenAI: class {
          constructor() {}
          models = {
            async generateContent() {
              if (extras.geminiFail) throw new Error("timeout");
              return { text: extras.geminiText ?? "" };
            },
          };
        },
      };
    }
    if (name.startsWith("@/")) {
      const mapped = name.replace("@/", "") + (name.endsWith(".ts") ? "" : "");
      const candidates = [`${mapped}.ts`, mapped];
      for (const candidate of candidates) {
        const full = path.join(root, candidate);
        if (fs.existsSync(full)) return load(candidate);
      }
    }
    return moduleRequire(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
    scopedRequire,
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

const health = load("lib/product-health.ts");

test("return rate and partial returns", () => {
  assert.equal(health.returnRate(10, 2), 20);
  assert.equal(health.returnRate(0, 1), null);
  assert.equal(health.remainingReturnableQty(3, 1), 2);
  assert.doesNotThrow(() => health.assertReturnQty(3, 1, 2));
  assert.throws(() => health.assertReturnQty(3, 1, 3));
  assert.throws(() => health.assertReturnQty(3, 1, 0));
});

test("duplicate qty prevention across successive requests", () => {
  let returned = 0;
  health.assertReturnQty(5, returned, 2);
  returned += 2;
  health.assertReturnQty(5, returned, 3);
  returned += 3;
  assert.throws(() => health.assertReturnQty(5, returned, 1));
  assert.equal(health.remainingReturnableQty(5, returned), 0);
});

test("health thresholds and insufficient data", () => {
  assert.equal(health.computeHealthScore({ soldUnits: 3, returnedUnits: 0 }), null);
  assert.equal(health.healthStatusFromScore(null, 3), "Insufficient Data");
  const healthy = health.computeHealthScore({
    soldUnits: 100,
    returnedUnits: 2,
    avgRating: 4.8,
    negativeReviewRate: 0.05,
    repeatedIssueWeight: 0.2,
  });
  assert.ok(healthy !== null && healthy >= 90);
  assert.equal(health.healthStatusFromScore(healthy, 100), "Healthy");
  const critical = health.computeHealthScore({
    soldUnits: 100,
    returnedUnits: 45,
    avgRating: 2,
    negativeReviewRate: 0.7,
    repeatedIssueWeight: 0.9,
  });
  assert.ok(critical !== null && critical < 50);
  assert.equal(health.healthStatusFromScore(critical, 100), "Critical");
});

test("urgency favors volume over tiny samples", () => {
  const tiny = health.urgencyRank(1, 1, 40);
  const large = health.urgencyRank(100, 60, 40);
  assert.ok(large > tiny);
});

test("admin allowlist gate", () => {
  process.env.ADMIN_EMAILS = "owner@veytra.test, ops@veytra.test";
  const admin = load("lib/admin.ts", { force: true });
  assert.equal(admin.isAdminEmail("owner@veytra.test"), true);
  assert.equal(admin.isAdminEmail("OWNER@veytra.test"), true);
  assert.equal(admin.isAdminEmail("shopper@example.com"), false);
  process.env.ADMIN_EMAILS = "";
  const closed = load("lib/admin.ts", { force: true });
  assert.equal(closed.isAdminEmail("owner@veytra.test"), false);
});

test("AI JSON validation and failure path", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const ai = load("lib/product-health/ai-diagnosis.ts", {
    force: true,
    geminiText: JSON.stringify({
      issues: [{ title: "Sizing", count: 3, reasonCodes: ["too_small"], evidenceIds: ["r1"], summary: "Runs small" }],
      actions: [{ title: "Review size chart", detail: "Check measurements", priority: "high" }],
    }),
  });
  const bundle = {
    productId: "p1",
    productName: "Coat",
    reasons: [{ reason: "too_small", count: 3 }],
    returnNotes: [{ id: "r1", text: "Too tight in shoulders" }],
    reviews: [],
  };
  const ok = await ai.diagnoseWithGemini(bundle);
  assert.equal(ok.issues[0].title, "Sizing");
  assert.equal(ok.actions[0].priority, "high");

  const invalid = ai.validateDiagnosis({ issues: "nope" }, "hash");
  assert.equal(invalid, null);

  const failing = load("lib/product-health/ai-diagnosis.ts", { force: true, geminiFail: true });
  const fallback = await failing.diagnoseWithGemini(bundle);
  assert.equal(fallback.model, "metrics-only");
  assert.ok(fallback.error);
  assert.equal(fallback.issues[0].reasonCodes[0], "too_small");
});

test("alert fingerprint dedupe key", () => {
  const a = health.alertFingerprint("critical_health", "prod-1");
  const b = health.alertFingerprint("critical_health", "prod-1");
  const c = health.alertFingerprint("high_return_rate", "prod-1");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@veytra.test";
  process.env.INSFORGE_API_KEY = "unit";
  process.env.NEXT_PUBLIC_INSFORGE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon";
});

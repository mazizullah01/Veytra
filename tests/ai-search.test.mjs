import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleRequire = createRequire(import.meta.url);
const cache = {};

function load(relative) {
  const filename = path.join(root, relative);
  if (cache[filename]) return cache[filename].exports;
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  cache[filename] = compiled;
  const scoped = (name) => {
    if (name.startsWith('.')) {
      const resolved = path.normalize(path.join(path.dirname(filename), name));
      const withTs = resolved.endsWith('.ts') || resolved.endsWith('.js') ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) return load(path.relative(root, withTs));
      if (fs.existsSync(`${resolved}/index.ts`)) return load(path.relative(root, `${resolved}/index.ts`));
    }
    return moduleRequire(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(scoped, compiled, compiled.exports);
  return compiled.exports;
}

const { rankCatalogueSuggestions, scoreCatalogueProduct } = load('lib/ai-search-rank.ts');

const catalogue = [
  { id: 'classic-oxford-shirt', name: 'Classic Oxford Shirt', category: 'men', subcategory: 'Shirts', price: 89, description: 'A crisp blue oxford shirt.', sizes: ['M'], images: ['/a.jpg'] },
  { id: 'essential-tee', name: 'Essential Heavyweight Tee', category: 'men', subcategory: 'T-Shirts', price: 48, description: 'Soft white tee.', sizes: ['M'], images: ['/b.jpg'] },
  { id: 'wide-leg', name: 'Wide Leg Trousers', category: 'men', subcategory: 'Trousers', price: 128, description: 'Tailored trousers.', sizes: ['M'], images: ['/c.jpg'] },
  { id: 'silk-dress', name: 'Silk Slip Dress', category: 'women', subcategory: 'Dresses', price: 198, description: 'Black silk dress.', sizes: ['S'], images: ['/d.jpg'] },
];

test('blue shirt ranks shirts above unrelated categories', () => {
  const ranked = rankCatalogueSuggestions(catalogue, 'blue shirt', 4);
  assert.equal(ranked[0].id, 'classic-oxford-shirt');
  assert.ok(ranked.some((p) => p.subcategory === 'T-Shirts' || p.subcategory === 'Trousers'));
});

test('literal substring still scores positively', () => {
  assert.ok(scoreCatalogueProduct(catalogue[3], 'silk') > 0);
  assert.equal(rankCatalogueSuggestions(catalogue, 'silk', 1)[0].id, 'silk-dress');
});

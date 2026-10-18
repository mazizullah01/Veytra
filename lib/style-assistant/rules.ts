import { COLORS, KINDS, STYLES, type ClassifiedMessage, type Intent, type Language, type SearchContext } from "./types";

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
const substitutions: [RegExp, string][] = [
  [/ٹی\s*شرٹس?|ٹی\s*شرٹ/g, " tshirt "], [/قمیصیں|قمیضیں|قمیص|قمیض|شرٹس?|شرٹ/g, " shirt "],
  [/مردوں|مردانہ|مرد|لڑکوں/g, " men "], [/عورتوں|خواتین|زنانہ|لڑکیوں/g, " women "],
  [/سیاہ|کالے|کالی|کالا/g, " black "], [/سفید/g, " white "], [/نیلے|نیلی|نیلا/g, " blue "], [/سبز|ہرا/g, " green "],
  [/گرمیوں|گرمی/g, " summer "], [/سردیوں|سردی/g, " winter "], [/پتلون/g, " trousers "],
  [/میڈیم|درمیانہ/g, " medium "], [/بڑا|لارج/g, " large "], [/چھوٹا|سمال/g, " small "], [/سائز/g, " size "],
  [/آرڈر/g, " order "], [/کہاں/g, " where "], [/واپسی|واپس/g, " return "], [/تبادلہ|تبدیل/g, " exchange "],
  [/ڈیلیوری|شپنگ/g, " shipping "], [/ادائیگی/g, " payment "], [/روپے|روپیہ/g, " pkr "],
  [/سے\s*کم/g, " under "], [/دکھائیں|دکھاؤ|دکھاو/g, " show "], [/چاہیے|چاہئے/g, " need "],
  [/کپڑے|کپڑوں/g, " clothes "], [/دستیاب/g, " available "], [/کونسا|کون\s*سا/g, " which "],
  [/مناسب|صحیح/g, " suitable "], [/صرف/g, " only "], [/السلام\s*علیکم|سلام/g, " hello "],
];
const words: Record<string, string> = {
  tshirts: "tshirt", tees: "tshirt", tee: "tshirt", shirts: "shirt", pants: "trousers", pant: "trousers", trouser: "trousers",
  dresses: "dress", jackets: "jacket", coats: "coat", sweaters: "sweater", knitwear: "sweater", blazers: "blazer",
  mens: "men", male: "men", gents: "men", mardon: "men", mardana: "men", larkon: "men",
  womens: "women", female: "women", ladies: "women", aurton: "women", khawateen: "women", larkion: "women",
  kala: "black", kaala: "black", kaali: "black", kali: "black", kalay: "black", siyah: "black",
  safed: "white", safaid: "white", neela: "blue", neeli: "blue", hara: "green", surkh: "red", khaki: "olive", gray: "grey",
  garmi: "summer", garmiyon: "summer", sardi: "winter", kapray: "clothes", kapre: "clothes", kapde: "clothes",
  dikhao: "show", dikhaye: "show", dikhaen: "show", dikhayen: "show", chahiye: "need", chahye: "need",
  kahan: "where", kidhar: "where", kab: "when", wapas: "return", badalna: "exchange", badal: "exchange",
  rupay: "pkr", rupees: "pkr", rs: "pkr", dollars: "usd", dollar: "usd", darmiyana: "medium", darmiana: "medium",
  blak: "black", whte: "white", bleu: "blue",
};
const dictionary = [...KINDS, "oversized", "summer", "casual", "formal", "cashmere", "linen", "oxford", "essential", "heavyweight"];

export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

export function normalizeMessage(input: string): string {
  let text = input.toLowerCase().normalize("NFKC").replace(/[’']/g, "").replace(/t[\s-]+shirts?/g, " tshirt ")
    .replace(/[۰-۹٠-٩]/g, char => String("۰۱۲۳۴۵۶۷۸۹".includes(char) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(char) : "٠١٢٣٤٥٦٧٨٩".indexOf(char)))
    .replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/\bse\s+kam\b/g, " under ")
    .replace(/\b(rs|pkr|usd)\./g, "$1 ").replace(/(\d)(pkr|usd)\b/g, "$1 $2").replace(/\b(pkr|usd)(?=\d)/g, "$1 ");
  for (const [pattern, replacement] of substitutions) text = text.replace(pattern, replacement);
  const normalized = text.replace(/[^\p{L}\p{N}.$\s-]/gu, " ").split(/\s+/).filter(Boolean).map(token => {
    if (words[token]) return words[token];
    if (dictionary.includes(token) || token.length < 4 || token.length > 20) return token;
    const ranked = dictionary.map(word => ({ word, distance: editDistance(token, word) })).sort((a, b) => a.distance - b.distance);
    return ranked[0].distance <= (token.length >= 6 ? 2 : 1) ? ranked[0].word : token;
  }).join(" ");
  return normalized.replace(/\b(\d+(?:\.\d{1,2})?)\s*(usd|pkr)?\s+under\b/g, (_, amount, currency) => `under ${amount} ${currency ?? ""}`).trim();
}

export function languageOf(text: string): Language {
  if (/[\u0600-\u06ff]/.test(text)) return "ur";
  return /\b(dikhao|dikhaen|chahiye|chahye|kapray|kapre|kahan|kidhar|mardon|mardana|garmi|safed|safaid|kaala|kala|rupay|wapas)\b/i.test(text) ? "roman" : "en";
}

export function validateContext(value: unknown): SearchContext {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid search context.");
  const source = value as Record<string, unknown>;
  const allowed = ["category", "kind", "color", "size", "minPrice", "maxPrice", "maxExclusive", "currency", "style", "query"];
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error("Invalid search context.");
  const output: SearchContext = {};
  const choices = { category: ["men", "women"], kind: KINDS, color: COLORS, size: sizes, currency: ["USD", "PKR"], style: STYLES };
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    if (source[key] !== undefined) {
      if (typeof source[key] !== "string" || !(choices[key] as readonly string[]).includes(source[key] as string)) throw new Error("Invalid search filter.");
      Object.assign(output, { [key]: source[key] });
    }
  }
  for (const key of ["minPrice", "maxPrice"] as const) {
    if (source[key] !== undefined) {
      if (typeof source[key] !== "number" || !Number.isFinite(source[key]) || source[key] < 0 || source[key] > 1_000_000) throw new Error("Invalid price filter.");
      output[key] = source[key];
    }
  }
  if (source.maxExclusive !== undefined) {
    if (typeof source.maxExclusive !== "boolean") throw new Error("Invalid price filter.");
    output.maxExclusive = source.maxExclusive;
  }
  if (source.query !== undefined) {
    if (typeof source.query !== "string" || source.query.length > 64 || !/^[\p{L}\p{N} -]*$/u.test(source.query)) throw new Error("Invalid product search.");
    output.query = source.query;
  }
  return output;
}

export function classifyMessage(input: string, previous: SearchContext = {}): ClassifiedMessage {
  const text = normalizeMessage(input);
  const has = (pattern: RegExp) => pattern.test(text);
  const language = languageOf(input);
  const context = { ...previous };
  const reply = (intent: Intent): ClassifiedMessage => ({ intent, context, language });
  if (has(/\b(clear chat|start over|reset|new search|clear filters)\b/)) return { intent: "reset", context: {}, language };
  if (has(/\b(order|track|tracking|parcel)\b/)) return { ...reply("order"), orderId: input.match(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/i)?.[0] };
  if (has(/\b(return|returns|refund|refunds)\b/)) return reply("returns");
  if (has(/\b(exchange|exchanges)\b/)) return reply("exchange");
  if (has(/\b(shipping|delivery|deliver|dispatch)\b/)) return reply("shipping");
  if (has(/\b(payment|payments|pay|stripe|cash on delivery|cod|paypal)\b/)) return reply("payments");
  if (has(/\b(regular|oversized)\b/) && has(/\b(difference|versus|vs|mean|meaning)\b/)) return reply("fit");
  if (has(/\b(which|what|suitable|fit me|measurements?|chest|waist|height|weight|size guide)\b/) && has(/\b(size|medium|small|large|measurements?|chest|waist|height|weight)\b/)) return reply("size-guide");
  if (has(/\b(categories|departments)\b/)) return reply("categories");
  if (/^(hi|hello|hey|salam|assalamualaikum)( there| assistant)?$/.test(text)) return reply("greeting");

  // Personal color advice must not turn skin descriptions into catalog filters.
  if (has(/\b(skin tone|complexion|(?:dark|black|brown|fair|light) skin|(?:will|would|does) (?:it|this|that) suit me|look good on me)\b/) || /رنگت|جلد کا رنگ|skin ka rang|rangat/.test(input.toLowerCase())) return reply("styling");

  const kind = KINDS.find(kind => has(new RegExp(`\\b${kind}\\b`)));
  const category = has(/\bwomen\b/) ? "women" : has(/\bmen\b/) ? "men" : undefined;
  const color = COLORS.find(color => has(new RegExp(`\\b${color}\\b`)));
  const size = has(/\b(extra small|xs)\b/) ? "XS" : has(/\b(extra extra large|xxl|2xl)\b/) ? "XXL" : has(/\b(extra large|xl)\b/) ? "XL" : has(/\b(medium|m)\b/) ? "M" : has(/\b(small|s)\b/) ? "S" : has(/\b(large|l)\b/) ? "L" : undefined;
  const matchesJeans = has(/\b(goes with|go with|match|matching|pair with|style with)\b/) && has(/\bblack jeans\b/);
  const related = has(/\b(goes with|go with|pair with|matching pieces|related products|related items)\b/);
  const style = matchesJeans ? "black-jeans" : related ? "related" : STYLES.find(style => style !== "black-jeans" && style !== "related" && has(new RegExp(`\\b${style}\\b`)));
  const amount = "(?:\\$\\s*|(?:usd|pkr)\\s*)?(\\d+(?:\\.\\d{1,2})?)";
  const max = text.match(new RegExp(`\\b(under|below|less than|up to|at most|budget(?: of)?)\\s*${amount}`));
  const min = text.match(new RegExp(`\\b(?:over|above|at least|minimum(?: of)?)\\s*${amount}`));
  const range = text.match(new RegExp(`\\bbetween\\s*${amount}\\s*(?:and|to|-)\\s*${amount}`));
  const hasCurrency = has(/\b(pkr|usd)\b/) || text.includes("$");
  const shopping = !!(kind || category || color || size || style || max || min || range || hasCurrency || has(/\b(show|find|looking|need|want|have|clothes|clothing|recommend|available|cheap|oversized)\b/));
  if (!shopping) return reply("unknown");
  // A new explicit product request resets old constraints; follow-ups retain them.
  const fresh = (kind || category) && has(/\b(show|find|need|want|looking)\b/) && !has(/\b(only|same|instead|also)\b/);
  if (fresh) for (const key of Object.keys(context)) delete context[key as keyof SearchContext];
  if (category) { context.category = category; if (!kind) { delete context.kind; delete context.query; } }
  if (kind) { context.kind = kind; delete context.query; delete context.style; }
  if (color) context.color = color;
  if (size) context.size = size;
  if (has(/\b(pkr)\b/)) context.currency = "PKR";
  else if (has(/\busd\b/) || text.includes("$")) context.currency = "USD";
  if (range) { context.minPrice = Number(range[1]); context.maxPrice = Number(range[2]); context.maxExclusive = false; }
  else {
    if (max) { context.maxPrice = Number(max[2]); context.maxExclusive = /under|below|less/.test(max[1]); }
    if (min) context.minPrice = Number(min[1]);
  }
  if (style) {
    context.style = style; delete context.query;
    if ((!kind && style !== "related") || matchesJeans) delete context.kind;
    if (matchesJeans || style === "related") delete context.color;
  }
  if (has(/\boversized\b/)) context.query = "oversized";
  else if (!kind && !style && !category && !size && !color && !max && !min && !range && !hasCurrency) {
    const stop = /^(show|me|please|find|do|you|have|a|an|the|some|any|i|need|want|looking|for|clothes|clothing|available|recommend|something|can|your|products|hai|hain|mujhe|mujhay|kya|ka|ki|ke|chahiye)$/;
    const tokens = text.split(" ").filter(token => !stop.test(token) && /^[a-z][a-z0-9-]{2,19}$/.test(token)).slice(0, 3);
    if (tokens.length) context.query = tokens.join(" ");
    else if (!Object.keys(context).length && !has(/\b(clothes|clothing|products|something)\b/)) return reply("unknown");
  } else if (kind) {
    const qualifier = ["cashmere", "linen", "oxford", "essential", "heavyweight", "silk", "wool"].find(word => has(new RegExp(`\\b${word}\\b`)));
    if (qualifier) context.query = qualifier;
  }
  return reply("search");
}

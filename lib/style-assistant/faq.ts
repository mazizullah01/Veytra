import { QUICK_REPLIES, WELCOME, type AssistantReply, type ClassifiedMessage } from "./types";

/** Verified against app/about/page.tsx, app/page.tsx, lib/store.tsx,
 * CheckoutView.tsx and stripe-server.ts. No invented refund/delivery guarantees. */
const FAQ = {
  shipping: "Checkout lists free shipping at $75 or more and $9.95 below that. The site advertises worldwide shipping and dispatch within 24 hours; an arrival date or country-specific delivery window is not published.",
  returns: "The site advertises free returns within 30 days. Detailed eligibility rules, refund timing and a working online return-request process are not published. The contact form is marked as a demo and does not send requests.",
  exchange: "The homepage says there is no minimum on exchanges. A complete exchange policy, conditions and processing times are not published, so I can’t confirm those details.",
  payments: "Checkout uses Stripe’s hosted payment page. This build supports Stripe Sandbox payments only. Cash on delivery, PayPal and other payment methods are not implemented here.",
  "size-guide": "The catalog lists size labels, but no garment measurement chart is published. Tell me the product name and your chest/waist measurements in cm so we can identify what needs checking. I can show listed sizes, but can’t reliably choose a label or guarantee fit without that product’s measurement chart.",
  fit: "Regular usually describes a closer, conventional cut; oversized describes an intentionally roomier silhouette. These are general terms, not measurements. Check the actual product description and dimensions; a larger size is not automatically the same as an oversized cut.",
  categories: "You can browse the Men and Women collections. Product categories and size choices are shown on their listings; use the shop links below for the current catalog.",
};
const TRANSLATIONS = {
  ur: {
    shipping: "چیک آؤٹ کے مطابق 75 USD یا زیادہ پر شپنگ مفت ہے، اس سے کم پر 9.95 USD۔ ویب سائٹ دنیا بھر میں شپنگ اور 24 گھنٹوں میں روانگی کا ذکر کرتی ہے۔ پہنچنے کی تاریخ یا ہر ملک کے لیے مدت شائع نہیں کی گئی۔",
    returns: "ویب سائٹ 30 دنوں کے اندر مفت واپسی کا ذکر کرتی ہے۔ اہلیت، رقم واپس ملنے کی مدت اور آن لائن واپسی کے طریقے کی مکمل تفصیل موجود نہیں۔ رابطے کا فارم ڈیمو ہے اور درخواست نہیں بھیجتا۔",
    exchange: "ہوم پیج کے مطابق ایکسچینج کے لیے کم از کم خریداری کی شرط نہیں۔ مکمل شرائط اور کارروائی کا وقت شائع نہیں کیا گیا، اس لیے میں ان کی تصدیق نہیں کر سکتا۔",
    payments: "چیک آؤٹ Stripe کے ادائیگی صفحے پر جاتا ہے۔ یہ ورژن صرف Sandbox ٹیسٹ ادائیگیاں قبول کرتا ہے۔ کیش آن ڈیلیوری، PayPal یا دوسرے طریقے موجود نہیں۔",
    "size-guide": "کیٹلاگ میں سائز کے نام ہیں، مگر لباس کی پیمائش کا چارٹ نہیں۔ پروڈکٹ کا نام اور سینے یا کمر کی پیمائش سینٹی میٹر میں بتائیں تاکہ معلوم ہو کیا چیک کرنا ہے۔ متعلقہ چارٹ کے بغیر میں درست فِٹ یا کسی سائز کی ضمانت نہیں دے سکتا۔",
    fit: "ریگولر عموماً عام اور نسبتاً قریب فِٹ جبکہ اوورسائزڈ جان بوجھ کر کشادہ کٹ ہوتا ہے۔ یہ عمومی اصطلاحات ہیں، اصل پیمائش نہیں۔ بڑا سائز لینا لازماً اوورسائزڈ کٹ کے برابر نہیں۔ پروڈکٹ کی تفصیل اور پیمائش چیک کریں۔",
    categories: "آپ مردوں اور خواتین کی کلیکشن دیکھ سکتے ہیں۔ موجودہ پروڈکٹس، ان کی اقسام اور درج سائز دیکھنے کے لیے نیچے دکان کے لنکس استعمال کریں۔",
  },
  roman: {
    shipping: "Checkout par $75 ya zyada ki shopping par shipping free hai; is se kam par $9.95 hai. Website worldwide shipping aur 24 ghanton mein dispatch batati hai. Delivery ki tareekh ya har mulk ka waqt publish nahi kiya gaya.",
    returns: "Website 30 din ke andar free returns batati hai. Eligibility, refund ka waqt aur online return request ka mukammal tareeqa publish nahi hai. Contact form demo hai aur request send nahi karta.",
    exchange: "Homepage ke mutabiq exchanges par minimum purchase nahi hai. Mukammal sharaait aur processing ka waqt publish nahi kiya gaya, is liye main inki tasdeeq nahi kar sakta.",
    payments: "Checkout Stripe ke payment page par jata hai. Yeh build sirf Sandbox test payments support karta hai. Cash on delivery, PayPal aur dusre tareeqay implement nahi hain.",
    "size-guide": "Catalog mein size labels hain magar garment measurement chart nahi hai. Product ka naam aur chest/waist ki measurements cm mein bata dein taake maloom ho kya check karna hai. Product chart ke baghair main exact fit ya size ki guarantee nahi de sakta.",
    fit: "Regular aam tor par conventional aur qareeb fit hota hai; oversized jaan boojh kar khula cut hota hai. Yeh aam istilahaat hain, actual measurements nahi. Bara size lena hamesha oversized cut jaisa nahi hota. Product ki tafseel aur measurements check karein.",
    categories: "Aap Men aur Women collections dekh sakte hain. Maujooda products, categories aur listed sizes ke liye neeche shop links istemal karein.",
  },
};
export function faqReply(message: ClassifiedMessage): AssistantReply | null {
  const { intent, context, language } = message;
  if (intent === "greeting" || intent === "reset") return { text: language === "ur" ? "السلام علیکم! میں ویٹرا اسٹائل اسسٹنٹ ہوں۔ آپ کو کس قسم کے کپڑے چاہییں؟ قیمتیں امریکی ڈالر میں ہیں۔" : language === "roman" ? "Salam! Main Veytra Style Assistant hoon. Aap ko kis qisam ke kapray chahiye? Qeematein USD mein hain." : WELCOME,
    context, quickReplies: QUICK_REPLIES };
  if (intent === "styling") return {
    text: language === "ur" ? "آپ کی رنگت کسی لباس کے رنگ کو محدود نہیں کرتی۔ ہلکے اور گہرے دونوں رنگ اچھے لگ سکتے ہیں؛ اپنی پسند اور مطلوبہ کنٹراسٹ کو اہمیت دیں۔ آپ کس شرٹ یا رنگ کے بارے میں پوچھ رہے ہیں؟" : language === "roman" ? "Aap ki rangat kapron ke rang ko limit nahi karti. Halke aur gehre dono rang achhe lag sakte hain; apni pasand aur contrast ko ahmiyat dein. Aap kis shirt ya rang ke bare mein pooch rahe hain?" : "It can suit you—your skin tone doesn’t rule out any clothing color. Light and dark colors can both work; your preference and the contrast you like matter. Which shirt or color are you considering?",
    context, quickReplies: ["Show me white T-shirts", "Show me olive T-shirts", "Show me men's shirts"],
  };
  if (intent === "unknown") return {
    text: language === "ur" ? "میں کپڑوں، سائز، شپنگ اور آپ کے آرڈر میں مدد کر سکتا ہوں۔ مثال: مردوں کی شرٹس، گرمیوں کے کپڑے، یا 50 امریکی ڈالر سے کم قیمت کے کپڑے۔" : language === "roman" ? "Main kapron, sizes, shipping aur aap ke orders mein madad kar sakta hoon. Misal: mardon ki shirts dikhao, garmi ke kapray, ya under $50." : "I can help with clothing, listed sizes, store policies and your orders. Try “men’s shirts”, “summer outfits”, “medium T-shirts” or “under $50”.",
    context, quickReplies: QUICK_REPLIES,
  };
  if (!(intent in FAQ)) return null;
  const key = intent as keyof typeof FAQ;
  return { text: language === "en" ? FAQ[key] : TRANSLATIONS[language][key], context,
    links: intent === "categories" ? [{ label: "Shop Men", href: "/men" }, { label: "Shop Women", href: "/women" }] :
      intent === "payments" ? [{ label: "Review checkout", href: "/checkout" }] :
      intent === "size-guide" || intent === "fit" ? [{ label: "Browse products", href: "/men" }, { label: "Shop Women", href: "/women" }] :
      [{ label: "Published store information", href: "/about" }],
    quickReplies: ["Show me T-shirts", "Show me women's clothing", "Track my order"],
  };
}

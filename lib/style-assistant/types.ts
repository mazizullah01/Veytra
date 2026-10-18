export const KINDS = ["tshirt", "shirt", "trousers", "dress", "jacket", "coat", "sweater", "blazer", "jeans"] as const;
export const COLORS = ["black", "white", "blue", "green", "red", "pink", "beige", "olive", "sand", "stone", "brown", "grey", "navy"] as const;
export const STYLES = ["summer", "casual", "formal", "black-jeans", "related"] as const;
export type Language = "en" | "ur" | "roman";
export interface SearchContext {
  category?: "men" | "women";
  kind?: (typeof KINDS)[number];
  color?: (typeof COLORS)[number];
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  maxExclusive?: boolean;
  currency?: "USD" | "PKR";
  style?: (typeof STYLES)[number];
  query?: string;
}
export type Intent = "search" | "styling" | "order" | "shipping" | "returns" | "exchange" | "payments" | "size-guide" | "fit" | "categories" | "greeting" | "reset" | "unknown";
export interface ClassifiedMessage { intent: Intent; context: SearchContext; language: Language; orderId?: string }
export interface ProductSuggestion {
  id: string; name: string; price: number; image: string; sizes: string[];
}
export interface AssistantReply {
  text: string;
  context: SearchContext;
  products?: ProductSuggestion[];
  links?: { label: string; href: string }[];
  quickReplies?: string[];
  /** Order replies exist in memory only and are cleared on authentication changes. */
  private?: boolean;
}
export interface ChatMessage { id: string; role: "user" | "assistant"; timestamp: number; text: string; reply?: AssistantReply }

export const QUICK_REPLIES = ["Suggest an outfit", "Color combinations", "Help with sizing", "Casual looks", "Wedding styling"];
export const WELCOME = "Hi, I’m your Veytra AI Fashion Stylist. Ask me about outfits, colors, sizing or wedding looks—in English, اردو or Roman Urdu. I can also suggest real Veytra pieces. What are you dressing for?";

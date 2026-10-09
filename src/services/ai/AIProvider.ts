import { GEMINI_API_KEY } from '../../config/constants.js';
import { AssistantProductSummary } from '../../tools/productSearch.tool.js';
import { AssistantShopSummary } from '../../tools/shopSearch.tool.js';
import { AvailabilityResult } from '../../tools/availability.tool.js';

export interface ExtractedFilters {
  query?: string;
  category?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  mallName?: string;
  occasion?: string;
  inStockOnly?: boolean;
  productId?: string;
}

export type AssistantIntent =
  | 'search_products'
  | 'search_shops'
  | 'check_availability'
  | 'reservation_inquiry'
  | 'recommendations'
  | 'mirror_help'
  | 'general_help';

export interface IntentExtractionResult {
  intent: AssistantIntent;
  filters: ExtractedFilters;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  userLocation?: {
    city?: string;
    lat?: number;
    lng?: number;
  };
  currentProductId?: string;
  activeFilters?: ExtractedFilters;
}

export class AIProvider {
  /**
   * Rule-based & pattern extraction of intent and structured filters from user query
   */
  extractIntent(
    message: string,
    history: ChatMessage[] = [],
    context?: ChatContext
  ): IntentExtractionResult {
    const text = message.toLowerCase().trim();
    const prevFilters = context?.activeFilters || {};
    const filters: ExtractedFilters = { ...prevFilters };

    // 1. Detect Intent
    let intent: AssistantIntent = 'search_products';

    if (
      text.includes('shop') ||
      text.includes('boutique') ||
      text.includes('store') ||
      text.includes('mall') ||
      text.includes('where to buy') ||
      text.includes('near me') ||
      text.includes('which shop') ||
      text.includes('which store')
    ) {
      if (text.includes('product') || text.includes('saree') || text.includes('mekhela') || text.includes('dress')) {
        intent = 'search_products';
      } else {
        intent = 'search_shops';
      }
    }

    if (
      text.includes('available') ||
      text.includes('in stock') ||
      text.includes('left in store') ||
      text.includes('stock status')
    ) {
      intent = 'check_availability';
    }

    if (
      text.includes('reserve') ||
      text.includes('hold for 48') ||
      text.includes('48h') ||
      text.includes('hold item') ||
      text.includes('booking')
    ) {
      intent = 'reservation_inquiry';
    }

    if (
      text.includes('mirror') ||
      text.includes('try on') ||
      text.includes('virtual try') ||
      text.includes('fit')
    ) {
      if (!text.includes('show') && !text.includes('find') && !text.includes('search')) {
        intent = 'mirror_help';
      }
    }

    if (
      text.includes('recommend') ||
      text.includes('similar') ||
      text.includes('suggest') ||
      text.includes('like this')
    ) {
      intent = 'recommendations';
    }

    // 2. Extract Price Constraints (under 5000, below ₹3000, max 6000, 4k, etc.)
    const underMatch = text.match(/(?:under|below|less than|up to|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?/i);
    if (underMatch) {
      let val = Number(underMatch[1]);
      if (underMatch[0].toLowerCase().includes('k')) val *= 1000;
      filters.maxPrice = val;
    }

    const aboveMatch = text.match(/(?:above|more than|min(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?/i);
    if (aboveMatch) {
      let val = Number(aboveMatch[1]);
      if (aboveMatch[0].toLowerCase().includes('k')) val *= 1000;
      filters.minPrice = val;
    }

    const rangeMatch = text.match(/between\s*(?:rs\.?|inr|₹)?\s*(\d+)\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    if (rangeMatch) {
      filters.minPrice = Number(rangeMatch[1]);
      filters.maxPrice = Number(rangeMatch[2]);
    }

    // 3. Extract City
    const knownCities = [
      'guwahati',
      'silchar',
      'kolkata',
      'delhi',
      'jaipur',
      'mumbai',
      'bengaluru',
      'bangalore',
      'chennai',
      'varanasi',
    ];
    for (const c of knownCities) {
      if (text.includes(c)) {
        filters.city = c === 'bangalore' ? 'Bengaluru' : c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }
    // Fallback to context city if none specified in prompt
    if (!filters.city && context?.userLocation?.city) {
      filters.city = context.userLocation.city;
    }

    // 4. Extract Mall Names
    const knownMalls = [
      'city center',
      'goldighi',
      'south city',
      'omaxe chowk',
      'pink city arcade',
      'phoenix palladium',
      'phoenix marketcity',
      'central point',
      'fancy bazar',
    ];
    for (const m of knownMalls) {
      if (text.includes(m)) {
        filters.mallName = m;
        break;
      }
    }

    // 5. Extract Category
    if (text.includes('mekhela') || text.includes('chador')) {
      filters.category = 'mekhela-chador';
    } else if (text.includes('saree') || text.includes('sari')) {
      filters.category = 'sarees';
    } else if (text.includes('lehenga') || text.includes('ghagra')) {
      filters.category = 'lehenga-ghagra';
    } else if (text.includes('salwar') || text.includes('anarkali') || text.includes('suit') || text.includes('sharara')) {
      filters.category = 'salwar-suits';
    } else if (text.includes('wedding') || text.includes('bridal') || text.includes('dulhan')) {
      filters.category = 'wedding-wear';
      filters.occasion = 'wedding';
    } else if (text.includes('bihu') || text.includes('puja') || text.includes('diwali') || text.includes('festival')) {
      filters.category = 'festival-wear';
      filters.occasion = 'festival';
    } else if (text.includes('dress') || text.includes('gown')) {
      filters.category = 'ethnic-dresses';
    } else if (text.includes('handloom')) {
      filters.category = 'handloom-wear';
    }

    // 6. Extract Material
    const materials = [
      'muga silk',
      'muga',
      'paat silk',
      'paat',
      'eri silk',
      'eri',
      'katan silk',
      'katan',
      'banarasi',
      'kanchipuram',
      'kanchi',
      'tussar',
      'georgette',
      'jamdani',
      'chanderi',
      'baluchari',
      'patola',
    ];
    for (const mat of materials) {
      if (text.includes(mat)) {
        filters.material = mat;
        break;
      }
    }

    // 7. Extract Color
    const colors = ['red', 'crimson', 'yellow', 'golden', 'gold', 'blue', 'royal blue', 'green', 'pink', 'white', 'black', 'maroon', 'orange', 'purple'];
    for (const col of colors) {
      if (text.includes(col)) {
        filters.color = col;
        break;
      }
    }

    // 8. General search query cleanup
    let cleanQuery = text
      .replace(/[?!.,;:]/g, '')
      .replace(/(?:under|below|less than|up to|above|more than|between)\s*(?:rs\.?|inr|₹)?\s*\d+(?:k)?(?:\s*(?:and|to|-)\s*\d+)?/gi, '')
      .replace(/(?:find|show|give|search|look for|recommend|i want|i need|can you show me|can i get|where can i find|which shop has|where is|which shops)\s*/gi, '')
      .replace(/(?:near me|in guwahati|in silchar|in kolkata|in delhi|in mumbai|in bengaluru|in jaipur|in chennai|in varanasi)/gi, '')
      .replace(/\b(?:me|please|show|find|outfits|outfit|traditional|clothes|clothing|wear|only|just|filter|ones|some|in store|available|which|where|what|shops|shop|stores|store|boutiques|boutique|have|has|are|is)\b/gi, '')
      .trim();

    // If category was already extracted, remove category keywords (including plurals) from residual query
    if (filters.category) {
      cleanQuery = cleanQuery.replace(/\b(?:mekhela|mekhelas|chador|chadors|saree|sarees|sari|saris|lehenga|lehengas|ghagra|ghagras|salwar|salwars|anarkali|anarkalis|suit|suits|dress|dresses|gown|gowns|wedding|bridal|festival|festivals)\b/gi, '').trim();
    }
    // If material was already extracted, remove material keywords from residual query
    if (filters.material) {
      cleanQuery = cleanQuery.replace(/\b(?:muga|paat|eri|kesha|katan|banarasi|kanchipuram|silk|silks|cotton|cottons|georgette)\b/gi, '').trim();
    }
    // If color was already extracted, remove color keywords from residual query
    if (filters.color) {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${filters.color}s?\\b`, 'gi'), '').trim();
    }

    if (cleanQuery.length > 2) {
      filters.query = cleanQuery;
    } else {
      delete filters.query;
    }

    return { intent, filters };
  }

  /**
   * Generate an anti-hallucinated natural language reply strictly using tool data
   */
  async generateResponse(params: {
    message: string;
    intent: AssistantIntent;
    filters: ExtractedFilters;
    products?: AssistantProductSummary[];
    shops?: AssistantShopSummary[];
    availability?: AvailabilityResult;
    history?: ChatMessage[];
  }): Promise<string> {
    const { message, intent, filters, products, shops, availability, history = [] } = params;

    // 1. If Gemini API Key is available, invoke Gemini 2.5 Flash with strict grounding
    if (GEMINI_API_KEY) {
      try {
        const geminiReply = await this.callGeminiModel({
          userPrompt: message,
          intent,
          filters,
          products: products || [],
          shops: shops || [],
          availability,
          history,
        });

        if (geminiReply && geminiReply.trim()) {
          return geminiReply.trim();
        }
      } catch (err) {
        console.warn('[AIProvider] Gemini API call fallback to deterministic local synthesizer:', err);
      }
    }

    // 2. Deterministic, 100% truthful fallback synthesizer (Strict Anti-Hallucination)
    return this.deterministicSynthesizer({
      message,
      intent,
      filters,
      products: products || [],
      shops: shops || [],
      availability,
    });
  }

  /**
   * Grounded Gemini generation with strict anti-hallucination prompt
   */
  private async callGeminiModel(args: {
    userPrompt: string;
    intent: string;
    filters: ExtractedFilters;
    products: AssistantProductSummary[];
    shops: AssistantShopSummary[];
    availability?: AvailabilityResult;
    history: ChatMessage[];
  }): Promise<string> {
    const systemPrompt = `You are Vastrix's AI Shopping Assistant for authentic Indian handlooms, traditional weaves, and local boutiques.
CRITICAL ANTI-HALLUCINATION RULES:
1. You must ONLY state product names, prices, shops, stock quantities, and physical addresses that are explicitly listed in the DATA RESULTS below.
2. If the DATA RESULTS are empty, explicitly tell the user: "I couldn't find a matching product in Vastrix's inventory right now." and suggest broader filters (e.g. higher budget, another city, or related categories).
3. DO NOT invent fake products, discounts, prices, or store locations under any circumstance.
4. Vastrix is an OFFLINE physical purchase model: customers can place a 100% free 48-hour hold to visit the boutique physically and inspect garments in person. Never ask for online payments or checkout.
5. Highlight that customers can click "✨ Try with Mirror" on any product card to see themselves virtually draped in the garment before visiting.
6. Keep answers concise, welcoming, stylish, and polite (under 3 paragraphs). Format with clean Markdown.`;

    const dataPayload = {
      userQuery: args.userPrompt,
      detectedIntent: args.intent,
      appliedFilters: args.filters,
      matchedProductsCount: args.products.length,
      products: args.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: `₹${p.discountedPrice.toLocaleString('en-IN')}`,
        originalPrice: `₹${p.price.toLocaleString('en-IN')}`,
        material: p.material,
        color: p.color,
        availableUnits: p.availableQuantity,
        shopName: p.shop.name,
        city: p.shop.city,
        mall: p.shop.mallName || 'High Street',
        floor: p.shop.floorName || 'Ground Floor',
        shopNumber: p.shop.shopNumber || '',
      })),
      matchedShops: args.shops.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        mall: s.mallName || '',
        floor: s.floorName || '',
        address: s.address,
        rating: s.rating,
        openingHours: s.openingHours,
      })),
      availability: args.availability
        ? {
            found: args.availability.found,
            productName: args.availability.product?.name,
            availableUnits: args.availability.product?.availableQuantity,
            shopName: args.availability.product?.shop?.name,
            directions: args.availability.product?.shop?.indoorDirections,
            policyNotice: args.availability.policyNotice,
          }
        : null,
    };

    const promptText = `${systemPrompt}\n\n### DATA RESULTS FROM VASTRIX BACKEND:\n${JSON.stringify(
      dataPayload,
      null,
      2
    )}\n\n### USER QUERY:\n"${args.userPrompt}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature prevents hallucinations
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const json: any = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Deterministic truthful synthesizer used when offline or without external API
   */
  private deterministicSynthesizer(args: {
    message: string;
    intent: AssistantIntent;
    filters: ExtractedFilters;
    products: AssistantProductSummary[];
    shops: AssistantShopSummary[];
    availability?: AvailabilityResult;
  }): string {
    const { intent, filters, products, shops, availability } = args;

    // 1. Availability Inquiry
    if (intent === 'check_availability' && availability) {
      if (!availability.found || !availability.product) {
        return `I searched Vastrix inventory, but couldn't locate this specific item. Please check the spelling or browse our catalog in the Explore tab.`;
      }
      const prod = availability.product;
      const count = prod.availableQuantity;
      if (count > 0) {
        return `**${prod.name}** is currently in stock! **${count} piece${
          count > 1 ? 's' : ''
        }** available at **${prod.shop.name}** in ${prod.shop.city}.\n\n📍 **Location:** ${
          prod.shop.mallName ? `${prod.shop.mallName}, ` : ''
        }${prod.shop.floorName ? `${prod.shop.floorName}, ` : ''}${prod.shop.shopNumber || ''}\n\n🎟️ You can place a **free 48-hour hold** to inspect it in person. No online payment required!`;
      } else {
        return `**${prod.name}** is currently out of stock at **${prod.shop.name}**. Would you like me to find similar traditional outfits nearby?`;
      }
    }

    // 2. Reservation Inquiry
    if (intent === 'reservation_inquiry') {
      return `On Vastrix, you can place a **100% free 48-hour hold** on any in-stock outfit. You'll receive a unique in-store reservation code, allowing you to physically visit the boutique, try it on, and inspect the weave in person before deciding to purchase! Zero upfront payment.`;
    }

    // 3. Mirror Help
    if (intent === 'mirror_help') {
      return `Vastrix's **🪞 Mirror** is an AI Virtual Try-On engine powered by FASHN VTON 1.5. Simply select any outfit, click **✨ Try with Mirror**, and upload a photo of yourself. Mirror will contour and drape the garment directly onto your portrait!`;
    }

    // 4. Shop Search
    if (intent === 'search_shops') {
      if (shops.length === 0) {
        return `I couldn't find any approved boutiques matching "${
          filters.city || filters.query || 'your search'
        }" in Vastrix right now. We currently feature artisan weavers across Guwahati, Silchar, Kolkata, Varanasi, Delhi, Jaipur, Mumbai, and Bengaluru!`;
      }

      const shopList = shops
        .map(
          (s) =>
            `- **${s.name}** (${s.city}${s.mallName ? ` • ${s.mallName}` : ''}) — ⭐ ${s.rating} (${s.productCount} outfits in stock)`
        )
        .join('\n');

      return `Here are top traditional clothing boutiques available on Vastrix:\n\n${shopList}\n\nClick on any shop to explore their in-store collection or get indoor floor directions!`;
    }

    // 5. Product Search & Recommendations
    if (products.length === 0) {
      let filterDesc = [];
      if (filters.category) filterDesc.push(`category "${filters.category}"`);
      if (filters.maxPrice) filterDesc.push(`under ₹${filters.maxPrice.toLocaleString('en-IN')}`);
      if (filters.city) filterDesc.push(`in ${filters.city}`);
      if (filters.color) filterDesc.push(`in ${filters.color}`);
      if (filters.material) filterDesc.push(`crafted with ${filters.material}`);

      return `I couldn't find a matching product in Vastrix's catalog ${
        filterDesc.length > 0 ? `for ${filterDesc.join(', ')}` : ''
      }.\n\nYou could try expanding your price budget, choosing another city, or exploring related regional weaves like Assam Silk or Banarasi!`;
    }

    const cityNotice = filters.city ? ` in **${filters.city}**` : '';
    const priceNotice = filters.maxPrice ? ` under **₹${filters.maxPrice.toLocaleString('en-IN')}**` : '';

    return `I found **${products.length} authentic traditional outfit${
      products.length > 1 ? 's' : ''
    }**${cityNotice}${priceNotice} available in store.\n\nYou can click **✨ Mirror** to see how it looks on you, or **🎟️ Reserve** to hold it free for 48 hours and inspect the craftsmanship in person!`;
  }
}

export const aiProvider = new AIProvider();
export default aiProvider;

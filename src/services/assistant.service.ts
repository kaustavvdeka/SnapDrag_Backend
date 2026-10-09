import { aiProvider, ChatMessage, ChatContext, ExtractedFilters, AssistantIntent } from './ai/AIProvider.js';
import { searchProducts, AssistantProductSummary } from '../tools/productSearch.tool.js';
import { searchShops, AssistantShopSummary } from '../tools/shopSearch.tool.js';
import { checkAvailability, AvailabilityResult } from '../tools/availability.tool.js';
import { getRecommendations } from '../tools/recommendation.tool.js';

export interface AssistantChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  context?: ChatContext;
}

export interface AssistantChatResponse {
  reply: string;
  products: AssistantProductSummary[];
  shops: AssistantShopSummary[];
  availability?: AvailabilityResult;
  intent: AssistantIntent;
  activeFilters: ExtractedFilters;
  suggestedQuickActions: string[];
}

export class AssistantService {
  async processChat(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const { message, conversationHistory = [], context = {} } = request;

    if (!message || !message.trim()) {
      return {
        reply: 'Hello! I am your Vastrix Traditional Fashion Assistant. How can I help you discover handlooms, boutiques, or virtual try-ons today?',
        products: [],
        shops: [],
        intent: 'general_help',
        activeFilters: {},
        suggestedQuickActions: [
          'Show Muga Mekhela Chador',
          'Traditional outfits under ₹5000',
          'Boutiques in Guwahati',
          'Wedding Banarasi Sarees',
        ],
      };
    }

    // 1. Extract intent & structured filters (preserving previous filters)
    const { intent, filters } = aiProvider.extractIntent(
      message,
      conversationHistory,
      context
    );

    let products: AssistantProductSummary[] = [];
    let shops: AssistantShopSummary[] = [];
    let availability: AvailabilityResult | undefined;

    // 2. Dispatch to dedicated Vastrix database tools
    if (intent === 'search_shops') {
      shops = await searchShops({
        query: filters.query,
        city: filters.city,
        mallName: filters.mallName,
        limit: 5,
      });
    } else if (intent === 'check_availability') {
      availability = await checkAvailability({
        productId: filters.productId || context.currentProductId,
        query: filters.query,
      });
      if (availability.product) {
        // Also fetch 2 similar alternatives
        products = await getRecommendations({
          productId: availability.product.id,
          city: filters.city,
          limit: 2,
        });
      }
    } else if (intent === 'recommendations') {
      products = await getRecommendations({
        productId: filters.productId || context.currentProductId,
        category: filters.category,
        occasion: filters.occasion,
        city: filters.city,
        maxPrice: filters.maxPrice,
        limit: 4,
      });
    } else {
      // Default & search_products
      products = await searchProducts({
        query: filters.query,
        category: filters.category,
        material: filters.material,
        color: filters.color,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        city: filters.city,
        mallName: filters.mallName,
        inStockOnly: true,
        limit: 5,
      });

      // If no products found in specific city, check broader catalog
      if (products.length === 0 && filters.city) {
        const broaderProducts = await searchProducts({
          query: filters.query,
          category: filters.category,
          material: filters.material,
          color: filters.color,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          inStockOnly: true,
          limit: 4,
        });
        if (broaderProducts.length > 0) {
          products = broaderProducts;
        }
      }
    }

    // 3. Synthesize natural language reply (Gemini or deterministic anti-hallucination fallback)
    const reply = await aiProvider.generateResponse({
      message,
      intent,
      filters,
      products,
      shops,
      availability,
      history: conversationHistory,
    });

    // 4. Generate dynamic context-relevant quick actions
    const suggestedQuickActions = this.generateQuickActions(intent, filters, products.length);

    return {
      reply,
      products,
      shops,
      availability,
      intent,
      activeFilters: filters,
      suggestedQuickActions,
    };
  }

  private generateQuickActions(
    intent: AssistantIntent,
    filters: ExtractedFilters,
    matchedCount: number
  ): string[] {
    const actions: string[] = [];

    if (matchedCount > 0) {
      if (!filters.maxPrice || filters.maxPrice > 4000) {
        actions.push('Under ₹4000');
      }
      if (!filters.city) {
        actions.push('Available in Guwahati');
      }
      actions.push('Try an outfit with Mirror');
      actions.push('How do I reserve for 48h?');
    } else {
      actions.push('Muga Mekhela Chador');
      actions.push('Traditional wear under ₹5000');
      actions.push('Find boutiques near me');
      actions.push('Wedding Bridal Couture');
    }

    return actions.slice(0, 4);
  }
}

export const assistantService = new AssistantService();
export default assistantService;

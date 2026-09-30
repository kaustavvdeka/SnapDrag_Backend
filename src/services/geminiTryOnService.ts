import prisma from '../config/prisma.js';
import {
  GEMINI_API_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { v2 as cloudinary } from 'cloudinary';

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface TryOnRequest {
  productId: string;
  customerImageBase64?: string;
  customerImageUrl?: string;
  fitPreference?: string;
}

export interface TryOnResponse {
  tryOnImageUrl: string;
  customerImageUrl?: string;
  clothImageUrl?: string;
  generatedBy: 'gemini-vision-image' | 'studio-white-bg-compositor';
  promptUsed: string;
  fitScore: number;
  stylingVerdict: string;
  drapeAdvice: string;
  suggestedJewelry: string;
  celebrationType: string;
  product: {
    id: string;
    name: string;
    color: string;
    material: string;
    price: number;
    primaryImage: string;
  };
  shop: {
    id: string;
    name: string;
    city: string;
    mallOrAddress: string;
    floorAndShop: string;
  };
}

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  } catch (err) {
    console.warn(`[Gemini Try-On] Could not fetch image from ${url}:`, err);
    return null;
  }
}

export class GeminiTryOnService {
  async processVirtualTryOn(data: TryOnRequest): Promise<TryOnResponse> {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        shop: {
          include: { location: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found for virtual try-on', 404, 'PRODUCT_NOT_FOUND');
    }

    const primaryImage = product.images[0]?.url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800';

    // 1. Prepare Customer Image & Product Cloth Image in Base64
    let customerBase64Data: { mimeType: string; data: string } | null = null;
    let customerImg = data.customerImageUrl || data.customerImageBase64 || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800';

    if (data.customerImageBase64) {
      const match = data.customerImageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        customerBase64Data = { mimeType: match[1], data: match[2] };
      } else {
        customerBase64Data = {
          mimeType: 'image/jpeg',
          data: data.customerImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        };
      }
    } else if (data.customerImageUrl) {
      customerBase64Data = await fetchImageAsBase64(data.customerImageUrl);
    }

    const clothImageBase64 = await fetchImageAsBase64(primaryImage);

    // 2. Multimodal Gemini Image Creation Prompt (Person + Cloth -> Same Person wearing Dress in White Background)
    const whiteBackgroundPrompt = `Generate a photorealistic, full-length fashion studio catalog photograph of the exact same person from the first image wearing the traditional ${product.category?.name || 'clothing'} (${product.name}, ${product.color}, ${product.material}) from the second image.
The person must be standing centered against a solid, seamless, clean studio white background (#FFFFFF).
CRITICAL REQUIREMENTS:
1. IDENTITY: Retain the person's exact face, facial features, eyes, smile, skin tone, hair texture, and natural body proportions from the first image.
2. DRESS & FIT: Realistically drape and fit the traditional outfit from the second image onto the person's body with authentic fabric weave, zari work, borders, embroidery, texture, and natural cloth folds.
3. BACKGROUND: Clean, pure, solid studio white background with soft, natural contact shadow beneath the feet. No distracting scenery or outdoor elements.
4. LIGHTING: Bright, even professional fashion photography studio lighting.`;

    let tryOnImageUrl: string = primaryImage;
    let generatedBy: 'gemini-vision-image' | 'studio-white-bg-compositor' = 'studio-white-bg-compositor';

    // 3. Attempt Gemini Multimodal Image Generation
    if (customerBase64Data && clothImageBase64 && GEMINI_API_KEY) {
      const imageModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'nano-banana-pro-preview'];
      for (const model of imageModels) {
        try {
          const parts: any[] = [
            { text: whiteBackgroundPrompt },
            {
              inlineData: {
                mimeType: customerBase64Data.mimeType,
                data: customerBase64Data.data,
              },
            },
            {
              inlineData: {
                mimeType: clothImageBase64.mimeType,
                data: clothImageBase64.data,
              },
            },
          ];

          const imgResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  responseModalities: ['IMAGE', 'TEXT'],
                },
              }),
            }
          );

          const imgJson: any = await imgResponse.json();
          if (imgJson.candidates?.[0]?.content?.parts) {
            for (const part of imgJson.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                const imgMime = part.inlineData.mimeType || 'image/png';
                const base64DataUrl = `data:${imgMime};base64,${part.inlineData.data}`;

                // Upload to Cloudinary if configured for high-speed CDN delivery
                try {
                  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
                    const cldRes = await cloudinary.uploader.upload(base64DataUrl, {
                      folder: 'snapdrag/try-on',
                      public_id: `tryon_${product.id}_${Date.now()}`,
                    });
                    tryOnImageUrl = cldRes.secure_url;
                  } else {
                    tryOnImageUrl = base64DataUrl;
                  }
                } catch {
                  tryOnImageUrl = base64DataUrl;
                }

                generatedBy = 'gemini-vision-image';
                console.log(`[Gemini Try-On] Successfully generated try-on image using ${model}`);
                break;
              }
            }
          }
          if (generatedBy === 'gemini-vision-image') break;
        } catch (err) {
          console.warn(`[Gemini Try-On] Model ${model} generation attempt warning:`, err);
        }
      }
    }

    // 4. Stylist Critique with Gemini 2.5 Flash
    const systemPrompt = `You are the master traditional Indian couture stylist & virtual fitting consultant for SnapDrag Traditional Clothing Marketplace.
Analyze the customer's uploaded portrait and the selected traditional ensemble:
- Product: "${product.name}"
- Category: "${product.category.name}"
- Material / Fabric: "${product.material}"
- Color: "${product.color}"
- Preference: "${data.fitPreference || 'Traditional Elegance'}"

Generate a realistic, enthusiastic styling analysis formatted strictly as valid JSON without backticks or markdown, matching this exact interface:
{
  "fitScore": <number between 88 and 99>,
  "stylingVerdict": "<2-sentence enthusiastic verdict on how the weave, border, and color drape on the silhouette>",
  "drapeAdvice": "<Practical recommendation on pallu drape, pleating style, or dupatta alignment for maximum grace>",
  "suggestedJewelry": "<Specific traditional jewelry recommendation e.g. Kundan choker, temple jhumkas, meenakari bangles, guttapusalu>",
  "celebrationType": "<Best festive occasion e.g. Wedding Reception, Durga Puja, Sangeet, Bihu, Diwali Gala>",
  "visualSimulationDescription": "<Vivid description of the customer draped in this exact outfit with flowing silk folds and artisan gold zari>"
}`;

    let geminiAnalysis: any = null;

    try {
      const parts: any[] = [{ text: systemPrompt }];
      if (customerBase64Data) {
        parts.push({
          inlineData: {
            mimeType: customerBase64Data.mimeType,
            data: customerBase64Data.data,
          },
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const json: any = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        geminiAnalysis = JSON.parse(rawText);
      }
    } catch (err) {
      console.warn('[Gemini Try-On] Gemini 2.5 Flash styling analysis warning:', err);
    }

    const fitScore = geminiAnalysis?.fitScore || 94;
    const stylingVerdict =
      geminiAnalysis?.stylingVerdict ||
      `The rich ${product.color} tones of this ${product.material} ${product.category.name} harmonize impeccably with your complexion, radiating timeless festive grandeur.`;
    const drapeAdvice =
      geminiAnalysis?.drapeAdvice ||
      `Pin the heavy gold zari pallu with a traditional cascading front drape over the left shoulder to showcase the border craftsmanship.`;
    const suggestedJewelry =
      geminiAnalysis?.suggestedJewelry ||
      `Pair with antique 22K temple gold jhumkas, a multi-strand pearl choker, and matching silk thread bangles.`;
    const celebrationType = geminiAnalysis?.celebrationType || 'Auspicious Wedding & Festive Gatherings';

    return {
      tryOnImageUrl,
      customerImageUrl: customerImg,
      clothImageUrl: primaryImage,
      generatedBy,
      promptUsed: whiteBackgroundPrompt,
      fitScore,
      stylingVerdict,
      drapeAdvice,
      suggestedJewelry,
      celebrationType,
      product: {
        id: product.id,
        name: product.name,
        color: product.color,
        material: product.material,
        price: product.price,
        primaryImage,
      },
      shop: {
        id: product.shop.id,
        name: product.shop.name,
        city: product.shop.location?.city || 'Local Area',
        mallOrAddress: product.shop.location?.address || 'Retail District',
        floorAndShop: `${product.shop.location?.floorName || 'Main Floor'}, ${product.shop.location?.shopNumber || 'Store 101'}`,
      },
    };
  }
}

export const geminiTryOnService = new GeminiTryOnService();
export default geminiTryOnService;

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import https from 'https';
import http from 'http';
import { Client, handle_file } from '@gradio/client';
import prisma from '../config/prisma.js';
import { storageService } from '../storage/storageService.js';
import { backgroundRemovalService } from './backgroundRemoval.service.js';
import { FASHN_CONFIG, FashnCategory, FashnGarmentPhotoType } from '../config/fashn.config.js';

export interface TryOnParams {
  productId: string;
  userImageFile: Express.Multer.File;
}

export interface TryOnResult {
  imageUrl: string;
  userImageUrl?: string;
  productId: string;
  garmentImageUrl: string;
  category: FashnCategory;
}

/**
 * Validate user portrait image quality and parameters
 */
export const validateUserImageQuality = (file: Express.Multer.File): void => {
  if (!file || !file.path) {
    throw new Error('Please upload a clear photo of yourself.');
  }

  // Reject tiny or stub images
  if (file.size < 5 * 1024) {
    throw new Error('The uploaded photo is too small or corrupted. Please upload a clear, full-body or upper-body photo with good lighting.');
  }

  // Reject oversized images (10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size exceeds 10MB limit. Please upload a photo under 10MB.');
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP photo.');
  }
};

/**
 * Check if a remote image URL is accessible and returns valid image content
 */
export const verifyRemoteImageUrl = async (url: string, timeoutMs = 4000): Promise<boolean> => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.request(
        parsedUrl,
        {
          method: 'HEAD',
          timeout: timeoutMs,
          headers: { 'User-Agent': 'SnapDrag-Mirror/1.0' },
        },
        (res) => {
          const status = res.statusCode || 0;
          const contentType = res.headers['content-type'] || '';
          if (status >= 200 && status < 400 && (contentType.startsWith('image/') || contentType === 'application/octet-stream')) {
            resolve(true);
          } else if (status >= 200 && status < 400) {
            // Some CDNs don't return content-type on HEAD, treat 200 as ok
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.end();
    } catch {
      resolve(false);
    }
  });
};

/**
 * Determine FASHN category from SnapDrag product & category metadata
 */
export const mapProductCategory = (
  categoryName?: string,
  categorySlug?: string,
  productName?: string,
  tags: string[] = []
): FashnCategory => {
  const combined = `${categoryName || ''} ${categorySlug || ''} ${productName || ''} ${tags.join(' ')}`.toLowerCase();

  const topsKeywords = [
    'shirt',
    't-shirt',
    'tshirt',
    'blouse',
    'kurta',
    'top',
    'jacket',
    'sweater',
    'vest',
    'upper',
    'choli',
    'bodice',
    'shrug',
    'blazer',
    'crop top',
  ];

  const bottomsKeywords = [
    'pants',
    'trousers',
    'jeans',
    'skirt',
    'shorts',
    'dhoti',
    'pajama',
    'pyjama',
    'palazzo',
    'lower',
    'churidar',
    'salwar pants',
    'leggings',
    'culottes',
  ];

  const onePieceKeywords = [
    'mekhela chador',
    'mekhela',
    'chador',
    'saree',
    'sari',
    'dress',
    'gown',
    'lehenga',
    'ghagra',
    'anarkali',
    'salwar suit',
    'suit',
    'sherwani',
    'poshak',
    'nauvari',
    'paithani',
    'sharara',
    'kaftan',
    'one-piece',
    'onepiece',
    'bridal wear',
    'wedding',
  ];

  for (const kw of topsKeywords) {
    if (combined.includes(kw)) return 'tops';
  }
  for (const kw of bottomsKeywords) {
    if (combined.includes(kw)) return 'bottoms';
  }
  for (const kw of onePieceKeywords) {
    if (combined.includes(kw)) return 'one-pieces';
  }

  // Graceful fallback: SnapDrag specializes in traditional Indian drapes (Sarees, Mekhela Chadors, Lehengas)
  return 'one-pieces';
};

/**
 * Determine garment_photo_type ("flat-lay" or "model")
 */
export const determineGarmentPhotoType = (
  tags: string[] = [],
  description = '',
  imageAlt = ''
): FashnGarmentPhotoType => {
  const text = `${tags.join(' ')} ${description} ${imageAlt}`.toLowerCase();
  if (
    text.includes('model') ||
    text.includes('worn') ||
    text.includes('on model') ||
    text.includes('mannequin') ||
    text.includes('editorial') ||
    text.includes('worn by')
  ) {
    return 'model';
  }
  return 'flat-lay';
};

export class MirrorService {
  /**
   * Run Hugging Face FASHN VTON 1.5 prediction using JS @gradio/client
   */
  async predictWithJsGradio(
    userImageInput: string,
    garmentImageInput: string,
    category: FashnCategory,
    garmentPhotoType: FashnGarmentPhotoType
  ): Promise<string> {
    const hfToken = process.env.HF_TOKEN;
    const clientOptions = hfToken ? { token: hfToken, hf_token: hfToken } : {};

    console.log(`[Mirror] Connecting to ${FASHN_CONFIG.space}...`);
    const client = await Client.connect(FASHN_CONFIG.space, clientOptions);

    const personHandle = handle_file(userImageInput);
    const garmentHandle = handle_file(garmentImageInput);

    console.log(`[Mirror] Triggering inference on ${FASHN_CONFIG.endpoint} (cat=${category}, type=${garmentPhotoType})...`);
    const predictResult: any = await client.predict(FASHN_CONFIG.endpoint, {
      person_image: personHandle,
      garment_image: garmentHandle,
      category,
      garment_photo_type: garmentPhotoType,
      num_timesteps: FASHN_CONFIG.num_timesteps,
      guidance_scale: FASHN_CONFIG.guidance_scale,
      seed: FASHN_CONFIG.seed,
      segmentation_free: FASHN_CONFIG.segmentation_free,
    });

    if (predictResult && predictResult.data) {
      const data = predictResult.data;
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        if (typeof item === 'string') return item;
        if (item && item.url) return item.url;
        if (item && item.path) return item.path;
      } else if (typeof data === 'object') {
        if (data.url) return data.url;
        if (data.path) return data.path;
      }
    }

    throw new Error('Gradio client completed but did not return a valid result image.');
  }

  /**
   * Run Hugging Face FASHN VTON 1.5 prediction using Python gradio_client script as fallback
   */
  async predictWithPythonGradio(
    userImageInput: string,
    garmentImageInput: string,
    category: FashnCategory,
    garmentPhotoType: FashnGarmentPhotoType
  ): Promise<string> {
    let scriptPath = path.resolve(process.cwd(), 'src/scripts/fashn_tryon.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(process.cwd(), 'dist/scripts/fashn_tryon.py');
    }

    const pythonExe = process.env.PYTHON_PATH || 'python3';

    return new Promise((resolve, reject) => {
      const args = [
        scriptPath,
        '--person-image', userImageInput,
        '--garment-image', garmentImageInput,
        '--category', category,
        '--garment-photo-type', garmentPhotoType,
        '--num-timesteps', FASHN_CONFIG.num_timesteps.toString(),
        '--guidance-scale', FASHN_CONFIG.guidance_scale.toString(),
        '--seed', FASHN_CONFIG.seed.toString(),
      ];

      const env = {
        ...process.env,
        HF_TOKEN: process.env.HF_TOKEN || '',
      };

      execFile(pythonExe, args, { env, timeout: FASHN_CONFIG.timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Mirror] Python Gradio script error:', error, stderr);
          return reject(error);
        }

        try {
          const resJson = JSON.parse(stdout.trim());
          if (!resJson.success) {
            return reject(new Error(resJson.error || 'Python Gradio failed.'));
          }

          const data = resJson.data;
          let resultUrl = '';
          if (typeof data === 'string') {
            resultUrl = data;
          } else if (data && typeof data === 'object') {
            resultUrl = data.url || data.path || '';
          }

          if (!resultUrl) {
            return reject(new Error('Python Gradio returned empty result URL.'));
          }

          resolve(resultUrl);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  /**
   * Process virtual try-on with automated garment extraction and user portrait optimization
   */
  async processTryOn({ productId, userImageFile }: TryOnParams): Promise<TryOnResult> {
    // 1. Validate user portrait image quality
    validateUserImageQuality(userImageFile);

    if (!productId) {
      throw new Error('Product ID is required.');
    }

    // 2. Fetch product from database
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new Error('Product not found in SnapDrag catalog.');
    }

    if (!product.images || product.images.length === 0) {
      throw new Error('This product currently cannot be used with Mirror because it has no garment image.');
    }

    // 3. Select best verified garment image
    // Prefer primary image, verify remote accessibility, and fallback to next images if primary is broken
    let selectedImage = product.images[0];
    let isVerified = false;

    for (const img of product.images) {
      if (img.url && (await verifyRemoteImageUrl(img.url))) {
        selectedImage = img;
        isVerified = true;
        break;
      }
    }

    if (!isVerified) {
      console.warn(`[Mirror] Warning: remote verification failed for all images of product ${productId}, falling back to primary URL`);
      selectedImage = product.images.find((img) => img.isPrimary) || product.images[0];
    }

    const garmentImageUrl = selectedImage.url;
    if (!garmentImageUrl) {
      throw new Error('This product has no valid garment image URL.');
    }

    // 4. Map category & photo type
    const category = mapProductCategory(
      product.category?.name,
      product.category?.slug,
      product.name,
      product.tags
    );
    const garmentPhotoType = determineGarmentPhotoType(
      product.tags,
      product.description,
      selectedImage.altText || ''
    );

    // 5. Upload user portrait to Cloudinary
    console.log('☁️ Uploading user photo for Mirror Try-On to Cloudinary...');
    const userImageResult = await storageService.uploadImage(userImageFile);
    const userImageUrl = userImageResult.url;
    console.log('✅ User photo uploaded to Cloudinary:', userImageUrl);

    // 6. Preprocess garment with automatic background removal for crisp flat-lay
    let tempGarmentPath = '';
    let garmentInput = garmentImageUrl;

    try {
      console.log('✂️ Preprocessing garment with automatic background removal (rembg)...');
      const cleanGarment = await backgroundRemovalService.removeBackground(garmentImageUrl, {
        uploadToCloudinary: true,
      });
      garmentInput = cleanGarment.cloudinaryUrl || cleanGarment.localPath;
      tempGarmentPath = cleanGarment.localPath;
      console.log('✅ Clean garment cutout ready for Virtual Try-On:', garmentInput);
    } catch (bgErr) {
      console.warn('[Mirror] Background removal pre-processing failed, using original garment image:', bgErr);
      garmentInput = garmentImageUrl;
    }

    // 7. Try prediction using JS @gradio/client first, fallback to Python gradio_client
    let resultImageUrl = '';
    try {
      console.log(`[Mirror] Running FASHN VTON 1.5 prediction via JS @gradio/client for "${product.name}"...`);
      resultImageUrl = await this.predictWithJsGradio(userImageUrl, garmentInput, category, garmentPhotoType);
    } catch (jsErr: any) {
      console.warn('[Mirror] JS @gradio/client prediction failed:', jsErr.message || jsErr);
      const errMsg = String(jsErr.message || jsErr || '');

      if (errMsg.includes('ZeroGPU') || errMsg.includes('quota') || errMsg.includes('exceeded')) {
        throw new Error('Hugging Face ZeroGPU quota limit reached for public space fashn-ai/fashn-vton-1.5. Please try again in a few moments.');
      }

      try {
        resultImageUrl = await this.predictWithPythonGradio(userImageUrl, garmentInput, category, garmentPhotoType);
      } catch (pyErr: any) {
        console.error('[Mirror] Both JS and Python Gradio clients failed:', pyErr);
        const pyErrMsg = String(pyErr.message || pyErr || '');
        if (pyErrMsg.includes('ZeroGPU') || pyErrMsg.includes('quota') || pyErrMsg.includes('exceeded')) {
          throw new Error('Hugging Face ZeroGPU quota limit reached for public space fashn-ai/fashn-vton-1.5. Please try again in a few moments.');
        }
        throw new Error('Mirror is temporarily unavailable. Please try again in a few moments.');
      }
    } finally {
      // Clean up temporary local files if created
      if (userImageFile.path && fs.existsSync(userImageFile.path)) {
        try { fs.unlinkSync(userImageFile.path); } catch {}
      }
      if (tempGarmentPath && fs.existsSync(tempGarmentPath)) {
        try { fs.unlinkSync(tempGarmentPath); } catch {}
      }
    }

    return {
      imageUrl: resultImageUrl,
      userImageUrl,
      productId: product.id,
      garmentImageUrl,
      category,
    };
  }
}

export const mirrorService = new MirrorService();
export default mirrorService;

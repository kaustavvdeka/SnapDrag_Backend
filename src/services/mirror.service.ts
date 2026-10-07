import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import https from 'https';
import http from 'http';
import { Client, handle_file } from '@gradio/client';
import prisma from '../config/prisma.js';
import { IMAGE_UPLOAD_DIR } from '../config/constants.js';
import { storageService } from '../storage/storageService.js';
import { backgroundRemovalService } from './backgroundRemoval.service.js';

export interface TryOnParams {
  productId: string;
  userImageFile: Express.Multer.File;
}

export interface TryOnResult {
  imageUrl: string;
  userImageUrl?: string;
}

/**
 * Helper to download a remote image URL to a local temporary file
 */
const downloadImageToTemp = (url: string, destPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          return reject(
            new Error(
              `Failed to download garment image from ${url}, status: ${response.statusCode}`
            )
          );
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(destPath));
        });
      })
      .on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
};

/**
 * Determine FASHN category from product & category metadata
 */
export const mapProductCategory = (
  categoryName?: string,
  categorySlug?: string,
  productName?: string
): 'tops' | 'bottoms' | 'one-pieces' => {
  const combined = `${categoryName || ''} ${categorySlug || ''} ${productName || ''}`.toLowerCase();

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
  ];
  const onePieceKeywords = [
    'dress',
    'saree',
    'sari',
    'mekhela',
    'chador',
    'gown',
    'one-piece',
    'onepiece',
    'anarkali',
    'lehenga',
    'suit',
    'sherwani',
    'kaftan',
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

  // Default for traditional clothing
  return 'one-pieces';
};

/**
 * Determine garment_photo_type ("flat-lay" or "model")
 */
export const determineGarmentPhotoType = (
  tags: string[] = [],
  description = ''
): 'flat-lay' | 'model' => {
  const text = `${tags.join(' ')} ${description}`.toLowerCase();
  if (text.includes('model') || text.includes('worn') || text.includes('on model')) {
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
    category: 'tops' | 'bottoms' | 'one-pieces',
    garmentPhotoType: 'flat-lay' | 'model'
  ): Promise<string> {
    const hfToken = process.env.HF_TOKEN;
    const clientOptions = hfToken ? { token: hfToken, hf_token: hfToken } : {};

    const client = await Client.connect('fashn-ai/fashn-vton-1.5', clientOptions);

    const personHandle = handle_file(userImageInput);
    const garmentHandle = handle_file(garmentImageInput);

    const predictResult: any = await client.predict('/try_on', {
      person_image: personHandle,
      garment_image: garmentHandle,
      category,
      garment_photo_type: garmentPhotoType,
      num_timesteps: 50,
      guidance_scale: 1.5,
      seed: 42,
      segmentation_free: true,
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

    throw new Error('JS Gradio client did not return a valid image URL.');
  }

  /**
   * Run Hugging Face FASHN VTON 1.5 prediction using Python gradio_client script
   */
  async predictWithPythonGradio(
    userImageInput: string,
    garmentImageInput: string,
    category: 'tops' | 'bottoms' | 'one-pieces',
    garmentPhotoType: 'flat-lay' | 'model'
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
        '--num-timesteps', '50',
        '--guidance-scale', '1.5',
        '--seed', '42',
      ];

      const env = {
        ...process.env,
        HF_TOKEN: process.env.HF_TOKEN || '',
      };

      execFile(pythonExe, args, { env, timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Python Gradio script error:', error, stderr);
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

  async processTryOn({ productId, userImageFile }: TryOnParams): Promise<TryOnResult> {
    if (!userImageFile || !userImageFile.path) {
      throw new Error('User image is missing. Please upload a clear photo of yourself.');
    }

    if (!productId) {
      throw new Error('Product ID is required.');
    }

    // 1. Upload user image to Cloudinary (removes local file from system disk)
    console.log('☁️ Uploading user photo for Mirror Try-On to Cloudinary...');
    const userImageResult = await storageService.uploadImage(userImageFile);
    const userImageUrl = userImageResult.url;
    console.log('✅ User photo uploaded to Cloudinary:', userImageUrl);

    // 2. Fetch product from database
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: {
          orderBy: { isPrimary: 'desc' },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found.');
    }

    if (!product.images || product.images.length === 0) {
      throw new Error('Sorry, this product cannot be used with Mirror because it has no image.');
    }

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
    let garmentImageUrl = primaryImage.url;

    if (!garmentImageUrl) {
      throw new Error('Sorry, this product has no valid image URL.');
    }

    // 3. Map category & photo type
    const category = mapProductCategory(product.category?.name, product.category?.slug, product.name);
    const garmentPhotoType = determineGarmentPhotoType(product.tags, product.description);

    // 4. Preprocess garment with automatic background removal for crisp flat-lay
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
      console.warn('Background removal pre-processing failed, using original garment image:', bgErr);
      garmentInput = garmentImageUrl;
    }

    // 5. Try prediction using JS @gradio/client first, fallback to Python gradio_client
    let resultImageUrl = '';
    try {
      console.log('Running FASHN VTON 1.5 prediction via JS @gradio/client...');
      resultImageUrl = await this.predictWithJsGradio(userImageUrl, garmentInput, category, garmentPhotoType);
    } catch (jsErr: any) {
      console.warn('JS @gradio/client prediction failed:', jsErr.message || jsErr);
      const errMsg = String(jsErr.message || jsErr || '');

      if (errMsg.includes('ZeroGPU') || errMsg.includes('quota') || errMsg.includes('exceeded')) {
        throw new Error('Hugging Face ZeroGPU quota limit reached for public space fashn-ai/fashn-vton-1.5. Please add a free HF_TOKEN in server/.env or try again in a few moments.');
      }

      try {
        resultImageUrl = await this.predictWithPythonGradio(userImageUrl, garmentInput, category, garmentPhotoType);
      } catch (pyErr: any) {
        console.error('Both JS and Python Gradio clients failed:', pyErr);
        const pyErrMsg = String(pyErr.message || pyErr || '');
        if (pyErrMsg.includes('ZeroGPU') || pyErrMsg.includes('quota') || pyErrMsg.includes('exceeded')) {
          throw new Error('Hugging Face ZeroGPU quota limit reached for public space fashn-ai/fashn-vton-1.5. Please add a free HF_TOKEN in server/.env or try again in a few moments.');
        }
        throw new Error('Mirror is currently busy or unavailable right now. Please try again in a few moments.');
      }
    } finally {
      // Clean up temporary local files if created
      if (fs.existsSync(userImageFile.path)) {
        try { fs.unlinkSync(userImageFile.path); } catch {}
      }
      if (tempGarmentPath && fs.existsSync(tempGarmentPath)) {
        try { fs.unlinkSync(tempGarmentPath); } catch {}
      }
    }

    return {
      imageUrl: resultImageUrl,
      userImageUrl,
    };
  }
}

export const mirrorService = new MirrorService();
export default mirrorService;

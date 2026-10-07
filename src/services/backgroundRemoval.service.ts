import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import https from 'https';
import http from 'http';
import { IMAGE_UPLOAD_DIR } from '../config/constants.js';
import { storageService } from '../storage/storageService.js';

export interface BackgroundRemovalOptions {
  whiteBackground?: boolean;
  model?: string;
  uploadToCloudinary?: boolean;
}

export class BackgroundRemovalService {
  /**
   * Helper to download remote image to a local file
   */
  private async downloadToTemp(url: string, destPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const client = url.startsWith('https') ? https : http;

      client
        .get(url, (response) => {
          if (response.statusCode && response.statusCode >= 400) {
            return reject(new Error(`Failed to download image from ${url}, status: ${response.statusCode}`));
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
  }

  /**
   * Automatically remove background from an image file (or URL)
   * Returns path to the processed transparent PNG (or Cloudinary URL if requested)
   */
  async removeBackground(
    inputSource: string,
    options: BackgroundRemovalOptions = {}
  ): Promise<{ localPath: string; cloudinaryUrl?: string }> {
    const uploadDir = path.resolve(process.cwd(), IMAGE_UPLOAD_DIR);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let localInputPath = inputSource;
    let isTemporaryDownload = false;

    // 1. If remote URL, download first
    if (inputSource.startsWith('http://') || inputSource.startsWith('https://')) {
      const tempExt = path.extname(new URL(inputSource).pathname) || '.jpg';
      const tempInputName = `temp-raw-${Date.now()}-${Math.round(Math.random() * 1e6)}${tempExt}`;
      localInputPath = path.join(uploadDir, tempInputName);
      await this.downloadToTemp(inputSource, localInputPath);
      isTemporaryDownload = true;
    } else if (inputSource.startsWith('/uploads/')) {
      localInputPath = path.resolve(process.cwd(), inputSource.replace(/^\//, ''));
    } else if (!path.isAbsolute(inputSource)) {
      localInputPath = path.resolve(uploadDir, inputSource);
    }

    const outputFilename = `nobg-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`;
    const localOutputPath = path.join(uploadDir, outputFilename);

    let scriptPath = path.resolve(process.cwd(), 'src/scripts/remove_background.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(process.cwd(), 'dist/scripts/remove_background.py');
    }

    const pythonExe = process.env.PYTHON_PATH || 'python3';
    const model = options.model || 'u2netp';

    const args = [
      scriptPath,
      '--input', localInputPath,
      '--output', localOutputPath,
      '--model', model,
    ];

    if (options.whiteBackground) {
      args.push('--white-bg');
    }

    try {
      await new Promise<void>((resolve, reject) => {
        execFile(pythonExe, args, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.warn('Background removal script error:', error.message, stderr);
            return reject(error);
          }
          try {
            const res = JSON.parse(stdout.trim().split('\n').pop() || '{}');
            if (res.success) {
              resolve();
            } else {
              reject(new Error(res.error || 'Failed to remove background'));
            }
          } catch {
            resolve();
          }
        });
      });
    } catch (err) {
      console.warn('Background removal failed, falling back to original image:', err);
      // Fallback: copy original to output path
      fs.copyFileSync(localInputPath, localOutputPath);
    } finally {
      if (isTemporaryDownload && fs.existsSync(localInputPath)) {
        try { fs.unlinkSync(localInputPath); } catch {}
      }
    }

    let cloudinaryUrl: string | undefined;

    // 2. Optionally upload the clean cutout to Cloudinary
    if (options.uploadToCloudinary && fs.existsSync(localOutputPath)) {
      try {
        const mockFile: Express.Multer.File = {
          fieldname: 'image',
          originalname: outputFilename,
          encoding: '7bit',
          mimetype: 'image/png',
          size: fs.statSync(localOutputPath).size,
          destination: uploadDir,
          filename: outputFilename,
          path: localOutputPath,
          buffer: Buffer.from([]),
          stream: null as any,
        };

        const uploadRes = await storageService.uploadImage(mockFile);
        cloudinaryUrl = uploadRes.url;
      } catch (cloudErr) {
        console.warn('Failed to upload background-removed image to Cloudinary:', cloudErr);
      }
    }

    return {
      localPath: localOutputPath,
      cloudinaryUrl,
    };
  }
}

export const backgroundRemovalService = new BackgroundRemovalService();
export default backgroundRemovalService;

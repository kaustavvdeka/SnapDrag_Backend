import fs from 'fs';
import path from 'path';
import {
  IMAGE_STORAGE_PROVIDER,
  IMAGE_STORAGE_URL,
  IMAGE_UPLOAD_DIR,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '../config/constants.js';

export interface UploadedFileResult {
  url: string;
  key: string;
  provider: string;
}

export interface IStorageProvider {
  saveFile(file: Express.Multer.File): Promise<UploadedFileResult>;
  deleteFile(fileKey: string): Promise<boolean>;
}

export class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir: string = IMAGE_UPLOAD_DIR, baseUrl: string = IMAGE_STORAGE_URL) {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    const filename = file.filename;
    return {
      url: `${this.baseUrl}/${filename}`,
      key: filename,
      provider: 'local',
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, fileKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary storage provider integration
export class CloudinaryStorageProvider implements IStorageProvider {
  private isConfigured: boolean = false;
  private localFallback: LocalStorageProvider;

  constructor() {
    this.localFallback = new LocalStorageProvider();
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.isConfigured = true;
    }
  }

  async saveFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    if (!this.isConfigured) {
      return this.localFallback.saveFile(file);
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'snapdrag/products',
        public_id: path.parse(file.filename).name,
      });

      // Remove temporary local file after uploading to Cloudinary
      if (fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch {
          // ignore unlink error
        }
      }

      return {
        url: uploadResult.secure_url,
        key: uploadResult.public_id,
        provider: 'cloudinary',
      };
    } catch (error) {
      console.warn('Cloudinary upload failed, falling back to local file:', error);
      return this.localFallback.saveFile(file);
    }
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    if (!this.isConfigured) {
      return this.localFallback.deleteFile(fileKey);
    }
    try {
      await cloudinary.uploader.destroy(fileKey);
      return true;
    } catch {
      return false;
    }
  }
}

export class S3StorageProvider implements IStorageProvider {
  async saveFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    // AWS S3 client integration hook
    return {
      url: `https://snapdrag-clothing.s3.amazonaws.com/${file.filename}`,
      key: file.filename,
      provider: 's3',
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    return true;
  }
}

export class StorageService {
  private provider: IStorageProvider;

  constructor() {
    switch (IMAGE_STORAGE_PROVIDER) {
      case 'cloudinary':
        this.provider = new CloudinaryStorageProvider();
        break;
      case 's3':
        this.provider = new S3StorageProvider();
        break;
      case 'local':
      default:
        this.provider = new LocalStorageProvider();
        break;
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadedFileResult> {
    return this.provider.saveFile(file);
  }

  async deleteImage(key: string): Promise<boolean> {
    return this.provider.deleteFile(key);
  }
}

export const storageService = new StorageService();

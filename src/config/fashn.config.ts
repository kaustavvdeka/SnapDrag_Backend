/**
 * Centralized inference configuration for FASHN AI Virtual Try-On (VTON 1.5)
 */
export const FASHN_CONFIG = {
  space: 'fashn-ai/fashn-vton-1.5',
  endpoint: '/try_on',
  num_timesteps: 50,
  guidance_scale: 1.5,
  seed: 42,
  segmentation_free: true,
  timeoutMs: 120000,
  categories: ['tops', 'bottoms', 'one-pieces'] as const,
  garmentPhotoTypes: ['flat-lay', 'model'] as const,
};

export type FashnCategory = (typeof FASHN_CONFIG.categories)[number];
export type FashnGarmentPhotoType = (typeof FASHN_CONFIG.garmentPhotoTypes)[number];

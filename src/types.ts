export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';
export type EntryStatus = 'awaiting-crop' | 'processing' | 'done';

export interface Metrics {
  width: number;
  height: number;
  rawSize: number;
  compressedSize: number;
  ratio: number;
}

export interface CropState {
  crop?: any;
  aspect?: number;
  rotation: number;
}

export interface ImageEntry {
  id: string;
  name: string;
  originalSrc: string; // object URL of the raw uploaded file — never mutated
  previewSrc: string; // object URL of the cropped result (thumbnail)
  originalImageData: ImageData | null;
  processedImageData: ImageData | null;
  compressedBlobUrl: string | null; // download URL for the compressed output
  metrics: Metrics | null;
  status: EntryStatus;
  cropState?: CropState;
  format: OutputFormat;
  quality: number; // 1–100 (ignored for lossless formats like png/tiff)
  colors: number; // 2–256 (used for gif)
  scale: number; // 1-100%
}

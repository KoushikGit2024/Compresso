import { OutputFormat } from '../types';
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// ── AVIF Support Guard ────────────────────────────────────────────────────────
let supportsAvif = false;
try {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  supportsAvif = c.toDataURL('image/avif').startsWith('data:image/avif');
} catch (e) {
  // Ignore
}

// ── MIME helpers ──────────────────────────────────────────────────────────────
export const FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
};

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tiff: 'tiff',
};

/** Formats where a quality slider makes sense */
export const LOSSY_FORMATS: OutputFormat[] = ['jpeg', 'webp', 'avif'];

// ── Worker Integration ────────────────────────────────────────────────────────
// Keep a singleton worker to avoid instantiating it repeatedly
let workerInstance: Worker | null = null;
let jobId = 0;
const pendingJobs = new Map<number, { resolve: Function; reject: Function }>();

function getWorker() {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./compressionWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerInstance.onmessage = (e) => {
      const { id, success, resultData, blob, size, error } = e.data;
      const job = pendingJobs.get(id);
      if (job) {
        pendingJobs.delete(id);
        if (success) {
          // Re-create the object URL on the main thread
          const blobUrl = URL.createObjectURL(blob);
          job.resolve({ data: resultData, size, blobUrl });
        } else {
          job.reject(new Error(error));
        }
      }
    };
  }
  return workerInstance;
}

// ── Main compression function ─────────────────────────────────────────────────
/**
 * Compresses ImageData to the requested OutputFormat at the given quality (1–100).
 * Returns the resulting ImageData (for display), the real byte size, and a blob URL
 * that can be used to download the compressed file.
 */
export async function compressToFormat(
  imgData: ImageData,
  format: OutputFormat,
  quality: number,
  colors: number = 256,
  scale: number = 100,
): Promise<{ data: ImageData; size: number; blobUrl: string }> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const id = ++jobId;
    pendingJobs.set(id, { resolve, reject });

    worker.postMessage({
      id,
      imgData,
      format,
      quality,
      colors,
      scale,
      supportsAvif,
    });
  });
}

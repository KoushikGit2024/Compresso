import heic2any from 'heic2any';

const HEIC_TYPES = ['image/heic', 'image/heif'];

/** Pre-process a file — converts HEIC to JPEG blob before anything else */
async function preprocessFile(file: File): Promise<File> {
  const isHeic =
    HEIC_TYPES.includes(file.type) || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);

  if (!isHeic) return file;

  try {
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (err: any) {
    console.error('HEIC conversion failed:', err);
    throw new Error(
      `Failed to decode HEIC file "${file.name}". It may be an unsupported or corrupted format variant.`,
    );
  }
}

export const loadImage = async (fileOrUrl: File | string): Promise<HTMLImageElement> => {
  if (typeof fileOrUrl !== 'string') {
    // Pre-process HEIC before loading
    fileOrUrl = await preprocessFile(fileOrUrl);
  }

  return new Promise((resolve, reject) => {
    if (typeof fileOrUrl === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fileOrUrl;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrUrl);
  });
};

/** Load a File after HEIC conversion and return an object URL safe to store */
export async function prepareFileUrl(file: File): Promise<string> {
  const processed = await preprocessFile(file);
  return URL.createObjectURL(processed);
}

export const getImageData = (image: HTMLImageElement): ImageData => {
  const canvas = document.createElement('canvas');
  const MAX_WIDTH = 1200;
  let { width, height } = image;

  if (width > MAX_WIDTH) {
    height = Math.floor(height * (MAX_WIDTH / width));
    width = MAX_WIDTH;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
};

import UTIF from 'utif';
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
};

self.onmessage = async (e: MessageEvent) => {
  const { id, imgData, format, quality, colors, scale, supportsAvif } = e.data;

  try {
    // 1. Convert imgData to OffscreenCanvas
    const rawCanvas = new OffscreenCanvas(imgData.width, imgData.height);
    const rawCtx = rawCanvas.getContext('2d')!;
    rawCtx.putImageData(imgData, 0, 0);

    let scaledCanvas = rawCanvas;
    if (scale !== 100) {
      const sw = Math.max(1, Math.floor(imgData.width * (scale / 100)));
      const sh = Math.max(1, Math.floor(imgData.height * (scale / 100)));
      scaledCanvas = new OffscreenCanvas(sw, sh);
      const scaledCtx = scaledCanvas.getContext('2d')!;
      scaledCtx.imageSmoothingEnabled = true;
      scaledCtx.imageSmoothingQuality = 'high';
      scaledCtx.drawImage(rawCanvas, 0, 0, sw, sh);
    }

    let actualFormat = format;
    if (format === 'avif' && !supportsAvif) {
      actualFormat = 'webp';
    }

    const mime = FORMAT_MIME[actualFormat] || 'image/png';
    const q = ['jpeg', 'webp', 'avif'].includes(actualFormat) ? quality / 100 : 1;
    let blob: Blob;

    if (['jpeg', 'png', 'webp', 'avif'].includes(actualFormat)) {
      blob = await scaledCanvas.convertToBlob({ type: mime, quality: q });
    } else if (actualFormat === 'gif') {
      const rgba = new Uint8Array(
        scaledCanvas.getContext('2d')!.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
          .data.buffer,
      );
      const palette = quantize(rgba, colors);
      const index = applyPalette(rgba, palette);
      const gif = GIFEncoder();
      gif.writeFrame(index, scaledCanvas.width, scaledCanvas.height, { palette });
      gif.finish();
      blob = new Blob([gif.bytes()], { type: mime });
    } else if (actualFormat === 'tiff') {
      const rgba = new Uint8Array(
        scaledCanvas.getContext('2d')!.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
          .data.buffer,
      );
      const buffer = UTIF.encodeImage(rgba, scaledCanvas.width, scaledCanvas.height);
      blob = new Blob([buffer], { type: mime });
    } else {
      blob = await scaledCanvas.convertToBlob({ type: 'image/png' });
    }

    // 2. Decode the Blob back into an ImageData array so the UI can diff it
    let resultData: ImageData;

    if (actualFormat === 'tiff') {
      // Decode TIFF manually since createImageBitmap doesn't support TIFF
      const arrayBuffer = await blob.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);
      UTIF.decodeImage(arrayBuffer, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]);
      const w = ifds[0].width;
      const h = ifds[0].height;
      resultData = new ImageData(new Uint8ClampedArray(rgba), w, h);
    } else {
      // Decode natively for everything else
      const bmp = await createImageBitmap(blob);
      const resCanvas = new OffscreenCanvas(scaledCanvas.width, scaledCanvas.height);
      const resCtx = resCanvas.getContext('2d')!;
      resCtx.drawImage(bmp, 0, 0);
      resultData = resCtx.getImageData(0, 0, resCanvas.width, resCanvas.height);
    }

    // 3. Send the blob and imagedata back to main thread
    self.postMessage({
      id,
      success: true,
      resultData,
      blob,
      size: blob.size,
    });
  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message || String(error) });
  }
};

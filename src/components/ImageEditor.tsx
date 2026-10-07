import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../utils/cropImage';
import { Check, X, RotateCw, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';
import { CropState } from '../types';

interface QueueItem {
  id: string;
  name: string;
  previewSrc: string;
  isCurrent: boolean;
}

interface ImageEditorProps {
  imageSrc: string;
  fileName: string;
  initialCropState?: CropState;
  queue: QueueItem[];
  onSave: (file: File, cropState: CropState) => void;
  onSkip: () => void;
  onSkipAll: () => void;
  onCancel: () => void;
  onJumpTo: (id: string) => void;
}

const ASPECT_PRESETS = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:5', value: 4 / 5 },
  { label: '21:9', value: 21 / 9 },
  { label: 'A4 (Port)', value: 1 / Math.SQRT2 },
  { label: 'A4 (Land)', value: Math.SQRT2 },
  { label: 'Letter (Port)', value: 8.5 / 11 },
  { label: 'Letter (Land)', value: 11 / 8.5 },
];

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

const CANVAS_PADDING = 32; // p-4 on each side

/** Largest display size (<= natural) whose rotated bounding box fits the available area. */
function fitImage(natW: number, natH: number, rotation: number, availW: number, availH: number) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bboxW = natW * cos + natH * sin;
  const bboxH = natW * sin + natH * cos;
  const scale = Math.min(availW / bboxW, availH / bboxH, 1);
  return { width: Math.floor(natW * scale), height: Math.floor(natH * scale) };
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageSrc,
  fileName,
  initialCropState,
  queue,
  onSave,
  onSkip,
  onSkipAll,
  onCancel,
  onJumpTo,
}) => {
  const [crop, setCrop] = useState<Crop | undefined>(initialCropState?.crop);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(initialCropState?.aspect);
  const [rotation, setRotation] = useState(initialCropState?.rotation ?? 0);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit =
    natural && canvasSize.w > 0
      ? fitImage(
          natural.w,
          natural.h,
          rotation,
          Math.max(1, canvasSize.w - CANVAS_PADDING),
          Math.max(1, canvasSize.h - CANVAS_PADDING),
        )
      : null;
  // Zoom multiplies the fit-to-screen size; the canvas scrolls once it overflows.
  const fitted = fit ? { width: Math.round(fit.width * zoom), height: Math.round(fit.height * zoom) } : null;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNatural({ w: naturalWidth, h: naturalHeight });
    if (!initialCropState?.crop && aspect) {
      setCrop(centerAspectCrop(naturalWidth, naturalHeight, aspect));
    }
  }

  const handleAspectClick = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (newAspect && imgRef.current) {
      setCrop(centerAspectCrop(imgRef.current.width, imgRef.current.height, newAspect));
    } else {
      setCrop(undefined);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const image = imgRef.current!;
      let pixelCrop: { x: number; y: number; width: number; height: number };

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        pixelCrop = {
          x: completedCrop.x * scaleX,
          y: completedCrop.y * scaleY,
          width: completedCrop.width * scaleX,
          height: completedCrop.height * scaleY,
        };
      } else {
        pixelCrop = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
      }

      const file = await getCroppedImg(imageSrc, pixelCrop, rotation);
      onSave(file, { crop, aspect, rotation });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = queue.filter((q) => !q.isCurrent).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold tracking-wider">
              Editing
            </p>
            <h2
              className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate max-w-[280px]"
              title={fileName}
            >
              {fileName}
            </h2>
          </div>
          {pendingCount > 0 && (
            <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-200 dark:border-zinc-700">
              +{pendingCount} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            title="Cancel and remove this file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md border border-zinc-200 dark:border-zinc-700 transition"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
          {pendingCount > 0 && (
            <>
              <button
                onClick={onSkip}
                title="Skip crop, use full image"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md border border-zinc-200 dark:border-zinc-700 transition"
              >
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </button>
              <button
                onClick={onSkipAll}
                title="Skip cropping for all remaining files"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md border border-zinc-200 dark:border-zinc-700 transition"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <SkipForward className="w-3 h-3 -ml-1.5" /> Skip All
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md border border-emerald-500 transition"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Applying...' : pendingCount > 0 ? 'Apply & Next' : 'Apply & Compress'}
          </button>
        </div>
      </div>

      {/* ── Queue strip ── */}
      {queue.length > 1 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase font-semibold tracking-wider flex-shrink-0 mr-1">
            Queue
          </span>
          {queue.map((item, i) => (
            <button
              key={item.id}
              onClick={() => !item.isCurrent && onJumpTo(item.id)}
              title={item.name}
              className={`relative flex-shrink-0 w-10 h-10 rounded overflow-hidden border-2 transition-all ${
                item.isCurrent
                  ? 'border-emerald-500 ring-1 ring-emerald-500/40 cursor-default'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer'
              }`}
            >
              <img src={item.previewSrc} alt={item.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 text-[8px] font-bold text-center bg-black/50 text-white leading-tight py-0.5">
                {i + 1}
              </span>
              {item.isCurrent && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Crop Canvas ── */}
      <div
        ref={canvasRef}
        className={`relative flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-950 flex p-4 ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}
      >
        <ReactCrop
          className="!m-auto shrink-0"
          style={{ maxWidth: 'none', maxHeight: 'none' }}
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            style={{
              transform: `rotate(${rotation}deg)`,
              width: fitted?.width,
              height: fitted?.height,
              maxWidth: 'none',
              visibility: fitted ? 'visible' : 'hidden',
            }}
            className="block shadow-md"
          />
        </ReactCrop>
      </div>

      {/* ── Controls Footer ── */}
      <div className="flex-shrink-0 max-h-[40vh] overflow-y-auto bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Aspect ratio */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Aspect
          </span>
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleAspectClick(preset.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition ${
                aspect === preset.value
                  ? 'bg-zinc-800 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-zinc-700 dark:border-zinc-300'
                  : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Rotation */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1 flex-shrink-0">
            <RotateCw className="w-3 h-3" /> Rotation
          </span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 h-1.5 accent-emerald-500 rounded-lg appearance-none cursor-pointer bg-zinc-300 dark:bg-zinc-700"
          />
          <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 w-8 flex-shrink-0">
            {rotation}°
          </span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1 flex-shrink-0">
            <ZoomIn className="w-3 h-3" /> Zoom
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= 1}
            title="Zoom out"
            className="p-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={1}
            max={5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 accent-emerald-500 rounded-lg appearance-none cursor-pointer bg-zinc-300 dark:bg-zinc-700"
          />
          <button
            onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= 5}
            title="Zoom in"
            className="p-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Fit to screen"
            className="text-[10px] font-mono w-10 flex-shrink-0 text-zinc-600 dark:text-zinc-300 hover:underline"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
};

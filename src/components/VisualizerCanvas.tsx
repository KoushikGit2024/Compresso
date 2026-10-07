import React, { useEffect, useRef, useState } from 'react';
import { Columns, Split, Map } from 'lucide-react';

interface Props {
  original: ImageData;
  processed: ImageData;
}

// Fixed chrome inside the side-by-side area (px)
const AREA_PADDING = 32; // p-4 on both sides
const GAP = 16;
const CARD_PAD_X = 26; // p-3 + border
const CARD_CHROME_Y = 26 + 30; // p-3 + border + label row + margin

/** Picks the split direction (and rendered image size) that maximizes image area. */
function computeSplitLayout(cw: number, ch: number, iw: number, ih: number) {
  const W = Math.max(0, cw - AREA_PADDING);
  const H = Math.max(0, ch - AREA_PADDING);
  const fit = (cellW: number, cellH: number) => {
    const bw = Math.max(1, cellW - CARD_PAD_X);
    const bh = Math.max(1, cellH - CARD_CHROME_Y);
    const scale = Math.min(bw / iw, bh / ih);
    return { width: Math.floor(iw * scale), height: Math.floor(ih * scale), scale };
  };
  const horizontal = fit((W - GAP) / 2, H);
  const vertical = fit(W, (H - GAP) / 2);
  return horizontal.scale >= vertical.scale
    ? { direction: 'cols' as const, size: horizontal }
    : { direction: 'rows' as const, size: vertical };
}

export const VisualizerCanvas: React.FC<Props> = ({
  original,
  processed,
}) => {
  const diffRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'slider' | 'side-by-side' | 'diff-map'>('slider');
  const [sliderPos, setSliderPos] = useState(50);
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAreaSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const split = computeSplitLayout(areaSize.w, areaSize.h, original.width, original.height);

  useEffect(() => {
    if (mode === 'diff-map' && diffRef.current) {
      const canvas = diffRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = original.width;
        canvas.height = original.height;
        const diffData = new ImageData(original.width, original.height);
        const orig = original.data;
        
        let compData = processed;
        if (processed.width !== original.width || processed.height !== original.height) {
          const tCanvas = document.createElement('canvas');
          tCanvas.width = original.width;
          tCanvas.height = original.height;
          const tCtx = tCanvas.getContext('2d')!;
          
          const pCanvas = document.createElement('canvas');
          pCanvas.width = processed.width;
          pCanvas.height = processed.height;
          pCanvas.getContext('2d')!.putImageData(processed, 0, 0);
          
          tCtx.drawImage(pCanvas, 0, 0, original.width, original.height);
          compData = tCtx.getImageData(0, 0, original.width, original.height);
        }
        
        const comp = compData.data;

        for (let i = 0; i < orig.length; i += 4) {
          const diff =
            Math.abs(orig[i] - comp[i]) +
            Math.abs(orig[i + 1] - comp[i + 1]) +
            Math.abs(orig[i + 2] - comp[i + 2]);
          if (diff > 0) {
            // Bright red for changes
            diffData.data[i] = 255;
            diffData.data[i + 1] = 0;
            diffData.data[i + 2] = 0;
            diffData.data[i + 3] = 255;
          } else {
            // Very dim grayscale for unchanged pixels
            const avg = (orig[i] + orig[i + 1] + orig[i + 2]) / 3;
            const dim = avg * 0.15;
            diffData.data[i] = dim;
            diffData.data[i + 1] = dim;
            diffData.data[i + 2] = dim;
            diffData.data[i + 3] = 255;
          }
        }
        ctx.putImageData(diffData, 0, 0);
      }
    }
  }, [original, processed, mode]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Image Comparison
          </span>
        </div>

        <div className="flex items-center w-full sm:w-auto bg-zinc-100 dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setMode('slider')}
            className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1 sm:gap-1.5 transition-colors ${
              mode === 'slider'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" /> Split Slider
          </button>
          <button
            onClick={() => setMode('side-by-side')}
            className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1 sm:gap-1.5 transition-colors ${
              mode === 'side-by-side'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Side by Side
          </button>
          <button
            onClick={() => setMode('diff-map')}
            className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1 sm:gap-1.5 transition-colors ${
              mode === 'diff-map'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Diff Map
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div
        ref={areaRef}
        className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-center relative overflow-hidden"
      >
        {mode === 'side-by-side' ? (
          <div
            className={`grid gap-4 w-full h-full min-h-0 min-w-0 ${split.direction === 'cols' ? 'grid-cols-2 grid-rows-1' : 'grid-cols-1 grid-rows-2'}`}
          >
            <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 min-h-0 min-w-0">
              <span className="max-w-full truncate text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-2 px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                Original (Raw)
              </span>
              <div className="flex-1 min-h-0 flex items-center justify-center w-full">
                <canvas
                  ref={(el) => {
                    if (el) {
                      el.width = original.width;
                      el.height = original.height;
                      el.getContext('2d')?.putImageData(original, 0, 0);
                    }
                  }}
                  style={{ width: split.size.width, height: split.size.height }}
                  className="rounded shadow-sm max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 min-h-0 min-w-0">
              <span className="max-w-full truncate text-[11px] font-mono uppercase text-emerald-600 dark:text-emerald-400 mb-2 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800/60">
                Compressed Result
              </span>
              <div className="flex-1 min-h-0 flex items-center justify-center w-full">
                <canvas
                  ref={(el) => {
                    if (el) {
                      el.width = processed.width;
                      el.height = processed.height;
                      el.getContext('2d')?.putImageData(processed, 0, 0);
                    }
                  }}
                  style={{ width: split.size.width, height: split.size.height }}
                  className="rounded shadow-sm max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : mode === 'slider' ? (
          <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden rounded-lg bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
            {/* Split Canvas Container */}
            <div className="relative inline-flex items-center justify-center w-full h-full">
              {/* Processed Canvas (Base layer) */}
              <canvas
                ref={(el) => {
                  if (el) {
                    el.width = processed.width;
                    el.height = processed.height;
                    el.getContext('2d')?.putImageData(processed, 0, 0);
                  }
                }}
                className="w-full h-full object-contain block"
              />

              {/* Original Canvas (Clipped overlay using clip-path) */}
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <canvas
                  ref={(el) => {
                    if (el) {
                      el.width = original.width;
                      el.height = original.height;
                      el.getContext('2d')?.putImageData(original, 0, 0);
                    }
                  }}
                  className="w-full h-full object-contain block"
                />
              </div>

              {/* Vertical Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-zinc-100 pointer-events-none z-10 shadow-lg"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 text-xs shadow-md font-bold">
                  ↔
                </div>
              </div>

              {/* Slider Touch Input */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
            </div>
          </div>
        ) : mode === 'diff-map' ? (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <span className="max-w-full truncate text-[11px] font-mono uppercase text-red-500 mb-2 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/60 rounded border border-red-200 dark:border-red-900/60 z-10">
              Difference Map (Red = Changed Pixels)
            </span>
            <div className="relative inline-flex items-center justify-center max-w-full max-h-full h-full">
              <canvas ref={diffRef} className="max-w-full max-h-full object-contain block" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

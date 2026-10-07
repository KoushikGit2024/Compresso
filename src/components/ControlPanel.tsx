import React, { useState, useEffect } from 'react';
import { OutputFormat } from '../types';
import { LOSSY_FORMATS } from '../utils/algorithms';
import { Cpu, Star, Maximize } from 'lucide-react';

// Re-export for convenience
export { LOSSY_FORMATS };

interface Props {
  format: OutputFormat;
  quality: number;
  colors: number;
  scale: number;
  setFormat: (f: OutputFormat) => void;
  setQuality: (q: number) => void;
  setColors: (c: number) => void;
  setScale: (s: number) => void;
  disabled: boolean;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; sub: string }[] = [
  { value: 'jpeg', label: 'JPEG', sub: 'Lossy · Photos' },
  { value: 'png', label: 'PNG', sub: 'Lossless · Transparency' },
  { value: 'webp', label: 'WebP', sub: 'Lossy/Lossless · Web' },
  { value: 'avif', label: 'AVIF', sub: 'Lossy · Next-Gen' },
  { value: 'gif', label: 'GIF', sub: 'Lossless · Animations' },
  { value: 'tiff', label: 'TIFF', sub: 'Lossless · Archival' },
];

export const ControlPanel: React.FC<Props> = ({
  format,
  quality,
  colors,
  scale,
  setFormat,
  setQuality,
  setColors,
  setScale,
  disabled,
}) => {
  const isLossy = (LOSSY_FORMATS as OutputFormat[]).includes(format);

  // Use local state so the slider physically moves smoothly without triggering heavy compression on every pixel of drag
  const [localQuality, setLocalQuality] = useState(quality);
  const [localColors, setLocalColors] = useState(colors);
  const [localScale, setLocalScale] = useState(scale);

  // Sync local state if props change from outside
  useEffect(() => setLocalQuality(quality), [quality]);
  useEffect(() => setLocalColors(colors), [colors]);
  useEffect(() => setLocalScale(scale), [scale]);

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Format Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          Output Format
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMAT_OPTIONS.map(({ value, label, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={`py-2 px-2.5 text-xs font-medium rounded-md transition-colors text-left flex flex-col justify-center gap-0.5 ${
                format === value
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <span className="font-semibold">{label}</span>
              <span
                className={`text-[9px] font-normal leading-tight ${format === value ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500'}`}
              >
                {sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution Scale Slider */}
      <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5 text-zinc-500" />
            Resolution
          </label>
          <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            {localScale}%
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={localScale}
          onChange={(e) => setLocalScale(parseInt(e.target.value))}
          onPointerUp={() => setScale(localScale)}
          onKeyUp={() => setScale(localScale)}
          className="w-full accent-zinc-800 dark:accent-zinc-200 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
          <span>1% (Tiny)</span>
          <span>100% (Original)</span>
        </div>
      </div>

      {/* Quality Slider — only for lossy formats */}
      {isLossy && (
        <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-zinc-500" />
              Quality
            </label>
            <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
              {localQuality}%
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={localQuality}
            onChange={(e) => setLocalQuality(parseInt(e.target.value))}
            onPointerUp={() => setQuality(localQuality)}
            onKeyUp={() => setQuality(localQuality)}
            className="w-full accent-zinc-800 dark:accent-zinc-200 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>1% (Smallest)</span>
            <span>100% (Best Quality)</span>
          </div>
        </div>
      )}

      {/* Colors Slider — only for GIF */}
      {format === 'gif' && (
        <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-zinc-500" />
              Colors (Palette)
            </label>
            <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
              {localColors}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="256"
            step="1"
            value={localColors}
            onChange={(e) => setLocalColors(parseInt(e.target.value))}
            onPointerUp={() => setColors(localColors)}
            onKeyUp={() => setColors(localColors)}
            className="w-full accent-zinc-800 dark:accent-zinc-200 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>2 (Tiny)</span>
            <span>256 (Best)</span>
          </div>
        </div>
      )}
    </div>
  );
};

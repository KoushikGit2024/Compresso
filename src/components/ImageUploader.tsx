import React, { useRef } from 'react';
import { Plus, Upload } from 'lucide-react';

interface Props {
  onUpload: (files: File[]) => void;
  compact?: boolean;
}

// All formats we support as inputs (including HEIC)
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/bmp',
];
const ACCEPT_ATTR = [...ACCEPTED_TYPES, '.heic', '.heif', '.tiff', '.tif', '.avif'].join(',');

function filterFiles(files: File[]): File[] {
  return files.filter(
    (f) => ACCEPTED_TYPES.includes(f.type) || /\.(heic|heif|tiff?|avif|bmp)$/i.test(f.name),
  );
}

export const ImageUploader: React.FC<Props> = ({ onUpload, compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = filterFiles(Array.from(e.target.files ?? []));
    if (files.length > 0) onUpload(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = filterFiles(Array.from(e.dataTransfer.files));
    if (files.length > 0) onUpload(files);
  };

  if (compact) {
    return (
      <>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Files
        </button>
        <input
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all duration-200 cursor-pointer text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-600 dark:text-zinc-300">
        <Upload className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Drop images here or click to browse
      </p>
      <p className="text-xs text-zinc-500 mt-1">
        JPEG · PNG · WebP · AVIF · GIF · TIFF · HEIC · BMP
      </p>
      <input
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

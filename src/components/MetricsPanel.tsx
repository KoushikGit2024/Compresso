import React from 'react';
import { Metrics, OutputFormat } from '../types';
import { FORMAT_EXTENSIONS } from '../utils/algorithms';
import { BarChart3, ArrowDownRight, Layers, FileCode, Download } from 'lucide-react';

interface Props {
  metrics: Metrics | null;
  isProcessing: boolean;
  compressedBlobUrl: string | null;
  format: OutputFormat;
  fileName: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const MetricsPanel: React.FC<Props> = ({
  metrics,
  isProcessing,
  compressedBlobUrl,
  format,
  fileName,
}) => {
  if (isProcessing) {
    return (
      <div className="py-4 flex items-center justify-center text-xs text-zinc-500 font-mono tracking-wider animate-pulse">
        PROCESSING...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Metrics will populate after compression
      </div>
    );
  }

  const isSaved = metrics.compressedSize <= metrics.rawSize;
  const savedPct = ((1 - metrics.compressedSize / metrics.rawSize) * 100).toFixed(1);

  const handleDownload = () => {
    if (!compressedBlobUrl) return;
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const ext = FORMAT_EXTENSIONS[format];
    const a = document.createElement('a');
    a.href = compressedBlobUrl;
    a.download = `${baseName}_compressed.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
          Compression Output
        </span>
        {compressedBlobUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 rounded-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download {format.toUpperCase()}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 min-w-0 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1 truncate">
            <Layers className="w-3 h-3 text-zinc-400" /> Resolution
          </span>
          <p className="text-sm font-semibold font-mono truncate text-zinc-800 dark:text-zinc-200 mt-1">
            {metrics.width}×{metrics.height}
          </p>
        </div>

        <div className="p-3 min-w-0 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1 truncate">
            <FileCode className="w-3 h-3 text-zinc-400" /> Original
          </span>
          <p className="text-sm font-semibold font-mono truncate text-zinc-800 dark:text-zinc-200 mt-1">
            {formatBytes(metrics.rawSize)}
          </p>
        </div>

        <div className="p-3 min-w-0 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1 truncate">
            <FileCode className="w-3 h-3 text-zinc-400" /> Compressed
          </span>
          <p
            className={`text-sm font-semibold font-mono truncate mt-1 ${isSaved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
          >
            {formatBytes(metrics.compressedSize)}
          </p>
        </div>

        <div className="p-3 min-w-0 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1 truncate">
            <ArrowDownRight className="w-3 h-3 text-zinc-400" /> Saved
          </span>
          <p
            className={`text-sm font-semibold font-mono truncate mt-1 ${isSaved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
          >
            {isSaved ? `-${savedPct}%` : `+${Math.abs(parseFloat(savedPct))}%`}
          </p>
        </div>
      </div>
    </div>
  );
};

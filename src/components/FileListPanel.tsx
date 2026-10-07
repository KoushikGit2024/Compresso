import React from 'react';
import { ImageEntry } from '../types';
import { Trash2, Pencil, Loader2, CheckCircle2, Crop } from 'lucide-react';

interface Props {
  entries: ImageEntry[];
  activeId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FileListPanel: React.FC<Props> = ({
  entries,
  activeId,
  editingId,
  onSelect,
  onDelete,
  onEdit,
}) => {
  if (entries.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 italic py-6">
        No images yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry, i) => {
        const isActive = entry.id === activeId;
        const isEditing = entry.id === editingId;
        const isAwaitingCrop = entry.status === 'awaiting-crop';
        const isProcessing = entry.status === 'processing';
        const isDone = entry.status === 'done';

        return (
          <div
            key={entry.id}
            onClick={() => {
              if (isAwaitingCrop) onEdit(entry.id);
              else onSelect(entry.id);
            }}
            className={`group relative flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all duration-150 select-none ${
              isEditing
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
                  : 'bg-white dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            {/* Index badge */}
            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center border border-white dark:border-zinc-900">
              {i + 1}
            </span>

            {/* Thumbnail */}
            <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-200 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-700">
              <img src={entry.previewSrc} alt={entry.name} className="w-full h-full object-cover" />
              {isEditing && (
                <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                  <Crop className="w-3.5 h-3.5 text-emerald-300" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate leading-tight"
                title={entry.name}
              >
                {entry.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {isEditing && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Crop className="w-2.5 h-2.5" /> Editing...
                  </span>
                )}
                {isAwaitingCrop && !isEditing && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <Crop className="w-2.5 h-2.5" /> Tap to crop
                  </span>
                )}
                {isProcessing && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-500">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                  </span>
                )}
                {isDone && entry.metrics && (
                  <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex-wrap">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                      <span className="px-1 rounded-[3px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase tracking-tight text-[9px] font-bold leading-tight">
                        {entry.format}
                        {!['png', 'gif', 'tiff'].includes(entry.format) ? ` ${entry.quality}` : ''}
                      </span>
                    </span>
                    <span className="truncate">
                      {formatBytes(entry.metrics.compressedSize)} · {entry.metrics.ratio.toFixed(0)}
                      %
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div
              className={`flex items-center gap-0.5 transition-opacity ${isActive || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              {!isAwaitingCrop && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(entry.id);
                  }}
                  title="Re-crop from original"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                }}
                title="Remove file"
                className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

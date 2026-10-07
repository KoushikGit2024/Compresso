import { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ControlPanel } from './components/ControlPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { ImageEditor } from './components/ImageEditor';
import { FileListPanel } from './components/FileListPanel';
import { Logo } from './components/Logo';
import { loadImage, getImageData, prepareFileUrl } from './utils/imageUtils';
import { compressToFormat } from './utils/algorithms';
import { OutputFormat, ImageEntry, CropState } from './types';
import { Cpu, Layers, Menu, Download, Settings2 } from 'lucide-react';
import JSZip from 'jszip';
import { FORMAT_EXTENSIONS } from './utils/algorithms';

function App() {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('theme') !== 'light');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => window.innerWidth >= 768);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(() => window.innerWidth >= 768);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeEntry = entries.find((e) => e.id === activeId) ?? null;
  const editingEntry = entries.find((e) => e.id === editingId) ?? null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const nextAwaitingCrop = (excluding: string, snapshot: ImageEntry[]) =>
    snapshot.find((e) => e.id !== excluding && e.status === 'awaiting-crop') ?? null;

  // ── Compression (async, real format encoding) ─────────────────────────────
  const compressEntry = useCallback(
    async (
      id: string,
      imgData: ImageData,
      format: OutputFormat,
      quality: number,
      colors: number,
      scale: number,
    ) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'processing' } : e)));

      try {
        const rawSize = imgData.width * imgData.height * 3;
        const { data, size, blobUrl } = await compressToFormat(
          imgData,
          format,
          quality,
          colors,
          scale,
        );

        setEntries((prev) => {
          // Revoke old compressed blob URL to avoid memory leak
          const old = prev.find((e) => e.id === id);
          if (old?.compressedBlobUrl) URL.revokeObjectURL(old.compressedBlobUrl);

          return prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  processedImageData: data,
                  compressedBlobUrl: blobUrl,
                  metrics: {
                    width: imgData.width,
                    height: imgData.height,
                    rawSize,
                    compressedSize: size,
                    ratio: (size / rawSize) * 100,
                  },
                  status: 'done',
                }
              : e,
          );
        });
      } catch (err) {
        console.error('Compression failed:', err);
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'done' } : e)));
      }
    },
    [],
  );

  // ── Per-file settings update ──────────────────────────────────────────────
  const handleUpdateSettings = (
    format: OutputFormat,
    quality: number,
    colors: number,
    scale: number,
  ) => {
    if (!activeEntry?.originalImageData) return;
    setEntries((prev) =>
      prev.map((e) => (e.id === activeEntry.id ? { ...e, format, quality, colors, scale } : e)),
    );
    compressEntry(activeEntry.id, activeEntry.originalImageData, format, quality, colors, scale);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFilesSelected = async (files: File[]) => {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const url = await prepareFileUrl(file); // handles HEIC conversion

          let defaultFormat: OutputFormat = 'jpeg';
          if (file.type === 'image/png') defaultFormat = 'png';
          else if (file.type === 'image/webp') defaultFormat = 'webp';
          else if (file.type === 'image/avif') defaultFormat = 'avif';
          else if (file.type === 'image/gif') defaultFormat = 'gif';
          else if (file.type === 'image/tiff' || file.name.match(/\.(tiff?)$/i))
            defaultFormat = 'tiff';

          return {
            id: crypto.randomUUID(),
            name: file.name,
            originalSrc: url,
            previewSrc: url,
            originalImageData: null,
            processedImageData: null,
            compressedBlobUrl: null,
            metrics: null,
            status: 'awaiting-crop' as const,
            format: defaultFormat,
            quality: 85,
            colors: 256,
            scale: 100,
          } as ImageEntry;
        } catch (err: any) {
          alert(err.message || `Failed to process ${file.name}`);
          return null;
        }
      }),
    );

    const newEntries = results.filter((r) => r !== null) as ImageEntry[];

    setEntries((prev) => {
      const updated = [...prev, ...newEntries];
      if (!editingId && newEntries.length > 0) setEditingId(newEntries[0].id);
      return updated;
    });
  };

  // ── Editor: save with crop ────────────────────────────────────────────────
  const handleEditorSave = async (cropState: CropState, croppedFile: File) => {
    if (!editingId || !editingEntry) return;
    const id = editingId;
    const format = editingEntry.format;
    const quality = editingEntry.quality;
    const colors = editingEntry.colors;
    const scale = editingEntry.scale;

    const img = await loadImage(croppedFile);
    const imgData = getImageData(img);
    const croppedSrc = URL.createObjectURL(croppedFile);

    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              previewSrc: croppedSrc,
              originalImageData: imgData,
              processedImageData: null,
              compressedBlobUrl: null,
              metrics: null,
              status: 'processing' as const,
              cropState,
            }
          : e,
      );
      const next = nextAwaitingCrop(id, updated);
      setEditingId(next?.id ?? null);
      return updated;
    });

    setActiveId(id);
    compressEntry(id, imgData, format, quality, colors, scale);
  };

  // ── Editor: skip ─────────────────────────────────────────────────────────
  const handleEditorSkip = async () => {
    if (!editingId || !editingEntry) return;
    const id = editingId;
    const format = editingEntry.format;
    const quality = editingEntry.quality;
    const colors = editingEntry.colors;
    const scale = editingEntry.scale;

    const img = await loadImage(editingEntry.originalSrc);
    const imgData = getImageData(img);

    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              originalImageData: imgData,
              processedImageData: null,
              compressedBlobUrl: null,
              metrics: null,
              status: 'processing' as const,
              cropState: { rotation: 0 },
            }
          : e,
      );
      const next = nextAwaitingCrop(id, updated);
      setEditingId(next?.id ?? null);
      return updated;
    });

    setActiveId(id);
    compressEntry(id, imgData, format, quality, colors, scale);
  };

  // ── Editor: skip all ─────────────────────────────────────────────────────
  const handleEditorSkipAll = async () => {
    const allAwaiting = entries.filter((e) => e.status === 'awaiting-crop');
    setEditingId(null);

    for (const entry of allAwaiting) {
      const img = await loadImage(entry.originalSrc);
      const imgData = getImageData(img);

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                originalImageData: imgData,
                processedImageData: null,
                compressedBlobUrl: null,
                metrics: null,
                status: 'processing' as const,
                cropState: { rotation: 0 },
              }
            : e,
        ),
      );

      compressEntry(entry.id, imgData, entry.format, entry.quality, entry.colors, entry.scale);
    }

    if (allAwaiting.length > 0) setActiveId(allAwaiting[0].id);
  };

  // ── Editor: cancel / remove ──────────────────────────────────────────────
  const handleEditorCancel = () => {
    if (!editingId) return;
    const id = editingId;

    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.originalImageData === null) {
        URL.revokeObjectURL(entry.originalSrc);
        if (entry.previewSrc !== entry.originalSrc) URL.revokeObjectURL(entry.previewSrc);
        if (entry.compressedBlobUrl) URL.revokeObjectURL(entry.compressedBlobUrl);
        const updated = prev.filter((e) => e.id !== id);
        setEditingId(nextAwaitingCrop(id, updated)?.id ?? null);
        return updated;
      }
      setEditingId(nextAwaitingCrop(id, prev)?.id ?? null);
      return prev;
    });
  };

  const handleJumpTo = (id: string) => setEditingId(id);
  const handleEditEntry = (id: string) => setEditingId(id);

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        URL.revokeObjectURL(entry.originalSrc);
        if (entry.previewSrc !== entry.originalSrc) URL.revokeObjectURL(entry.previewSrc);
        if (entry.compressedBlobUrl) URL.revokeObjectURL(entry.compressedBlobUrl);
      }
      return prev.filter((e) => e.id !== id);
    });
    if (activeId === id) setActiveId(entries.find((e) => e.id !== id)?.id ?? null);
    if (editingId === id)
      setEditingId(
        nextAwaitingCrop(
          id,
          entries.filter((e) => e.id !== id),
        )?.id ?? null,
      );
  };

  const handleDownloadAll = async () => {
    const doneEntries = entries.filter((e) => e.status === 'done' && e.compressedBlobUrl);
    if (doneEntries.length === 0) return;

    const zip = new JSZip();

    await Promise.all(
      doneEntries.map(async (entry) => {
        if (!entry.compressedBlobUrl) return;
        try {
          const response = await fetch(entry.compressedBlobUrl);
          const blob = await response.blob();
          const baseName = entry.name.replace(/\.[^.]+$/, '');
          const ext = FORMAT_EXTENSIONS[entry.format];
          zip.file(`${baseName}_compressed.${ext}`, blob);
        } catch (err) {
          console.error(`Failed to zip ${entry.name}`, err);
        }
      }),
    );

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = 'compresso_batch.zip';
    a.click();
    URL.revokeObjectURL(zipUrl);
  };

  // ── Editor queue ─────────────────────────────────────────────────────────
  const editorQueue = editingEntry
    ? entries
        .filter((e) => e.status === 'awaiting-crop' || e.id === editingId)
        .map((e) => ({
          id: e.id,
          name: e.name,
          previewSrc: e.previewSrc,
          isCurrent: e.id === editingId,
        }))
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {entries.length > 0 && (
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="md:hidden p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                title="Toggle file list"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <Logo className="w-9 h-9 flex-shrink-0 drop-shadow-sm" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Compresso
              </h1>
              <p className="text-[10px] text-zinc-500 hidden sm:block">
                Image Compresser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="text-xs text-zinc-500 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{entries.length} file{entries.length !== 1 ? 's' : ''}</span>
              </button>
            )}

            {entries.some((e) => e.status === 'done') && (
              <button
                onClick={handleDownloadAll}
                className="text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
                title="Download all compressed images as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download All</span>
              </button>
            )}

            {entries.length > 0 && (
              <button
                onClick={() => setSettingsOpen((o) => !o)}
                className={`p-2 rounded-md border transition-colors flex-shrink-0 ${
                  settingsOpen
                    ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
                title="Toggle settings panel"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsDark((d) => !d)}
              className="p-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-md transition flex-shrink-0"
              title="Toggle theme"
            >
              {isDark ? (
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-md w-full space-y-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-3">
                  <Cpu className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  No files loaded
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Upload images — JPEG, PNG, WebP, AVIF, GIF, TIFF, HEIC, BMP
                </p>
              </div>
              <ImageUploader onUpload={handleFilesSelected} />
            </div>
          </div>
        ) : (
          <>
            {/* Mobile backdrop */}
            {(sidebarOpen || settingsOpen) && (
              <div
                className="fixed inset-0 z-30 bg-black/30 md:hidden"
                onClick={() => {
                  setSidebarOpen(false);
                  setSettingsOpen(false);
                }}
              />
            )}

            {/* ── Left Sidebar (Files) ── */}
            <div
              className={`
              absolute inset-y-0 left-0 z-40 w-64 flex-col
              bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800
              transition-transform duration-200 ease-in-out
              md:relative md:translate-x-0 md:z-auto
              ${sidebarOpen ? 'flex translate-x-0 shadow-xl md:shadow-none' : 'hidden md:hidden -translate-x-full'}
            `}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Files ({entries.length})
                </span>
                <ImageUploader onUpload={handleFilesSelected} compact />
              </div>

              {/* File list — independently scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                <FileListPanel
                  entries={entries}
                  activeId={activeId}
                  editingId={editingId}
                  onSelect={(id) => {
                    setActiveId(id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  onDelete={handleDeleteEntry}
                  onEdit={handleEditEntry}
                />
              </div>
            </div>

            {/* ── Main Panel (Canvas Only) ── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-50 dark:bg-slate-950">
              {activeEntry?.originalImageData && activeEntry.processedImageData ? (
                <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center">
                  <div className="h-full w-full bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800/80 p-4 shadow-sm dark:shadow-none">
                    <VisualizerCanvas
                      original={activeEntry.originalImageData}
                      processed={activeEntry.processedImageData}
                      originalUrl={activeEntry.originalSrc}
                      processedUrl={activeEntry.compressedBlobUrl!}
                    />
                  </div>
                </div>
              ) : activeEntry?.status === 'processing' ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-zinc-500">Processing...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3">
                    <Cpu className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {entries.some((e) => e.status === 'awaiting-crop')
                      ? 'Crop your images to begin'
                      : 'Select a file from the list'}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {entries.some((e) => e.status === 'awaiting-crop')
                      ? `${entries.filter((e) => e.status === 'awaiting-crop').length} file(s) waiting to be cropped`
                      : 'Click any completed file in the sidebar'}
                  </p>
                </div>
              )}
            </div>

            {/* ── Right Sidebar (Settings & Metrics) ── */}
            <div
              className={`
              absolute inset-y-0 right-0 z-40 w-72 flex-col
              bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800
              transition-transform duration-200 ease-in-out overflow-y-auto
              md:relative md:translate-x-0 md:z-auto
              ${settingsOpen ? 'flex translate-x-0 shadow-xl md:shadow-none' : 'hidden md:hidden translate-x-full'}
            `}
            >
              <div className="flex-shrink-0 p-4 space-y-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Output Settings
                </span>
                <ControlPanel
                  format={activeEntry?.format ?? 'jpeg'}
                  quality={activeEntry?.quality ?? 85}
                  colors={activeEntry?.colors ?? 256}
                  scale={activeEntry?.scale ?? 100}
                  setFormat={(f) =>
                    handleUpdateSettings(
                      f,
                      activeEntry?.quality ?? 85,
                      activeEntry?.colors ?? 256,
                      activeEntry?.scale ?? 100,
                    )
                  }
                  setQuality={(q) =>
                    handleUpdateSettings(
                      activeEntry?.format ?? 'jpeg',
                      q,
                      activeEntry?.colors ?? 256,
                      activeEntry?.scale ?? 100,
                    )
                  }
                  setColors={(c) =>
                    handleUpdateSettings(
                      activeEntry?.format ?? 'jpeg',
                      activeEntry?.quality ?? 85,
                      c,
                      activeEntry?.scale ?? 100,
                    )
                  }
                  setScale={(s) =>
                    handleUpdateSettings(
                      activeEntry?.format ?? 'jpeg',
                      activeEntry?.quality ?? 85,
                      activeEntry?.colors ?? 256,
                      s,
                    )
                  }
                  disabled={!activeEntry?.originalImageData || activeEntry.status === 'processing'}
                />
              </div>

              {/* Metrics Panel */}
              <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Compression Metrics
                  </span>
                </div>
                <div className="px-4 py-3">
                  <MetricsPanel
                    metrics={activeEntry?.metrics ?? null}
                    isProcessing={activeEntry?.status === 'processing'}
                    compressedBlobUrl={activeEntry?.compressedBlobUrl ?? null}
                    format={activeEntry?.format ?? 'jpeg'}
                    fileName={activeEntry?.name ?? 'image'}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Image Editor Modal ── */}
      {editingId && editingEntry && (
        <ImageEditor
          imageSrc={editingEntry.originalSrc}
          fileName={editingEntry.name}
          initialCropState={editingEntry.cropState}
          queue={editorQueue}
          onSave={(file, cropState) => handleEditorSave(cropState, file)}
          onSkip={handleEditorSkip}
          onSkipAll={handleEditorSkipAll}
          onCancel={handleEditorCancel}
          onJumpTo={handleJumpTo}
        />
      )}
    </div>
  );
}

export default App;

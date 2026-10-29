import React, { useState } from 'react';
import { ExtractedArchive, VaultSettings } from '../types';
import {
  X,
  Play,
  Pause,
  Download,
  FolderArchive,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  FileCode,
  Eye,
  Maximize2,
  Volume2,
  VolumeX,
  Film,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  downloadMarkdownFile,
  downloadObsidianZipPackage,
  formatObsidianMarkdown,
  generateFilename,
  openInObsidianURI,
} from '../utils/obsidian';

interface ReaderModeOverlayProps {
  archive: ExtractedArchive;
  settings: VaultSettings;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const ReaderModeOverlay: React.FC<ReaderModeOverlayProps> = ({
  archive,
  settings,
  onClose,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'reader' | 'markdown'>('reader');
  const [copied, setCopied] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const currentMedia = archive.mediaList[activeMediaIndex] || archive.mediaList[0];

  const handleCopy = async () => {
    const md = formatObsidianMarkdown(archive, settings);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setZipProgress('Packaging...');
      setErrorMessage(null);
      await downloadObsidianZipPackage(archive, settings, (status) => {
        setZipProgress(status);
      });
      setTimeout(() => setZipProgress(null), 1500);
    } catch (err: any) {
      setErrorMessage(`ZIP packaging failed: ${err?.message || 'Error'}`);
      setZipProgress(null);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl relative my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60">
              {archive.platform}
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              {generateFilename(archive, settings)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View tabs */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('reader')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'reader'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Reader</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('markdown')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'markdown'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Obsidian MD</span>
              </button>
            </div>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(archive.id);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                title="Delete this note from Vault"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Close reader overlay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-6 py-2 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Content Body */}

        {activeTab === 'reader' ? (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
            {/* Left Column: Media Player (Video / High-Res Carousel) */}
            <div className="lg:col-span-5 xl:col-span-4 p-5 sm:p-6 flex flex-col justify-between bg-zinc-950 space-y-4">
              <div className="space-y-4">
                {currentMedia ? (
                  <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-xl group">
                    {archive.mediaList.length > 1 && (
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg bg-black/75 border border-zinc-700/80 text-xs font-mono text-zinc-200">
                          Slide {activeMediaIndex + 1} / {archive.mediaList.length}
                        </span>
                        <div className="flex items-center gap-1 pointer-events-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMediaIndex((prev) =>
                                prev > 0 ? prev - 1 : archive.mediaList.length - 1
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
                            title="Previous slide"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMediaIndex((prev) =>
                                prev < archive.mediaList.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
                            title="Next slide"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                    {currentMedia.type === 'video' ? (
                      <video
                        key={currentMedia.id}
                        src={currentMedia.proxyUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[500px] object-contain mx-auto bg-black"
                      />
                    ) : (
                      <img
                        key={currentMedia.id}
                        src={currentMedia.proxyUrl}
                        alt={currentMedia.alt || archive.title}
                        className="w-full max-h-[500px] object-contain mx-auto bg-zinc-950"
                      />
                    )}
                    <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-zinc-300 flex items-center gap-1.5 truncate max-w-[180px]">
                        {currentMedia.type === 'video' ? (
                          <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                        <span className="truncate">{currentMedia.filename}</span>
                      </span>
                      <a
                        href={`${currentMedia.proxyUrl}&download=1&filename=${encodeURIComponent(currentMedia.filename)}`}
                        download={currentMedia.filename}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-sm transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-zinc-500 text-xs">
                    No visual media attached for this post.
                  </div>
                )}

                {/* Additional media thumbnails if multiple */}
                {archive.mediaList.length > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Swipe Gallery ({archive.mediaList.length})
                      </span>
                      <span className="text-[11px] text-zinc-500">Click thumbnail to preview</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {archive.mediaList.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setActiveMediaIndex(idx)}
                          className={`relative aspect-square rounded-lg overflow-hidden border transition-all group block bg-zinc-900 ${
                            activeMediaIndex === idx
                              ? 'border-purple-500 ring-2 ring-purple-500/40'
                              : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                          title={`Slide ${idx + 1}: ${m.filename}`}
                        >
                          {m.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/60 text-purple-400">
                              <Film className="w-4 h-4" />
                            </div>
                          ) : (
                            <img
                              src={m.proxyUrl}
                              alt={m.filename}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/75 text-[10px] font-mono text-zinc-200">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Obsidian Quick Export Strip */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 mt-4">
                <span className="text-xs font-medium text-zinc-300">Export for Vault</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={!!zipProgress}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>{zipProgress || 'Download Vault ZIP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openInObsidianURI(archive, settings)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Open Obsidian</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Post Content, Author, AI Summary, Tags */}
            <div className="lg:col-span-7 xl:col-span-8 p-6 sm:p-8 md:p-10 overflow-y-auto space-y-6 bg-zinc-950/70">
              {/* Author Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  {archive.author.avatarUrl ? (
                    <img
                      src={archive.author.avatarUrl}
                      alt={archive.author.name}
                      className="w-12 h-12 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-800 flex items-center justify-center text-white font-bold text-sm">
                      {archive.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-zinc-100 text-base leading-snug">
                      {archive.author.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      {archive.author.handle && (
                        <span className="font-mono text-xs text-zinc-400">
                          {archive.author.handle}
                        </span>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {archive.publishedDate || archive.archivedDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Font Size Adjuster */}
                  <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFontSize('normal')}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        fontSize === 'normal' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Normal font size"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize('large')}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        fontSize === 'large' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Large font size"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize('xlarge')}
                      className={`px-2 py-1 rounded text-sm font-bold transition-colors ${
                        fontSize === 'xlarge' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Extra Large font size"
                    >
                      A++
                    </button>
                  </div>

                  <a
                    href={archive.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* AI Summary Banner */}
              {archive.summary && (
                <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Summary & Takeaways</span>
                  </div>
                  <p className="text-xs sm:text-sm text-purple-100/90 whitespace-pre-line leading-relaxed font-sans">
                    {archive.summary}
                  </p>
                </div>
              )}

              {/* Title & Full Text (Spacious & highly legible caption) */}
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-100 leading-snug tracking-tight">
                  {archive.title}
                </h2>
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-7 shadow-sm">
                  <div
                    className={`text-zinc-100 whitespace-pre-line font-normal select-text tracking-normal font-sans ${
                      fontSize === 'xlarge'
                        ? 'text-lg sm:text-xl leading-loose'
                        : fontSize === 'large'
                        ? 'text-base sm:text-lg leading-relaxed sm:leading-loose'
                        : 'text-sm sm:text-base leading-relaxed'
                    }`}
                  >
                    {archive.content}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {archive.stats && Object.keys(archive.stats).length > 0 && (
                <div className="flex items-center gap-5 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
                  {archive.stats.likes !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      {Number(archive.stats.likes).toLocaleString()} Likes
                    </span>
                  )}
                  {archive.stats.shares !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      {Number(archive.stats.shares).toLocaleString()} Shares
                    </span>
                  )}
                  {archive.stats.comments !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                      {Number(archive.stats.comments).toLocaleString()} Comments
                    </span>
                  )}
                </div>
              )}

              {/* Hashtags */}
              {archive.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {archive.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Full Obsidian Markdown code viewer */
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono text-purple-300">
                {settings.notesFolder}/{generateFilename(archive, settings)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
            <pre className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
              {formatObsidianMarkdown(archive, settings)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

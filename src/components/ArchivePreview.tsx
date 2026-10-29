import React, { useState } from 'react';
import {
  ExtractedArchive,
  VaultSettings,
  MediaItem,
} from '../types';
import {
  openInObsidianURI,
  downloadMarkdownFile,
  downloadObsidianZipPackage,
  formatObsidianMarkdown,
  generateFilename,
} from '../utils/obsidian';
import {
  Copy,
  Check,
  Download,
  FolderArchive,
  ExternalLink,
  Edit3,
  Eye,
  FileCode,
  Image as ImageIcon,
  Heart,
  Share2,
  MessageCircle,
  Save,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';

import { ReaderModeOverlay } from './ReaderModeOverlay';

interface ArchivePreviewProps {
  archive: ExtractedArchive;
  settings: VaultSettings;
  onSaveToLibrary: (archive: ExtractedArchive) => void;
  isSavedInLibrary: boolean;
  onUpdateArchive: (updated: ExtractedArchive) => void;
}

export const ArchivePreview: React.FC<ArchivePreviewProps> = ({
  archive,
  settings,
  onSaveToLibrary,
  isSavedInLibrary,
  onUpdateArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown' | 'attachments'>('visual');
  const [copied, setCopied] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState(() =>
    formatObsidianMarkdown(archive, settings)
  );

  React.useEffect(() => {
    setEditedMarkdown(formatObsidianMarkdown(archive, settings));
  }, [archive, settings]);

  const filename = generateFilename(archive, settings);

  const handleCopy = async () => {
    try {
      const textToCopy = isEditingMarkdown
        ? editedMarkdown
        : formatObsidianMarkdown(archive, settings);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPreviewError('Failed to copy to clipboard.');
      setTimeout(() => setPreviewError(null), 3000);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setZipProgress('Packaging...');
      setPreviewError(null);
      await downloadObsidianZipPackage(archive, settings, (status) => {
        setZipProgress(status);
      });
      setTimeout(() => setZipProgress(null), 1500);
    } catch (err: any) {
      setPreviewError(`Error generating ZIP: ${err?.message || 'Unknown error'}`);
      setZipProgress(null);
      setTimeout(() => setPreviewError(null), 4000);
    }
  };

  const handleOpenObsidian = () => {
    openInObsidianURI(archive, settings);
  };


  const handleDownloadMd = () => {
    downloadMarkdownFile(archive, settings);
  };

  const handleDownloadAllMedia = async () => {
    for (let i = 0; i < archive.mediaList.length; i++) {
      const m = archive.mediaList[i];
      const dlUrl = `${m.proxyUrl}&download=1&filename=${encodeURIComponent(m.filename)}`;
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = m.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Small delay between downloads so browsers allow multiple files
      if (i < archive.mediaList.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-4">
      {previewError && (
        <div className="bg-rose-950/80 border border-rose-800 rounded-xl px-4 py-2 text-xs text-rose-200 flex items-center justify-between">
          <span>{previewError}</span>
          <button type="button" onClick={() => setPreviewError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Banner & Action Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60">
              {archive.platform}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {filename}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 mt-1 line-clamp-1">
            {archive.title}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Copy Markdown */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            title="Copy Obsidian Markdown note to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Note</span>
              </>
            )}
          </button>

          {/* Download .md */}
          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            title="Download .md file only"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>.md Only</span>
          </button>

          {/* Download Full Vault ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={!!zipProgress}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
            title="Download complete ZIP containing markdown note and all media in the exact vault structure"
          >
            {zipProgress ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{zipProgress}</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Download Vault ZIP</span>
              </>
            )}
          </button>

          {/* Reader Mode (matching social-archive.org/yukizr/3OtpdojyiP#reader) */}
          <button
            onClick={() => setIsReaderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-purple-800/50 text-purple-300 text-xs font-medium transition-colors"
            title="Open Reader Mode with playable video & full notes"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Reader Mode</span>
          </button>

          {/* Open directly in Obsidian */}
          <button
            onClick={handleOpenObsidian}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-200 text-xs font-medium transition-colors"
            title="Open or create directly in your installed Obsidian app"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open in Obsidian</span>
          </button>

          {/* Save to Vault Library */}
          <button
            onClick={() => onSaveToLibrary(archive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isSavedInLibrary
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
          >
            {isSavedInLibrary ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save to Library</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Card with Tabs */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-6 py-2.5 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'visual'
                  ? 'bg-zinc-800 text-purple-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Card</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'markdown'
                  ? 'bg-zinc-800 text-purple-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Obsidian Markdown</span>
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'attachments'
                  ? 'bg-zinc-800 text-purple-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media Attachments ({archive.mediaList.length})</span>
            </button>
          </div>

          <a
            href={archive.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>Original Post</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Tab 1: Visual Card */}
        {activeTab === 'visual' && (
          <div className="p-6 space-y-6">
            {/* Author info & Metadata */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {archive.author.avatarUrl ? (
                  <img
                    src={archive.author.avatarUrl}
                    alt={archive.author.name}
                    className="w-12 h-12 rounded-full border border-zinc-700 object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-800 flex items-center justify-center text-white font-bold text-base">
                    {archive.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-100 text-base">{archive.author.name}</h3>
                    {archive.author.handle && (
                      <span className="text-xs text-zinc-400 font-mono">{archive.author.handle}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {archive.publishedDate || archive.archivedDate}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{archive.platform}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Banner if present */}
            {archive.summary && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Summary & Takeaways</span>
                </div>
                <div className="text-xs text-purple-100/90 whitespace-pre-line leading-relaxed">
                  {archive.summary}
                </div>
              </div>
            )}

            {/* Post Content */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 text-zinc-100 text-sm sm:text-base leading-relaxed whitespace-pre-line font-sans select-text">
              {archive.content}
            </div>

            {/* Media Gallery / Players */}
            {archive.mediaList.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Media ({archive.mediaList.length})
                  </h4>
                  {archive.mediaList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAllMedia}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-700/50 text-purple-200 text-xs font-medium transition-colors"
                    >
                      <Download className="w-3 h-3 text-purple-400" />
                      <span>Download All ({archive.mediaList.length})</span>
                    </button>
                  )}
                </div>
                <div className={`grid gap-3 ${archive.mediaList.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {archive.mediaList.map((m, idx) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 group relative flex flex-col justify-between"
                    >
                      {archive.mediaList.length > 1 && (
                        <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/75 border border-zinc-700/80 text-[11px] font-mono text-zinc-200">
                          {idx + 1} / {archive.mediaList.length}
                        </span>
                      )}
                      {m.type === 'video' ? (
                        <video
                          src={m.proxyUrl}
                          controls
                          className="w-full max-h-[440px] object-contain bg-black"
                        />
                      ) : (
                        <img
                          src={m.proxyUrl}
                          alt={m.alt || 'Post attachment'}
                          className="w-full max-h-[440px] object-contain bg-zinc-950 group-hover:scale-[1.01] transition-transform duration-200"
                          loading="lazy"
                        />
                      )}
                      <div className="p-2.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                          {m.filename}
                        </span>
                        <a
                          href={`${m.proxyUrl}&download=1&filename=${encodeURIComponent(m.filename)}`}
                          download={m.filename}
                          className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[11px]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Save</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Stats if available */}
            {archive.stats && Object.keys(archive.stats).length > 0 && (
              <div className="flex items-center gap-6 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
                {archive.stats.likes !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    {archive.stats.likes.toLocaleString?.() || archive.stats.likes} Likes
                  </span>
                )}
                {archive.stats.shares !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    {archive.stats.shares.toLocaleString?.() || archive.stats.shares} Shares
                  </span>
                )}
                {archive.stats.comments !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                    {archive.stats.comments.toLocaleString?.() || archive.stats.comments} Comments
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            {archive.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {archive.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Obsidian Markdown */}
        {activeTab === 'markdown' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono text-purple-300">
                {settings.notesFolder}/{filename}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMarkdown(!isEditingMarkdown)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                >
                  <Edit3 className="w-3 h-3" />
                  {isEditingMarkdown ? 'Locked Preview' : 'Edit Markdown'}
                </button>
              </div>
            </div>

            {isEditingMarkdown ? (
              <textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                rows={18}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-purple-500 leading-relaxed resize-y"
              />
            ) : (
              <pre className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {editedMarkdown}
              </pre>
            )}

            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Embed syntax: {settings.embedStyle === 'wikilink' ? '![[attachment.ext]] (Obsidian Wikilink)' : '![](attachments/...) (Standard Markdown)'}</span>
              <span>Vault: {settings.vaultName}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Media Attachments */}
        {activeTab === 'attachments' && (
          <div className="p-6 space-y-4">
            {archive.mediaList.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                No local media attachments found for this post.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-zinc-400">
                    These files will be downloaded directly into your vault's <code className="text-purple-300 font-mono">{settings.attachmentsFolder}/</code> folder when downloading the ZIP package:
                  </p>
                  {archive.mediaList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAllMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shrink-0 self-start sm:self-auto"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All ({archive.mediaList.length})</span>
                    </button>
                  )}
                </div>
                <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                  {archive.mediaList.map((m, index) => (
                    <div
                      key={m.id}
                      className="p-3 sm:p-4 flex items-center justify-between gap-4 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {m.type === 'video' ? (
                            <video src={m.proxyUrl} className="w-full h-full object-cover" />
                          ) : (
                            <img src={m.proxyUrl} alt={m.filename} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-zinc-200 truncate">{m.filename}</p>
                          <p className="text-[11px] text-zinc-500 capitalize">{m.type} attachment · Slide #{index + 1}</p>
                        </div>
                      </div>

                      <a
                        href={`${m.proxyUrl}&download=1&filename=${encodeURIComponent(m.filename)}`}
                        download={m.filename}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reader Mode Overlay */}
      {isReaderOpen && (
        <ReaderModeOverlay
          archive={archive}
          settings={settings}
          onClose={() => setIsReaderOpen(false)}
        />
      )}
    </div>
  );
};

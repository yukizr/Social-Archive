import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ExtractedArchive,
  VaultSettings,
} from '../types';
import {
  Search,
  SlidersHorizontal,
  Download,
  FolderArchive,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  FileCode,
  Globe,
  LayoutGrid,
  List,
  Newspaper,
  Image as ImageIcon,
  Type,
  Play,
  Film,
  ArrowUpDown,
  Filter,
  Eye,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import {
  downloadBulkObsidianZip,
  downloadMarkdownFile,
  downloadObsidianZipPackage,
  formatObsidianMarkdown,
  openInObsidianURI,
} from '../utils/obsidian';
import { ReaderModeOverlay } from './ReaderModeOverlay';

export type ListingType = 'mosaic' | 'timeline' | 'list' | 'media' | 'text';

interface VaultLibraryProps {
  archives: ExtractedArchive[];
  settings: VaultSettings;
  onSelectArchive: (archive: ExtractedArchive) => void;
  onDeleteArchive: (id: string) => void;
  onClearAll: () => void;
  onLoadDemos?: () => void;
}

export const VaultLibrary: React.FC<VaultLibraryProps> = ({
  archives,
  settings,
  onSelectArchive,
  onDeleteArchive,
  onClearAll,
  onLoadDemos,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [listingType, setListingType] = useState<ListingType>('mosaic');
  const [zoomLevel, setZoomLevel] = useState<number>(310); // card min-width in px
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'likes' | 'title'>('date-desc');
  const [readerArchive, setReaderArchive] = useState<ExtractedArchive | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract platforms
  const platforms = useMemo(() => {
    const set = new Set<string>();
    archives.forEach((a) => set.add(a.platform));
    return ['all', ...Array.from(set)];
  }, [archives]);

  // Filter & Sort
  const filteredArchives = useMemo(() => {
    let result = archives.filter((a) => {
      const matchesSearch =
        searchTerm === '' ||
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.author.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlatform =
        selectedPlatform === 'all' || a.platform === selectedPlatform;

      return matchesSearch && matchesPlatform;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return (b.publishedDate || b.archivedDate).localeCompare(a.publishedDate || a.archivedDate);
      } else if (sortBy === 'date-asc') {
        return (a.publishedDate || a.archivedDate).localeCompare(b.publishedDate || b.archivedDate);
      } else if (sortBy === 'likes') {
        const likesA = Number(a.stats?.likes) || 0;
        const likesB = Number(b.stats?.likes) || 0;
        return likesB - likesA;
      } else {
        return a.title.localeCompare(b.title);
      }
    });
  }, [archives, searchTerm, selectedPlatform, sortBy]);

  const handleCopy = async (archive: ExtractedArchive, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = formatObsidianMarkdown(archive, settings);
    await navigator.clipboard.writeText(md);
    setCopiedId(archive.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkExport = async () => {
    if (archives.length === 0) return;
    try {
      setBulkProgress('Packaging Vault ZIP...');
      setErrorMessage(null);
      await downloadBulkObsidianZip(archives, settings, (status) => {
        setBulkProgress(status);
      });
      setTimeout(() => setBulkProgress(null), 1500);
    } catch (err: any) {
      setErrorMessage(`Bulk export failed: ${err?.message || 'Unknown error'}`);
      setBulkProgress(null);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Helper to get preview image or video poster
  const getMediaCover = (archive: ExtractedArchive) => {
    const video = archive.mediaList.find((m) => m.type === 'video');
    const image = archive.mediaList.find((m) => m.type === 'image');
    return {
      hasVideo: !!video,
      videoUrl: video?.proxyUrl,
      imageUrl: image?.proxyUrl,
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <span>Obsidian Vault Library</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-zinc-800 text-purple-300">
              {archives.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personal local archive with interactive listing layouts, media playback, and Obsidian export.
          </p>
        </div>

        {archives.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkExport}
              disabled={!!bulkProgress}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>{bulkProgress || 'Export All as Vault ZIP'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900 transition-colors cursor-pointer"
              title="Delete all saved archives"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Inline Error Notice if bulk export fails */}
      {errorMessage && (
        <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {/* Filter, Search & Layout Control Toolbar (matches screenshot 1 & 2) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
        {/* Search */}

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts, creators, keywords, tags..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Platform Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize shrink-0 transition-colors ${
                selectedPlatform === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Right Toolbar: Sort, Listing Switcher & Zoom Slider */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
          {/* Sort By Toggle */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                sortBy.startsWith('date') ? 'text-purple-300 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={sortBy === 'date-desc' ? 'Sorted by Date (Newest)' : 'Sorted by Date (Oldest)'}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'likes' ? 'date-desc' : 'likes')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                sortBy === 'likes' ? 'text-purple-300 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Sort by Likes & Engagement"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW TYPE DROPDOWN (Matches screenshot 2) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
              className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                isViewDropdownOpen
                  ? 'bg-zinc-800 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
              }`}
              title="Type of listing"
            >
              <LayoutGrid className="w-4 h-4 text-purple-400" />
            </button>

            {/* Dropdown Menu (Matches Screenshot 2) */}
            {isViewDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setListingType('timeline');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    listingType === 'timeline'
                      ? 'bg-purple-950/60 text-purple-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Newspaper className="w-4 h-4 text-zinc-400" />
                  <span>Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setListingType('list');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    listingType === 'list'
                      ? 'bg-purple-950/60 text-purple-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4 text-zinc-400" />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setListingType('media');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    listingType === 'media'
                      ? 'bg-purple-950/60 text-purple-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                  <span>Media</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setListingType('mosaic');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    listingType === 'mosaic'
                      ? 'bg-purple-950/60 text-purple-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300">Mosaic</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setListingType('text');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    listingType === 'text'
                      ? 'bg-purple-950/60 text-purple-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Type className="w-4 h-4 text-zinc-400" />
                  <span>Text</span>
                </button>
              </div>
            )}
          </div>

          {/* ZOOM SLIDER (Matches screenshot 1) */}
          {(listingType === 'mosaic' || listingType === 'media') && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="text-xs text-zinc-400 font-medium">Zoom</span>
              <input
                type="range"
                min="200"
                max="440"
                step="20"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-20 sm:w-28 accent-purple-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                title="Zoom grid card size"
              />
            </div>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredArchives.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7 text-purple-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-zinc-200">
              {archives.length === 0 ? 'Your Obsidian Library is Empty' : 'No matching archives found'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {archives.length === 0
                ? 'Archive posts from Instagram Reels, X/Twitter, TikTok, YouTube, or Substack to start building your visual personal knowledge base.'
                : 'Try adjusting your search query or platform filters.'}
            </p>
          </div>

          {archives.length === 0 && onLoadDemos && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onLoadDemos}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xl shadow-purple-950/50 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Load Sample Notes for Preview</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* LISTING MODES */
        <div>
          {/* VIEW 1: MOSAIC (Matches Screenshot 1) */}
          {listingType === 'mosaic' && (
            <div
              className="grid gap-4 sm:gap-6 justify-center"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${zoomLevel}px, 1fr))`,
              }}
            >
              {filteredArchives.map((archive) => {
                const mediaInfo = getMediaCover(archive);
                return (
                  <div
                    key={archive.id}
                    onClick={() => setReaderArchive(archive)}
                    className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer shadow-lg aspect-[9/16] flex flex-col justify-end"
                  >
                    {/* Media Background */}
                    {mediaInfo.imageUrl ? (
                      <img
                        src={mediaInfo.imageUrl}
                        alt={archive.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : mediaInfo.videoUrl ? (
                      <video
                        src={`${mediaInfo.videoUrl}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-purple-950/40 p-6 flex flex-col justify-between">
                        <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider">
                          {archive.platform}
                        </span>
                        <p className="text-xs text-zinc-400 line-clamp-6 leading-relaxed">
                          {archive.content}
                        </p>
                      </div>
                    )}

                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

                    {/* Video badge in top right */}
                    {mediaInfo.hasVideo && (
                      <div className="absolute top-3 right-11 p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-md">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    )}

                    {/* Delete button on hover in top right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArchive(archive.id);
                      }}
                      className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
                      title="Delete from Library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Platform Tag in top left */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-black/60 backdrop-blur-md text-purple-300 border border-white/10">
                        {archive.platform}
                      </span>
                    </div>

                    {/* Bottom Caption Overlay (Matches Screenshot 1) */}
                    <div className="relative z-10 p-4 space-y-1">
                      <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-purple-200 transition-colors">
                        {archive.title}
                      </h3>
                      <p className="text-xs text-zinc-300/80 line-clamp-1 font-medium">
                        {archive.author.name || archive.author.handle}
                      </p>

                      {/* Hover action bar */}
                      <div className="pt-2 flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-purple-300 font-semibold flex items-center gap-1 text-[11px]">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open Reader</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(archive, e)}
                            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                            title="Copy Markdown"
                          >
                            {copiedId === archive.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteArchive(archive.id);
                            }}
                            className="p-1 rounded bg-zinc-800/80 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 text-xs transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: TIMELINE */}
          {listingType === 'timeline' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {filteredArchives.map((archive) => {
                const mediaInfo = getMediaCover(archive);
                return (
                  <div
                    key={archive.id}
                    onClick={() => setReaderArchive(archive)}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all cursor-pointer shadow-md space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {archive.author.avatarUrl ? (
                          <img
                            src={archive.author.avatarUrl}
                            alt={archive.author.name}
                            className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-800 flex items-center justify-center font-bold text-white text-xs">
                            {archive.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-100">{archive.author.name}</span>
                            <span className="text-xs text-zinc-500 font-mono">{archive.author.handle}</span>
                          </div>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {archive.publishedDate || archive.archivedDate} · {archive.platform.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteArchive(archive.id);
                        }}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-zinc-100">{archive.title}</h3>
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
                        {archive.content}
                      </p>
                    </div>

                    {/* Media Preview if attached */}
                    {(mediaInfo.imageUrl || mediaInfo.videoUrl) && (
                      <div className="relative rounded-xl overflow-hidden bg-black max-h-72 border border-zinc-800">
                        {mediaInfo.imageUrl ? (
                          <img
                            src={mediaInfo.imageUrl}
                            alt={archive.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={`${mediaInfo.videoUrl}#t=0.1`}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full max-h-72 object-cover pointer-events-none"
                          />
                        )}
                        {mediaInfo.hasVideo && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="p-3 rounded-full bg-purple-600 text-white shadow-xl">
                              <Play className="w-6 h-6 fill-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                      <span className="text-purple-400 font-medium flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open in Reader Mode</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(archive, e)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadObsidianZipPackage(archive, settings);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-400"
                        >
                          <FolderArchive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: LIST TABLE */}
          {listingType === 'list' && (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/80">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Media</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredArchives.map((archive) => {
                    const hasVideo = archive.mediaList.some((m) => m.type === 'video');
                    return (
                      <tr
                        key={archive.id}
                        onClick={() => setReaderArchive(archive)}
                        className="hover:bg-zinc-850/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-zinc-100 max-w-xs truncate group-hover:text-purple-300">
                          {archive.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            {archive.platform}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">{archive.author.name}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">
                          {hasVideo ? (
                            <span className="text-purple-400 flex items-center gap-1">
                              <Film className="w-3 h-3" />
                              Video ({archive.mediaList.length})
                            </span>
                          ) : (
                            <span>{archive.mediaList.length} files</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                          {archive.publishedDate || archive.archivedDate}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setReaderArchive(archive)}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-purple-400"
                              title="Reader Mode"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openInObsidianURI(archive, settings)}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-indigo-300"
                              title="Open Obsidian"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteArchive(archive.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 4: MEDIA GRID */}
          {listingType === 'media' && (
            <div
              className="grid gap-4 justify-center"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${zoomLevel}px, 1fr))`,
              }}
            >
              {filteredArchives.map((archive) => {
                const mediaInfo = getMediaCover(archive);
                return (
                  <div
                    key={archive.id}
                    onClick={() => setReaderArchive(archive)}
                    className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-purple-500 transition-all cursor-pointer aspect-square shadow-md"
                  >
                    {mediaInfo.imageUrl ? (
                      <img
                        src={mediaInfo.imageUrl}
                        alt={archive.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : mediaInfo.videoUrl ? (
                      <video
                        src={`${mediaInfo.videoUrl}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-600 text-xs">
                        No Media
                      </div>
                    )}

                    {/* Delete button on hover in top-right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArchive(archive.id);
                      }}
                      className="absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/70 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Video play icon center */}
                    {mediaInfo.hasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Bottom caption overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <p className="font-bold text-xs text-white truncate">{archive.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{archive.author.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 5: TEXT (Clean Obsidian Document View) */}
          {listingType === 'text' && (
            <div className="space-y-3">
              {filteredArchives.map((archive) => (
                <div
                  key={archive.id}
                  onClick={() => setReaderArchive(archive)}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                        {archive.platform}
                      </span>
                      <span className="text-xs text-zinc-400">{archive.author.name}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">{archive.publishedDate || archive.archivedDate}</span>
                    </div>
                    <h3 className="font-bold text-sm text-zinc-100 truncate">{archive.title}</h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{archive.content}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(archive, e)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                      title="Copy Markdown"
                    >
                      {copiedId === archive.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInObsidianURI(archive, settings)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-xs"
                      title="Open in Obsidian"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteArchive(archive.id)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 text-xs transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Footer (Matches Screenshot 1) */}
          <div className="text-center py-10 space-y-1 text-xs text-zinc-500">
            <p>Showing {filteredArchives.length} of {archives.length} archives</p>
            <p className="text-zinc-600">You have reached the end.</p>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION IN-APP MODAL (no browser confirm) */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">Clear Entire Vault Library?</h3>
                <p className="text-xs text-zinc-400">This will remove all {archives.length} archived posts from your list.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to clear your saved archives? You can always restore the sample posts or archive new URLs whenever you like.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All ({archives.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READER MODE OVERLAY */}
      {readerArchive && (
        <ReaderModeOverlay
          archive={readerArchive}
          settings={settings}
          onClose={() => setReaderArchive(null)}
          onDelete={(id) => {
            onDeleteArchive(id);
            setReaderArchive(null);
          }}
        />
      )}
    </div>
  );
};


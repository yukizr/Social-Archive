import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  Clipboard,
  ArrowRight,
  SlidersHorizontal,
  Tags,
  FileCode,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Share2,
} from 'lucide-react';
import { VaultSettings, ExtractedArchive } from '../types';
import { DEMO_ARCHIVES } from '../utils/demoData';

interface ArchiveInputProps {
  onArchive: (url: string, options: {
    aiEnrichment: boolean;
    obsidianEmbedStyle: 'wikilink' | 'standard';
    customTags: string[];
  }) => Promise<void>;
  isLoading: boolean;
  statusMessage: string;
  settings: VaultSettings;
  onOpenManualPaste: () => void;
  onLoadDemo?: (demoArchive: ExtractedArchive) => void;
}

export const ArchiveInput: React.FC<ArchiveInputProps> = ({
  onArchive,
  isLoading,
  statusMessage,
  settings,
  onOpenManualPaste,
  onLoadDemo,
}) => {
  const [url, setUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [aiEnrichment, setAiEnrichment] = useState(settings.autoAiSummary);
  const [embedStyle, setEmbedStyle] = useState<'wikilink' | 'standard'>(settings.embedStyle);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [inputError, setInputError] = useState('');

  // Detect platform as user types
  const getPlatformInfo = (targetUrl: string) => {
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('twitter.com') || host.includes('x.com')) return { name: 'X / Twitter', color: 'text-sky-400 bg-sky-950/40 border-sky-800/50' };
      if (host.includes('instagram.com')) return { name: 'Instagram', color: 'text-pink-400 bg-pink-950/40 border-pink-800/50' };
      if (host.includes('tiktok.com')) return { name: 'TikTok', color: 'text-rose-400 bg-rose-950/40 border-rose-800/50' };
      if (host.includes('youtube.com') || host.includes('youtu.be')) return { name: 'YouTube', color: 'text-red-400 bg-red-950/40 border-red-800/50' };
      if (host.includes('threads.net') || host.includes('threads.com')) return { name: 'Threads', color: 'text-zinc-300 bg-zinc-900 border-zinc-700' };
      if (host.includes('linkedin.com')) return { name: 'LinkedIn', color: 'text-blue-400 bg-blue-950/40 border-blue-800/50' };
      if (host.includes('facebook.com') || host.includes('fb.watch')) return { name: 'Facebook', color: 'text-blue-500 bg-blue-950/40 border-blue-800/50' };
      if (host.includes('reddit.com') || host.includes('redd.it')) return { name: 'Reddit', color: 'text-orange-400 bg-orange-950/40 border-orange-800/50' };
      if (host.includes('substack.com')) return { name: 'Substack', color: 'text-orange-500 bg-orange-950/40 border-orange-800/50' };
      if (host.includes('medium.com')) return { name: 'Medium', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' };
      return { name: 'Web Article', color: 'text-purple-400 bg-purple-950/40 border-purple-800/50' };
    } catch {
      return null;
    }
  };

  const detected = url ? getPlatformInfo(url) : null;

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setInputError('');
      }
    } catch {
      setInputError('Could not read clipboard. Please paste manually into the box.');
    }
  };

  const handleAddTag = () => {
    const trimmed = customTagInput.trim().replace(/^#/, '');
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags([...customTags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setInputError('Please enter or paste a valid URL');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setInputError('URL must start with http:// or https://');
      return;
    }
    setInputError('');
    onArchive(url.trim(), {
      aiEnrichment,
      obsidianEmbedStyle: embedStyle,
      customTags,
    });
  };

  // Quick test samples
  const sampleLinks = [
    { label: 'Instagram Reel (Video)', url: 'https://social-archive.org/yukizr/3OtpdojyiP#reader' },
    { label: 'Instagram Post', url: 'https://www.instagram.com/p/DbbsKo7SvNv/' },
    { label: 'YouTube Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'X / Twitter Post', url: 'https://x.com/levelsio/status/1765089201088741706' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Intro Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
          Archive Any Social Post into <span className="text-purple-400">Obsidian</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
          Extract text, author metadata, high-res images, and videos from 8+ platforms into clean markdown with properties. Zero monthly subscription fees.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="url-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                Post or Article URL
              </label>
              
              <div className="flex items-center gap-2">
                {detected && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${detected.color}`}>
                    {detected.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-zinc-800"
                >
                  <Clipboard className="w-3 h-3" />
                  Paste
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="https://x.com/..., https://instagram.com/p/..., https://tiktok.com/@..., youtube..."
                disabled={isLoading}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-4 pr-32 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
              />

              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className={`p-2 rounded-lg text-xs transition-colors ${
                    showOptions ? 'bg-zinc-800 text-purple-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                  title="Archive options & tags"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Archiving...</span>
                    </>
                  ) : (
                    <>
                      <span>Archive</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {inputError && (
              <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {inputError}
              </p>
            )}
          </div>

          {/* Quick options panel */}
          {showOptions && (
            <div className="pt-3 border-t border-zinc-800/80 space-y-3 bg-zinc-950/40 -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* AI enrichment */}
                <label className="flex items-start gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={aiEnrichment}
                    onChange={(e) => setAiEnrichment(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 bg-zinc-950 border-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Summary & Smart Tags</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Uses Gemini Flash to generate key takeaways and hashtags.
                    </p>
                  </div>
                </label>

                {/* Obsidian Embed style */}
                <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 mb-1.5">
                    <FileCode className="w-3.5 h-3.5 text-purple-400" />
                    <span>Media Embed Syntax</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEmbedStyle('wikilink')}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors font-mono text-[11px] ${
                        embedStyle === 'wikilink'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-semibold'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      ![[media.jpg]]
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmbedStyle('standard')}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors font-mono text-[11px] ${
                        embedStyle === 'standard'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-semibold'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      ![](attachments/)
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom tags */}
              <div>
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-1.5">
                  <Tags className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Custom Tags to append (Obsidian tags)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="e.g. readlater, design, ai, newsletter"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                  >
                    Add Tag
                  </button>
                </div>
                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {customTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400 ml-0.5 text-zinc-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading status feedback banner */}
          {isLoading && (
            <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              <div className="text-xs text-purple-200">
                <span className="font-semibold">Processing: </span>
                {statusMessage || 'Connecting to source and scraping metadata...'}
              </div>
            </div>
          )}
        </form>

        {/* Footer actions: quick samples & instant preview & manual paste */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-500 text-[11px]">Instant Demo Note:</span>
            {DEMO_ARCHIVES.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => onLoadDemo?.(demo)}
                className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-200 text-[11px] font-medium transition-colors flex items-center gap-1"
                title={`Preview ${demo.platform.toUpperCase()} note sample`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>
                  {demo.id === 'demo_ig_reel_archives'
                    ? 'Playable Reel Video'
                    : demo.platform === 'twitter'
                    ? 'X / Twitter Post'
                    : 'YouTube Video'}
                </span>
              </button>
            ))}

            <span className="text-zinc-600 text-[11px] ml-1">|</span>
            <span className="text-zinc-500 text-[11px]">Paste sample URL:</span>
            {sampleLinks.slice(0, 2).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setUrl(s.url);
                  setInputError('');
                }}
                className="text-zinc-400 hover:text-purple-300 underline underline-offset-2 text-[11px] transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenManualPaste}
            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px] transition-colors hover:underline shrink-0"
          >
            <FileText className="w-3 h-3 text-zinc-500" />
            Paste text/HTML manually
          </button>
        </div>
      </div>
    </div>
  );
};

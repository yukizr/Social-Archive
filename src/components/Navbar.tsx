import React from 'react';
import { Archive, BookOpen, Settings, Library, Sparkles, Plus, FolderSync } from 'lucide-react';
import { VaultSettings } from '../types';

interface NavbarProps {
  activeTab: 'archive' | 'library' | 'guide';
  setActiveTab: (tab: 'archive' | 'library' | 'guide') => void;
  savedCount: number;
  settings: VaultSettings;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  settings,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-purple-950/50">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100 tracking-tight text-lg">Social Archive</span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/50 text-purple-300">
                Obsidian Dupe
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Free personal archiver · Markdown + Attachments
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'archive'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Archive Post</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'library'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Vault Library</span>
            {savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-purple-300 border border-purple-500/20">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'guide'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Obsidian Guide</span>
          </button>
        </nav>

        {/* Vault settings button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition-colors"
            title="Configure Obsidian Vault folders and frontmatter"
          >
            <FolderSync className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline font-mono text-[11px] text-zinc-400 truncate max-w-[130px]">
              {settings.notesFolder}/
            </span>
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

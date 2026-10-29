import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ArchiveInput } from './components/ArchiveInput';
import { ArchivePreview } from './components/ArchivePreview';
import { VaultLibrary } from './components/VaultLibrary';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { ManualPasteModal } from './components/ManualPasteModal';
import { ExtractedArchive, VaultSettings } from './types';
import {
  loadSettings,
  saveSettings,
  loadArchives,
  saveArchiveItem,
  deleteArchiveItem,
  clearAllArchives,
  restoreDemoArchives,
} from './utils/storage';

import { DEMO_ARCHIVES } from './utils/demoData';
import {
  Archive,
  Layers,
  Sparkles,
  BookOpen,
  FolderArchive,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Video,
  FileText,
  Camera,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'archive' | 'library' | 'guide'>('archive');
  const [settings, setSettings] = useState<VaultSettings>(() => loadSettings());
  const [savedArchives, setSavedArchives] = useState<ExtractedArchive[]>(() => loadArchives());
  const [currentArchive, setCurrentArchive] = useState<ExtractedArchive | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualPasteOpen, setIsManualPasteOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync settings when updated
  const handleSaveSettings = (newSettings: VaultSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Perform archive extraction
  const handleArchive = async (
    url: string,
    options: {
      aiEnrichment: boolean;
      obsidianEmbedStyle: 'wikilink' | 'standard';
      customTags: string[];
    }
  ) => {
    setIsLoading(true);
    setArchiveError(null);
    setStatusMessage('Connecting to source URL and resolving author...');

    try {
      // Step feedback updates
      const timer1 = setTimeout(() => {
        setStatusMessage('Extracting post content, images, and videos...');
      }, 700);

      const timer2 = setTimeout(() => {
        setStatusMessage('Generating Obsidian YAML frontmatter & markdown...');
      }, 1500);

      const response = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: {
            ...options,
            attachmentsFolder: settings.attachmentsFolder,
            notesFolder: settings.notesFolder,
          },
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data: ExtractedArchive = await response.json();
      setCurrentArchive(data);

      // Auto-save into library so user never loses their extract
      const updatedList = saveArchiveItem(data);
      setSavedArchives(updatedList);
    } catch (err: any) {
      console.error('Archiving error:', err);
      setArchiveError(
        `Could not archive post: ${err.message || 'Unknown network error'}. Tip: If the post is behind a private login wall, click "Paste text/HTML manually" below to create your Obsidian note!`
      );
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };


  const handleSaveToLibrary = (archive: ExtractedArchive) => {
    const updated = saveArchiveItem(archive);
    setSavedArchives(updated);
  };

  const handleDeleteArchive = (id: string) => {
    const updated = deleteArchiveItem(id);
    setSavedArchives(updated);
    if (currentArchive?.id === id) {
      setCurrentArchive(null);
    }
  };

  const handleClearAllArchives = () => {
    clearAllArchives();
    setSavedArchives([]);
    setCurrentArchive(null);
  };

  const isSavedInLibrary = currentArchive
    ? savedArchives.some((a) => a.id === currentArchive.id)
    : false;

  // Platform badges supported
  const supportedPlatforms = [
    { name: 'X / Twitter', tag: 'Tweets, media, metrics' },
    { name: 'YouTube', tag: 'Videos, Shorts, thumbnails' },
    { name: 'TikTok', tag: 'Videos, audios, tags' },
    { name: 'Instagram', tag: 'Reels, photos, captions' },
    { name: 'Threads', tag: 'Posts & media' },
    { name: 'Substack & Blogs', tag: 'Full articles & headers' },
    { name: 'LinkedIn', tag: 'Posts & articles' },
    { name: 'Facebook', tag: 'Public posts & media' },
    { name: 'Reddit', tag: 'Discussions & images' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-900 selection:text-purple-100">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedArchives.length}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* TAB 1: ARCHIVE */}
        {activeTab === 'archive' && (
          <div className="space-y-8">
            {/* Inline Error Banner */}
            {archiveError && (
              <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 shadow-xl flex items-start justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-rose-100">Archive Notice</p>
                    <p className="text-rose-200/90 leading-relaxed">{archiveError}</p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsManualPasteOpen(true)}
                        className="font-medium underline hover:text-white transition-colors cursor-pointer"
                      >
                        Open Manual Text/HTML Paste Modal →
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setArchiveError(null)}
                  className="text-rose-400 hover:text-rose-100 p-1"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <ArchiveInput
              onArchive={handleArchive}
              isLoading={isLoading}
              statusMessage={statusMessage}
              settings={settings}
              onOpenManualPaste={() => setIsManualPasteOpen(true)}
              onLoadDemo={(demo) => {
                setCurrentArchive(demo);
              }}
            />

            {/* Extracted Post Result Preview */}
            {currentArchive && (
              <ArchivePreview
                archive={currentArchive}
                settings={settings}
                onSaveToLibrary={handleSaveToLibrary}
                isSavedInLibrary={isSavedInLibrary}
                onUpdateArchive={(updated) => {
                  setCurrentArchive(updated);
                  handleSaveToLibrary(updated);
                }}
              />
            )}

            {/* Supported platforms strip */}
            {!currentArchive && (
              <div className="max-w-4xl mx-auto pt-8">
                <div className="text-center mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Supported Sources & Clean Obsidian Wikilink Extraction
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {supportedPlatforms.map((p) => (
                    <div
                      key={p.name}
                      className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between"
                    >
                      <span className="font-semibold text-xs text-zinc-200">{p.name}</span>
                      <span className="text-[11px] text-zinc-500 mt-1">{p.tag}</span>
                    </div>
                  ))}
                </div>

                {/* Feature highlights callout */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-400 flex items-center justify-center mx-auto mb-2">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-200">Obsidian Vault Native</h4>
                    <p className="text-[11px] text-zinc-400">
                      Formats with YAML properties and Wikilinks <code className="text-purple-300 font-mono">![[media]]</code> so images appear instantly in your notes.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-400 flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-200">100% Free & Private</h4>
                    <p className="text-[11px] text-zinc-400">
                      Zero recurring subscription fees or cloud locks. Your archives are saved straight to your computer.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-400 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-200">AI Summary & Tags</h4>
                    <p className="text-[11px] text-zinc-400">
                      Automatically summarizes takeaways and recommends Obsidian hashtags with Gemini Flash.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VAULT LIBRARY */}
        {activeTab === 'library' && (
          <VaultLibrary
            archives={savedArchives}
            settings={settings}
            onSelectArchive={(archive) => {
              setCurrentArchive(archive);
              setActiveTab('archive');
            }}
            onDeleteArchive={handleDeleteArchive}
            onClearAll={handleClearAllArchives}
            onLoadDemos={() => {
              const demos = restoreDemoArchives();
              setSavedArchives(demos);
            }}
          />
        )}

        {/* TAB 3: OBSIDIAN GUIDE */}
        {activeTab === 'guide' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                Obsidian Integration & Workflow Guide
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                How to integrate your saved archives directly with Obsidian on Desktop and Mobile.
              </p>
            </div>

            {/* Embed the guide contents directly in tab */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
                  <FolderArchive className="w-4 h-4 text-purple-400" />
                  1. How to save to Obsidian in 1 click
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="font-bold text-purple-300 text-xs">A. Open in Obsidian (URI)</span>
                    <p className="text-[11px] text-zinc-400">
                      When you click <strong>Open in Obsidian</strong>, the app triggers the native <code className="text-zinc-200 font-mono">obsidian://new</code> link. Obsidian will launch automatically and create the note in your vault.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="font-bold text-purple-300 text-xs">B. Download Vault ZIP</span>
                    <p className="text-[11px] text-zinc-400">
                      Downloads a package containing the note in <code className="text-zinc-200 font-mono">Social Archive/</code> and all high-res photos/videos in <code className="text-zinc-200 font-mono">attachments/social-archive/</code>. Drag into your vault folder!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  2. Obsidian Dataview Dynamic Query
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Install the free community plugin <strong>Dataview</strong> in Obsidian, create a note called <code className="text-purple-300 font-mono">Social Dashboard.md</code>, and paste this query:
                </p>

                <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto select-all">
{`\`\`\`dataview
TABLE 
  platform as Platform,
  author as Author,
  date_published as "Date",
  tags as Tags
FROM "${settings.notesFolder}"
SORT date_published DESC
\`\`\``}
                </pre>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  3. Vault Folder Hierarchy
                </h3>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 font-mono text-[11px] text-zinc-400 leading-relaxed">
                  <div>Your_Obsidian_Vault/</div>
                  <div className="pl-4 text-purple-300">├── {settings.notesFolder}/</div>
                  <div className="pl-8 text-zinc-300">│   ├── 2026-10-25 - @author - Title.md</div>
                  <div className="pl-8 text-zinc-300">│   └── 2026-10-24 - @creator - Video.md</div>
                  <div className="pl-4 text-purple-300">└── {settings.attachmentsFolder}/</div>
                  <div className="pl-8 text-zinc-300">    ├── sa_1849_1_author.jpg</div>
                  <div className="pl-8 text-zinc-300">    └── sa_1849_2_author.mp4</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ManualPasteModal
        isOpen={isManualPasteOpen}
        onClose={() => setIsManualPasteOpen(false)}
        onArchiveCreated={(newArchive) => {
          setCurrentArchive(newArchive);
          handleSaveToLibrary(newArchive);
          setActiveTab('archive');
        }}
        settings={settings}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Social Archive for Obsidian · Free & Open Source Alternative</span>
          <div className="flex items-center gap-4 text-zinc-500">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-purple-400 transition-colors"
            >
              Setup Guide
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-purple-400 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

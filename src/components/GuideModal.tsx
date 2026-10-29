import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  FolderArchive,
  Layers,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const dataviewTableCode = `\`\`\`dataview
TABLE 
  platform as Platform,
  author as Author,
  date_published as "Published Date",
  tags as Tags
FROM "Social Archive"
SORT date_published DESC
\`\`\``;

  const dataviewCardsCode = `\`\`\`dataview
TABLE WITHOUT ID
  link(file.link, title) as "Post",
  author as "Author",
  date_published as "Date",
  tags as "Tags"
FROM "Social Archive"
WHERE contains(tags, "twitter") OR contains(tags, "youtube")
SORT date_published DESC
\`\`\``;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-zinc-100 text-base">
              Obsidian & Social Archive Integration Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs text-zinc-300 leading-relaxed">
          {/* Section 1: The 3 Ways to Save to Obsidian */}
          <div>
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <FolderArchive className="w-4 h-4 text-purple-400" />
              1. Three Seamless Ways to Save into Obsidian
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-bold text-purple-300 text-xs">A. "Open in Obsidian"</div>
                <p className="text-[11px] text-zinc-400">
                  Click the purple <strong>Open in Obsidian</strong> button. Your browser triggers the native <code className="text-zinc-300 font-mono">obsidian://new</code> protocol, opening Obsidian and creating the note instantly.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-bold text-purple-300 text-xs">B. "Vault Package ZIP"</div>
                <p className="text-[11px] text-zinc-400">
                  Downloads a ZIP containing the Markdown note and all high-res photos/videos in the exact folder layout (<code className="text-zinc-300 font-mono">attachments/social-archive/</code>). Drag & drop right into your vault!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-bold text-purple-300 text-xs">C. "Copy Markdown"</div>
                <p className="text-[11px] text-zinc-400">
                  Copies the full note with Obsidian YAML frontmatter properties. Paste anywhere into your daily notes or reading lists.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Mobile Workflow */}
          <div className="pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              2. Mobile Workflow (iPhone & Android)
            </h4>
            <p className="text-zinc-400 text-xs mb-2">
              You don't need a paid mobile subscription to archive on the go:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-300 text-xs">
              <li>Open this web app URL in Safari or Chrome on your mobile phone.</li>
              <li>Tap <strong>"Add to Home Screen"</strong> to run it full-screen like a native app.</li>
              <li>When browsing Twitter, TikTok, or Instagram, tap <strong>Share → Copy Link</strong>.</li>
              <li>Open Social Archive, tap <strong>Paste</strong>, and hit <strong>Archive</strong>!</li>
              <li>Tap <strong>Open in Obsidian</strong> to immediately switch into Obsidian Mobile.</li>
            </ol>
          </div>

          {/* Section 3: Dataview Integration */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              3. Obsidian Dataview Dynamic Feed
            </h4>
            <p className="text-zinc-400 text-xs">
              If you have the popular free <strong>Dataview</strong> plugin installed in Obsidian, create a note named <code className="text-purple-300 font-mono">Social Feed.md</code> and paste either snippet below:
            </p>

            {/* Dataview snippet 1 */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 relative font-mono text-[11px] text-zinc-300">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[10px] text-zinc-500 font-sans">
                <span>Table view sorted by publish date</span>
                <button
                  onClick={() => handleCopyCode(dataviewTableCode, 'table')}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-sans"
                >
                  {copiedSnippet === 'table' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto">{dataviewTableCode}</pre>
            </div>

            {/* Dataview snippet 2 */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 relative font-mono text-[11px] text-zinc-300">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[10px] text-zinc-500 font-sans">
                <span>Filter by specific platform (e.g. Twitter & YouTube)</span>
                <button
                  onClick={() => handleCopyCode(dataviewCardsCode, 'cards')}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-sans"
                >
                  {copiedSnippet === 'cards' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto">{dataviewCardsCode}</pre>
            </div>
          </div>

          {/* Section 4: Vault Folder Structure */}
          <div className="pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              4. Vault Folder Structure
            </h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-400">
              <div>Your_Obsidian_Vault/</div>
              <div className="pl-4 text-purple-300">├── Social Archive/</div>
              <div className="pl-8 text-zinc-300">│   ├── 2026-10-25 - @author - Title.md</div>
              <div className="pl-8 text-zinc-300">│   └── 2026-10-24 - @creator - Video.md</div>
              <div className="pl-4 text-purple-300">└── attachments/</div>
              <div className="pl-8 text-purple-400">    └── social-archive/</div>
              <div className="pl-12 text-zinc-300">        ├── sa_1849_1_author.jpg</div>
              <div className="pl-12 text-zinc-300">        └── sa_1849_2_author.mp4</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

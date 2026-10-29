import React, { useState } from 'react';
import { X, FileText, Check, Plus, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ExtractedArchive, VaultSettings, MediaItem } from '../types';
import { formatObsidianMarkdown } from '../utils/obsidian';

interface ManualPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArchiveCreated: (archive: ExtractedArchive) => void;
  settings: VaultSettings;
}

export const ManualPasteModal: React.FC<ManualPasteModalProps> = ({
  isOpen,
  onClose,
  onArchiveCreated,
  settings,
}) => {
  const [platform, setPlatform] = useState('instagram');
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorHandle, setAuthorHandle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    const isVideo = mediaUrlInput.toLowerCase().includes('.mp4') || mediaUrlInput.toLowerCase().includes('video');
    const newMedia: MediaItem = {
      id: `manual_${Date.now()}_${mediaList.length + 1}`,
      type: isVideo ? 'video' : 'image',
      url: mediaUrlInput.trim(),
      proxyUrl: `/api/proxy-media?url=${encodeURIComponent(mediaUrlInput.trim())}`,
      filename: `manual_${Date.now()}_${mediaList.length + 1}.${isVideo ? 'mp4' : 'jpg'}`,
      alt: title || 'Attached media',
    };
    setMediaList([...mediaList, newMedia]);
    setMediaUrlInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) {
      setFormError('Please enter post text or title.');
      return;
    }
    setFormError(null);


    const todayStr = new Date().toISOString().split('T')[0];
    const generatedTitle = title.trim() || `${platform.toUpperCase()} Post by ${authorName || 'User'}`;
    const cleanAuthorHandle = authorHandle.trim()
      ? (authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`)
      : `@${(authorName || 'user').toLowerCase().replace(/\s+/g, '')}`;

    const tags = Array.from(new Set([
      platform,
      ...tagsInput.split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean),
    ]));

    const archiveData: ExtractedArchive = {
      id: `sa_manual_${Date.now()}`,
      platform,
      title: generatedTitle,
      author: {
        name: authorName.trim() || 'Author',
        handle: cleanAuthorHandle,
        url: sourceUrl.trim(),
      },
      sourceUrl: sourceUrl.trim() || `https://${platform}.com`,
      publishedDate: todayStr,
      archivedDate: todayStr,
      content: content.trim(),
      tags,
      mediaList,
      obsidianMarkdown: '',
      suggestedFilename: `${todayStr} - ${cleanAuthorHandle} - ${generatedTitle.slice(0, 30)}.md`,
    };

    archiveData.obsidianMarkdown = formatObsidianMarkdown(archiveData, settings);
    onArchiveCreated(archiveData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-zinc-100 text-base">Manual Post / Login-Wall Fallback</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
              {formError}
            </div>
          )}
          <p className="text-xs text-zinc-400">
            If a post is behind a private account, login screen, or captcha wall (e.g. private Instagram or LinkedIn), paste the text directly below to create a pristine Obsidian note.
          </p>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 capitalize"
              >
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="threads">Threads</option>
                <option value="twitter">X / Twitter</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="blog">Blog / Article</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Post URL (Optional)
              </label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Satya Nadella"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Handle
              </label>
              <input
                type="text"
                value={authorHandle}
                onChange={(e) => setAuthorHandle(e.target.value)}
                placeholder="@satyanadella"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Title / Headline
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thoughts on the Future of AI"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Full Post Text / Caption
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Paste caption, tweet, or article body here..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Image / Video URL (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="https://.../photo.jpg"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Add
              </button>
            </div>
            {mediaList.length > 0 && (
              <div className="mt-2 space-y-1">
                {mediaList.map((m, idx) => (
                  <div key={m.id} className="text-[11px] font-mono text-zinc-400 flex items-center justify-between bg-zinc-950 p-1.5 rounded border border-zinc-800">
                    <span className="truncate max-w-[280px]">Attachment #{idx + 1}: {m.url}</span>
                    <button
                      type="button"
                      onClick={() => setMediaList(mediaList.filter(item => item.id !== m.id))}
                      className="text-rose-400 hover:text-rose-300 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Tags (comma or space separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. productivity, tech, marketing"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Generate Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};

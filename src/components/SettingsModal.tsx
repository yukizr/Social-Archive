import React, { useState } from 'react';
import { X, Save, FolderSync, Sliders, FileCode, Check, RefreshCw } from 'lucide-react';
import { VaultSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaultSettings;
  onSave: (newSettings: VaultSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<VaultSettings>(settings);
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleAddDefaultTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !form.defaultTags.includes(trimmed)) {
      setForm({ ...form, defaultTags: [...form.defaultTags, trimmed] });
      setTagInput('');
    }
  };

  const handleRemoveDefaultTag = (tag: string) => {
    setForm({
      ...form,
      defaultTags: form.defaultTags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset settings to default?')) {
      setForm(DEFAULT_SETTINGS);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-zinc-100 text-base">Obsidian Vault Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Vault Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Obsidian Vault Name
            </label>
            <input
              type="text"
              value={form.vaultName}
              onChange={(e) => setForm({ ...form, vaultName: e.target.value })}
              placeholder="e.g. My Vault, Personal, Notes"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Required for the "Open in Obsidian" button to identify your local vault.
            </p>
          </div>

          {/* Notes Folder */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Notes Folder in Vault
            </label>
            <input
              type="text"
              value={form.notesFolder}
              onChange={(e) => setForm({ ...form, notesFolder: e.target.value })}
              placeholder="e.g. Social Archive or Inbox/Social"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Attachments Folder */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Media Attachments Folder
            </label>
            <input
              type="text"
              value={form.attachmentsFolder}
              onChange={(e) => setForm({ ...form, attachmentsFolder: e.target.value })}
              placeholder="e.g. attachments/social-archive"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Embed Style */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Media Embed Syntax
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, embedStyle: 'wikilink' })}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  form.embedStyle === 'wikilink'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 bg-zinc-950'
                }`}
              >
                <div className="font-semibold text-zinc-200">Wikilink (Default)</div>
                <div className="font-mono text-[11px] text-purple-400 mt-0.5">![[image.jpg]]</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, embedStyle: 'standard' })}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  form.embedStyle === 'standard'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 bg-zinc-950'
                }`}
              >
                <div className="font-semibold text-zinc-200">Standard Markdown</div>
                <div className="font-mono text-[11px] text-purple-400 mt-0.5">![](attachments/...)</div>
              </button>
            </div>
          </div>

          {/* Filename Template */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Filename Format
            </label>
            <select
              value={form.filenameTemplate}
              onChange={(e) => setForm({ ...form, filenameTemplate: e.target.value as any })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
            >
              <option value="date-author-title">2026-10-25 - @author - Title.md (Recommended)</option>
              <option value="author-title">@author - Title.md</option>
              <option value="platform-date-title">twitter - 2026-10-25 - Title.md</option>
              <option value="title">Title.md</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
              <span className="text-xs text-zinc-300">Include YAML Frontmatter Properties</span>
              <input
                type="checkbox"
                checked={form.includeMetadataFrontmatter}
                onChange={(e) => setForm({ ...form, includeMetadataFrontmatter: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500 bg-zinc-950 border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
              <span className="text-xs text-zinc-300">Include Engagement Stats (Likes, Shares)</span>
              <input
                type="checkbox"
                checked={form.includeStats}
                onChange={(e) => setForm({ ...form, includeStats: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500 bg-zinc-950 border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
              <span className="text-xs text-zinc-300">Default to AI Summary & Smart Tags</span>
              <input
                type="checkbox"
                checked={form.autoAiSummary}
                onChange={(e) => setForm({ ...form, autoAiSummary: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500 bg-zinc-950 border-zinc-700"
              />
            </label>
          </div>

          {/* Default Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Default Tags (applied to every archive)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDefaultTag();
                  }
                }}
                placeholder="e.g. social-archive, bookmarks"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={handleAddDefaultTag}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {form.defaultTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 font-mono"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveDefaultTag(t)}
                    className="hover:text-rose-400 text-zinc-500 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
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
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import JSZip from 'jszip';
import { ExtractedArchive, VaultSettings } from '../types';

export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>#^[\]]/g, '').trim().slice(0, 80);
}

export function generateFilename(archive: ExtractedArchive, settings: VaultSettings): string {
  const authorClean = sanitizeFilename(archive.author.handle || archive.author.name || 'Author');
  const titleClean = sanitizeFilename(archive.title.slice(0, 40) || 'Post');
  const dateStr = archive.publishedDate || archive.archivedDate;

  switch (settings.filenameTemplate) {
    case 'author-title':
      return `${authorClean} - ${titleClean}.md`;
    case 'platform-date-title':
      return `${archive.platform} - ${dateStr} - ${titleClean}.md`;
    case 'title':
      return `${titleClean}.md`;
    case 'date-author-title':
    default:
      return `${dateStr} - ${authorClean} - ${titleClean}.md`;
  }
}

// Generate Obsidian markdown from archive data and current settings
export function formatObsidianMarkdown(archive: ExtractedArchive, settings: VaultSettings): string {
  const allTags = Array.from(new Set([
    ...settings.defaultTags,
    archive.platform,
    ...archive.tags
  ])).map(t => t.replace(/^#/, '').toLowerCase().trim()).filter(Boolean);

  let mediaSection = '';
  if (archive.mediaList.length > 0) {
    mediaSection = archive.mediaList.map(m => {
      if (settings.embedStyle === 'wikilink') {
        return `![[${m.filename}]]`;
      } else {
        return `![${m.alt || m.filename}](${settings.attachmentsFolder}/${m.filename})`;
      }
    }).join('\n\n');
  } else {
    mediaSection = '*No local media files attached*';
  }

  let frontmatter = '';
  if (settings.includeMetadataFrontmatter) {
    frontmatter = `---
platform: ${archive.platform}
author: "${archive.author.name || archive.author.handle}"
handle: "${archive.author.handle || ''}"
source_url: "${archive.sourceUrl}"
date_published: ${archive.publishedDate || archive.archivedDate}
date_archived: ${archive.archivedDate}
tags:
${allTags.map(t => `  - ${t}`).join('\n')}${settings.includeStats && archive.stats?.likes ? `\nlikes: ${archive.stats.likes}` : ''}${settings.includeStats && archive.stats?.shares ? `\nshares: ${archive.stats.shares}` : ''}
---
\n`;
  }

  let body = `# ${archive.title}\n\n`;
  body += `> **Author:** [${archive.author.name || archive.author.handle}](${archive.sourceUrl}) · **Platform:** ${archive.platform.toUpperCase()} · **Date:** ${archive.publishedDate || archive.archivedDate}\n\n`;

  if (archive.summary) {
    body += `## Summary & Takeaways\n${archive.summary}\n\n`;
  }

  body += `## Content\n${archive.content || '*No text content available*'}\n\n`;
  body += `## Media Attachments\n${mediaSection}\n\n`;
  body += `---\n*Archived with Social Archive on ${archive.archivedDate} from [${archive.sourceUrl}](${archive.sourceUrl})*`;

  return `${frontmatter}${body}`;
}

// Trigger Obsidian URI: obsidian://new?vault=...&file=...&content=...
export function openInObsidianURI(archive: ExtractedArchive, settings: VaultSettings): void {
  const filenameWithFolder = `${settings.notesFolder}/${generateFilename(archive, settings).replace(/\.md$/, '')}`;
  const markdown = formatObsidianMarkdown(archive, settings);
  
  const params = new URLSearchParams({
    vault: settings.vaultName,
    file: filenameWithFolder,
    content: markdown,
  });

  const uri = `obsidian://new?${params.toString()}`;
  window.location.href = uri;
}

// Download single markdown file
export function downloadMarkdownFile(archive: ExtractedArchive, settings: VaultSettings): void {
  const filename = generateFilename(archive, settings);
  const markdown = formatObsidianMarkdown(archive, settings);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download Obsidian Zip Package with Note + All Media in Vault directory structure
export async function downloadObsidianZipPackage(
  archive: ExtractedArchive,
  settings: VaultSettings,
  onProgress?: (status: string) => void
): Promise<void> {
  const zip = new JSZip();
  const noteFilename = generateFilename(archive, settings);
  const markdown = formatObsidianMarkdown(archive, settings);

  // Clean folder paths
  const notesFolder = settings.notesFolder.replace(/^\/+|\/+$/g, '');
  const attachmentsFolder = settings.attachmentsFolder.replace(/^\/+|\/+$/g, '');

  onProgress?.('Adding markdown note to zip...');
  zip.file(`${notesFolder}/${noteFilename}`, markdown);

  // Fetch and add media attachments
  if (archive.mediaList.length > 0) {
    for (let i = 0; i < archive.mediaList.length; i++) {
      const media = archive.mediaList[i];
      onProgress?.(`Downloading media ${i + 1}/${archive.mediaList.length}: ${media.filename}...`);
      try {
        const response = await fetch(media.proxyUrl);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(`${attachmentsFolder}/${media.filename}`, blob);
        } else {
          console.warn(`Could not fetch media for zip: ${media.filename}`);
        }
      } catch (err) {
        console.warn(`Failed to package media ${media.filename}:`, err);
      }
    }
  }

  onProgress?.('Generating zip archive...');
  const content = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${sanitizeFilename(archive.title.slice(0, 30) || 'social_archive')}_obsidian_package.zip`;

  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  onProgress?.('Downloaded!');
}

// Bulk export all archives into a single unified vault ZIP
export async function downloadBulkObsidianZip(
  archives: ExtractedArchive[],
  settings: VaultSettings,
  onProgress?: (status: string) => void
): Promise<void> {
  const zip = new JSZip();
  const notesFolder = settings.notesFolder.replace(/^\/+|\/+$/g, '');
  const attachmentsFolder = settings.attachmentsFolder.replace(/^\/+|\/+$/g, '');

  onProgress?.(`Packaging ${archives.length} notes...`);

  for (let idx = 0; idx < archives.length; idx++) {
    const archive = archives[idx];
    const filename = generateFilename(archive, settings);
    const markdown = formatObsidianMarkdown(archive, settings);
    zip.file(`${notesFolder}/${filename}`, markdown);

    // Download media for each
    for (const media of archive.mediaList) {
      try {
        const resp = await fetch(media.proxyUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          zip.file(`${attachmentsFolder}/${media.filename}`, blob);
        }
      } catch (e) {
        console.warn('Error fetching media during bulk export:', e);
      }
    }
    onProgress?.(`Packaged ${idx + 1}/${archives.length} archives...`);
  }

  // Also include a Dataview Dashboard file!
  const dashboardContent = `# Social Archive Dashboard

This note uses the Obsidian Dataview plugin to dynamically display your saved social archives.

\`\`\`dataview
TABLE 
  platform as Platform,
  author as Author,
  date_published as "Published",
  file.mtime as "Archived"
FROM "${notesFolder}"
SORT date_published DESC
\`\`\`
`;
  zip.file(`${notesFolder}/_Social Archive Dashboard.md`, dashboardContent);

  onProgress?.('Compressing vault zip...');
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Obsidian_Social_Archive_Vault_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  onProgress?.('Complete!');
}

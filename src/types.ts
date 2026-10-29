export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  proxyUrl: string;
  filename: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ExtractedArchive {
  id: string;
  platform: string;
  title: string;
  author: {
    name: string;
    handle: string;
    avatarUrl?: string;
    url?: string;
  };
  sourceUrl: string;
  publishedDate: string;
  archivedDate: string;
  content: string;
  summary?: string;
  tags: string[];
  stats?: {
    likes?: number | string;
    shares?: number | string;
    comments?: number | string;
    views?: number | string;
  };
  mediaList: MediaItem[];
  obsidianMarkdown: string;
  suggestedFilename: string;
}

export interface VaultSettings {
  vaultName: string;
  notesFolder: string;
  attachmentsFolder: string;
  embedStyle: 'wikilink' | 'standard'; // ![[file]] vs ![](attachments/file)
  filenameTemplate: 'date-author-title' | 'author-title' | 'platform-date-title' | 'title';
  includeMetadataFrontmatter: boolean;
  includeStats: boolean;
  autoAiSummary: boolean;
  defaultTags: string[];
}

export const DEFAULT_SETTINGS: VaultSettings = {
  vaultName: 'Obsidian Vault',
  notesFolder: 'Social Archive',
  attachmentsFolder: 'attachments/social-archive',
  embedStyle: 'wikilink',
  filenameTemplate: 'date-author-title',
  includeMetadataFrontmatter: true,
  includeStats: true,
  autoAiSummary: false,
  defaultTags: ['social-archive'],
};


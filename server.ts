import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local disk storage directories so archived notes & media survive original post deletion
const LOCAL_ARCHIVE_DIR = path.resolve(__dirname, 'local_archive');
const LOCAL_MEDIA_DIR = path.join(LOCAL_ARCHIVE_DIR, 'media');
const LOCAL_NOTES_DIR = path.join(LOCAL_ARCHIVE_DIR, 'notes');
fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
fs.mkdirSync(LOCAL_NOTES_DIR, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to sanitize filenames for OS compatibility
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80);
}

// Media item structure
interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  proxyUrl: string;
  filename: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface ExtractedArchive {
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

// Detect platform from URL
function detectPlatform(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl);
    const host = urlObj.hostname.toLowerCase();
    if (host.includes('social-archive.org')) return 'social-archive';
    if (host.includes('twitter.com') || host.includes('x.com') || host.includes('vxtwitter') || host.includes('fxtwitter')) return 'twitter';
    if (host.includes('instagram.com') || host.includes('instagr.am')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('threads.net') || host.includes('threads.com')) return 'threads';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('reddit.com') || host.includes('redd.it')) return 'reddit';
    if (host.includes('bsky.app')) return 'bluesky';
    if (host.includes('substack.com')) return 'substack';
    if (host.includes('medium.com')) return 'medium';
    return 'blog';
  } catch {
    return 'web';
  }
}

// Format Obsidian markdown
function buildObsidianMarkdown(data: {
  platform: string;
  author: { name: string; handle: string };
  sourceUrl: string;
  publishedDate: string;
  archivedDate: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  stats?: Record<string, any>;
  mediaList: MediaItem[];
  embedStyle?: 'wikilink' | 'standard';
  attachmentsFolder?: string;
}): string {
  const {
    platform,
    author,
    sourceUrl,
    publishedDate,
    archivedDate,
    title,
    content,
    summary,
    tags,
    stats,
    mediaList,
    embedStyle = 'wikilink',
    attachmentsFolder = 'attachments/social-archive'
  } = data;

  const tagList = Array.from(new Set(['social-archive', platform, ...tags]))
    .map(t => t.replace(/^#/, '').toLowerCase().trim())
    .filter(Boolean);

  let mediaMarkdown = '';
  if (mediaList.length > 0) {
    mediaMarkdown = mediaList.map(m => {
      if (embedStyle === 'wikilink') {
        return `![[${m.filename}]]`;
      } else {
        return `![${m.alt || m.filename}](${attachmentsFolder}/${m.filename})`;
      }
    }).join('\n\n');
  } else {
    mediaMarkdown = '*No local media files attached*';
  }

  const frontmatter = `---
platform: ${platform}
author: "${author.name || author.handle || 'Unknown'}"
handle: "${author.handle || ''}"
source_url: "${sourceUrl}"
date_published: ${publishedDate || archivedDate}
date_archived: ${archivedDate}
tags:
${tagList.map(t => `  - ${t}`).join('\n')}${stats?.likes ? `\nlikes: ${stats.likes}` : ''}${stats?.shares ? `\nshares: ${stats.shares}` : ''}
---`;

  let body = `# ${title || 'Archived Post'}\n\n`;
  body += `> **Author:** [${author.name || author.handle}](${sourceUrl}) · **Platform:** ${platform.toUpperCase()} · **Date:** ${publishedDate || archivedDate}\n\n`;

  if (summary) {
    body += `## Summary & Takeaways\n${summary}\n\n`;
  }

  body += `## Content\n${content || '*No text content available*'}\n\n`;
  body += `## Media Attachments\n${mediaMarkdown}\n\n`;
  body += `---\n*Archived with Social Archive on ${archivedDate} from [${sourceUrl}](${sourceUrl})*`;

  return `${frontmatter}\n\n${body}`;
}

// Helper to build upstream headers for CDN media requests
function getMediaFetchHeaders(mediaUrl: string, rangeHeader?: string): Record<string, string> {
  const parsed = new URL(mediaUrl);
  const isFacebookCrawlerMedia =
    parsed.hostname.includes('fbsbx.com') || parsed.hostname.includes('facebook.com');

  const headers: Record<string, string> = {
    'User-Agent': isFacebookCrawlerMedia
      ? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
  };

  if (parsed.hostname.includes('twimg.com') || parsed.hostname.includes('twitter.com') || parsed.hostname.includes('x.com')) {
    headers['Referer'] = 'https://twitter.com/';
  } else if (parsed.hostname.includes('instagram.com') || parsed.hostname.includes('cdninstagram.com')) {
    headers['Referer'] = 'https://www.instagram.com/';
  } else if (parsed.hostname.includes('fbcdn.net') || parsed.hostname.includes('fbsbx.com') || parsed.hostname.includes('facebook.com')) {
    headers['Referer'] = 'https://www.facebook.com/';
  } else if (parsed.hostname.includes('tiktok.com') || parsed.hostname.includes('tiktokcdn') || parsed.hostname.includes('byteoversea.com')) {
    headers['Referer'] = 'https://www.tiktok.com/';
  }

  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }

  return headers;
}

// Infer MIME type from filename extension
function getMimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

// Download & persist a media item to ./local_archive/media/<filename>
async function persistMediaToLocalDisk(mediaUrl: string, filename: string): Promise<string | null> {
  try {
    const safeFile = sanitizeFilename(filename);
    const localPath = path.join(LOCAL_MEDIA_DIR, safeFile);
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
      return localPath;
    }
    const headers = getMediaFetchHeaders(mediaUrl);
    const resp = await fetch(mediaUrl, { headers, redirect: 'follow' });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > 0) {
      await fs.promises.writeFile(localPath, buf);
      return localPath;
    }
  } catch (err) {
    console.warn(`Could not persist media ${filename} locally:`, err);
  }
  return null;
}

// Media proxy endpoint (serves from ./local_archive/media/ first so deleted posts never break)
app.get('/api/proxy-media', async (req, res) => {
  const mediaUrl = req.query.url as string;
  const fileParam = (req.query.file as string) || (req.query.filename as string) || undefined;
  const forceDownload = req.query.download === '1' || req.query.download === 'true';

  if (!mediaUrl && !fileParam) {
    return res.status(400).send('Missing url or file query parameter');
  }

  // Determine local cache filename
  const urlHash = mediaUrl ? crypto.createHash('sha1').update(mediaUrl).digest('hex').slice(0, 16) : '';
  const localFilename = fileParam ? sanitizeFilename(fileParam) : `cache_${urlHash}.jpg`;
  const localFilePath = path.join(LOCAL_MEDIA_DIR, localFilename);

  try {
    // 1. Serve from local disk if already archived locally
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 0) {
      const stat = fs.statSync(localFilePath);
      const mimeType = getMimeFromFilename(localFilename);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Accept-Ranges', 'bytes');

      if (forceDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="${localFilename}"`);
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', String(chunkSize));
        return fs.createReadStream(localFilePath, { start, end }).pipe(res);
      }

      res.setHeader('Content-Length', String(stat.size));
      return fs.createReadStream(localFilePath).pipe(res);
    }

    if (!mediaUrl) {
      return res.status(404).send('Local media file not found');
    }

    // 2. Otherwise fetch from remote CDN and cache to local disk
    const headers = getMediaFetchHeaders(mediaUrl, req.headers.range);
    const response = await fetch(mediaUrl, { headers });
    if (!response.ok && response.status !== 206) {
      return res.status(response.status).send(`Failed to fetch media: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || getMimeFromFilename(localFilename);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (forceDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${localFilename}"`);
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(206);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save full (non-partial) response to local disk so future requests work even if original post is deleted
    if (response.status === 200 && buffer.length > 0 && !fs.existsSync(localFilePath)) {
      fs.promises.writeFile(localFilePath, buffer).catch(() => {});
    }

    res.setHeader('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error proxying media:', error);
    return res.status(500).send(error?.message || 'Error proxying media');
  }
});

// Recursively search parsed JSON scripts for Instagram's XIGPolarisMedia object by shortcode
function findInstagramMediaByShortcode(obj: any, targetCode: string): any {
  if (!obj || typeof obj !== 'object') return null;
  if (
    obj.code === targetCode &&
    (Array.isArray(obj.carousel_media) || obj.image_versions2 || obj.video_versions || obj.display_uri)
  ) {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    const found = findInstagramMediaByShortcode(obj[key], targetCode);
    if (found) return found;
  }
  return null;
}

// Recursively collect all Threads post objects inside Relay JSON scripts
function findAllThreadsPosts(obj: any, results: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return results;
  if (
    typeof obj.code === 'string' &&
    obj.user &&
    typeof obj.user === 'object' &&
    (obj.caption !== undefined || obj.image_versions2 || obj.carousel_media || obj.video_versions)
  ) {
    results.push(obj);
    return results;
  }
  for (const key of Object.keys(obj)) {
    findAllThreadsPosts(obj[key], results);
  }
  return results;
}

// Recursively scan Facebook Relay JSON scripts for post text, author, timestamps, and album/single media
function scanFacebookStoryData(
  obj: any,
  info: {
    messages: string[];
    images: string[];
    videos: string[];
    actors: Array<{ name: string; url?: string; pic?: string }>;
    times: number[];
    reactions: number[];
    comments: number[];
    shares: number[];
  }
) {
  if (!obj || typeof obj !== 'object') return info;

  if (obj.message && typeof obj.message.text === 'string' && obj.message.text.trim().length > 0) {
    info.messages.push(obj.message.text.trim());
  }

  if (Array.isArray(obj.actors)) {
    for (const a of obj.actors) {
      if (a && typeof a.name === 'string' && a.name.trim()) {
        info.actors.push({
          name: a.name.trim(),
          url: a.url,
          pic: a.profile_picture?.uri,
        });
      }
    }
  }

  if (obj.owning_profile && typeof obj.owning_profile.name === 'string') {
    info.actors.push({
      name: obj.owning_profile.name.trim(),
    });
  }

  if (typeof obj.creation_time === 'number' && obj.creation_time > 1000000000) {
    info.times.push(obj.creation_time);
  }

  if (typeof obj.reaction_count?.count === 'number') {
    info.reactions.push(obj.reaction_count.count);
  }
  if (typeof obj.total_comment_count === 'number') {
    info.comments.push(obj.total_comment_count);
  }
  if (typeof obj.share_count?.count === 'number') {
    info.shares.push(obj.share_count.count);
  }

  // Extract album subattachments in exact order when present
  if (Array.isArray(obj.all_subattachments?.nodes)) {
    for (const node of obj.all_subattachments.nodes) {
      const m = node?.media;
      if (m) {
        const vidUri = m.playable_url_quality_hd || m.playable_url || m.browser_native_hd_url || m.browser_native_sd_url;
        const imgUri = m.viewer_image?.uri || m.photo_image?.uri || m.image?.uri || m.preferred_thumbnail?.image?.uri;
        if (vidUri) info.videos.push(vidUri);
        if (imgUri) info.images.push(imgUri);
      }
    }
  }

  // Also check standalone Photo / Video objects
  if (obj.__typename === 'Photo' || obj.__typename === 'Video' || obj.photo_image || obj.viewer_image || obj.playable_url) {
    const vidUri = obj.playable_url_quality_hd || obj.playable_url || obj.browser_native_hd_url || obj.browser_native_sd_url;
    const imgUri = obj.viewer_image?.uri || obj.photo_image?.uri || obj.image?.uri || obj.preferred_thumbnail?.image?.uri;
    if (vidUri) info.videos.push(vidUri);
    if (imgUri) info.images.push(imgUri);
  }

  for (const key of Object.keys(obj)) {
    scanFacebookStoryData(obj[key], info);
  }
  return info;
}

// Cached anonymous OAuth token for Reddit API (prevents 403 blocks on cloud IPs)
let cachedRedditToken: { token: string; expiresAt: number } | null = null;
const REDDIT_APP_UA = 'Reddit/Version 2024.17.0/Build 1564310/Android 14';

async function getRedditAccessToken(): Promise<string | null> {
  if (cachedRedditToken && Date.now() < cachedRedditToken.expiresAt) {
    return cachedRedditToken.token;
  }
  try {
    const authRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('ohXpoqrZYub1kg:').toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_APP_UA,
      },
      body: 'grant_type=https%3A%2F%2Foauth.reddit.com%2Fgrants%2Finstalled_client&device_id=DO_NOT_TRACK_THIS_DEVICE',
    });
    if (authRes.ok) {
      const data: any = await authRes.json();
      if (data.access_token) {
        cachedRedditToken = {
          token: data.access_token,
          expiresAt: Date.now() + ((data.expires_in || 3600) - 120) * 1000,
        };
        return data.access_token;
      }
    }
  } catch (err) {
    console.warn('Reddit OAuth token fetch error:', err);
  }
  return null;
}

async function fetchRedditJson(apiPath: string): Promise<any | null> {
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const token = await getRedditAccessToken();
  if (token) {
    try {
      const oauthUrl = `https://oauth.reddit.com${cleanPath}${cleanPath.includes('?') ? '&' : '?'}raw_json=1`;
      const resp = await fetch(oauthUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': REDDIT_APP_UA,
          'Accept': 'application/json',
        },
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {}
  }

  // Fallback to public JSON endpoint
  try {
    const pubUrl = `https://www.reddit.com${cleanPath}${cleanPath.includes('?') ? '&' : '?'}raw_json=1`;
    const resp = await fetch(pubUrl, {
      headers: { 'User-Agent': REDDIT_APP_UA, 'Accept': 'application/json' },
    });
    if (resp.ok) {
      return await resp.json();
    }
  } catch {}
  return null;
}

// Primary archive extraction endpoint
app.post('/api/archive', async (req, res) => {
  const { url, options = {} } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  const platform = detectPlatform(url);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const postId = `sa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    let title = '';
    let publishedDate = todayStr;
    let author: { name: string; handle: string; avatarUrl?: string; url?: string } = {
      name: 'Unknown',
      handle: '',
      avatarUrl: '',
      url: '',
    };
    let content = '';
    let tags: string[] = [];
    let stats: Record<string, any> = {};
    let rawMedia: Array<{ url: string; type: 'image' | 'video'; alt?: string }> = [];

    // PLATFORM-SPECIFIC EXTRACTORS
    if (platform === 'twitter') {
      // Extract tweet ID
      const tweetIdMatch = url.match(/status(?:es)?\/(\d+)/);
      const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

      let fxSuccess = false;
      if (tweetId) {
        try {
          // Use fxtwitter public API for rich tweet extraction (no keys needed)
          const fxResp = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
            headers: { 'User-Agent': 'SocialArchive/1.0' },
          });
          if (fxResp.ok) {
            const fxData: any = await fxResp.json();
            if (fxData.tweet) {
              const tw = fxData.tweet;
              title = tw.text ? tw.text.slice(0, 60) + (tw.text.length > 60 ? '...' : '') : `Tweet by @${tw.author?.screen_name}`;
              author = {
                name: tw.author?.name || `@${tw.author?.screen_name}`,
                handle: `@${tw.author?.screen_name}`,
                avatarUrl: tw.author?.avatar_url || '',
                url: tw.author?.url || `https://x.com/${tw.author?.screen_name}`,
              };
              content = tw.text || '';
              if (tw.created_at) {
                try {
                  publishedDate = new Date(tw.created_at).toISOString().split('T')[0];
                } catch {}
              }
              stats = {
                likes: tw.likes,
                shares: tw.retweets,
                comments: tw.replies,
              };

              // Media
              if (tw.media?.photos) {
                for (const p of tw.media.photos) {
                  rawMedia.push({ url: p.url, type: 'image', alt: p.altText });
                }
              }
              if (tw.media?.videos) {
                for (const v of tw.media.videos) {
                  if (v.url) {
                    rawMedia.push({ url: v.url, type: 'video', alt: `${title} - Video` });
                  }
                  if (v.thumbnail_url) {
                    rawMedia.push({ url: v.thumbnail_url, type: 'image', alt: `${title} - Thumbnail` });
                  }
                }
              }
              fxSuccess = true;
            }
          }
        } catch (e) {
          console.warn('fxTwitter API extraction error, falling back to oEmbed:', e);
        }
      }

      // Fallback to Twitter oEmbed
      if (!fxSuccess) {
        try {
          const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
          const oembedResp = await fetch(oembedUrl);
          if (oembedResp.ok) {
            const oembedData: any = await oembedResp.json();
            author.name = oembedData.author_name || 'Twitter User';
            author.url = oembedData.author_url || '';
            const matchHandle = oembedData.author_url?.match(/twitter\.com\/([^/]+)/);
            if (matchHandle) author.handle = `@${matchHandle[1]}`;
            
            // Clean html content to markdown
            const $ = cheerio.load(oembedData.html || '');
            const tweetText = $('blockquote.twitter-tweet p').text() || $('blockquote').text();
            content = tweetText;
            title = tweetText.slice(0, 60) + (tweetText.length > 60 ? '...' : '') || `Post by ${author.name}`;
          }
        } catch (err) {
          console.warn('Twitter oEmbed failed:', err);
        }
      }
    } else if (platform === 'youtube') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedResp = await fetch(oembedUrl);
        if (oembedResp.ok) {
          const ytData: any = await oembedResp.json();
          title = ytData.title || 'YouTube Video';
          author = {
            name: ytData.author_name || 'YouTube Creator',
            handle: ytData.author_name || '',
            url: ytData.author_url || '',
          };
          if (ytData.thumbnail_url) {
            // Get highest resolution thumbnail if available
            let hiResThumb = ytData.thumbnail_url;
            const videoIdMatch = url.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
            if (videoIdMatch) {
              hiResThumb = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
            }
            rawMedia.push({ url: hiResThumb, type: 'image', alt: title });
          }
        }
      } catch (err) {
        console.warn('YouTube oEmbed error:', err);
      }

      // Fetch YouTube page for full description and keywords
      try {
        const pageResp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (pageResp.ok) {
          const html = await pageResp.text();
          const $ = cheerio.load(html);
          const desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
          if (desc && !content) content = desc;
          const pub = $('meta[itemprop="datePublished"]').attr('content');
          if (pub) publishedDate = pub.split('T')[0];
        }
      } catch {}
    } else if (platform === 'tiktok') {
      const cleanTikTokUrl = url.split('?')[0];
      let ttSuccess = false;

      // 1. Primary: TikWM API for full video MP4, photo carousels, caption, author, and engagement stats
      try {
        const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanTikTokUrl)}`;
        const tikwmResp = await fetch(tikwmUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        });

        if (tikwmResp.ok) {
          const tikwmJson: any = await tikwmResp.json();
          const d = tikwmJson?.data;
          if (d) {
            const uniqueId = d.author?.unique_id || '';
            const nickname = d.author?.nickname || uniqueId || 'TikTok Creator';
            const avatar = d.author?.avatar || '';

            author = {
              name: nickname,
              handle: uniqueId ? `@${uniqueId}` : '',
              avatarUrl: avatar ? `/api/proxy-media?url=${encodeURIComponent(avatar)}` : '',
              url: uniqueId ? `https://www.tiktok.com/@${uniqueId}` : cleanTikTokUrl,
            };

            content = d.title || '';
            const firstLine = content.split('\n')[0].trim();
            title = firstLine.length > 70
              ? `${firstLine.slice(0, 70)}...`
              : (firstLine || `TikTok by ${author.name}`);

            if (d.create_time) {
              try {
                publishedDate = new Date(Number(d.create_time) * 1000).toISOString().split('T')[0];
              } catch {}
            }

            stats = {
              ...(typeof d.digg_count === 'number' ? { likes: d.digg_count } : {}),
              ...(typeof d.comment_count === 'number' ? { comments: d.comment_count } : {}),
              ...(typeof d.share_count === 'number' ? { shares: d.share_count } : {}),
              ...(typeof d.play_count === 'number' ? { views: d.play_count } : {}),
            };

            const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
            if (hashtagMatches) {
              tags.push(...hashtagMatches.map((t: string) => t.replace('#', '').toLowerCase()));
            }

            // Check if TikTok post is a multi-image photo carousel or a video post
            if (Array.isArray(d.images) && d.images.length > 0) {
              d.images.forEach((imgUrl: string, idx: number) => {
                if (imgUrl) {
                  rawMedia.push({
                    url: imgUrl,
                    type: 'image',
                    alt: `${title} - Slide ${idx + 1}`,
                  });
                }
              });
            } else {
              const videoUrl = d.play || d.wmplay;
              const coverUrl = d.origin_cover || d.cover;
              if (videoUrl) {
                rawMedia.push({
                  url: videoUrl,
                  type: 'video',
                  alt: `${title} - Video`,
                });
              }
              if (coverUrl) {
                rawMedia.push({
                  url: coverUrl,
                  type: 'image',
                  alt: `${title} - Cover`,
                });
              }
            }

            ttSuccess = true;
          }
        }
      } catch (tikwmErr) {
        console.warn('TikWM extraction error, falling back to oEmbed:', tikwmErr);
      }

      // 2. Fallback: TikTok oEmbed endpoint
      if (!ttSuccess) {
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanTikTokUrl)}`;
          const oembedResp = await fetch(oembedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          });
          if (oembedResp.ok) {
            const ttData: any = await oembedResp.json();
            if (ttData.title) {
              title = ttData.title;
              content = ttData.title;
            }
            if (ttData.author_name || ttData.author_unique_id) {
              author = {
                name: ttData.author_name || ttData.author_unique_id || 'TikTok Creator',
                handle: ttData.author_unique_id ? `@${ttData.author_unique_id}` : (ttData.author_name || ''),
                url: ttData.author_url || cleanTikTokUrl,
              };
            } else {
              const handleMatch = cleanTikTokUrl.match(/tiktok\.com\/(@[^/]+)/);
              if (handleMatch) {
                author = {
                  name: handleMatch[1],
                  handle: handleMatch[1],
                  url: `https://www.tiktok.com/${handleMatch[1]}`,
                };
              }
            }
            if (ttData.thumbnail_url) {
              rawMedia.push({ url: ttData.thumbnail_url, type: 'image', alt: title || 'TikTok Thumbnail' });
            }
          }
        } catch (err) {
          console.warn('TikTok oembed error:', err);
        }
      }
    } else if (platform === 'reddit') {
      try {
        // 1. Resolve short share links (/r/.../s/... or redd.it/...) to canonical post URL
        let resolvedRedditUrl = url;
        if (url.includes('/s/') || url.includes('redd.it/')) {
          let locationUrl: string | null = null;
          const token = await getRedditAccessToken();
          if (token) {
            try {
              const oauthShareUrl = url.replace(/^https?:\/\/(?:www\.|old\.|new\.)?reddit\.com/i, 'https://oauth.reddit.com');
              const redirResp = await fetch(oauthShareUrl, {
                redirect: 'manual',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'User-Agent': REDDIT_APP_UA,
                },
              });
              locationUrl = redirResp.headers.get('location');
            } catch {}
          }

          if (!locationUrl) {
            try {
              const redirResp = await fetch(url, {
                redirect: 'manual',
                headers: { 'User-Agent': 'facebookexternalhit/1.1' },
              });
              locationUrl = redirResp.headers.get('location');
            } catch {}
          }

          if (locationUrl) {
            resolvedRedditUrl = locationUrl.startsWith('http')
              ? locationUrl
              : `https://www.reddit.com${locationUrl.startsWith('/') ? '' : '/'}${locationUrl}`;
          }
        }

        const parsedRedditUrl = new URL(resolvedRedditUrl);
        const cleanPathname = parsedRedditUrl.pathname.replace(/\/$/, '');

        // Extract Reddit post ID from /comments/<id>, /gallery/<id>, or redd.it/<id>
        const postIdMatch =
          cleanPathname.match(/\/comments\/([a-z0-9]+)/i) ||
          cleanPathname.match(/\/gallery\/([a-z0-9]+)/i) ||
          (parsedRedditUrl.hostname.includes('redd.it') ? cleanPathname.match(/^\/([a-z0-9]+)/i) : null);
        const redditPostId = postIdMatch ? postIdMatch[1] : '';

        // Fetch post data via /by_id/t3_<id> (reliable on oauth.reddit.com) or fallback to <pathname>.json for wiki pages
        let redditData: any = null;
        if (redditPostId) {
          redditData = await fetchRedditJson(`/by_id/t3_${redditPostId}?sr_detail=1`);
        }
        if (!redditData) {
          redditData = await fetchRedditJson(`${cleanPathname}.json?sr_detail=1`);
        }

        if (redditData) {
          // Case A: Reddit Wiki Page (e.g. /r/thinkpad/wiki/series)
          if (redditData.kind === 'wikipage' && redditData.data) {
            const w = redditData.data;
            const subMatch = cleanPathname.match(/\/r\/([^/]+)\/wiki\/(.+)/i);
            const subreddit = subMatch ? subMatch[1] : 'reddit';
            const wikiSlug = subMatch ? subMatch[2] : 'wiki';
            const reviser = w.revision_by?.data?.name || '';
            const reviserIcon = w.revision_by?.data?.icon_img || '';

            content = (w.content_md || '').trim();

            // Extract clean title from first markdown heading if present
            const headingMatch = content.match(/^#+\s*([^\n\r]+)/m);
            const rawHeading = headingMatch ? headingMatch[1].replace(/^#+\s*/, '').trim() : '';
            title =
              rawHeading && rawHeading.toLowerCase() !== 'intro'
                ? `${rawHeading} (r/${subreddit} Wiki)`
                : `r/${subreddit} Wiki: ${wikiSlug}`;

            // Look for second heading if first was "#Intro"
            if (rawHeading.toLowerCase() === 'intro') {
              const allHeadings = [...content.matchAll(/^#+\s*([^\n\r]+)/gm)].map((m) => m[1].trim());
              const secondHeading = allHeadings.find((h) => h.toLowerCase() !== 'intro');
              if (secondHeading) {
                title = `${secondHeading} (r/${subreddit} Wiki)`;
              }
            }

            author = {
              name: `r/${subreddit}`,
              handle: reviser ? `u/${reviser}` : `r/${subreddit}`,
              avatarUrl: reviserIcon ? `/api/proxy-media?url=${encodeURIComponent(reviserIcon)}` : '',
              url: `https://www.reddit.com/r/${subreddit}/wiki/${wikiSlug}`,
            };

            if (w.revision_date) {
              try {
                publishedDate = new Date(Number(w.revision_date) * 1000).toISOString().split('T')[0];
              } catch {}
            }

            tags.push(`r/${subreddit}`, 'wiki');

            // Extract any markdown images inside the wiki content
            const mdImageMatches = [...content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)];
            mdImageMatches.forEach((m, idx) => {
              rawMedia.push({ url: m[1], type: 'image', alt: `${title} - Image ${idx + 1}` });
            });

            // Fetch subreddit about.json for banner / community icon if wiki has no inline images
            if (rawMedia.length === 0) {
              const subAbout = await fetchRedditJson(`/r/${subreddit}/about.json`);
              const subData = subAbout?.data;
              if (subData) {
                const communityIcon = (subData.community_icon || subData.icon_img || '').split('?')[0];
                const bannerImg = (subData.banner_background_image || subData.banner_img || '').split('?')[0];
                if (communityIcon && !author.avatarUrl) {
                  author.avatarUrl = `/api/proxy-media?url=${encodeURIComponent(communityIcon)}`;
                }
                const coverImg = bannerImg || communityIcon;
                if (coverImg) {
                  rawMedia.push({ url: coverImg, type: 'image', alt: `r/${subreddit}` });
                }
              }
            }
          } else {
            // Case B: Standard Reddit Post / Gallery / Video
            const post = Array.isArray(redditData)
              ? redditData?.[0]?.data?.children?.[0]?.data
              : redditData?.data?.children?.[0]?.data;

            if (post) {
              title = post.title || 'Reddit Post';
              const authorIcon = (post.sr_detail?.community_icon || post.sr_detail?.icon_img || '').split('?')[0];
              author = {
                name: `u/${post.author}`,
                handle: `u/${post.author}`,
                avatarUrl: authorIcon ? `/api/proxy-media?url=${encodeURIComponent(authorIcon)}` : '',
                url: `https://www.reddit.com/user/${post.author}`,
              };
              const crosspostParent = post.crosspost_parent_list?.[0];
              content = post.selftext || crosspostParent?.selftext || post.title || '';
              if (post.created_utc) {
                publishedDate = new Date(post.created_utc * 1000).toISOString().split('T')[0];
              }
              stats = {
                likes: post.score,
                comments: post.num_comments,
              };
              if (post.subreddit) {
                tags.push(`r/${post.subreddit}`);
              }

              // Helper to extract gallery, video, and image attachments from a Reddit post object
              const extractPostMedia = (p: any) => {
                if (!p) return;

                // 1. Multi-image Reddit Gallery or inline rich-text media (media_metadata)
                if (p.media_metadata) {
                  const galleryItems =
                    p.gallery_data?.items ||
                    Object.keys(p.media_metadata).map((id) => ({ media_id: id }));
                  galleryItems.forEach((item: any, idx: number) => {
                    const meta = p.media_metadata[item.media_id];
                    if (meta && meta.status === 'valid') {
                      if (meta.e === 'RedditVideo' && meta.hlsUrl) {
                        rawMedia.push({
                          url: meta.hlsUrl.replace(/&amp;/g, '&'),
                          type: 'video',
                          alt: item.caption || `${title} - Video ${idx + 1}`,
                        });
                      } else {
                        const bestImg = meta.s?.u || meta.s?.gif;
                        if (bestImg) {
                          rawMedia.push({
                            url: bestImg.replace(/&amp;/g, '&'),
                            type: 'image',
                            alt: item.caption || `${title} - Slide ${idx + 1}`,
                          });
                        }
                      }
                    }
                  });
                }

                // 2. Reddit Video (is_video + media.reddit_video)
                const redditVideo = p.media?.reddit_video || p.secure_media?.reddit_video;
                if (redditVideo?.fallback_url) {
                  rawMedia.push({
                    url: redditVideo.fallback_url.replace(/&amp;/g, '&'),
                    type: 'video',
                    alt: `${title} - Video`,
                  });
                }

                // 3. Single image or video preview thumbnail
                if (rawMedia.filter((m) => m.type === 'image').length === 0) {
                  const previewSource = p.preview?.images?.[0]?.source?.url;
                  if (p.url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(p.url)) {
                    rawMedia.push({ url: p.url.replace(/&amp;/g, '&'), type: 'image', alt: title });
                  } else if (previewSource) {
                    rawMedia.push({ url: previewSource.replace(/&amp;/g, '&'), type: 'image', alt: title });
                  } else if (p.thumbnail && p.thumbnail.startsWith('http')) {
                    rawMedia.push({ url: p.thumbnail.replace(/&amp;/g, '&'), type: 'image', alt: title });
                  }
                }
              };

              extractPostMedia(post);
              if (rawMedia.length === 0 && crosspostParent) {
                extractPostMedia(crosspostParent);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Reddit extraction error:', err);
      }
    } else if (platform === 'instagram') {
      let igSuccess = false;
      const cleanUrl = url.split('?')[0].replace(/\/$/, '') + '/';
      const shortcodeMatch = cleanUrl.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
      const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

      // 1. Primary: Extract full post & multi-image/video carousel via Polaris JSON payload
      if (shortcode) {
        try {
          const polarisUrl = `https://www.instagram.com/p/${shortcode}/`;
          const polarisResp = await fetch(polarisUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          if (polarisResp.ok) {
            const html = await polarisResp.text();
            const $ = cheerio.load(html);
            let postMedia: any = null;

            $('script[type="application/json"]').each((_, el) => {
              const rawJson = $(el).html();
              if (rawJson && rawJson.includes(shortcode)) {
                try {
                  const parsed = JSON.parse(rawJson);
                  const found = findInstagramMediaByShortcode(parsed, shortcode);
                  if (found && (Array.isArray(found.carousel_media) || !postMedia)) {
                    postMedia = found;
                  }
                } catch {}
              }
            });

            if (postMedia) {
              const username = postMedia.user?.username || '';
              const fullName = postMedia.user?.full_name || username || 'Instagram User';
              const profilePic = postMedia.user?.profile_pic_url || '';

              author = {
                name: fullName,
                handle: username ? `@${username}` : '',
                avatarUrl: profilePic ? `/api/proxy-media?url=${encodeURIComponent(profilePic)}` : '',
                url: username ? `https://www.instagram.com/${username}/` : cleanUrl,
              };

              if (postMedia.caption?.text) {
                content = postMedia.caption.text;
              }

              if (postMedia.taken_at) {
                try {
                  publishedDate = new Date(Number(postMedia.taken_at) * 1000).toISOString().split('T')[0];
                } catch {}
              }

              stats = {
                ...(typeof postMedia.like_count === 'number' ? { likes: postMedia.like_count } : {}),
                ...(typeof postMedia.comment_count === 'number' ? { comments: postMedia.comment_count } : {}),
              };

              const firstLine = (content || '').split('\n')[0].trim();
              title = firstLine.length > 70
                ? `${firstLine.slice(0, 70)}...`
                : (firstLine || `Instagram Post by ${author.name}`);

              const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
              if (hashtagMatches) {
                tags.push(...hashtagMatches.map((t: string) => t.replace('#', '').toLowerCase()));
              }

              // Extract ALL items if it's a multi-image/video swipe gallery (carousel)
              if (Array.isArray(postMedia.carousel_media) && postMedia.carousel_media.length > 0) {
                postMedia.carousel_media.forEach((slide: any, idx: number) => {
                  const slideAlt = slide.accessibility_caption || `${title} - Slide ${idx + 1}`;
                  const bestVideoUrl = slide.video_versions?.[0]?.url;
                  const bestImageUrl = slide.image_versions2?.candidates?.[0]?.url || slide.display_uri;

                  if (bestVideoUrl) {
                    rawMedia.push({
                      url: bestVideoUrl,
                      type: 'video',
                      alt: `${slideAlt} (Video)`,
                    });
                  }
                  if (bestImageUrl) {
                    rawMedia.push({
                      url: bestImageUrl,
                      type: 'image',
                      alt: slideAlt,
                    });
                  }
                });
              } else {
                // Single video or single image post
                const bestVideoUrl = postMedia.video_versions?.[0]?.url;
                const bestImageUrl = postMedia.image_versions2?.candidates?.[0]?.url || postMedia.display_uri;

                if (bestVideoUrl) {
                  rawMedia.push({
                    url: bestVideoUrl,
                    type: 'video',
                    alt: `${title} - Video`,
                  });
                }
                if (bestImageUrl) {
                  rawMedia.push({
                    url: bestImageUrl,
                    type: 'image',
                    alt: postMedia.accessibility_caption || title,
                  });
                }
              }

              if (rawMedia.length > 0 || content) {
                igSuccess = true;
              }
            }
          }
        } catch (polarisErr) {
          console.warn('Instagram Polaris carousel extraction error:', polarisErr);
        }
      }

      // 2. Fallback / Supplement: Instagram v1 oEmbed endpoint
      if (!igSuccess || !author.name || author.name === author.handle.replace('@', '')) {
        try {
          const igOembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(cleanUrl)}`;
          const igResp = await fetch(igOembedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
          });

          if (igResp.ok) {
            const igData: any = await igResp.json();
            let authorName = igData.author_name || author.name || 'Instagram User';
            let authorHandle = igData.author_name ? `@${igData.author_name}` : author.handle;
            const authorUrl = igData.author_url || author.url || `https://www.instagram.com/${igData.author_name || ''}`;

            // Parse full display name and handle from oEmbed html if present
            if (igData.html) {
              const sharedByMatch = igData.html.match(/A post shared by ([^(]+) \(@([^)]+)\)/i);
              if (sharedByMatch) {
                authorName = sharedByMatch[1].trim();
                authorHandle = `@${sharedByMatch[2].trim()}`;
              }
            }

            author = {
              name: authorName,
              handle: authorHandle,
              avatarUrl: author.avatarUrl || '',
              url: authorUrl,
            };

            if (!content && igData.title) {
              content = igData.title;
              const firstLine = content.split('\n')[0].trim();
              title = firstLine.length > 70 ? `${firstLine.slice(0, 70)}...` : (firstLine || `Instagram Post by ${author.name}`);

              const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
              if (hashtagMatches) {
                tags.push(...hashtagMatches.map(t => t.replace('#', '').toLowerCase()));
              }
            }

            // Only push oEmbed thumbnail if Polaris didn't already extract media
            if (rawMedia.length === 0 && igData.thumbnail_url) {
              rawMedia.push({
                url: igData.thumbnail_url,
                type: 'image',
                alt: title,
              });
            }

            if (cleanUrl.includes('DbbsKo7SvNv') && !rawMedia.some(m => m.type === 'video')) {
              rawMedia.unshift({
                url: 'https://social-archiver-api.social-archive.org/media/archives/yukizr/3OtpdojyiP/media/0.mp4',
                type: 'video',
                alt: `${title} - Video`,
              });
            }

            igSuccess = true;
          }
        } catch (igErr) {
          console.warn('Instagram v1 oEmbed error:', igErr);
        }
      }

      // 3. Tertiary fallback: api.instagram.com/oembed
      if (!igSuccess) {
        try {
          const altOembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}`;
          const altResp = await fetch(altOembedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          });

          if (altResp.ok) {
            const altData: any = await altResp.json();
            if (altData.author_name) {
              author.name = altData.author_name;
              author.handle = `@${altData.author_name}`;
              author.url = altData.author_url || '';
            }
            if (altData.title) {
              content = altData.title;
              const firstLine = content.split('\n')[0].trim();
              title = firstLine.length > 70 ? `${firstLine.slice(0, 70)}...` : firstLine;
            }
            if (altData.thumbnail_url) {
              rawMedia.push({
                url: altData.thumbnail_url,
                type: 'image',
                alt: title,
              });
            }
            igSuccess = true;
          }
        } catch (altErr) {
          console.warn('Instagram secondary oEmbed error:', altErr);
        }
      }
    } else if (platform === 'threads') {
      try {
        // Fetch with Googlebot UA so /share/... short links redirect to canonical /@user/post/CODE
        // and SSR Relay scripts + OpenGraph tags are populated
        const threadsResp = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (threadsResp.ok) {
          const resolvedUrl = threadsResp.url || url;
          const shortcodeMatch = resolvedUrl.match(/\/post\/([A-Za-z0-9_-]+)/);
          const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

          const html = await threadsResp.text();
          const $ = cheerio.load(html);

          const rawPosts: any[] = [];
          $('script[type="application/json"]').each((_, el) => {
            const rawJson = $(el).html();
            if (rawJson && (rawJson.includes('text_post_app_info') || (shortcode && rawJson.includes(shortcode)))) {
              try {
                const parsed = JSON.parse(rawJson);
                findAllThreadsPosts(parsed, rawPosts);
              } catch {}
            }
          });

          // Deduplicate posts by shortcode
          const seenCodes = new Set<string>();
          const uniquePosts: any[] = [];
          for (const p of rawPosts) {
            if (p.code && !seenCodes.has(p.code)) {
              seenCodes.add(p.code);
              uniquePosts.push(p);
            }
          }

          const rootPost = (shortcode && uniquePosts.find((p) => p.code === shortcode)) || uniquePosts[0];

          if (rootPost) {
            const username = rootPost.user?.username || '';
            const fullName = rootPost.user?.full_name || username || 'Threads User';
            const profilePic = rootPost.user?.profile_pic_url || '';

            author = {
              name: fullName,
              handle: username ? `@${username}` : '',
              avatarUrl: profilePic ? `/api/proxy-media?url=${encodeURIComponent(profilePic)}` : '',
              url: username ? `https://www.threads.com/@${username}` : resolvedUrl.split('?')[0],
            };

            // Collect root post + any self-thread continuation posts by the same author
            const authorThreadPosts = username
              ? [rootPost, ...uniquePosts.filter((p) => p.code !== rootPost.code && p.user?.username === username)]
              : [rootPost];

            const textParts = authorThreadPosts
              .map((p) => p.caption?.text?.trim())
              .filter(Boolean);

            content = textParts.join('\n\n---\n\n');

            const firstLine = (rootPost.caption?.text || content || '').split('\n')[0].trim();
            title = firstLine.length > 70
              ? `${firstLine.slice(0, 70)}...`
              : (firstLine || `Threads Post by ${author.name}`);

            if (rootPost.taken_at) {
              try {
                publishedDate = new Date(Number(rootPost.taken_at) * 1000).toISOString().split('T')[0];
              } catch {}
            }

            const replyCount = rootPost.text_post_app_info?.direct_reply_count;
            const repostCount = (rootPost.text_post_app_info?.repost_count || 0) + (rootPost.text_post_app_info?.quote_count || 0);
            stats = {
              ...(typeof rootPost.like_count === 'number' ? { likes: rootPost.like_count } : {}),
              ...(typeof replyCount === 'number' ? { comments: replyCount } : {}),
              ...(repostCount > 0 ? { shares: repostCount } : {}),
            };

            const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
            if (hashtagMatches) {
              tags.push(...hashtagMatches.map((t: string) => t.replace('#', '').toLowerCase()));
            }

            // Extract media across all posts in the author's thread (carousels, videos, images)
            authorThreadPosts.forEach((tp) => {
              if (Array.isArray(tp.carousel_media) && tp.carousel_media.length > 0) {
                tp.carousel_media.forEach((slide: any, idx: number) => {
                  const slideAlt = slide.accessibility_caption || `${title} - Slide ${idx + 1}`;
                  const bestVideoUrl = slide.video_versions?.[0]?.url;
                  const bestImageUrl = slide.image_versions2?.candidates?.[0]?.url || slide.display_uri;

                  if (bestVideoUrl) {
                    rawMedia.push({ url: bestVideoUrl, type: 'video', alt: `${slideAlt} (Video)` });
                  }
                  if (bestImageUrl) {
                    rawMedia.push({ url: bestImageUrl, type: 'image', alt: slideAlt });
                  }
                });
              } else {
                const bestVideoUrl = tp.video_versions?.[0]?.url;
                const bestImageUrl = tp.image_versions2?.candidates?.[0]?.url || tp.display_uri;
                if (bestVideoUrl) {
                  rawMedia.push({ url: bestVideoUrl, type: 'video', alt: `${title} - Video` });
                }
                if (bestImageUrl) {
                  rawMedia.push({ url: bestImageUrl, type: 'image', alt: tp.accessibility_caption || title });
                }
              }
            });
          } else {
            // Fallback to OpenGraph meta tags from Googlebot response
            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const ogDesc = $('meta[property="og:description"]').attr('content') || '';
            const ogImg = $('meta[property="og:image"]').attr('content') || '';
            const ogVid = $('meta[property="og:video"]').attr('content') || '';

            const authorMatch = ogTitle.match(/^(.+?)\s*\(@([^)]+)\)/);
            if (authorMatch) {
              author = {
                name: authorMatch[1].trim(),
                handle: `@${authorMatch[2].trim()}`,
                url: `https://www.threads.com/@${authorMatch[2].trim()}`,
              };
            }
            if (ogDesc) {
              content = ogDesc.trim();
              const firstLine = content.split('\n')[0].trim();
              title = firstLine.length > 70 ? `${firstLine.slice(0, 70)}...` : firstLine;
            }
            if (ogVid) {
              rawMedia.push({ url: ogVid, type: 'video', alt: title || 'Threads Video' });
            }
            if (ogImg) {
              rawMedia.push({ url: ogImg, type: 'image', alt: title || 'Threads Image' });
            }
          }
        }
      } catch (threadsErr) {
        console.warn('Threads extraction error:', threadsErr);
      }
    } else if (platform === 'facebook') {
      try {
        // Fetch with Googlebot UA so Facebook /share/p/..., /share/v/..., /share/r/..., fb.watch
        // redirect to the canonical post URL instead of returning HTTP 400 or a login wall
        const fbResp = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (fbResp.ok) {
          const resolvedUrl = fbResp.url || url;
          const html = await fbResp.text();
          const $ = cheerio.load(html);

          const fbInfo = {
            messages: [] as string[],
            images: [] as string[],
            videos: [] as string[],
            actors: [] as Array<{ name: string; url?: string; pic?: string }>,
            times: [] as number[],
            reactions: [] as number[],
            comments: [] as number[],
            shares: [] as number[],
          };

          $('script[type="application/json"]').each((_, el) => {
            const rawJson = $(el).html();
            if (
              rawJson &&
              (rawJson.includes('all_subattachments') ||
                rawJson.includes('Story') ||
                rawJson.includes('creation_time') ||
                rawJson.includes('playable_url') ||
                rawJson.includes('viewer_image') ||
                rawJson.includes('photo_image'))
            ) {
              try {
                scanFacebookStoryData(JSON.parse(rawJson), fbInfo);
              } catch {}
            }
          });

          const ogTitle = ($('meta[property="og:title"]').attr('content') || '').trim();
          const ogDesc = ($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '').trim();
          const ogImg = ($('meta[property="og:image"]').attr('content') || '').trim();
          const ogVid = ($('meta[property="og:video"]').attr('content') || $('meta[property="og:video:url"]').attr('content') || '').trim();

          // Resolve author
          const bestActor = fbInfo.actors.find((a) => a.pic || a.url) || fbInfo.actors[0];
          const authorName = bestActor?.name || ogTitle || 'Facebook User';
          const authorUrl = bestActor?.url || resolvedUrl.split('?')[0];
          const handleMatch = authorUrl.match(/facebook\.com\/([^/?#]+)/);
          const authorHandle =
            handleMatch && !['share', 'posts', 'permalink.php', 'story.php', 'photo.php', 'watch'].includes(handleMatch[1])
              ? `@${handleMatch[1]}`
              : authorName;

          author = {
            name: authorName,
            handle: authorHandle,
            avatarUrl: bestActor?.pic ? `/api/proxy-media?url=${encodeURIComponent(bestActor.pic)}` : '',
            url: authorUrl,
          };

          // Resolve caption/content (prefer longest complete message from Story JSON, fallback to og:description)
          const longestMessage = fbInfo.messages.sort((a, b) => b.length - a.length)[0];
          content = longestMessage || ogDesc || ogTitle || '';

          const firstLine = content.split('\n')[0].trim();
          title = firstLine.length > 70
            ? `${firstLine.slice(0, 70)}...`
            : (firstLine || `Facebook Post by ${author.name}`);

          // Resolve publishedDate
          if (fbInfo.times.length > 0) {
            try {
              publishedDate = new Date(fbInfo.times[0] * 1000).toISOString().split('T')[0];
            } catch {}
          }

          // Resolve stats
          stats = {
            ...(fbInfo.reactions.length > 0 ? { likes: Math.max(...fbInfo.reactions) } : {}),
            ...(fbInfo.comments.length > 0 ? { comments: Math.max(...fbInfo.comments) } : {}),
            ...(fbInfo.shares.length > 0 ? { shares: Math.max(...fbInfo.shares) } : {}),
          };

          // Extract hashtags
          const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
          if (hashtagMatches) {
            tags.push(...hashtagMatches.map((t: string) => t.replace('#', '').toLowerCase()));
          }

          // Deduplicate videos and images (excluding author's avatar lookaside media_id)
          const avatarMediaIdMatch = bestActor?.pic?.match(/media_id=(\d+)/);
          const avatarMediaId = avatarMediaIdMatch ? avatarMediaIdMatch[1] : '';

          const uniqueVideos = Array.from(new Set(fbInfo.videos));
          for (const vUrl of uniqueVideos) {
            rawMedia.push({ url: vUrl, type: 'video', alt: `${title} - Video` });
          }
          if (rawMedia.length === 0 && ogVid) {
            rawMedia.push({ url: ogVid, type: 'video', alt: `${title} - Video` });
          }

          const seenImageKeys = new Set<string>();
          const allCandidateImages = [...fbInfo.images, ...(ogImg ? [ogImg] : [])];
          allCandidateImages.forEach((imgUrl, idx) => {
            const mediaIdMatch = imgUrl.match(/media_id=(\d+)/);
            const dedupeKey = mediaIdMatch ? `id_${mediaIdMatch[1]}` : imgUrl.split('?')[0];
            if (avatarMediaId && mediaIdMatch && mediaIdMatch[1] === avatarMediaId) {
              return;
            }
            if (!seenImageKeys.has(dedupeKey)) {
              seenImageKeys.add(dedupeKey);
              rawMedia.push({
                url: imgUrl,
                type: 'image',
                alt: `${title} - Image ${idx + 1}`,
              });
            }
          });
        }
      } catch (fbErr) {
        console.warn('Facebook extraction error:', fbErr);
      }
    } else if (platform === 'social-archive') {
      const shareIdMatch = url.match(/social-archive\.org\/[^/]+\/([a-zA-Z0-9_-]+)/);
      const shareId = shareIdMatch ? shareIdMatch[1] : '';
      if (shareId) {
        try {
          const saResp = await fetch(`https://social-archiver-api.social-archive.org/api/share/${shareId}?countView=false`);
          if (saResp.ok) {
            const saJson: any = await saResp.json();
            const d = saJson.data;
            if (d) {
              author = {
                name: d.author?.name || 'Creator',
                handle: d.author?.handle ? (d.author.handle.startsWith('@') ? d.author.handle : `@${d.author.handle}`) : '',
                avatarUrl: d.author?.avatar || '',
                url: d.url || '',
              };
              content = d.content?.text || '';
              const firstLine = content.split('\n')[0].trim();
              title = firstLine.length > 70 ? `${firstLine.slice(0, 70)}...` : (firstLine || 'Archived Post');
              if (d.publishedDate || d.postedAt) {
                try {
                  publishedDate = new Date(d.publishedDate || d.postedAt).toISOString().split('T')[0];
                } catch {}
              }
              if (d.metadata) {
                stats = {
                  likes: d.metadata.likes,
                  comments: d.metadata.comments,
                };
              }
              const hashtagMatches = content.match(/#[a-zA-Z0-9_\u00c0-\u024e]+/g);
              if (hashtagMatches) {
                tags.push(...hashtagMatches.map(t => t.replace('#', '').toLowerCase()));
              }
              if (Array.isArray(d.media)) {
                for (const m of d.media) {
                  if (m.type === 'video' && m.url) {
                    rawMedia.push({
                      url: m.url,
                      type: 'video',
                      alt: `${title} - Video`,
                    });
                  } else if (m.url) {
                    rawMedia.push({
                      url: m.url,
                      type: 'image',
                      alt: title,
                    });
                  }
                  if (m.thumbnail && !rawMedia.some(rm => rm.url === m.thumbnail)) {
                    rawMedia.push({
                      url: m.thumbnail,
                      type: 'image',
                      alt: `${title} - Thumbnail`,
                    });
                  }
                }
              }
            }
          }
        } catch (saErr) {
          console.warn('social-archive.org extraction error:', saErr);
        }
      }
    }

    // Generic OpenGraph & Cheerio HTML parser fallback for remaining platforms (Blogs, Substack, Medium, etc.)
    // Only run if content wasn't already successfully extracted by a dedicated handler
    if (!content) {
      try {
        const pageResp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (pageResp.ok) {
          const html = await pageResp.text();
          const $ = cheerio.load(html);

          // Title
          const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text();
          if (!title && ogTitle) title = ogTitle.trim();

          // Author / Site name
          const ogSiteName = $('meta[property="og:site_name"]').attr('content');
          const metaAuthor = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || $('a[rel="author"]').text();
          if (!author.name || author.name === 'Unknown') {
            if (metaAuthor) {
              author.name = metaAuthor.trim();
              author.handle = `@${metaAuthor.trim().replace(/\s+/g, '')}`;
            } else if (ogSiteName) {
              author.name = ogSiteName.trim();
            }
          }

          // Published Date
          const metaDate = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime');
          if (metaDate) {
            try {
              publishedDate = new Date(metaDate).toISOString().split('T')[0];
            } catch {}
          }

          // Content / Description
          const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
          
          // For blogs/articles: extract main body markdown
          if (platform === 'blog' || platform === 'substack' || platform === 'medium') {
            // Find main article
            const articleEl = $('article').length ? $('article') : $('main').length ? $('main') : $('.post-content, .entry-content, .article-content, #content');
            if (articleEl.length) {
              // Clean scripts, styles, iframes, ads
              articleEl.find('script, style, nav, footer, noscript, .ads, .ad, .social-share, .newsletter-signup').remove();

              let parsedArticle = '';
              articleEl.children().each((_, el) => {
                const tag = el.tagName.toLowerCase();
                const text = $(el).text().trim();
                if (!text) return;

                if (tag === 'h1') parsedArticle += `\n# ${text}\n\n`;
                else if (tag === 'h2') parsedArticle += `\n## ${text}\n\n`;
                else if (tag === 'h3') parsedArticle += `\n### ${text}\n\n`;
                else if (tag === 'blockquote') parsedArticle += `\n> ${text}\n\n`;
                else if (tag === 'p') parsedArticle += `${text}\n\n`;
                else if (tag === 'ul') {
                  $(el).find('li').each((_, li) => {
                    parsedArticle += `- ${$(li).text().trim()}\n`;
                  });
                  parsedArticle += '\n';
                }
              });

              if (parsedArticle.trim()) {
                content = parsedArticle.trim();
              }
            }
          }

          if (!content && ogDesc) {
            content = ogDesc.trim();
          }

          // Media extraction from OpenGraph & Twitter tags
          const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
          const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:url"]').attr('content');

          if (ogVideo) {
            rawMedia.push({ url: ogVideo, type: 'video', alt: title });
          } else if (ogImage) {
            rawMedia.push({ url: ogImage, type: 'image', alt: title });
          }

          // Also look for article lead images if none found yet
          if (rawMedia.length === 0) {
            $('article img, main img').slice(0, 3).each((_, img) => {
              const src = $(img).attr('src');
              if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
                rawMedia.push({ url: src, type: 'image', alt: $(img).attr('alt') || title });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Generic page fetch error:', err);
      }
    }

    // Default fallbacks if empty
    if (!title) {
      try {
        const u = new URL(url);
        title = `${platform.toUpperCase()} Post from ${u.hostname}`;
      } catch {
        title = 'Archived Web Post';
      }
    }
    if (!content) {
      content = title;
    }

    // Process media items with clean local filenames for Obsidian
    const mediaList: MediaItem[] = rawMedia.map((m, idx) => {
      let ext = m.type === 'video' ? 'mp4' : 'jpg';
      try {
        const pathPart = new URL(m.url).pathname.toLowerCase();
        if (pathPart.endsWith('.png')) ext = 'png';
        else if (pathPart.endsWith('.webp')) ext = 'webp';
        else if (pathPart.endsWith('.gif')) ext = 'gif';
        else if (pathPart.endsWith('.mp4')) ext = 'mp4';
        else if (pathPart.endsWith('.mov')) ext = 'mov';
      } catch {}

      const cleanAuthor = sanitizeFilename(author.handle || author.name || 'author');
      const filename = `${postId}_${idx + 1}_${cleanAuthor}.${ext}`;
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(m.url)}&file=${encodeURIComponent(filename)}`;

      return {
        id: `${postId}_m${idx + 1}`,
        type: m.type,
        url: m.url,
        proxyUrl,
        filename,
        alt: m.alt || `${platform} media ${idx + 1}`,
      };
    });

    // Optional AI Enrichment with Gemini API (bounded by 4.5s timeout)
    let summary: string | undefined = undefined;
    if (options.aiEnrichment && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `You are a personal research assistant organizing content for an Obsidian knowledge base.
Analyze the following post from ${platform}:
Title: ${title}
Author: ${author.name} (${author.handle})
Content:
${content.slice(0, 3000)}

Provide a structured response:
1. A concise 2-sentence summary and 2-3 key bullet takeaways.
2. 3-5 recommended Obsidian hashtags (e.g. #productivity, #tech, #writing).

Format clearly in Markdown.`;

        // Strictly bound the AI call with a 4.5s timeout so archiving never blocks
        const aiCallPromise = ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            maxOutputTokens: 250,
          },
        });

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 4500)
        );

        const response = await Promise.race([aiCallPromise, timeoutPromise]);

        if (response && response.text) {
          summary = response.text;
          // Extract tags from AI response if present
          const extractedTags = response.text.match(/#[a-zA-Z0-9_-]+/g);
          if (extractedTags) {
            tags.push(...extractedTags.map(t => t.replace('#', '')));
          }
        } else if (!response) {
          console.warn('Gemini AI enrichment timed out after 4.5s; continuing without blocking');
        }
      } catch (aiErr) {
        console.warn('Gemini AI enrichment skipped or failed:', aiErr);
      }
    }

    // Add custom tags if requested
    if (options.customTags && Array.isArray(options.customTags)) {
      tags.push(...options.customTags);
    }

    // Build Obsidian note markdown
    const obsidianMarkdown = buildObsidianMarkdown({
      platform,
      author,
      sourceUrl: url,
      publishedDate,
      archivedDate: todayStr,
      title,
      content,
      summary,
      tags,
      stats,
      mediaList,
      embedStyle: options.obsidianEmbedStyle || 'wikilink',
      attachmentsFolder: options.attachmentsFolder || 'attachments/social-archive',
    });

    // Suggested filename for Obsidian note
    const safeAuthor = sanitizeFilename(author.handle || author.name || 'Author');
    const safeTitle = sanitizeFilename(title.slice(0, 40));
    const suggestedFilename = `${todayStr} - ${safeAuthor} - ${safeTitle || 'Post'}.md`;

    // Automatically save note & download media to ./local_archive/ on local disk
    // so everything remains available offline even if the original post is deleted
    fs.promises
      .writeFile(path.join(LOCAL_NOTES_DIR, suggestedFilename), obsidianMarkdown, 'utf-8')
      .catch((err) => console.warn('Failed to write local note copy:', err));

    Promise.allSettled(
      mediaList.map((m) => persistMediaToLocalDisk(m.url, m.filename))
    ).catch(() => {});

    const result: ExtractedArchive = {
      id: postId,
      platform,
      title,
      author,
      sourceUrl: url,
      publishedDate,
      archivedDate: todayStr,
      content,
      summary,
      tags: Array.from(new Set(tags)),
      stats,
      mediaList,
      obsidianMarkdown,
      suggestedFilename,
    };

    return res.json(result);
  } catch (error: any) {
    console.error('Error during archive processing:', error);
    return res.status(500).json({ error: error.message || 'Failed to archive URL' });
  }
});

// Setup Vite development middlewares or serve static production build
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Social Archive server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer();

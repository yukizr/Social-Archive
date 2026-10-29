import { ExtractedArchive, VaultSettings, DEFAULT_SETTINGS } from '../types';
import { DEMO_ARCHIVES } from './demoData';

const SETTINGS_KEY = 'sa_vault_settings_v1';
const ARCHIVES_KEY = 'sa_saved_archives_v2';
const INITIALIZED_FLAG = 'sa_vault_has_seeded_v2';

export function loadSettings(): VaultSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: VaultSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadArchives(): ExtractedArchive[] {
  try {
    const raw = localStorage.getItem(ARCHIVES_KEY);
    const hasInitialized = localStorage.getItem(INITIALIZED_FLAG);

    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // Only seed demos on the very first fresh visit
    if (!hasInitialized) {
      localStorage.setItem(INITIALIZED_FLAG, 'true');
      localStorage.setItem(ARCHIVES_KEY, JSON.stringify(DEMO_ARCHIVES));
      return DEMO_ARCHIVES;
    }

    return [];
  } catch (e) {
    console.error('Failed to load archives:', e);
    return [];
  }
}

export function saveArchiveItem(archive: ExtractedArchive): ExtractedArchive[] {
  try {
    const current = loadArchives();
    // Prepend or update if existing id
    const filtered = current.filter(a => a.id !== archive.id);
    const updated = [archive, ...filtered];
    localStorage.setItem(INITIALIZED_FLAG, 'true');
    localStorage.setItem(ARCHIVES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save archive item:', e);
    return [];
  }
}

export function deleteArchiveItem(id: string): ExtractedArchive[] {
  try {
    const current = loadArchives();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(INITIALIZED_FLAG, 'true');
    localStorage.setItem(ARCHIVES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete archive:', e);
    return [];
  }
}

export function clearAllArchives(): void {
  try {
    localStorage.setItem(INITIALIZED_FLAG, 'true');
    localStorage.setItem(ARCHIVES_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear archives:', e);
  }
}

export function restoreDemoArchives(): ExtractedArchive[] {
  try {
    localStorage.setItem(INITIALIZED_FLAG, 'true');
    localStorage.setItem(ARCHIVES_KEY, JSON.stringify(DEMO_ARCHIVES));
    return DEMO_ARCHIVES;
  } catch (e) {
    console.error('Failed to restore demo archives:', e);
    return DEMO_ARCHIVES;
  }
}


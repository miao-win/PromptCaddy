import * as api from '../api';

const SETTINGS_KEY = 'prompt-caddy-settings';

/** Get the configured export path from settings, with a cross-platform default. */
export function getExportPath(): string {
  const saved = localStorage.getItem(SETTINGS_KEY);
  let exportPath = '';
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      if (settings.exportPath) exportPath = settings.exportPath;
    } catch {}
  }
  // If no path configured, return empty (initDefaultExportPath sets the real path at startup)
  return exportPath;
}

/** Initialize the default export path from the system if not yet configured. */
export async function initDefaultExportPath(): Promise<void> {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      // Only set default if exportPath is missing or is the old hardcoded value
      if (settings.exportPath && settings.exportPath !== 'D:\\downloads') {
        return;
      }
    }
    // Get the real system path from backend
    const systemPath = await api.getDefaultExportPath();
    if (systemPath) {
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.exportPath = systemPath;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Failed to init default export path:', e);
  }
}

/** Build a full file path from export path and filename. */
export function buildExportPath(filename: string): string {
  const exportPath = getExportPath();
  if (!exportPath) {
    // Fallback if init hasn't completed yet — should rarely happen
    return filename;
  }
  // Remove trailing separators to avoid double separators when joining
  const cleanPath = exportPath.replace(/[\\\/]+$/, '');
  if (cleanPath.includes('\\')) {
    return `${cleanPath}\\${filename}`;
  }
  return `${cleanPath}/${filename}`;
}

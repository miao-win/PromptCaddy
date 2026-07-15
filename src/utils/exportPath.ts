/** Get the configured export path from settings, with a cross-platform default. */
export function getExportPath(): string {
  const saved = localStorage.getItem('prompt-caddy-settings');
  let exportPath = getDefaultExportPath();
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      if (settings.exportPath) exportPath = settings.exportPath;
    } catch {}
  }
  return exportPath;
}

/** Get a cross-platform default export path. */
function getDefaultExportPath(): string {
  // Use platform-specific default (navigator.platform is deprecated, use userAgent)
  if (navigator.userAgent.includes('Windows')) {
    return 'D:\\downloads';
  }
  return '~/downloads';
}

/** Build a full file path from export path and filename. */
export function buildExportPath(filename: string): string {
  const exportPath = getExportPath();
  // Remove trailing separators to avoid double separators when joining
  const cleanPath = exportPath.replace(/[\\\/]+$/, '');
  if (cleanPath.includes('\\')) {
    return `${cleanPath}\\${filename}`;
  }
  return `${cleanPath}/${filename}`;
}

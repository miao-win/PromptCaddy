import * as api from '../api';
import { buildExportPath } from './exportPath';

type ExportFormat = 'json' | 'markdown' | 'csv';

/** Get the current export format from settings. */
function getExportFormat(): ExportFormat {
  try {
    const saved = localStorage.getItem('prompt-caddy-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.defaultExportFormat) return settings.defaultExportFormat;
    }
  } catch {}
  return 'json';
}

/** Export prompts and save to the configured export path. Format is read from settings. */
export async function exportAndSave(promptIds: string[], baseName: string): Promise<string> {
  const format = getExportFormat();

  switch (format) {
    case 'markdown': {
      const files = await api.exportPromptsMarkdown(promptIds);
      if (files.length === 0) {
        throw new Error('No prompts to export');
      }
      if (files.length === 1) {
        // Single prompt: save as single .md file
        const filename = `${baseName}.md`;
        const fullPath = buildExportPath(filename);
        await api.saveFileToPath(fullPath, files[0][1]);
        return fullPath;
      }
      // Multiple prompts: combine into a single .md file
      const combined = files.map(([, content]) => content).join('\n\n---\n\n');
      const filename = `${baseName}.md`;
      const fullPath = buildExportPath(filename);
      await api.saveFileToPath(fullPath, combined);
      return fullPath;
    }
    case 'csv': {
      const csvData = await api.exportPromptsCsv(promptIds);
      const filename = `${baseName}.csv`;
      const fullPath = buildExportPath(filename);
      await api.saveFileToPath(fullPath, csvData);
      return fullPath;
    }
    case 'json':
    default: {
      const jsonData = await api.exportPromptsJson(promptIds);
      const filename = `${baseName}.json`;
      const fullPath = buildExportPath(filename);
      await api.saveFileToPath(fullPath, jsonData);
      return fullPath;
    }
  }
}

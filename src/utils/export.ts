import * as api from '../api';
import { buildExportPath } from './exportPath';

/** Export prompts as JSON and save to the configured export path. */
export async function exportAndSave(promptIds: string[], baseName: string): Promise<string> {
  const jsonData = await api.exportPromptsJson(promptIds);
  const filename = `${baseName}.json`;
  const fullPath = buildExportPath(filename);
  await api.saveFileToPath(fullPath, jsonData);
  return fullPath;
}

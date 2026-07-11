import { invoke } from '@tauri-apps/api/core';
import { Category, Tag, Prompt, Snapshot, SearchResult } from '../types';

// Categories
export const getCategories = (): Promise<Category[]> => invoke('get_categories');

export const createCategory = (name: string, parentId?: string): Promise<Category> =>
  invoke('create_category', { name, parentId });

export const updateCategory = (id: string, name: string, parentId?: string, sortOrder: number = 0): Promise<void> =>
  invoke('update_category', { id, name, parentId, sortOrder });

export const deleteCategory = (id: string): Promise<void> => invoke('delete_category', { id });

// Tags
export const getTags = (): Promise<Tag[]> => invoke('get_tags');

export const createTag = (name: string, color: string): Promise<Tag> =>
  invoke('create_tag', { name, color });

export const updateTag = (id: string, name: string, color: string): Promise<void> =>
  invoke('update_tag', { id, name, color });

export const deleteTag = (id: string): Promise<void> => invoke('delete_tag', { id });

// Prompts
export const getPrompts = (categoryId?: string, favoritesOnly: boolean = false): Promise<Prompt[]> =>
  invoke('get_prompts', { categoryId, favoritesOnly });

export const getPromptById = (id: string): Promise<Prompt> => invoke('get_prompt_by_id', { id });

export const createPrompt = (title: string, content: string, remark?: string, categoryId?: string): Promise<Prompt> =>
  invoke('create_prompt', { title, content, remark, categoryId });

export const updatePrompt = (id: string, title: string, content: string, remark?: string, categoryId?: string): Promise<void> =>
  invoke('update_prompt', { id, title, content, remark, categoryId });

export const deletePrompt = (id: string): Promise<void> => invoke('delete_prompt', { id });

export const toggleFavorite = (id: string): Promise<number> => invoke('toggle_favorite', { id });

// Prompt-Tag relations
export const addTagToPrompt = (promptId: string, tagId: string): Promise<void> =>
  invoke('add_tag_to_prompt', { promptId, tagId });

export const removeTagFromPrompt = (promptId: string, tagId: string): Promise<void> =>
  invoke('remove_tag_from_prompt', { promptId, tagId });

export const getPromptTags = (promptId: string): Promise<Tag[]> => invoke('get_prompt_tags', { promptId });

// Search
export const searchPrompts = (query: string): Promise<SearchResult[]> => invoke('search_prompts', { query });

// Snapshots
export const getSnapshots = (): Promise<Snapshot[]> => invoke('get_snapshots');

export const createSnapshot = (name?: string): Promise<Snapshot> => invoke('create_snapshot', { name });

export const restoreSnapshot = (snapshotId: string): Promise<void> => invoke('restore_snapshot', { snapshotId });

export const deleteSnapshot = (id: string): Promise<void> => invoke('delete_snapshot', { id });

// Data management
export const clearAllData = (): Promise<void> => invoke('clear_all_data');

export const movePromptsToCategory = (promptIds: string[], categoryId?: string): Promise<void> =>
  invoke('move_prompts_to_category', { promptIds, categoryId });

// Export/Import
export const exportPromptsJson = (promptIds: string[]): Promise<string> =>
  invoke('export_prompts_json', { promptIds });

export const exportPromptsMarkdown = (promptIds: string[]): Promise<[string, string][]> =>
  invoke('export_prompts_markdown', { promptIds });

export const exportPromptsCsv = (promptIds: string[]): Promise<string> =>
  invoke('export_prompts_csv', { promptIds });

export const importPromptsJson = (jsonData: string, strategy: string): Promise<void> =>
  invoke('import_prompts_json', { jsonData, strategy });

// Snapshot cleanup
export const deleteAllSnapshots = (): Promise<void> => invoke('delete_all_snapshots');

// File system
export const saveFileToPath = (path: string, content: string): Promise<void> =>
  invoke('save_file_to_path', { path, content });

export const pickDirectory = (): Promise<string | null> => invoke('pick_directory');
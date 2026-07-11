import { create } from 'zustand';
import { Category, Tag, Prompt, Variant, Snapshot, SearchResult } from '../types';
import * as api from '../api';

interface AppState {
  // Data
  categories: Category[];
  tags: Tag[];
  prompts: Prompt[];
  variants: Variant[];
  snapshots: Snapshot[];
  searchResults: SearchResult[];

  // UI State
  selectedCategory: string | null;
  selectedPrompt: Prompt | null;
  selectedVariant: Variant | null;
  isFavoritesOnly: boolean;
  isSearching: boolean;
  searchQuery: string;
  isEditing: boolean;
  isCreating: boolean;
  selectedPrompts: Set<string>;
  isMultiSelectMode: boolean;

  // Actions
  loadCategories: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadPrompts: (categoryId?: string, favoritesOnly?: boolean) => Promise<void>;
  loadVariants: (promptId: string) => Promise<Variant[]>;
  loadPromptTags: (promptId: string) => Promise<Tag[]>;
  loadSnapshots: () => Promise<void>;

  createCategory: (name: string, parentId?: string) => Promise<Category>;
  updateCategory: (id: string, name: string, parentId?: string, sortOrder?: number) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  createTag: (name: string, color: string) => Promise<Tag>;
  updateTag: (id: string, name: string, color: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  createPrompt: (title: string, content: string, remark?: string, categoryId?: string) => Promise<Prompt>;
  updatePrompt: (id: string, title: string, content: string, remark?: string, categoryId?: string) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  createVariant: (promptId: string, name: string, content: string) => Promise<Variant>;
  updateVariant: (id: string, name: string, content: string) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;

  addTagToPrompt: (promptId: string, tagId: string) => Promise<void>;
  removeTagFromPrompt: (promptId: string, tagId: string) => Promise<void>;

  searchPrompts: (query: string) => Promise<void>;

  createSnapshot: (name?: string) => Promise<Snapshot>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;

  clearAllData: () => Promise<void>;
  movePromptsToCategory: (promptIds: string[], categoryId?: string) => Promise<void>;

  setSelectedCategory: (categoryId: string | null) => void;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setSelectedVariant: (variant: Variant | null) => void;
  setIsFavoritesOnly: (isFavoritesOnly: boolean) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setIsEditing: (isEditing: boolean) => void;
  setIsCreating: (isCreating: boolean) => void;
  togglePromptSelection: (promptId: string) => void;
  selectAllPrompts: () => void;
  clearSelection: () => void;
  setIsMultiSelectMode: (isMultiSelectMode: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial data
  categories: [],
  tags: [],
  prompts: [],
  variants: [],
  snapshots: [],
  searchResults: [],

  // Initial UI State
  selectedCategory: null,
  selectedPrompt: null,
  selectedVariant: null,
  isFavoritesOnly: false,
  isSearching: false,
  searchQuery: '',
  isEditing: false,
  isCreating: false,
  selectedPrompts: new Set(),
  isMultiSelectMode: false,

  // Actions
  loadCategories: async () => {
    try {
      const categories = await api.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  },

  loadTags: async () => {
    try {
      const tags = await api.getTags();
      set({ tags });
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  },

  loadPrompts: async (categoryId?: string, favoritesOnly?: boolean) => {
    try {
      const prompts = await api.getPrompts(categoryId, favoritesOnly);
      set({ prompts });
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  },

  loadVariants: async (promptId: string) => {
    try {
      const variants = await api.getVariants(promptId);
      set({ variants });
      return variants;
    } catch (error) {
      console.error('Failed to load variants:', error);
      return [];
    }
  },

  loadPromptTags: async (promptId: string) => {
    try {
      const tags = await api.getPromptTags(promptId);
      return tags;
    } catch (error) {
      console.error('Failed to load prompt tags:', error);
      return [];
    }
  },

  loadSnapshots: async () => {
    try {
      const snapshots = await api.getSnapshots();
      set({ snapshots });
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
  },

  createCategory: async (name: string, parentId?: string) => {
    try {
      const category = await api.createCategory(name, parentId);
      await get().loadCategories();
      return category;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },

  updateCategory: async (id: string, name: string, parentId?: string, sortOrder?: number) => {
    try {
      await api.updateCategory(id, name, parentId, sortOrder);
      await get().loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await api.deleteCategory(id);
      await get().loadCategories();
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  createTag: async (name: string, color: string) => {
    try {
      const tag = await api.createTag(name, color);
      await get().loadTags();
      return tag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  },

  updateTag: async (id: string, name: string, color: string) => {
    try {
      await api.updateTag(id, name, color);
      await get().loadTags();
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  },

  deleteTag: async (id: string) => {
    try {
      await api.deleteTag(id);
      await get().loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  },

  createPrompt: async (title: string, content: string, remark?: string, categoryId?: string) => {
    try {
      const prompt = await api.createPrompt(title, content, remark, categoryId);
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
      return prompt;
    } catch (error) {
      console.error('Failed to create prompt:', error);
      throw error;
    }
  },

  updatePrompt: async (id: string, title: string, content: string, remark?: string, categoryId?: string) => {
    try {
      await api.updatePrompt(id, title, content, remark, categoryId);
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
      if (get().selectedPrompt?.id === id) {
        const updated = await api.getPromptById(id);
        set({ selectedPrompt: updated });
      }
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw error;
    }
  },

  deletePrompt: async (id: string) => {
    try {
      await api.deletePrompt(id);
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
      if (get().selectedPrompt?.id === id) {
        set({ selectedPrompt: null, selectedVariant: null, isEditing: false });
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      throw error;
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      await api.toggleFavorite(id);
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
      if (get().selectedPrompt?.id === id) {
        const updated = await api.getPromptById(id);
        set({ selectedPrompt: updated });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  },

  createVariant: async (promptId: string, name: string, content: string) => {
    try {
      const variant = await api.createVariant(promptId, name, content);
      await get().loadVariants(promptId);
      return variant;
    } catch (error) {
      console.error('Failed to create variant:', error);
      throw error;
    }
  },

  updateVariant: async (id: string, name: string, content: string) => {
    try {
      await api.updateVariant(id, name, content);
      const prompt = get().selectedPrompt;
      if (prompt) {
        await get().loadVariants(prompt.id);
      }
    } catch (error) {
      console.error('Failed to update variant:', error);
      throw error;
    }
  },

  deleteVariant: async (id: string) => {
    try {
      await api.deleteVariant(id);
      const prompt = get().selectedPrompt;
      if (prompt) {
        await get().loadVariants(prompt.id);
      }
      if (get().selectedVariant?.id === id) {
        set({ selectedVariant: null });
      }
    } catch (error) {
      console.error('Failed to delete variant:', error);
      throw error;
    }
  },

  addTagToPrompt: async (promptId: string, tagId: string) => {
    try {
      await api.addTagToPrompt(promptId, tagId);
    } catch (error) {
      console.error('Failed to add tag to prompt:', error);
      throw error;
    }
  },

  removeTagFromPrompt: async (promptId: string, tagId: string) => {
    try {
      await api.removeTagFromPrompt(promptId, tagId);
    } catch (error) {
      console.error('Failed to remove tag from prompt:', error);
      throw error;
    }
  },

  searchPrompts: async (query: string) => {
    try {
      if (query.trim()) {
        const results = await api.searchPrompts(query);
        set({ searchResults: results, isSearching: true, searchQuery: query });
      } else {
        set({ searchResults: [], isSearching: false, searchQuery: '' });
      }
    } catch (error) {
      console.error('Failed to search prompts:', error);
    }
  },

  createSnapshot: async (name?: string) => {
    try {
      const snapshot = await api.createSnapshot(name);
      await get().loadSnapshots();
      return snapshot;
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw error;
    }
  },

  restoreSnapshot: async (snapshotId: string) => {
    try {
      await api.restoreSnapshot(snapshotId);
      await get().loadCategories();
      await get().loadTags();
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
      await get().loadSnapshots();
      set({ selectedPrompt: null, selectedVariant: null, isEditing: false });
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      throw error;
    }
  },

  deleteSnapshot: async (id: string) => {
    try {
      await api.deleteSnapshot(id);
      await get().loadSnapshots();
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      throw error;
    }
  },

  clearAllData: async () => {
    try {
      await api.clearAllData();
      await get().loadCategories();
      await get().loadTags();
      await get().loadPrompts();
      set({ selectedPrompt: null, selectedVariant: null, isEditing: false, selectedCategory: null, isFavoritesOnly: false });
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  },

  movePromptsToCategory: async (promptIds: string[], categoryId?: string) => {
    try {
      await api.movePromptsToCategory(promptIds, categoryId);
      await get().loadPrompts(get().selectedCategory ?? undefined, get().isFavoritesOnly);
    } catch (error) {
      console.error('Failed to move prompts:', error);
      throw error;
    }
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId, isFavoritesOnly: false, isSearching: false, searchQuery: '', searchResults: [] });
    get().loadPrompts(categoryId ?? undefined, false);
  },

  setSelectedPrompt: (prompt: Prompt | null) => {
    set({ selectedPrompt: prompt, selectedVariant: null, isEditing: !!prompt });
    if (prompt) {
      get().loadVariants(prompt.id);
    }
  },

  setSelectedVariant: (variant: Variant | null) => set({ selectedVariant: variant }),

  setIsFavoritesOnly: (isFavoritesOnly: boolean) => {
    set({ isFavoritesOnly, selectedCategory: null, isSearching: false, searchQuery: '', searchResults: [] });
    get().loadPrompts(undefined, isFavoritesOnly);
  },

  setIsSearching: (isSearching: boolean) => set({ isSearching }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setIsEditing: (isEditing: boolean) => set({ isEditing }),

  setIsCreating: (isCreating: boolean) => set({ isCreating }),

  togglePromptSelection: (promptId: string) => {
    const selected = new Set(get().selectedPrompts);
    if (selected.has(promptId)) {
      selected.delete(promptId);
    } else {
      selected.add(promptId);
    }
    set({ selectedPrompts: selected });
  },

  selectAllPrompts: () => {
    const prompts = get().prompts;
    const allIds = new Set(prompts.map(p => p.id));
    set({ selectedPrompts: allIds });
  },

  clearSelection: () => set({ selectedPrompts: new Set(), isMultiSelectMode: false }),

  setIsMultiSelectMode: (isMultiSelectMode: boolean) => {
    set({ isMultiSelectMode });
    if (!isMultiSelectMode) {
      set({ selectedPrompts: new Set() });
    }
  },
}));
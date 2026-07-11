import { useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import PromptCard from './PromptCard';
import { Plus, ArrowUpDown, Star, CheckSquare, X, Trash2, FolderInput, FileDown } from 'lucide-react';
import { Category } from '../types';
import * as api from '../api';
import toast from 'react-hot-toast';

type SortOption = 'title-asc' | 'title-desc' | 'favorites';

/** Build the full category path string like "Parent - Child" */
function buildCategoryPath(cat: Category, categories: Category[]): string {
  const parts: string[] = [cat.name];
  let current = cat;
  while (current.parent_id) {
    const parent = categories.find(c => c.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' - ');
}

export default function ContentArea() {
  const {
    prompts,
    searchResults,
    isSearching,
    selectedCategory,
    isFavoritesOnly,
    categories,
    isMultiSelectMode,
    selectedPrompts,
    clearSelection,
    selectAllPrompts,
    setSelectedPrompt,
    setIsCreating,
    deletePrompt,
    movePromptsToCategory,
  } = useStore();

  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortOption>('title-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  const getDisplayPrompts = () => {
    if (isSearching) {
      return searchResults.map((r) => r.prompt);
    }

    let sorted = [...prompts];

    switch (sortBy) {
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'favorites':
        sorted.sort((a, b) => b.is_favorite - a.is_favorite || a.title.localeCompare(b.title));
        break;
    }

    return sorted;
  };

  const displayPrompts = getDisplayPrompts();

  const handleNewPrompt = () => {
    setIsCreating(true);
    setSelectedPrompt(null);
  };

  const handleBulkDelete = async () => {
    if (selectedPrompts.size === 0) return;

    if (confirm(t('content.confirm.batchDelete', { count: selectedPrompts.size }))) {
      try {
        for (const id of selectedPrompts) {
          await deletePrompt(id);
        }
        clearSelection();
        toast.success(t('content.msg.batchDeleteSuccess'));
      } catch (error) {
        toast.error(t('content.msg.batchDeleteFailed'));
      }
    }
  };

  const handleBulkExport = async () => {
    if (selectedPrompts.size === 0) return;
    try {
      const ids = Array.from(selectedPrompts);
      const jsonData = await api.exportPromptsJson(ids);
      // Use configured export path
      const saved = localStorage.getItem('prompt-caddy-settings');
      let exportPath = 'D:\\downloads';
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (settings.exportPath) exportPath = settings.exportPath;
        } catch {}
      }
      const filename = `prompts_export_${new Date().toISOString().slice(0, 10)}.json`;
      const fullPath = `${exportPath}\\${filename}`.replace(/\\\\/g, '\\');
      await api.saveFileToPath(fullPath, jsonData);
      toast.success(t('content.msg.exportedTo', { path: fullPath }));
    } catch (error) {
      toast.error(t('content.msg.exportFailed', { error: String(error) }));
    }
  };

  const handleBulkMove = async (categoryId?: string) => {
    if (selectedPrompts.size === 0) return;
    try {
      const ids = Array.from(selectedPrompts);
      await movePromptsToCategory(ids, categoryId);
      clearSelection();
      setShowMoveDialog(false);
      toast.success(t('content.msg.batchMoveSuccess'));
    } catch (error) {
      toast.error(t('content.msg.moveFailed'));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-medium">
            {isSearching
              ? t('content.searchResults', { count: displayPrompts.length })
              : isFavoritesOnly
              ? t('content.favorites')
              : currentCategory
              ? currentCategory.name
              : t('content.allPrompts')}
          </h2>

          {/* Sort button */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowUpDown size={14} />
              {t('content.sort')}
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-50 glass-card p-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      setSortBy('title-asc');
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${
                      sortBy === 'title-asc'
                        ? 'text-white bg-white/10'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {t('content.sortTitleAsc')}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('title-desc');
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${
                      sortBy === 'title-desc'
                        ? 'text-white bg-white/10'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {t('content.sortTitleDesc')}
                  </button>
                  {!isFavoritesOnly && (
                    <button
                      onClick={() => {
                        setSortBy('favorites');
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${
                        sortBy === 'favorites'
                          ? 'text-white bg-white/10'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Star size={14} />
                      {t('content.sortFavorites')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMultiSelectMode ? (
            <>
              <span className="text-sm text-white/70">
                {t('content.selectedCount', { count: selectedPrompts.size })}
              </span>
              <button
                onClick={selectAllPrompts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <CheckSquare size={14} />
                {t('content.selectAll')}
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
                {t('content.deselect')}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoveDialog(!showMoveDialog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FolderInput size={14} />
                  {t('content.moveCategory')}
                </button>
                {showMoveDialog && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoveDialog(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 glass-card p-1 min-w-[160px] max-h-60 overflow-y-auto scrollbar-thin">
                      <button
                        onClick={() => handleBulkMove(undefined)}
                        className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded"
                      >
                        {t('content.uncategorized')}
                      </button>
                      {(() => {
                        const rootCats = categories.filter(c => !c.parent_id);
                        const result: { cat: Category; label: string }[] = [];
                        const traverse = (cat: Category) => {
                          result.push({ cat, label: buildCategoryPath(cat, categories) });
                          const children = categories.filter(c => c.parent_id === cat.id);
                          children.forEach(child => traverse(child));
                        };
                        rootCats.forEach(cat => traverse(cat));
                        return result.map(item => (
                          <button
                            key={item.cat.id}
                            onClick={() => handleBulkMove(item.cat.id)}
                            className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded whitespace-nowrap"
                          >
                            {item.label}
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                {t('content.delete')}
              </button>
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <FileDown size={14} />
                {t('content.export')}
              </button>
            </>
          ) : (
            <button
              onClick={handleNewPrompt}
              className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
            >
              <Plus size={16} />
              {t('content.newPrompt')}
            </button>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {displayPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <p className="text-lg mb-2">{t('content.noPrompt')}</p>
            <p className="text-sm">{t('content.noPromptHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                isSelected={selectedPrompts.has(prompt.id)}
                isMultiSelectMode={isMultiSelectMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

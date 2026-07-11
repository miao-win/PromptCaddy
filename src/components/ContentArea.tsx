import { useState } from 'react';
import { useStore } from '../store';
import PromptCard from './PromptCard';
import { Plus, ArrowUpDown, Star, CheckSquare, X, Trash2, FolderInput, FileDown } from 'lucide-react';
import * as api from '../api';
import toast from 'react-hot-toast';

type SortOption = 'title-asc' | 'title-desc' | 'favorites';

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

    if (confirm(`确定要删除选中的 ${selectedPrompts.size} 个 Prompt 吗？`)) {
      try {
        for (const id of selectedPrompts) {
          await deletePrompt(id);
        }
        clearSelection();
        toast.success('批量删除成功');
      } catch (error) {
        toast.error('批量删除失败');
      }
    }
  };

  const handleBulkExport = async () => {
    if (selectedPrompts.size === 0) return;
    try {
      const ids = Array.from(selectedPrompts);
      const jsonData = await api.exportPromptsJson(ids);
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${ids.length} 个 Prompt`);
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const handleBulkMove = async (categoryId?: string) => {
    if (selectedPrompts.size === 0) return;
    try {
      const ids = Array.from(selectedPrompts);
      await movePromptsToCategory(ids, categoryId);
      clearSelection();
      setShowMoveDialog(false);
      toast.success('批量移动成功');
    } catch (error) {
      toast.error('移动失败');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-medium">
            {isSearching
              ? `搜索结果 (${displayPrompts.length})`
              : isFavoritesOnly
              ? '我的收藏'
              : currentCategory
              ? currentCategory.name
              : '全部 Prompt'}
          </h2>

          {/* Sort button */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowUpDown size={14} />
              排序
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
                    标题升序
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
                    标题降序
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
                      收藏优先
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
                已选 {selectedPrompts.size} 项
              </span>
              <button
                onClick={selectAllPrompts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <CheckSquare size={14} />
                全选
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
                取消选择
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoveDialog(!showMoveDialog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FolderInput size={14} />
                  移动分类
                </button>
                {showMoveDialog && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoveDialog(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 glass-card p-1 min-w-[160px] max-h-60 overflow-y-auto scrollbar-thin">
                      <button
                        onClick={() => handleBulkMove(undefined)}
                        className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded"
                      >
                        未分类
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleBulkMove(cat.id)}
                          className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded"
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                删除
              </button>
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <FileDown size={14} />
                导出
              </button>
            </>
          ) : (
            <button
              onClick={handleNewPrompt}
              className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
            >
              <Plus size={16} />
              新建 Prompt
            </button>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {displayPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <p className="text-lg mb-2">暂无 Prompt</p>
            <p className="text-sm">点击「新建 Prompt」开始创建</p>
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
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { Prompt, Variant, Tag } from '../types';
import { Star, Copy, Edit2, Trash2, FolderInput, FileDown, MoreVertical, Layers } from 'lucide-react';
import * as api from '../api';
import toast from 'react-hot-toast';
import VariableFillDialog from './VariableFillDialog';

interface PromptCardProps {
  prompt: Prompt;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
}

export default function PromptCard({ prompt, isSelected = false, isMultiSelectMode = false }: PromptCardProps) {
  const {
    setSelectedPrompt,
    toggleFavorite,
    deletePrompt,
    togglePromptSelection,
    setIsMultiSelectMode,
    categories,
  } = useStore();

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showVariants, setShowVariants] = useState(false);
  const [promptVariants, setPromptVariants] = useState<Variant[]>([]);
  const [promptTags, setPromptTags] = useState<Tag[]>([]);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // Load variants and tags for this prompt
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedVariants, loadedTags] = await Promise.all([
          api.getVariants(prompt.id),
          api.getPromptTags(prompt.id),
        ]);
        setPromptVariants(loadedVariants);
        setPromptTags(loadedTags);
      } catch (error) {
        console.error('Failed to load prompt data:', error);
      }
    };
    loadData();
  }, [prompt.id]);

  const handleCopy = async (content: string) => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const hasVariables = variableRegex.test(content);

    if (hasVariables) {
      setSelectedContent(content);
      setShowVariableDialog(true);
    } else {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    }
  };

  const handleCopyWithVariants = () => {
    if (promptVariants.length === 0) {
      handleCopy(prompt.content);
    } else {
      setShowVariants(!showVariants);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setShowMoveSubmenu(false);
  }, []);

  useEffect(() => {
    if (showContextMenu) {
      document.addEventListener('click', handleCloseContextMenu);
      return () => document.removeEventListener('click', handleCloseContextMenu);
    }
  }, [showContextMenu, handleCloseContextMenu]);

  const handleDelete = async () => {
    if (confirm('确定要删除此 Prompt 吗？')) {
      try {
        await deletePrompt(prompt.id);
        toast.success('删除成功');
      } catch (error) {
        toast.error('删除失败');
      }
    }
    setShowContextMenu(false);
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(prompt.id);
    } catch (error) {
      toast.error('操作失败');
    }
    setShowContextMenu(false);
  };

  const handleEdit = () => {
    setSelectedPrompt(prompt);
    setShowContextMenu(false);
  };

  const handleEnterMultiSelect = () => {
    setIsMultiSelectMode(true);
    togglePromptSelection(prompt.id);
    setShowContextMenu(false);
  };

  const handleMoveToCategory = async (categoryId?: string) => {
    try {
      await api.movePromptsToCategory([prompt.id], categoryId);
      const store = useStore.getState();
      await store.loadPrompts(store.selectedCategory ?? undefined, store.isFavoritesOnly);
      toast.success('移动成功');
    } catch (error) {
      toast.error('移动失败');
    }
    setShowContextMenu(false);
  };

  const handleExportJson = async () => {
    try {
      const jsonData = await api.exportPromptsJson([prompt.id]);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prompt.title}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
    setShowContextMenu(false);
  };

  const handleCardClick = () => {
    if (isMultiSelectMode) {
      togglePromptSelection(prompt.id);
    } else {
      setSelectedPrompt(prompt);
    }
  };

  const category = categories.find((c) => c.id === prompt.category_id);

  return (
    <>
      <div
        className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.02] ${
          isSelected ? 'ring-2 ring-white/50' : ''
        } ${isMultiSelectMode ? 'select-none' : ''}`}
        onClick={handleCardClick}
        onDoubleClick={() => {
          if (!isMultiSelectMode) {
            handleCopyWithVariants();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isMultiSelectMode && (
              <div
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  isSelected
                    ? 'bg-white border-white'
                    : 'border-white/40'
                }`}
              >
                {isSelected && <span className="text-purple-600 text-xs font-bold">✓</span>}
              </div>
            )}
            <h3 className="text-white font-medium text-sm truncate">{prompt.title}</h3>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Star
                size={14}
                className={prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyWithVariants();
              }}
              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
              title="复制"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Variant selection dropdown */}
        {showVariants && promptVariants.length > 0 && (
          <div className="mb-2 p-2 glass-card">
            <p className="text-xs text-white/60 mb-1">选择变体：</p>
            <div className="space-y-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(prompt.content);
                  setShowVariants(false);
                }}
                className="w-full text-left px-2 py-1 text-xs text-white/80 hover:bg-white/10 rounded"
              >
                主正文
              </button>
              {promptVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(variant.content);
                    setShowVariants(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs text-white/80 hover:bg-white/10 rounded"
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category */}
        {category && (
          <div className="mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {category.name}
            </span>
          </div>
        )}

        {/* Content preview */}
        <p className="text-xs text-white/60 line-clamp-2 mb-3">
          {prompt.content}
        </p>

        {/* Footer: tags and variant count */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap flex-1 min-w-0 mr-2">
            {promptTags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded-full text-white/80 truncate max-w-[80px]"
                style={{ backgroundColor: tag.color + '80' }}
              >
                {tag.name}
              </span>
            ))}
            {promptTags.length > 3 && (
              <span className="text-[10px] text-white/40">+{promptTags.length - 3}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {promptVariants.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/50" title={`${promptVariants.length} 个变体`}>
                <Layers size={10} />
                {promptVariants.length}
              </span>
            )}
            <span className="text-[10px] text-white/40">
              {new Date(prompt.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 glass-card p-1 min-w-[160px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <Edit2 size={14} />
            编辑
          </button>
          <button
            onClick={() => {
              handleCopy(prompt.content);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <Copy size={14} />
            复制正文
          </button>
          <button
            onClick={handleToggleFavorite}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <Star size={14} />
            {prompt.is_favorite ? '取消收藏' : '收藏'}
          </button>

          {/* Move to category submenu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveSubmenu(!showMoveSubmenu);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
            >
              <FolderInput size={14} />
              移动分类
            </button>
            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 glass-card p-1 min-w-[140px] max-h-48 overflow-y-auto scrollbar-thin">
                <button
                  onClick={() => handleMoveToCategory(undefined)}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 rounded"
                >
                  未分类
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleMoveToCategory(cat.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 rounded"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportJson}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <FileDown size={14} />
            导出
          </button>

          <div className="border-t border-white/10 my-1" />

          <button
            onClick={handleEnterMultiSelect}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <MoreVertical size={14} />
            进入多选模式
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded"
          >
            <Trash2 size={14} />
            删除
          </button>
        </div>
      )}

      {/* Variable fill dialog */}
      {showVariableDialog && (
        <VariableFillDialog
          content={selectedContent}
          onCopy={(filledContent) => {
            navigator.clipboard.writeText(filledContent);
            setShowVariableDialog(false);
          }}
          onClose={() => setShowVariableDialog(false)}
        />
      )}
    </>
  );
}

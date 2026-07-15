import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Prompt, Tag } from '../types';
import { Star, Copy, Edit2, Trash2, FolderInput, FileDown, MoreVertical } from 'lucide-react';
import * as api from '../api';
import toast from 'react-hot-toast';
import VariableFillDialog from './VariableFillDialog';
import { buildCategoryPath, getFlatCategoryList } from '../utils/category';
import { exportAndSave } from '../utils/export';
import { highlightText } from '../utils/highlight';
import { getTagColorClass } from '../utils/tagColors';

interface PromptCardProps {
  prompt: Prompt;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
  onFocus?: (promptId: string | null) => void;
  searchQuery?: string;
}

export default function PromptCard({ prompt, isSelected = false, isMultiSelectMode = false, onFocus, searchQuery }: PromptCardProps) {
  const {
    setSelectedPrompt,
    toggleFavorite,
    deletePrompt,
    togglePromptSelection,
    setIsMultiSelectMode,
    categories,
  } = useStore();

  const { t } = useTranslation();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [promptTags, setPromptTags] = useState<Tag[]>([]);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // Load tags for this prompt
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedTags = await api.getPromptTags(prompt.id);
        setPromptTags(loadedTags);
      } catch (error) {
        console.error('Failed to load prompt tags:', error);
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
      toast.success(t('card.msg.copied'));
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
    if (confirm(t('card.confirm.delete'))) {
      try {
        await deletePrompt(prompt.id);
        toast.success(t('card.msg.deleteSuccess'));
      } catch (error) {
        toast.error(t('card.msg.deleteFailed'));
      }
    }
    setShowContextMenu(false);
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(prompt.id);
    } catch (error) {
      toast.error(t('card.msg.operationFailed'));
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
      toast.success(t('card.msg.moveSuccess'));
    } catch (error) {
      toast.error(t('card.msg.moveFailed'));
    }
    setShowContextMenu(false);
  };

  const handleExportJson = async () => {
    if (!confirm(t('card.confirm.export'))) return;
    try {
      const fullPath = await exportAndSave([prompt.id], prompt.title);
      toast.success(t('card.msg.exportedTo', { path: fullPath }));
    } catch (error) {
      toast.error(t('card.msg.exportFailed', { error: String(error) }));
    }
    setShowContextMenu(false);
  };

  const handleCardClick = () => {
    onFocus?.(prompt.id);
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
            <h3 className="text-white font-medium text-sm truncate">{searchQuery ? highlightText(prompt.title, searchQuery) : prompt.title}</h3>
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
                handleCopy(prompt.content);
              }}
              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
              title={t('card.copy')}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Category */}
        {category && (
          <div className="mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {buildCategoryPath(category, categories)}
            </span>
          </div>
        )}

        {/* Content preview */}
        <p className="text-xs text-white/60 line-clamp-2 mb-3">
          {searchQuery ? highlightText(prompt.content, searchQuery) : prompt.content}
        </p>

        {/* Footer: tags */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap flex-1 min-w-0 mr-2">
            {promptTags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className={`text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[80px] ${getTagColorClass(tag.name)}`}
              >
                {tag.name}
              </span>
            ))}
            {promptTags.length > 3 && (
              <span className="text-[10px] text-white/40">+{promptTags.length - 3}</span>
            )}
          </div>
          <span className="text-[10px] text-white/40">
            {new Date(prompt.updated_at).toLocaleDateString()}
          </span>
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
            {t('card.edit')}
          </button>
          <button
            onClick={() => {
              handleCopy(prompt.content);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <Copy size={14} />
            {t('card.copyContent')}
          </button>
          <button
            onClick={handleToggleFavorite}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <Star size={14} />
            {prompt.is_favorite ? t('card.removeFavorite') : t('card.addFavorite')}
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
              {t('card.moveCategory')}
            </button>
            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 glass-card p-1 min-w-[140px] max-h-48 overflow-y-auto scrollbar-thin">
                <button
                  onClick={() => handleMoveToCategory(undefined)}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 rounded"
                >
                  {t('content.uncategorized')}
                </button>
                {getFlatCategoryList(categories).map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleMoveToCategory(item.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 rounded whitespace-nowrap"
                  >
                    {item.label}
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
            {t('card.export')}
          </button>

          <div className="border-t border-white/10 my-1" />

          <button
            onClick={handleEnterMultiSelect}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
          >
            <MoreVertical size={14} />
            {t('card.multiSelect')}
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded"
          >
            <Trash2 size={14} />
            {t('card.delete')}
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

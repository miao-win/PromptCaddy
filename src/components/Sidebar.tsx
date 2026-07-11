import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Category } from '../types';
import * as api from '../api';
import { ChevronDown, ChevronRight, Plus, Star, Folder, Tag, Settings, Trash2, Edit2, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

type Page = 'home' | 'tags' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

interface CategoryItemProps {
  category: Category;
  level: number;
  expandedCategories: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, category: Category) => void;
  selectedCategory: string | null;
}

function CategoryItem({
  category,
  level,
  expandedCategories,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
  onContextMenu,
  selectedCategory,
}: CategoryItemProps) {
  const { categories } = useStore();
  const children = categories.filter((c) => c.parent_id === category.id);
  const isExpanded = expandedCategories.has(category.id);
  const isSelected = selectedCategory === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-white/20 text-white'
            : 'hover:bg-white/10 text-white/80'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(category.id)}
        onContextMenu={(e) => onContextMenu(e, category)}
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(category.id);
            }}
            className="p-0.5 hover:bg-white/20 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Folder size={16} className="flex-shrink-0" />
        <span className="flex-1 truncate text-sm">{category.name}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category.id);
            }}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              expandedCategories={expandedCategories}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              selectedCategory={selectedCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const {
    categories,
    selectedCategory,
    isFavoritesOnly,
    setSelectedCategory,
    setIsFavoritesOnly,
    createCategory,
    updateCategory,
    deleteCategory,
    loadPrompts,
  } = useStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; category: Category } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const rootCategories = categories.filter((c) => !c.parent_id);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const handleCategoryContextMenu = (e: React.MouseEvent, category: Category) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, category });
  };

  const handleExportCategory = async (category: Category) => {
    setContextMenu(null);
    try {
      const prompts = await api.getPrompts(category.id);
      if (prompts.length === 0) {
        toast.error('该分类下没有 Prompt');
        return;
      }
      const ids = prompts.map((p) => p.id);
      const jsonData = await api.exportPromptsJson(ids);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.name}_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${ids.length} 个 Prompt`);
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const handleDeleteCategoryWithConfirm = async (category: Category) => {
    setContextMenu(null);
    if (confirm(`确定要删除分类「${category.name}」吗？分类下的 Prompt 将变为未分类状态。`)) {
      try {
        await deleteCategory(category.id);
        toast.success('分类删除成功');
      } catch (error) {
        toast.error('删除分类失败');
      }
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast.success('分类创建成功');
    } catch (error) {
      toast.error('创建分类失败');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      await updateCategory(editingCategory.id, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName('');
      toast.success('分类更新成功');
    } catch (error) {
      toast.error('更新分类失败');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('确定要删除此分类吗？分类下的Prompt将变为未分类状态。')) {
      try {
        await deleteCategory(id);
        toast.success('分类删除成功');
      } catch (error) {
        toast.error('删除分类失败');
      }
    }
  };

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    onPageChange('home');
  };

  const handleSelectAll = () => {
    setSelectedCategory(null);
    setIsFavoritesOnly(false);
    loadPrompts();
  };

  const handleSelectFavorites = () => {
    setIsFavoritesOnly(true);
  };

  return (
    <div className="w-60 glass-effect flex flex-col border-r border-white/10">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Prompt Caddy</h1>
        <p className="text-xs text-white/60 mt-1">Prompt 管理工具</p>
      </div>

      {/* Quick access */}
      <div className="p-2 border-b border-white/10">
        <button
          onClick={() => {
            handleSelectAll();
            onPageChange('home');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            currentPage === 'home' && !selectedCategory && !isFavoritesOnly
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Folder size={18} />
          <span className="text-sm">全部 Prompt</span>
        </button>

        <button
          onClick={() => {
            handleSelectFavorites();
            onPageChange('home');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            currentPage === 'home' && isFavoritesOnly
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Star size={18} />
          <span className="text-sm">我的收藏</span>
        </button>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-white/60 uppercase">分类</span>
          <button
            onClick={() => setIsCreatingCategory(true)}
            className="p-1 hover:bg-white/20 rounded text-white/60 hover:text-white"
          >
            <Plus size={14} />
          </button>
        </div>

        {isCreatingCategory && (
          <div className="px-3 py-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="分类名称"
              className="w-full px-3 py-1.5 glass-input text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') {
                  setIsCreatingCategory(false);
                  setNewCategoryName('');
                }
              }}
              onBlur={() => {
                if (!newCategoryName.trim()) {
                  setIsCreatingCategory(false);
                }
              }}
            />
          </div>
        )}

        {editingCategory && (
          <div className="px-3 py-2">
            <input
              type="text"
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              placeholder="分类名称"
              className="w-full px-3 py-1.5 glass-input text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateCategory();
                if (e.key === 'Escape') {
                  setEditingCategory(null);
                  setEditCategoryName('');
                }
              }}
              onBlur={() => {
                if (!editCategoryName.trim()) {
                  setEditingCategory(null);
                }
              }}
            />
          </div>
        )}

        {rootCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            level={0}
            expandedCategories={expandedCategories}
            onToggleExpand={toggleExpand}
            onSelect={handleSelectCategory}
            onEdit={(cat) => {
              setEditingCategory(cat);
              setEditCategoryName(cat.name);
            }}
            onDelete={handleDeleteCategory}
            onContextMenu={handleCategoryContextMenu}
            selectedCategory={selectedCategory}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => onPageChange('tags')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            currentPage === 'tags'
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Tag size={18} />
          <span className="text-sm">标签管理</span>
        </button>

        <button
          onClick={() => onPageChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            currentPage === 'settings'
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Settings size={18} />
          <span className="text-sm">设置</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] glass-card py-1 min-w-[140px] animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleExportCategory(contextMenu.category)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FileDown size={14} />
            导出分类
          </button>
          <button
            onClick={() => handleDeleteCategoryWithConfirm(contextMenu.category)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} />
            删除分类
          </button>
        </div>
      )}
    </div>
  );
}
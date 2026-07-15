import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Category } from '../types';
import * as api from '../api';
import { ChevronDown, ChevronRight, Plus, Star, Folder, Tag, Settings, Trash2, Edit2, FileDown, FolderPlus, Check, X, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportAndSave } from '../utils/export';

type Page = 'home' | 'tags' | 'settings' | 'about';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  onActiveViewChange?: (view: 'all' | 'favorites' | 'category') => void;
}

interface CategoryItemProps {
  category: Category;
  level: number;
  expandedCategories: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onStartRename: (category: Category) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, category: Category) => void;
  onCreateSubcategory: (parentId: string) => void;
  selectedCategory: string | null;
  creatingSubcategoryFor: string | null;
  subcategoryName: string;
  onSubcategoryNameChange: (name: string) => void;
  onConfirmSubcategory: () => void;
  onCancelSubcategory: () => void;
  renamingCategory: string | null;
  renameCategoryName: string;
  onRenameNameChange: (name: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}

function CategoryItem({
  category,
  level,
  expandedCategories,
  onToggleExpand,
  onSelect,
  onStartRename,
  onDelete,
  onTogglePin,
  onContextMenu,
  onCreateSubcategory,
  selectedCategory,
  creatingSubcategoryFor,
  subcategoryName,
  onSubcategoryNameChange,
  onConfirmSubcategory,
  onCancelSubcategory,
  renamingCategory,
  renameCategoryName,
  onRenameNameChange,
  onConfirmRename,
  onCancelRename,
}: CategoryItemProps) {
  const { categories } = useStore();
  const { t } = useTranslation();
  const children = categories.filter((c) => c.parent_id === category.id);
  const isExpanded = expandedCategories.has(category.id);
  const isSelected = selectedCategory === category.id;
  const isCreatingSub = creatingSubcategoryFor === category.id;
  const isRenaming = renamingCategory === category.id;
  const canHaveChildren = level < 2; // max 3 levels (0, 1, 2)

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
          isSelected
            ? 'bg-white/20 text-white'
            : 'hover:bg-white/10 text-white/80'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(category.id)}
        onContextMenu={(e) => onContextMenu(e, category)}
      >
        {/* Pin indicator - leftmost position */}
        {category.is_pinned === 1 ? (
          <Pin size={14} className="flex-shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" fill="currentColor" />
        ) : (
          <span className="w-[14px]" />
        )}

        <Folder size={16} className="flex-shrink-0" />
        <span className="flex-1 truncate text-sm">{category.name}</span>

        {children.length > 0 || isCreatingSub ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(category.id);
            }}
            className="p-0.5 hover:bg-white/20 rounded"
          >
            {isExpanded || isCreatingSub ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(category.id);
            }}
            className={`p-1 hover:bg-white/20 rounded ${category.is_pinned === 1 ? 'text-amber-400' : ''}`}
            title={category.is_pinned === 1 ? t('sidebar.unpinCategory') : t('sidebar.pinCategory')}
          >
            <Pin size={12} />
          </button>
          {canHaveChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubcategory(category.id);
              }}
              className="p-1 hover:bg-white/20 rounded"
              title={t('sidebar.newSubcategory')}
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(category);
            }}
            className="p-1 hover:bg-white/20 rounded"
            title={t('sidebar.rename')}
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category.id);
            }}
            className="p-1 hover:bg-white/20 rounded"
            title={t('sidebar.deleteCategory')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline rename input */}
      {isRenaming && (
        <div className="px-3 py-1" style={{ paddingLeft: `${level * 16 + 12 + 20}px` }}>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={renameCategoryName}
              onChange={(e) => onRenameNameChange(e.target.value)}
              placeholder={t('sidebar.categoryName')}
              className="flex-1 px-2 py-1 glass-input text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmRename();
                if (e.key === 'Escape') onCancelRename();
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmRename();
              }}
              className="p-1 hover:bg-green-500/20 rounded text-green-400"
              title={t('sidebar.confirm')}
            >
              <Check size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelRename();
              }}
              className="p-1 hover:bg-red-500/20 rounded text-red-400"
              title={t('sidebar.cancel')}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Subcategory creation input */}
      {isCreatingSub && (
        <div className="px-3 py-1" style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }} data-subcategory-create-input>
          <input
            type="text"
            value={subcategoryName}
            onChange={(e) => onSubcategoryNameChange(e.target.value)}
            placeholder={t('sidebar.subcategoryName')}
            className="w-full px-3 py-1.5 glass-input text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmSubcategory();
              if (e.key === 'Escape') onCancelSubcategory();
            }}
          />
        </div>
      )}

      {(isExpanded || isCreatingSub || isRenaming) && children.length > 0 && (
        <div>
          {children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              expandedCategories={expandedCategories}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onStartRename={onStartRename}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onContextMenu={onContextMenu}
              onCreateSubcategory={onCreateSubcategory}
              selectedCategory={selectedCategory}
              creatingSubcategoryFor={creatingSubcategoryFor}
              subcategoryName={subcategoryName}
              onSubcategoryNameChange={onSubcategoryNameChange}
              onConfirmSubcategory={onConfirmSubcategory}
              onCancelSubcategory={onCancelSubcategory}
              renamingCategory={renamingCategory}
              renameCategoryName={renameCategoryName}
              onRenameNameChange={onRenameNameChange}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ currentPage, onPageChange, onActiveViewChange }: SidebarProps) {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    setIsFavoritesOnly,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryPin,
    loadPrompts,
  } = useStore();

  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; category: Category } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [creatingSubcategoryFor, setCreatingSubcategoryFor] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [activeView, setActiveView] = useState<'all' | 'favorites' | 'category'>('all');

  const rootCategories = categories.filter((c) => !c.parent_id);

  // Listen for activeView sync from App (e.g. ESC key)
  useEffect(() => {
    const handler = (e: Event) => {
      const view = (e as CustomEvent).detail;
      setActiveView(view);
    };
    window.addEventListener('sidebar-active-view', handler);
    return () => window.removeEventListener('sidebar-active-view', handler);
  }, []);

  // Notify parent when activeView changes
  useEffect(() => {
    onActiveViewChange?.(activeView);
  }, [activeView, onActiveViewChange]);

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

  // Close category creation input on click outside
  useEffect(() => {
    if (!isCreatingCategory) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-category-create-input]')) {
        setIsCreatingCategory(false);
        setNewCategoryName('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreatingCategory]);

  // Close subcategory creation input on click outside
  useEffect(() => {
    if (!creatingSubcategoryFor) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-subcategory-create-input]')) {
        setCreatingSubcategoryFor(null);
        setSubcategoryName('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [creatingSubcategoryFor]);

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
        toast.error(t('sidebar.msg.noPromptInCategory'));
        return;
      }
      const ids = prompts.map((p) => p.id);
      const filename = `${category.name}_export_${new Date().toISOString().slice(0, 10)}`;
      const fullPath = await exportAndSave(ids, filename);
      toast.success(t('sidebar.msg.exportedTo', { path: fullPath }));
    } catch (error) {
      toast.error(t('sidebar.msg.exportFailed', { error: String(error) }));
    }
  };

  const handleDeleteCategoryWithConfirm = async (category: Category) => {
    setContextMenu(null);
    if (confirm(t('sidebar.confirm.deleteCategory', { name: category.name }))) {
      try {
        await deleteCategory(category.id);
        toast.success(t('sidebar.msg.deleteSuccess'));
      } catch (error) {
        toast.error(t('sidebar.msg.deleteFailed'));
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
      toast.success(t('sidebar.msg.categoryCreated'));
    } catch (error) {
      toast.error(t('sidebar.msg.categoryCreateFailed'));
    }
  };

  const handleStartRename = (category: Category) => {
    setRenamingCategory(category.id);
    setRenameCategoryName(category.name);
    // Auto-expand the category to show children
    const newExpanded = new Set(expandedCategories);
    newExpanded.add(category.id);
    setExpandedCategories(newExpanded);
  };

  const handleConfirmRename = async () => {
    if (!renamingCategory || !renameCategoryName.trim()) return;

    try {
      await updateCategory(renamingCategory, renameCategoryName.trim());
      setRenamingCategory(null);
      setRenameCategoryName('');
      toast.success(t('sidebar.msg.nameUpdated'));
    } catch (error) {
      toast.error(t('sidebar.msg.updateFailed'));
    }
  };

  const handleCancelRename = () => {
    setRenamingCategory(null);
    setRenameCategoryName('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm(t('sidebar.confirm.deleteCategorySimple'))) {
      try {
        await deleteCategory(id);
        toast.success(t('sidebar.msg.deleteSuccess'));
      } catch (error) {
        toast.error(t('sidebar.msg.deleteFailed'));
      }
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await toggleCategoryPin(id);
      const category = categories.find(c => c.id === id);
      if (category?.is_pinned === 1) {
        toast.success(t('sidebar.msg.unpinSuccess'));
      } else {
        toast.success(t('sidebar.msg.pinSuccess'));
      }
    } catch (error) {
      toast.error(t('sidebar.msg.pinFailed'));
    }
  };

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    setActiveView('category');
    onPageChange('home');
  };

  const handleCreateSubcategory = (parentId: string) => {
    setCreatingSubcategoryFor(parentId);
    setSubcategoryName('');
    // Auto-expand the parent
    const newExpanded = new Set(expandedCategories);
    newExpanded.add(parentId);
    setExpandedCategories(newExpanded);
  };

  const handleConfirmSubcategory = async () => {
    if (!creatingSubcategoryFor || !subcategoryName.trim()) return;
    try {
      await createCategory(subcategoryName.trim(), creatingSubcategoryFor);
      setSubcategoryName('');
      setCreatingSubcategoryFor(null);
      toast.success(t('sidebar.msg.subcategoryCreated'));
    } catch (error) {
      toast.error(t('sidebar.msg.subcategoryCreateFailed'));
    }
  };

  const handleCancelSubcategory = () => {
    setCreatingSubcategoryFor(null);
    setSubcategoryName('');
  };

  const handleSelectAll = () => {
    setSelectedCategory(null);
    setIsFavoritesOnly(false);
    setActiveView('all');
    loadPrompts();
  };

  const handleSelectFavorites = () => {
    setIsFavoritesOnly(true);
    setActiveView('favorites');
  };

  return (
    <div className="w-60 glass-effect flex flex-col border-r border-white/10">
      {/* Logo */}
      <button
        onClick={() => onPageChange('about')}
        className={`w-full p-4 border-b border-white/10 text-left transition-all ${
          currentPage === 'about' ? 'bg-white/15' : 'hover:bg-white/10'
        }`}
      >
        <h1 className="text-xl font-bold text-white">Prompt Caddy</h1>
        <p className="text-xs text-white/60 mt-1">{t('sidebar.appTitle')}</p>
      </button>

      {/* Quick access */}
      <div className="p-2 border-b border-white/10">
        <button
          onClick={() => {
            handleSelectAll();
            onPageChange('home');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            activeView === 'all'
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Folder size={18} />
          <span className="text-sm">{t('sidebar.allPrompts')}</span>
        </button>

        <button
          onClick={() => {
            handleSelectFavorites();
            onPageChange('home');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            activeView === 'favorites'
              ? 'bg-white/20 text-white'
              : 'hover:bg-white/10 text-white/80'
          }`}
        >
          <Star size={18} />
          <span className="text-sm">{t('sidebar.favorites')}</span>
        </button>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-white/60 uppercase">{t('sidebar.categories')}</span>
          <button
            onClick={() => setIsCreatingCategory(true)}
            className="p-1 hover:bg-white/20 rounded text-white/60 hover:text-white"
          >
            <Plus size={14} />
          </button>
        </div>

        {isCreatingCategory && (
          <div className="px-3 py-2" data-category-create-input>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('sidebar.categoryName')}
              className="w-full px-3 py-1.5 glass-input text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') {
                  setIsCreatingCategory(false);
                  setNewCategoryName('');
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
            onStartRename={handleStartRename}
            onDelete={handleDeleteCategory}
            onTogglePin={handleTogglePin}
            onContextMenu={handleCategoryContextMenu}
            onCreateSubcategory={handleCreateSubcategory}
            selectedCategory={selectedCategory}
            creatingSubcategoryFor={creatingSubcategoryFor}
            subcategoryName={subcategoryName}
            onSubcategoryNameChange={setSubcategoryName}
            onConfirmSubcategory={handleConfirmSubcategory}
            onCancelSubcategory={handleCancelSubcategory}
            renamingCategory={renamingCategory}
            renameCategoryName={renameCategoryName}
            onRenameNameChange={setRenameCategoryName}
            onConfirmRename={handleConfirmRename}
            onCancelRename={handleCancelRename}
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
          <span className="text-sm">{t('sidebar.tagManagement')}</span>
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
          <span className="text-sm">{t('sidebar.settings')}</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] glass-card py-1 min-w-[140px] animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* Only show "create subcategory" if depth allows (max 3 levels) */}
          {(() => {
            // Calculate depth of the clicked category
            let depth = 1;
            let current: Category | undefined = contextMenu.category;
            while (current?.parent_id) {
              depth++;
              current = categories.find(c => c.id === current!.parent_id);
            }
            return depth < 3;
          })() && (
            <button
              onClick={() => {
                setContextMenu(null);
                handleCreateSubcategory(contextMenu.category.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <FolderPlus size={14} />
              {t('sidebar.createSubcategory')}
            </button>
          )}
          <button
            onClick={() => {
              setContextMenu(null);
              handleStartRename(contextMenu.category);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Edit2 size={14} />
            {t('sidebar.rename')}
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              handleTogglePin(contextMenu.category.id);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Pin size={14} className={contextMenu.category.is_pinned === 1 ? 'text-amber-400' : ''} />
            {contextMenu.category.is_pinned === 1 ? t('sidebar.unpinCategory') : t('sidebar.pinCategory')}
          </button>
          <button
            onClick={() => handleExportCategory(contextMenu.category)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FileDown size={14} />
            {t('sidebar.exportCategory')}
          </button>
          <button
            onClick={() => handleDeleteCategoryWithConfirm(contextMenu.category)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} />
            {t('sidebar.deleteCategory')}
          </button>
        </div>
      )}
    </div>
  );
}

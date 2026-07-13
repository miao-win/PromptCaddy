import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Tag, Category } from '../types';
import { X, Plus, Save, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function EditPanel() {
  const {
    selectedPrompt,
    selectedCategory,
    tags,
    categories,
    isEditing,
    isCreating,
    setSelectedPrompt,
    setIsEditing,
    setIsCreating,
    setIsFullscreenEditing,
    updatePrompt,
    createPrompt,
    loadPromptTags,
    addTagToPrompt,
    removeTagFromPrompt,
    createTag,
  } = useStore();

  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [remark, setRemark] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [promptTags, setPromptTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Track if content has been modified
  const isDirtyRef = useRef(false);
  const initialDataRef = useRef({ title: '', content: '', remark: '', categoryId: '' });

  useEffect(() => {
    if (selectedPrompt) {
      setTitle(selectedPrompt.title);
      setContent(selectedPrompt.content);
      setRemark(selectedPrompt.remark || '');
      setCategoryId(selectedPrompt.category_id || '');
      // Load prompt tags from API
      loadPromptTags(selectedPrompt.id).then((loadedTags) => {
        setPromptTags(loadedTags);
      });
      initialDataRef.current = {
        title: selectedPrompt.title,
        content: selectedPrompt.content,
        remark: selectedPrompt.remark || '',
        categoryId: selectedPrompt.category_id || '',
      };
      isDirtyRef.current = false;
    } else if (isCreating) {
      const defaultCategoryId = selectedCategory || '';
      setTitle('');
      setContent('');
      setRemark('');
      setCategoryId(defaultCategoryId);
      setPromptTags([]);
      initialDataRef.current = { title: '', content: '', remark: '', categoryId: defaultCategoryId };
      isDirtyRef.current = false;
    }
  }, [selectedPrompt, isCreating]);

  // Track dirty state
  useEffect(() => {
    if (selectedPrompt || isCreating) {
      const initial = initialDataRef.current;
      isDirtyRef.current =
        title !== initial.title ||
        content !== initial.content ||
        remark !== initial.remark ||
        categoryId !== initial.categoryId;
    }
  }, [title, content, remark, categoryId, selectedPrompt, isCreating]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('edit.msg.titleRequired'));
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await createPrompt(title, content, remark || undefined, categoryId || undefined);
        toast.success(t('edit.msg.created'));
      } else if (selectedPrompt) {
        await updatePrompt(
          selectedPrompt.id,
          title,
          content,
          remark || undefined,
          categoryId || undefined
        );
        toast.success(t('edit.msg.saved'));
      }
      isDirtyRef.current = false;
      handleClose();
    } catch (error) {
      toast.error(t('edit.msg.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (isDirtyRef.current && title.trim()) {
      await handleSave();
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedPrompt(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleTag = async (tag: Tag) => {
    if (!selectedPrompt) return;

    const isAttached = promptTags.some((t) => t.id === tag.id);
    try {
      if (isAttached) {
        await removeTagFromPrompt(selectedPrompt.id, tag.id);
        setPromptTags(promptTags.filter((t) => t.id !== tag.id));
      } else {
        await addTagToPrompt(selectedPrompt.id, tag.id);
        setPromptTags([...promptTags, tag]);
      }
    } catch (error) {
      toast.error(t('edit.msg.operationFailed'));
    }
  };

  const handleCreateTagInline = async () => {
    if (!newTagName.trim()) return;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    try {
      const newTag = await createTag(newTagName.trim(), randomColor);
      if (selectedPrompt) {
        await addTagToPrompt(selectedPrompt.id, newTag.id);
        setPromptTags([...promptTags, newTag]);
      }
      setNewTagName('');
      setIsCreatingTag(false);
      toast.success(t('edit.msg.tagCreated'));
    } catch (error) {
      toast.error(t('edit.msg.tagCreateFailed'));
    }
  };

  if (!isEditing && !isCreating) {
    return null;
  }

  return (
    <div className="w-2/5 glass-effect border-l border-white/10 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-medium">
          {isCreating ? t('edit.newPrompt') : t('edit.editPrompt')}
        </h2>
        <button
          onClick={handleSaveAndClose}
          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          title={t('edit.closeTooltip')}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm text-white/70 mb-1">{t('edit.title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('edit.titlePlaceholder')}
            className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-white/70 mb-1">{t('edit.category')}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 glass-input text-white bg-transparent"
          >
            <option value="">{t('content.uncategorized')}</option>
            {(() => {
              const rootCats = categories.filter(c => !c.parent_id);
              const result: { id: string; label: string }[] = [];
              const traverse = (cat: Category) => {
                result.push({ id: cat.id, label: buildCategoryPath(cat, categories) });
                const children = categories.filter(c => c.parent_id === cat.id);
                children.forEach(child => traverse(child));
              };
              rootCats.forEach(cat => traverse(cat));
              return result.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ));
            })()}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm text-white/70 mb-1">{t('edit.tags')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {promptTags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  onClick={() => handleToggleTag(tag)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setShowTagSelect(!showTagSelect)}
              className="px-2 py-1 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 border border-dashed border-white/30"
            >
              {t('edit.addTag')}
            </button>
          </div>

          {showTagSelect && (
            <div className="glass-card p-2 max-h-48 overflow-y-auto scrollbar-thin">
              {tags.map((tag) => {
                const isAttached = promptTags.some((t) => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                      isAttached ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    {isAttached && <span className="ml-auto text-xs">✓</span>}
                  </button>
                );
              })}
              {/* Inline tag creation */}
              <div className="border-t border-white/10 mt-1 pt-1">
                {isCreatingTag ? (
                  <div className="flex gap-1 px-1">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder={t('edit.newTagName')}
                      className="flex-1 px-2 py-1 glass-input text-white text-xs placeholder-white/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateTagInline();
                        if (e.key === 'Escape') { setIsCreatingTag(false); setNewTagName(''); }
                      }}
                    />
                    <button onClick={handleCreateTagInline} className="px-2 py-1 text-xs glass-button text-white">+</button>
                    <button onClick={() => { setIsCreatingTag(false); setNewTagName(''); }} className="px-2 py-1 text-xs text-white/50 hover:text-white">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingTag(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <Plus size={12} />
                    {t('edit.createTag')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm text-white/70 mb-1">{t('edit.remark')}</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('edit.remarkPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 glass-input text-white placeholder-white/50 resize-none"
          />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-white/70">{t('edit.content')}</label>
            <button
              onClick={() => setIsFullscreenEditing(true)}
              disabled={!selectedPrompt}
              className="px-2 py-1 text-xs rounded text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              title={selectedPrompt ? t('edit.fullscreen') : t('edit.fullscreenDisabled')}
            >
              <Maximize2 size={12} className="inline mr-1" />
              {t('edit.fullscreen')}
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('edit.contentPlaceholder')}
            rows={10}
            className="w-full px-3 py-2 glass-input text-white placeholder-white/50 resize-none font-mono text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {t('edit.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? t('edit.saving') : t('edit.save')}
        </button>
      </div>
    </div>
  );
}

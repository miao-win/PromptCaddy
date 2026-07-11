import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Tag } from '../types';
import { X, Plus, Save, Eye, Edit2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

export default function EditPanel() {
  const {
    selectedPrompt,
    selectedVariant,
    tags,
    variants,
    categories,
    isEditing,
    isCreating,
    setSelectedPrompt,
    setSelectedVariant,
    setIsEditing,
    setIsCreating,
    updatePrompt,
    createPrompt,
    createVariant,
    updateVariant,
    deleteVariant,
    loadVariants,
    loadPromptTags,
    addTagToPrompt,
    removeTagFromPrompt,
    createTag,
  } = useStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [remark, setRemark] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [promptTags, setPromptTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Variant state
  const [variantName, setVariantName] = useState('');
  const [variantContent, setVariantContent] = useState('');
  const [isEditingVariant, setIsEditingVariant] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);

  // Track if content has been modified
  const isDirtyRef = useRef(false);
  const initialDataRef = useRef({ title: '', content: '', remark: '', categoryId: '' });

  useEffect(() => {
    if (selectedPrompt) {
      setTitle(selectedPrompt.title);
      setContent(selectedPrompt.content);
      setRemark(selectedPrompt.remark || '');
      setCategoryId(selectedPrompt.category_id || '');
      loadVariants(selectedPrompt.id);
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
      setTitle('');
      setContent('');
      setRemark('');
      setCategoryId('');
      setPromptTags([]);
      initialDataRef.current = { title: '', content: '', remark: '', categoryId: '' };
      isDirtyRef.current = false;
    }
  }, [selectedPrompt, isCreating]);

  useEffect(() => {
    if (selectedVariant) {
      setVariantName(selectedVariant.name);
      setVariantContent(selectedVariant.content);
      setIsEditingVariant(true);
    } else {
      setVariantName('');
      setVariantContent('');
      setIsEditingVariant(false);
    }
  }, [selectedVariant]);

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
      toast.error('请输入标题');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await createPrompt(title, content, remark || undefined, categoryId || undefined);
        toast.success('Prompt 创建成功');
        setIsCreating(false);
      } else if (selectedPrompt) {
        await updatePrompt(
          selectedPrompt.id,
          title,
          content,
          remark || undefined,
          categoryId || undefined
        );
        toast.success('保存成功');
      }
      isDirtyRef.current = false;
    } catch (error) {
      toast.error('保存失败');
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
    setSelectedVariant(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleAddVariant = async () => {
    if (!selectedPrompt || !variantName.trim()) {
      toast.error('请输入变体名称');
      return;
    }

    try {
      await createVariant(selectedPrompt.id, variantName, variantContent || content);
      setShowAddVariant(false);
      setVariantName('');
      setVariantContent('');
      toast.success('变体创建成功');
    } catch (error) {
      toast.error('创建变体失败');
    }
  };

  const handleUpdateVariant = async () => {
    if (!selectedVariant || !variantName.trim()) {
      toast.error('请输入变体名称');
      return;
    }

    try {
      await updateVariant(selectedVariant.id, variantName, variantContent);
      toast.success('变体更新成功');
    } catch (error) {
      toast.error('更新变体失败');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (confirm('确定要删除此变体吗？')) {
      try {
        await deleteVariant(variantId);
        toast.success('变体删除成功');
      } catch (error) {
        toast.error('删除变体失败');
      }
    }
  };

  const handleSyncToAllVariants = async () => {
    if (!selectedPrompt || variants.length === 0) return;

    if (confirm('确定要将当前正文同步到所有变体吗？此操作不可撤销。')) {
      try {
        for (const variant of variants) {
          await updateVariant(variant.id, variant.name, content);
        }
        toast.success('已同步到所有变体');
      } catch (error) {
        toast.error('同步失败');
      }
    }
  };

  const handleSyncFromMain = async () => {
    if (!selectedVariant || !selectedPrompt) return;

    if (confirm('确定要从主 Prompt 同步正文吗？当前变体内容将被覆盖。')) {
      try {
        await updateVariant(selectedVariant.id, selectedVariant.name, selectedPrompt.content);
        setVariantContent(selectedPrompt.content);
        toast.success('已从主 Prompt 同步');
      } catch (error) {
        toast.error('同步失败');
      }
    }
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
      toast.error('操作失败');
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
      toast.success('标签创建成功');
    } catch (error) {
      toast.error('创建标签失败');
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
          {isCreating ? '新建 Prompt' : '编辑 Prompt'}
        </h2>
        <button
          onClick={handleSaveAndClose}
          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          title="关闭（自动保存）"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm text-white/70 mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入 Prompt 标题"
            className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-white/70 mb-1">分类</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 glass-input text-white bg-transparent"
          >
            <option value="">未分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm text-white/70 mb-1">标签</label>
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
              + 添加标签
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
                      placeholder="新标签名称"
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
                    创建新标签
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm text-white/70 mb-1">备注</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="添加备注信息"
            rows={2}
            className="w-full px-3 py-2 glass-input text-white placeholder-white/50 resize-none"
          />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-white/70">正文</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreview(false)}
                className={`px-2 py-1 text-xs rounded ${
                  !isPreview ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Edit2 size={12} className="inline mr-1" />
                编辑
              </button>
              <button
                onClick={() => setIsPreview(true)}
                className={`px-2 py-1 text-xs rounded ${
                  isPreview ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Eye size={12} className="inline mr-1" />
                预览
              </button>
            </div>
          </div>

          {isPreview ? (
            <div className="glass-card p-4 min-h-[200px] markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入 Prompt 正文内容"
              rows={10}
              className="w-full px-3 py-2 glass-input text-white placeholder-white/50 resize-none font-mono text-sm"
            />
          )}

          {!isCreating && variants.length > 0 && (
            <button
              onClick={handleSyncToAllVariants}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <RefreshCw size={12} />
              同步至所有变体
            </button>
          )}
        </div>

        {/* Variants */}
        {!isCreating && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70">变体</label>
              {variants.length < 5 && (
                <button
                  onClick={() => setShowAddVariant(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  <Plus size={12} />
                  添加变体
                </button>
              )}
            </div>

            {/* Variant tabs */}
            {variants.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {variant.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVariant(variant.id);
                      }}
                      className="hover:bg-white/20 rounded p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </button>
                ))}
              </div>
            )}

            {/* Add variant form */}
            {showAddVariant && (
              <div className="glass-card p-3 space-y-2">
                <input
                  type="text"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="变体名称"
                  className="w-full px-3 py-1.5 glass-input text-white placeholder-white/50 text-sm"
                />
                <textarea
                  value={variantContent || content}
                  onChange={(e) => setVariantContent(e.target.value)}
                  placeholder="变体正文（默认继承主正文）"
                  rows={4}
                  className="w-full px-3 py-1.5 glass-input text-white placeholder-white/50 text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddVariant(false);
                      setVariantName('');
                      setVariantContent('');
                    }}
                    className="px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs glass-button text-white"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}

            {/* Edit variant */}
            {isEditingVariant && selectedVariant && (
              <div className="glass-card p-3 space-y-2">
                <input
                  type="text"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="变体名称"
                  className="w-full px-3 py-1.5 glass-input text-white placeholder-white/50 text-sm"
                />
                <textarea
                  value={variantContent}
                  onChange={(e) => setVariantContent(e.target.value)}
                  placeholder="变体正文"
                  rows={6}
                  className="w-full px-3 py-1.5 glass-input text-white placeholder-white/50 text-sm resize-none font-mono"
                />
                <div className="flex justify-between">
                  <button
                    onClick={handleSyncFromMain}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <RefreshCw size={12} />
                    同步主正文
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedVariant(null);
                        setIsEditingVariant(false);
                      }}
                      className="px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUpdateVariant}
                      className="px-3 py-1.5 text-xs glass-button text-white"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {variants.length === 0 && !showAddVariant && (
              <p className="text-xs text-white/50 text-center py-4">
                暂无变体，点击「添加变体」创建
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
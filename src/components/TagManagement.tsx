import { useState } from 'react';
import { useStore } from '../store';
import { Tag } from '../types';
import { Plus, Edit2, Trash2, Save, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
];

export default function TagManagement() {
  const { tags, createTag, updateTag, deleteTag } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<'new' | 'edit' | null>(null);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    try {
      await createTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor(DEFAULT_COLORS[0]);
      setIsCreating(false);
      toast.success('标签创建成功');
    } catch (error) {
      toast.error('创建标签失败，可能存在重名');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    try {
      await updateTag(editingTag.id, editTagName.trim(), editTagColor);
      setEditingTag(null);
      setEditTagName('');
      setEditTagColor('');
      toast.success('标签更新成功');
    } catch (error) {
      toast.error('更新标签失败，可能存在重名');
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (confirm(`确定要删除标签「${tag.name}」吗？所有关联的 Prompt 将解除此标签绑定。`)) {
      try {
        await deleteTag(tag.id);
        toast.success('标签删除成功');
      } catch (error) {
        toast.error('删除标签失败');
      }
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditTagName('');
    setEditTagColor('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">标签管理</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
        >
          <Plus size={16} />
          新建标签
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {/* Create form */}
        {isCreating && (
          <div className="glass-card p-4 mb-4">
            <h3 className="text-white font-medium mb-3">新建标签</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="标签名称"
                  className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewTagName('');
                    }
                  }}
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(showColorPicker === 'new' ? null : 'new')}
                  className="w-10 h-10 rounded-lg border-2 border-white/20 flex items-center justify-center"
                  style={{ backgroundColor: newTagColor }}
                >
                  <Palette size={16} className="text-white" />
                </button>
                {showColorPicker === 'new' && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowColorPicker(null)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 glass-card p-3 grid grid-cols-6 gap-2">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setNewTagColor(color);
                            setShowColorPicker(null);
                          }}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            newTagColor === color ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                  }}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTag}
                  className="px-4 py-2 glass-button text-white text-sm"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tag list */}
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="glass-card p-4">
              {editingTag?.id === tag.id ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      placeholder="标签名称"
                      className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTag();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(showColorPicker === 'edit' ? null : 'edit')}
                      className="w-10 h-10 rounded-lg border-2 border-white/20 flex items-center justify-center"
                      style={{ backgroundColor: editTagColor }}
                    >
                      <Palette size={16} className="text-white" />
                    </button>
                    {showColorPicker === 'edit' && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowColorPicker(null)}
                        />
                        <div className="absolute right-0 top-full mt-2 z-50 glass-card p-3 grid grid-cols-6 gap-2">
                          {DEFAULT_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                setEditTagColor(color);
                                setShowColorPicker(null);
                              }}
                              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                editTagColor === color ? 'border-white scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUpdateTag}
                      className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
                    >
                      <Save size={14} />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-white">{tag.name}</span>
                  <button
                    onClick={() => handleStartEdit(tag)}
                    className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {tags.length === 0 && (
            <div className="text-center py-12 text-white/50">
              <p className="text-lg mb-2">暂无标签</p>
              <p className="text-sm">点击「新建标签」开始创建</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
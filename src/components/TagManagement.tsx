import { useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Tag } from '../types';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TagManagement() {
  const { tags, createTag, updateTag, deleteTag } = useStore();
  const { t } = useTranslation();

  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error(t('tags.msg.nameRequired'));
      return;
    }

    try {
      await createTag(newTagName.trim());
      setNewTagName('');
      setIsCreating(false);
      toast.success(t('tags.msg.created'));
    } catch (error) {
      toast.error(t('tags.msg.createFailed'));
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      toast.error(t('tags.msg.nameRequired'));
      return;
    }

    try {
      await updateTag(editingTag.id, editTagName.trim());
      setEditingTag(null);
      setEditTagName('');
      toast.success(t('tags.msg.updated'));
    } catch (error) {
      toast.error(t('tags.msg.updateFailed'));
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (confirm(t('tags.confirm.delete', { name: tag.name }))) {
      try {
        await deleteTag(tag.id);
        toast.success(t('tags.msg.deleted'));
      } catch (error) {
        toast.error(t('tags.msg.deleteFailed'));
      }
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditTagName('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('tags.title')}</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
        >
          <Plus size={16} />
          {t('tags.newTag')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {/* Create form */}
        {isCreating && (
          <div className="glass-card p-4 mb-4">
            <h3 className="text-white font-medium mb-3">{t('tags.newTag')}</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t('tags.tagName')}
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
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                  }}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {t('tags.cancel')}
                </button>
                <button
                  onClick={handleCreateTag}
                  className="px-4 py-2 glass-button text-white text-sm"
                >
                  {t('tags.create')}
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
                      placeholder={t('tags.tagName')}
                      className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTag();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {t('tags.cancel')}
                    </button>
                    <button
                      onClick={handleUpdateTag}
                      className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
                    >
                      <Save size={14} />
                      {t('tags.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
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
              <p className="text-lg mb-2">{t('tags.noTags')}</p>
              <p className="text-sm">{t('tags.noTagsHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

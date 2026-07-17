import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Tag } from '../types';
import {
  SlidersHorizontal,
  Tag as TagIcon,
  Recycle,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ManagementTab = 'tags' | 'recycleBin';

export default function Management() {
  const {
    tags,
    deletedPrompts,
    createTag,
    updateTag,
    deleteTag,
    loadDeletedPrompts,
    restoreDeletedPrompt,
    permanentlyDeletePrompt,
    emptyRecycleBin,
  } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ManagementTab>('tags');

  // Tag management state
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');

  useEffect(() => {
    loadDeletedPrompts();
  }, []);

  const tabs = [
    { id: 'tags' as ManagementTab, label: t('management.tags'), icon: TagIcon },
    { id: 'recycleBin' as ManagementTab, label: t('management.recycleBin'), icon: Recycle },
  ];

  // --- Tag handlers ---
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

  // --- Recycle bin handlers ---
  const getDaysLeft = (deletedAt: string): number => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  const handleRestoreDeleted = async (id: string) => {
    try {
      await restoreDeletedPrompt(id);
      toast.success(t('management.msg.promptRestored'));
    } catch (error) {
      toast.error(t('management.msg.promptRestoreFailed'));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm(t('management.confirm.permanentDelete'))) {
      try {
        await permanentlyDeletePrompt(id);
        toast.success(t('management.msg.promptPermanentlyDeleted'));
      } catch (error) {
        toast.error(t('management.msg.promptPermanentDeleteFailed'));
      }
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (confirm(t('management.confirm.emptyRecycleBin'))) {
      try {
        await emptyRecycleBin();
        toast.success(t('management.msg.recycleBinEmptied'));
      } catch (error) {
        toast.error(t('management.msg.emptyRecycleBinFailed'));
      }
    }
  };

  // --- Tab content renderers ---
  const renderTags = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">{t('management.tags')}</h3>
          <p className="text-xs text-white/50 mt-1">{t('management.tagsHint')}</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
        >
          <Plus size={14} />
          {t('tags.newTag')}
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="glass-card p-4">
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
  );

  const renderRecycleBin = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">{t('management.recycleBin')}</h3>
          <p className="text-xs text-white/50 mt-1">{t('management.recycleBinHint')}</p>
        </div>
        {deletedPrompts.length > 0 && (
          <button
            onClick={handleEmptyRecycleBin}
            className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
          >
            <Trash2 size={14} />
            {t('management.emptyRecycleBin')}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {deletedPrompts.map((prompt) => (
          <div key={prompt.id} className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Recycle size={16} className="text-white/60 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{prompt.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/50">
                      {t('management.deletedAt', { date: new Date(prompt.deleted_at).toLocaleString() })}
                    </p>
                    <span className="text-xs text-white/40">·</span>
                    <p className="text-xs text-amber-400/80">
                      {t('management.daysLeft', { days: getDaysLeft(prompt.deleted_at) })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleRestoreDeleted(prompt.id)}
                  className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-green-400 transition-colors"
                  title={t('management.restore')}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => handlePermanentDelete(prompt.id)}
                  className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                  title={t('management.permanentDelete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {deletedPrompts.length === 0 && (
          <div className="text-center py-12 text-white/50">
            <p>{t('management.noDeletedPrompt')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'tags':
        return renderTags();
      case 'recycleBin':
        return renderRecycleBin();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <SlidersHorizontal size={24} className="text-white" />
        <h1 className="text-xl font-bold text-white">{t('management.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar tabs */}
        <div className="w-48 border-r border-white/10 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">{renderContent()}</div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Save, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

export default function FullscreenEditor() {
  const {
    selectedPrompt,
    isFullscreenEditing,
    setIsFullscreenEditing,
    updatePrompt,
  } = useStore();

  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isFullscreenEditing && selectedPrompt) {
      setTitle(selectedPrompt.title);
      setContent(selectedPrompt.content);
    }
  }, [isFullscreenEditing, selectedPrompt]);

  if (!isFullscreenEditing || !selectedPrompt) {
    return null;
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('fullscreen.msg.titleRequired'));
      return;
    }
    setIsSaving(true);
    try {
      await updatePrompt(
        selectedPrompt.id,
        title,
        content,
        selectedPrompt.remark || undefined,
        selectedPrompt.category_id || undefined
      );
      toast.success(t('fullscreen.msg.saved'));
    } catch (error) {
      toast.error(t('fullscreen.msg.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExit = () => {
    setIsFullscreenEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-white/10 glass-effect flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('fullscreen.titlePlaceholder')}
            className="flex-1 px-3 py-1.5 glass-input text-white placeholder-white/50 text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? t('fullscreen.saving') : t('fullscreen.save')}
          </button>
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={t('fullscreen.exitTooltip')}
          >
            <Minimize2 size={14} />
            {t('fullscreen.exit')}
          </button>
        </div>
      </div>

      {/* Split pane: editor left, preview right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-white/10">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="text-xs text-white/60 font-medium">{t('fullscreen.edit')}</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('fullscreen.contentPlaceholder')}
            className="flex-1 w-full px-6 py-4 bg-transparent text-white placeholder-white/40 resize-none font-mono text-sm leading-relaxed focus:outline-none"
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="text-xs text-white/60 font-medium">{t('fullscreen.preview')}</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

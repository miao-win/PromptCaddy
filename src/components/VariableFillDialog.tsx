import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, Copy } from 'lucide-react';

interface VariableFillDialogProps {
  content: string;
  onCopy: (filledContent: string) => void;
  onClose: () => void;
}

export default function VariableFillDialog({ content, onCopy, onClose }: VariableFillDialogProps) {
  const { t } = useTranslation();
  const [variables, setVariables] = useState<Map<string, string>>(new Map());
  const [filledContent, setFilledContent] = useState('');

  useEffect(() => {
    // Extract variables from content
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(variableRegex);
    const newVariables = new Map<string, string>();

    for (const match of matches) {
      const varName = match[1].trim();
      if (!newVariables.has(varName)) {
        newVariables.set(varName, '');
      }
    }

    setVariables(newVariables);
  }, [content]);

  useEffect(() => {
    // Generate filled content
    let result = content;
    variables.forEach((value, key) => {
      const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      result = result.replace(regex, value || `{{${key}}}`);
    });
    setFilledContent(result);
  }, [content, variables]);

  const handleVariableChange = (name: string, value: string) => {
    const newVariables = new Map(variables);
    newVariables.set(name, value);
    setVariables(newVariables);
  };

  const handleCopy = () => {
    onCopy(filledContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCopy();
    }
  };

  const allFilled = Array.from(variables.values()).every((v) => v.trim() !== '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="glass-card w-full max-w-lg mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">{t('variable.title')}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Variables form */}
        <div className="p-4 max-h-96 overflow-y-auto scrollbar-thin">
          <p className="text-sm text-white/70 mb-4">
            {t('variable.description')}
          </p>

          <div className="space-y-3">
            {Array.from(variables.entries()).map(([name, value]) => (
              <div key={name}>
                <label className="block text-sm text-white/80 mb-1">
                  {name}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleVariableChange(name, e.target.value)}
                  placeholder={t('variable.placeholder', { name })}
                  className="w-full px-3 py-2 glass-input text-white placeholder-white/50"
                  autoFocus={Array.from(variables.keys())[0] === name}
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-4">
            <p className="text-sm text-white/70 mb-2">{t('variable.preview')}</p>
            <div className="glass-card p-3 max-h-40 overflow-y-auto scrollbar-thin">
              <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">
                {filledContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex justify-between items-center">
          <p className="text-xs text-white/50">
            {t('variable.shortcutHint')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {t('variable.cancel')}
            </button>
            <button
              onClick={handleCopy}
              disabled={!allFilled}
              className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm disabled:opacity-50"
            >
              <Copy size={16} />
              {t('variable.confirmCopy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

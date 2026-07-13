import { useTranslation } from '../i18n';
import { BookOpen, Folder, Tag, Copy, Search, Layers, Keyboard, Sparkles } from 'lucide-react';

export default function AboutPage() {
  const { t } = useTranslation();

  const features = [
    { icon: BookOpen, title: t('about.feature.crud'), desc: t('about.feature.crudDesc') },
    { icon: Folder, title: t('about.feature.category'), desc: t('about.feature.categoryDesc') },
    { icon: Tag, title: t('about.feature.tag'), desc: t('about.feature.tagDesc') },
    { icon: Copy, title: t('about.feature.copy'), desc: t('about.feature.copyDesc') },
    { icon: Search, title: t('about.feature.search'), desc: t('about.feature.searchDesc') },
    { icon: Layers, title: t('about.feature.snapshot'), desc: t('about.feature.snapshotDesc') },
  ];

  const shortcuts = [
    { key: 'Ctrl+N', action: t('settings.shortcut.newPrompt') },
    { key: 'Ctrl+C', action: t('settings.shortcut.quickCopy') },
    { key: 'Ctrl+F', action: t('settings.shortcut.focusSearch') },
    { key: 'Ctrl+A', action: t('settings.shortcut.selectAll') },
    { key: 'Ctrl+S', action: t('settings.shortcut.saveSnapshot') },
    { key: 'ESC', action: t('settings.shortcut.closePanel') },
  ];

  const quickStart = [
    t('about.quickStart.step1'),
    t('about.quickStart.step2'),
    t('about.quickStart.step3'),
    t('about.quickStart.step4'),
    t('about.quickStart.step5'),
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <img
            src="/app-icon.png"
            alt="Prompt Caddy"
            className="w-16 h-16 rounded-2xl mb-4 shadow-lg mx-auto"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Prompt Caddy</h1>
          <p className="text-white/60 text-sm">{t('about.subtitle')}</p>
        </div>

        {/* Description */}
        <div className="glass-card p-5 mb-6">
          <p className="text-white/80 text-sm leading-relaxed">{t('about.description')}</p>
        </div>

        {/* Quick Start */}
        <div className="glass-card p-5 mb-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <BookOpen size={18} />
            {t('about.quickStart.title')}
          </h2>
          <ol className="space-y-2">
            {quickStart.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Features */}
        <div className="glass-card p-5 mb-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Sparkles size={18} />
            {t('about.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <f.icon size={16} className="text-white/80" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-medium">{f.title}</h3>
                  <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="glass-card p-5 mb-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Keyboard size={18} />
            {t('about.shortcuts.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-white/70 text-sm">{s.action}</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-white/60">{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card p-5">
          <h2 className="text-white font-semibold text-lg mb-4">{t('about.tips.title')}</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-white/70">
              <span className="text-white/40 mt-1">•</span>
              <span>{t('about.tips.variable')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white/70">
              <span className="text-white/40 mt-1">•</span>
              <span>{t('about.tips.rightClick')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white/70">
              <span className="text-white/40 mt-1">•</span>
              <span>{t('about.tips.dragDrop')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-white/70">
              <span className="text-white/40 mt-1">•</span>
              <span>{t('about.tips.snapshot')}</span>
            </li>
          </ul>
        </div>

        {/* Version */}
        <p className="text-center text-white/30 text-xs mt-8 mb-4">v0.2.0</p>
      </div>
    </div>
  );
}

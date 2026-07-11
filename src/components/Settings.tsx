import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation, Language } from '../i18n';
import { Snapshot } from '../types';
import * as api from '../api';
import {
  Settings as SettingsIcon,
  Globe,
  Database,
  Keyboard,
  Palette,
  Save,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Clock,
  Plus,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'data' | 'shortcuts' | 'appearance';

interface AppSettings {
  language: Language;
  startupBehavior: 'all' | 'last';
  defaultExportFormat: 'json' | 'markdown' | 'csv';
  exportPath: string;
  theme: 'light' | 'dark' | 'system';
  cardDensity: 'compact' | 'standard' | 'relaxed';
  glassIntensity: number;
}

const SETTINGS_KEY = 'prompt-caddy-settings';

const defaultSettings: AppSettings = {
  language: 'zh-CN',
  startupBehavior: 'all',
  defaultExportFormat: 'json',
  exportPath: 'D:\\downloads',
  theme: 'light',
  cardDensity: 'standard',
  glassIntensity: 50,
};

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old 'zh' value to 'zh-CN'
      if (parsed.language === 'zh') parsed.language = 'zh-CN';
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

function applyGlassIntensity(intensity: number) {
  document.documentElement.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${intensity / 400})`);
}

export default function Settings() {
  const {
    snapshots,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearAllData,
    loadCategories,
    loadTags,
    loadPrompts,
  } = useStore();

  const { t, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [snapshotName, setSnapshotName] = useState('');
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);

  useEffect(() => {
    loadSnapshots();
    // Theme is now initialized at App level, only apply glass intensity here
    applyGlassIntensity(settings.glassIntensity);
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    saveSettings(newSettings);

    // Apply theme immediately
    if (partial.theme !== undefined) {
      applyTheme(partial.theme);
    }
    if (partial.glassIntensity !== undefined) {
      applyGlassIntensity(partial.glassIntensity);
    }
    // Apply language immediately
    if (partial.language !== undefined) {
      setLanguage(partial.language);
    }
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: t('settings.general'), icon: Globe },
    { id: 'data' as SettingsTab, label: t('settings.data'), icon: Database },
    { id: 'shortcuts' as SettingsTab, label: t('settings.shortcuts'), icon: Keyboard },
    { id: 'appearance' as SettingsTab, label: t('settings.appearance'), icon: Palette },
  ];

  const handleCreateSnapshot = async () => {
    try {
      await createSnapshot(snapshotName || undefined);
      setSnapshotName('');
      setShowCreateSnapshot(false);
      toast.success(t('settings.msg.snapshotCreated'));
    } catch (error) {
      toast.error(t('settings.msg.snapshotCreateFailed'));
    }
  };

  const handleRestoreSnapshot = async (snapshot: Snapshot) => {
    if (
      confirm(
        t('settings.confirm.restoreSnapshot', { name: snapshot.name || t('settings.snapshotDefault') })
      )
    ) {
      try {
        await restoreSnapshot(snapshot.id);
        toast.success(t('settings.msg.snapshotRestored'));
      } catch (error) {
        toast.error(t('settings.msg.snapshotRestoreFailed'));
      }
    }
  };

  const handleDeleteSnapshot = async (snapshot: Snapshot) => {
    if (confirm(t('settings.confirm.deleteSnapshot', { name: snapshot.name || t('settings.snapshotDefault') }))) {
      try {
        await deleteSnapshot(snapshot.id);
        toast.success(t('settings.msg.snapshotDeleted'));
      } catch (error) {
        toast.error(t('settings.msg.snapshotDeleteFailed'));
      }
    }
  };

  const handleExportAll = async () => {
    try {
      const jsonData = await api.exportPromptsJson([]);
      const exportPath = settings.exportPath || defaultSettings.exportPath;
      const filename = `prompt_caddy_export_${new Date().toISOString().slice(0, 10)}.json`;
      const fullPath = `${exportPath}\\${filename}`.replace(/\\\\/g, '\\');
      await api.saveFileToPath(fullPath, jsonData);
      toast.success(t('settings.msg.exportedTo', { path: fullPath }));
    } catch (error) {
      toast.error(t('settings.msg.exportFailed', { error: String(error) }));
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const jsonData = event.target?.result as string;
            // Validate JSON
            JSON.parse(jsonData);

            const strategy = window.confirm(t('settings.confirm.importOverwrite'))
              ? 'overwrite'
              : 'skip';

            await api.importPromptsJson(jsonData, strategy);
            await loadCategories();
            await loadTags();
            await loadPrompts();
            toast.success(t('settings.msg.importSuccess'));
          } catch (error) {
            toast.error(t('settings.msg.importFailed'));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      toast.error(t('settings.msg.importFailedGeneric'));
    }
  };

  const handleClearData = async () => {
    if (confirm(t('settings.confirm.clearData'))) {
      if (confirm(t('settings.confirm.clearDataAgain'))) {
        try {
          await clearAllData();
          toast.success(t('settings.msg.dataCleared'));
        } catch (error) {
          toast.error(t('settings.msg.clearDataFailed'));
        }
      }
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.language')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ language: 'zh-CN' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.language === 'zh-CN'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            简体中文
          </button>
          <button
            onClick={() => updateSettings({ language: 'en' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.language === 'en'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            English
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.startupBehavior')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ startupBehavior: 'all' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.startupBehavior === 'all'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            {t('settings.startupAll')}
          </button>
          <button
            onClick={() => updateSettings({ startupBehavior: 'last' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.startupBehavior === 'last'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            {t('settings.startupLast')}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.exportFormat')}</h3>
        <div className="flex gap-2">
          {(['json', 'markdown', 'csv'] as const).map((format) => (
            <button
              key={format}
              onClick={() => updateSettings({ defaultExportFormat: format })}
              className={`px-4 py-2 rounded-lg text-sm uppercase transition-colors ${
                settings.defaultExportFormat === format
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const handleBrowseExportPath = async () => {
    try {
      const selected = await api.pickDirectory();
      if (selected) {
        updateSettings({ exportPath: selected });
      }
    } catch (error) {
      toast.error(t('settings.msg.browseFailed'));
    }
  };

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.exportPath')}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.exportPath}
            onChange={(e) => updateSettings({ exportPath: e.target.value })}
            placeholder="D:\downloads"
            className="flex-1 px-3 py-2 glass-input text-white placeholder-white/50 text-sm"
          />
          <button
            onClick={handleBrowseExportPath}
            className="flex items-center gap-1.5 px-3 py-2 glass-button text-white text-sm flex-shrink-0"
          >
            <FolderOpen size={16} />
            {t('settings.browse')}
          </button>
        </div>
        <p className="text-xs text-white/50 mt-1">{t('settings.exportPathHint')}</p>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.dataExportImport')}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
          >
            <Download size={16} />
            {t('settings.exportAll')}
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
          >
            <Upload size={16} />
            {t('settings.importAll')}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">{t('settings.snapshotManagement')}</h3>
          <button
            onClick={() => setShowCreateSnapshot(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
          >
            <Plus size={14} />
            {t('settings.saveSnapshot')}
          </button>
        </div>

        {showCreateSnapshot && (
          <div className="glass-card p-3 mb-3">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder={t('settings.snapshotName')}
              className="w-full px-3 py-2 glass-input text-white placeholder-white/50 mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSnapshot();
                if (e.key === 'Escape') setShowCreateSnapshot(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateSnapshot(false)}
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded"
              >
                {t('sidebar.cancel')}
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
              >
                <Save size={14} />
                {t('edit.save')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="glass-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-white/60" />
                  <div>
                    <p className="text-white text-sm">
                      {snapshot.name || t('settings.snapshotDefault')}
                    </p>
                    <p className="text-xs text-white/50">
                      {new Date(snapshot.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRestoreSnapshot(snapshot)}
                    className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                    title={t('settings.restoreSnapshot')}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snapshot)}
                    className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                    title={t('settings.deleteSnapshot')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {snapshots.length === 0 && (
            <div className="text-center py-8 text-white/50">
              <p>{t('settings.noSnapshot')}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3 text-red-400">{t('settings.dangerous')}</h3>
        <button
          onClick={handleClearData}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          <Trash2 size={16} />
          {t('settings.clearAllData')}
        </button>
        <p className="text-xs text-white/50 mt-1">{t('settings.clearDataHint')}</p>
      </div>
    </div>
  );

  const renderShortcutsSettings = () => {
    const shortcuts = [
      { key: 'Ctrl+F', action: t('settings.shortcut.focusSearch') },
      { key: 'Ctrl+N', action: t('settings.shortcut.newPrompt') },
      { key: 'Ctrl+C', action: t('settings.shortcut.quickCopy') },
      { key: 'Ctrl+A', action: t('settings.shortcut.selectAll') },
      { key: 'Ctrl+S', action: t('settings.shortcut.saveSnapshot') },
      { key: 'ESC', action: t('settings.shortcut.closePanel') },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-white font-medium mb-3">{t('settings.globalShortcuts')}</h3>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="glass-card p-3 flex items-center justify-between"
              >
                <span className="text-white/80 text-sm">{shortcut.action}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded text-sm font-mono text-white/70">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.theme')}</h3>
        <div className="flex gap-2">
          {([
            { id: 'light' as const, label: t('settings.themeLight') },
            { id: 'dark' as const, label: t('settings.themeDark') },
            { id: 'system' as const, label: t('settings.themeSystem') },
          ]).map((th) => (
            <button
              key={th.id}
              onClick={() => updateSettings({ theme: th.id })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.theme === th.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.cardDensity')}</h3>
        <div className="flex gap-2">
          {([
            { id: 'compact' as const, label: t('settings.densityCompact') },
            { id: 'standard' as const, label: t('settings.densityStandard') },
            { id: 'relaxed' as const, label: t('settings.densityRelaxed') },
          ]).map((d) => (
            <button
              key={d.id}
              onClick={() => updateSettings({ cardDensity: d.id })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.cardDensity === d.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">{t('settings.glassIntensity')}</h3>
        <div className="glass-card p-4">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.glassIntensity}
            onChange={(e) => updateSettings({ glassIntensity: Number(e.target.value) })}
            className="w-full accent-white"
          />
          <div className="flex justify-between mt-2 text-xs text-white/50">
            <span>{t('settings.glassWeak')}</span>
            <span>{settings.glassIntensity}%</span>
            <span>{t('settings.glassStrong')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'data':
        return renderDataSettings();
      case 'shortcuts':
        return renderShortcutsSettings();
      case 'appearance':
        return renderAppearanceSettings();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <SettingsIcon size={24} className="text-white" />
        <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
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

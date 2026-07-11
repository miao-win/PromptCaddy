import { useState, useEffect } from 'react';
import { useStore } from '../store';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'data' | 'shortcuts' | 'appearance';

interface AppSettings {
  language: 'zh' | 'en';
  startupBehavior: 'all' | 'last';
  defaultExportFormat: 'json' | 'markdown' | 'csv';
  theme: 'light' | 'dark' | 'system';
  cardDensity: 'compact' | 'standard' | 'relaxed';
  glassIntensity: number;
}

const SETTINGS_KEY = 'prompt-caddy-settings';

const defaultSettings: AppSettings = {
  language: 'zh',
  startupBehavior: 'all',
  defaultExportFormat: 'json',
  theme: 'light',
  cardDensity: 'standard',
  glassIntensity: 50,
};

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
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
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: '通用设置', icon: Globe },
    { id: 'data' as SettingsTab, label: '数据管理', icon: Database },
    { id: 'shortcuts' as SettingsTab, label: '快捷键设置', icon: Keyboard },
    { id: 'appearance' as SettingsTab, label: '外观设置', icon: Palette },
  ];

  const handleCreateSnapshot = async () => {
    try {
      await createSnapshot(snapshotName || undefined);
      setSnapshotName('');
      setShowCreateSnapshot(false);
      toast.success('快照创建成功');
    } catch (error) {
      toast.error('创建快照失败');
    }
  };

  const handleRestoreSnapshot = async (snapshot: Snapshot) => {
    if (
      confirm(
        `确定要回退到快照「${snapshot.name || '启动快照'}」吗？当前未保存的编辑内容将永久丢失，无法撤销。`
      )
    ) {
      try {
        await restoreSnapshot(snapshot.id);
        toast.success('快照回退成功');
      } catch (error) {
        toast.error('回退快照失败');
      }
    }
  };

  const handleDeleteSnapshot = async (snapshot: Snapshot) => {
    if (confirm(`确定要删除快照「${snapshot.name || '启动快照'}」吗？`)) {
      try {
        await deleteSnapshot(snapshot.id);
        toast.success('快照删除成功');
      } catch (error) {
        toast.error('删除快照失败');
      }
    }
  };

  const handleExportAll = async () => {
    try {
      const jsonData = await api.exportPromptsJson([]);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt_caddy_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('全量导出成功');
    } catch (error) {
      toast.error('导出失败');
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

            const strategy = window.confirm('是否覆盖现有数据？\n\n确定 = 覆盖\n取消 = 跳过重复')
              ? 'overwrite'
              : 'skip';

            await api.importPromptsJson(jsonData, strategy);
            await loadCategories();
            await loadTags();
            await loadPrompts();
            toast.success('导入成功');
          } catch (error) {
            toast.error('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (error) {
      toast.error('导入失败');
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        '确定要清空所有数据吗？此操作不可恢复，所有 Prompt、分类、标签数据将被永久删除。'
      )
    ) {
      if (confirm('再次确认：此操作不可撤销，确定继续吗？')) {
        try {
          await clearAllData();
          toast.success('数据已清空');
        } catch (error) {
          toast.error('清空数据失败');
        }
      }
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-medium mb-3">界面语言</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ language: 'zh' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.language === 'zh'
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
        <h3 className="text-white font-medium mb-3">启动行为</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ startupBehavior: 'all' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.startupBehavior === 'all'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            全部 Prompt
          </button>
          <button
            onClick={() => updateSettings({ startupBehavior: 'last' })}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              settings.startupBehavior === 'last'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            上次退出位置
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">默认导出格式</h3>
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

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-medium mb-3">数据导出与导入</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
          >
            <Download size={16} />
            全量导出
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 glass-button text-white text-sm"
          >
            <Upload size={16} />
            全量导入
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">快照管理</h3>
          <button
            onClick={() => setShowCreateSnapshot(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
          >
            <Plus size={14} />
            保存当前快照
          </button>
        </div>

        {showCreateSnapshot && (
          <div className="glass-card p-3 mb-3">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="快照名称（可选）"
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
                取消
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 glass-button text-white text-sm"
              >
                <Save size={14} />
                保存
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
                      {snapshot.name || '启动快照'}
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
                    title="回退至此版本"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snapshot)}
                    className="p-2 hover:bg-white/10 rounded text-white/60 hover:text-red-400 transition-colors"
                    title="删除快照"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {snapshots.length === 0 && (
            <div className="text-center py-8 text-white/50">
              <p>暂无快照</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3 text-red-400">危险操作</h3>
        <button
          onClick={handleClearData}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          <Trash2 size={16} />
          清空所有数据
        </button>
        <p className="text-xs text-white/50 mt-1">此操作不可恢复，请谨慎操作</p>
      </div>
    </div>
  );

  const renderShortcutsSettings = () => {
    const shortcuts = [
      { key: 'Ctrl+F', action: '聚焦搜索框' },
      { key: 'Ctrl+N', action: '新建 Prompt' },
      { key: 'Ctrl+C', action: '快速复制（选中卡片时）' },
      { key: 'Ctrl+A', action: '全选/退出多选' },
      { key: 'Ctrl+S', action: '手动保存快照' },
      { key: 'ESC', action: '关闭面板/取消操作' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-white font-medium mb-3">全局快捷键</h3>
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
        <h3 className="text-white font-medium mb-3">主题模式</h3>
        <div className="flex gap-2">
          {([
            { id: 'light' as const, label: '浅色' },
            { id: 'dark' as const, label: '深色' },
            { id: 'system' as const, label: '跟随系统' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => updateSettings({ theme: t.id })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.theme === t.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3">卡片密度</h3>
        <div className="flex gap-2">
          {([
            { id: 'compact' as const, label: '紧凑' },
            { id: 'standard' as const, label: '标准' },
            { id: 'relaxed' as const, label: '宽松' },
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
        <h3 className="text-white font-medium mb-3">玻璃效果强度</h3>
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
            <span>弱</span>
            <span>{settings.glassIntensity}%</span>
            <span>强</span>
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
        <h1 className="text-xl font-bold text-white">设置</h1>
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

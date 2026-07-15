/** Shared keyboard shortcut definitions used in Settings and AboutPage. */
export interface ShortcutEntry {
  key: string;
  actionKey: string; // i18n key
}

export const SHORTCUTS: ShortcutEntry[] = [
  { key: 'Ctrl+N', actionKey: 'settings.shortcut.newPrompt' },
  { key: 'Ctrl+C', actionKey: 'settings.shortcut.quickCopy' },
  { key: 'Ctrl+F', actionKey: 'settings.shortcut.focusSearch' },
  { key: 'Ctrl+A', actionKey: 'settings.shortcut.selectAll' },
  { key: 'Ctrl+S', actionKey: 'settings.shortcut.saveSnapshot' },
  { key: 'ESC', actionKey: 'settings.shortcut.closePanel' },
];

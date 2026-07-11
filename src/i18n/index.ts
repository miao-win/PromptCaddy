import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import zhCN from './locales/zh-CN';
import en from './locales/en';

export type Language = 'zh-CN' | 'en';

const locales: Record<Language, Record<string, string>> = {
  'zh-CN': zhCN,
  'en': en,
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const SETTINGS_KEY = 'prompt-caddy-settings';

function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      const lang = settings.language;
      // Migrate old 'zh' value to 'zh-CN'
      if (lang === 'zh' || lang === 'zh-TW') return 'zh-CN';
      if (lang === 'zh-CN' || lang === 'en') return lang;
    }
  } catch (e) {
    console.error('Failed to load language setting:', e);
  }
  return 'zh-CN';
}

function saveLanguage(lang: Language) {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const settings = saved ? JSON.parse(saved) : {};
    settings.language = lang;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save language setting:', e);
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = locales[language]?.[key] || locales['zh-CN'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }, [language]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const currentLang = loadLanguage();
    if (currentLang !== language) {
      setLanguageState(currentLang);
    }
  }, []);

  return React.createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

// Helper for non-component code that needs translations
let _globalT: ((key: string, params?: Record<string, string | number>) => string) | null = null;

export function setGlobalT(t: (key: string, params?: Record<string, string | number>) => string) {
  _globalT = t;
}

export function getGlobalT() {
  return _globalT;
}

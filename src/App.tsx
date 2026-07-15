import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from './store';
import { I18nProvider, useTranslation } from './i18n';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import EditPanel from './components/EditPanel';
import FullscreenEditor from './components/FullscreenEditor';
import SearchBar from './components/SearchBar';
import TagManagement from './components/TagManagement';
import Settings from './components/Settings';
import AboutPage from './components/AboutPage';
import Toaster from './components/Toaster';
import toast from 'react-hot-toast';
import { formatDateForSnapshot } from './utils/date';
import { applyTheme, applyGlassIntensity } from './utils/theme';

type Page = 'home' | 'tags' | 'settings' | 'about';

function AppInner() {
  const {
    loadCategories, loadTags, loadPrompts, loadSnapshots, createSnapshot, deleteAllSnapshots,
    isFullscreenEditing, isEditing, isCreating, isSearching, isMultiSelectMode,
    prompts,
    setIsFullscreenEditing, setIsEditing, setIsCreating,
    setSelectedPrompt, setIsSearching, setSearchQuery,
    selectAllPrompts, clearSelection, setIsMultiSelectMode,
    setSelectedCategory, setIsFavoritesOnly,
  } = useStore();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const hasInitialized = useRef(false);
  const focusedPromptRef = useRef<string | null>(null);
  const activeViewRef = useRef<'all' | 'favorites' | 'category'>('all');

  // Initialize theme from saved settings (runs once at app startup)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prompt-caddy-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        applyTheme(settings.theme || 'dark');
        if (settings.glassIntensity !== undefined) {
          applyGlassIntensity(settings.glassIntensity);
        }
      }
    } catch (e) {
      console.error('Failed to apply saved theme:', e);
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization in React StrictMode (development)
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      await loadCategories();
      await loadTags();
      await loadPrompts();
      await loadSnapshots();

      // Clear old snapshots and create a fresh startup snapshot
      try {
        await deleteAllSnapshots();
        const dateStr = formatDateForSnapshot(new Date());
        await createSnapshot(`${t('app.startupSnapshot')} - ${dateStr}`);
      } catch (e) {
        console.error('Failed to create startup snapshot:', e);
      }
    };
    init();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // ESC - close panels in priority order, then navigate to all prompts
      if (e.key === 'Escape') {
        if (isFullscreenEditing) {
          setIsFullscreenEditing(false);
          e.preventDefault();
          return;
        }
        if (isEditing || isCreating) {
          setSelectedPrompt(null);
          setIsEditing(false);
          setIsCreating(false);
          e.preventDefault();
          return;
        }
        if (isSearching) {
          setIsSearching(false);
          setSearchQuery('');
          e.preventDefault();
          return;
        }
        if (isMultiSelectMode) {
          clearSelection();
          e.preventDefault();
          return;
        }
        // No panels open — navigate to all prompts
        if (currentPage !== 'home' || activeViewRef.current !== 'all') {
          setSelectedCategory(null);
          setIsFavoritesOnly(false);
          loadPrompts().catch(console.error);
          setCurrentPage('home');
          activeViewRef.current = 'all';
          window.dispatchEvent(new CustomEvent('sidebar-active-view', { detail: 'all' }));
          e.preventDefault();
        }
        return;
      }

      // Don't intercept shortcuts when typing in inputs (except ESC above)
      if (isInput) return;

      // Ctrl+N - New prompt
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setSelectedPrompt(null);
        setIsCreating(true);
        setCurrentPage('home');
        return;
      }

      // Ctrl+C - Copy focused prompt content
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const promptId = focusedPromptRef.current;
        if (promptId) {
          const prompt = prompts.find(p => p.id === promptId);
          if (prompt) {
            e.preventDefault();
            navigator.clipboard.writeText(prompt.content);
            toast.success(t('card.msg.copied'));
          }
        }
        return;
      }

      // Ctrl+A - Select all / toggle multi-select
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (isMultiSelectMode) {
          clearSelection();
        } else {
          setIsMultiSelectMode(true);
          selectAllPrompts();
        }
        return;
      }

      // Ctrl+S - Save snapshot
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const dateStr = formatDateForSnapshot(new Date());
        createSnapshot(`${t('settings.saveSnapshot')} - ${dateStr}`)
          .then(() => toast.success(t('settings.msg.snapshotCreated')))
          .catch(() => toast.error(t('settings.msg.snapshotCreateFailed')));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenEditing, isEditing, isCreating, isSearching, isMultiSelectMode, prompts, currentPage, t]);

  const handlePromptFocus = useCallback((promptId: string | null) => {
    focusedPromptRef.current = promptId;
  }, []);

  const handleActiveViewChange = useCallback((view: 'all' | 'favorites' | 'category') => {
    activeViewRef.current = view;
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'tags':
        return <TagManagement />;
      case 'settings':
        return <Settings />;
      case 'about':
        return <AboutPage />;
      default:
        return (
          <>
            <SearchBar />
            <ContentArea onPromptFocus={handlePromptFocus} />
          </>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#E0F0FF] via-[#D6EEFC] to-[#A8D2FF] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -z-10" />

      {/* Main container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onActiveViewChange={handleActiveViewChange} />

        {/* Content area */}
        {isFullscreenEditing ? (
          <FullscreenEditor />
        ) : (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderPage()}
            </div>

            {/* Edit panel - only show on home page */}
            {currentPage === 'home' && <EditPanel />}
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

export default App;

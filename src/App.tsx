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
import PromptCard from './components/PromptCard';
import toast from 'react-hot-toast';
import { formatDateForSnapshot } from './utils/date';
import { applyTheme, applyGlassIntensity } from './utils/theme';
import { initDefaultExportPath } from './utils/exportPath';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';

type Page = 'home' | 'tags' | 'settings' | 'about';

function AppInner() {
  const {
    loadCategories, loadTags, loadPrompts, loadSnapshots, createSnapshot, deleteAllSnapshots,
    isFullscreenEditing, isEditing, isCreating, isSearching, isMultiSelectMode,
    prompts, searchQuery,
    setIsFullscreenEditing, setIsEditing, setIsCreating,
    setSelectedPrompt, setIsSearching, setSearchQuery,
    selectAllPrompts, clearSelection, setIsMultiSelectMode,
    setSelectedCategory, setIsFavoritesOnly,
    movePromptsToCategory,
  } = useStore();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const hasInitialized = useRef(false);
  const focusedPromptRef = useRef<string | null>(null);
  const activeViewRef = useRef<'all' | 'favorites' | 'category'>('all');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DnD state
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const overCategoryElRef = useRef<HTMLElement | null>(null);
  const overlayInnerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const activePrompt = activePromptId ? prompts.find(p => p.id === activePromptId) : null;

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
      await initDefaultExportPath();
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

  // Auto-save timer (checks every 30s if it's time to save)
  useEffect(() => {
    let lastSaveTime = Date.now();

    const getIntervalMinutes = () => {
      try {
        const saved = localStorage.getItem('prompt-caddy-settings');
        return saved ? (JSON.parse(saved).autoSnapshotInterval || 10) : 10;
      } catch {
        return 10;
      }
    };

    autoSaveTimerRef.current = setInterval(async () => {
      const intervalMs = getIntervalMinutes() * 60 * 1000;
      if (Date.now() - lastSaveTime >= intervalMs) {
        try {
          const dateStr = formatDateForSnapshot(new Date());
          await createSnapshot(`${t('app.autoSaveSnapshot')} - ${dateStr}`);
          lastSaveTime = Date.now();
        } catch (e) {
          console.error('Auto-save snapshot failed:', e);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [createSnapshot, t]);

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
        const snapshots = useStore.getState().snapshots;
        const manualCount = snapshots.filter(s => s.name?.startsWith(t('settings.saveSnapshot'))).length;
        const seq = manualCount + 1;
        const dateStr = formatDateForSnapshot(new Date());
        createSnapshot(`${t('settings.saveSnapshot')}${seq} - ${dateStr}`)
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

  // Helper: find the category element under the drag overlay's center
  // Uses the overlay's bounding rect (not cursor position) because:
  // 1. PointerSensor captures pointer events via setPointerCapture, so global pointermove doesn't fire
  // 2. The overlay has pointer-events-none, so elementFromPoint sees through it to categories below
  const findCategoryElement = (): HTMLElement | null => {
    // The inner wrapper's parent is DragOverlay's positioned div
    const overlayEl = overlayInnerRef.current?.parentElement;
    if (!overlayEl) return null;
    const rect = overlayEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const el = document.elementFromPoint(centerX, centerY) as HTMLElement | null;
    if (!el) return null;
    return el.closest('[data-category-id]') as HTMLElement | null;
  };

  // Drop target highlight via requestAnimationFrame during drag
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!activePromptId) {
      // Drag ended — clear highlight and stop loop
      if (overCategoryElRef.current) {
        overCategoryElRef.current.classList.remove('drop-target-active');
        overCategoryElRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    // Drag started — run rAF loop to track overlay position and highlight categories
    const tick = () => {
      const catEl = findCategoryElement();
      if (catEl !== overCategoryElRef.current) {
        if (overCategoryElRef.current) {
          overCategoryElRef.current.classList.remove('drop-target-active');
        }
        if (catEl) {
          catEl.classList.add('drop-target-active');
        }
        overCategoryElRef.current = catEl;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (overCategoryElRef.current) {
        overCategoryElRef.current.classList.remove('drop-target-active');
        overCategoryElRef.current = null;
      }
    };
  }, [activePromptId]);

  // DnD handlers for prompt-to-category drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActivePromptId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active } = event;

    // Detect category under overlay using elementFromPoint (before state clears)
    const catEl = findCategoryElement();
    const categoryId = catEl?.getAttribute('data-category-id') || undefined;
    const promptId = active.id as string;

    setActivePromptId(null);

    if (!categoryId) return;

    try {
      await movePromptsToCategory([promptId], categoryId);
      const store = useStore.getState();
      await loadPrompts(store.selectedCategory ?? undefined, store.isFavoritesOnly);
      toast.success(t('card.msg.moveSuccess'));
    } catch (error) {
      toast.error(t('card.msg.moveFailed'));
    }
  }, [movePromptsToCategory, loadPrompts, t]);

  const handleDragCancel = useCallback(() => {
    setActivePromptId(null);
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-screen flex flex-col">
        {/* Background gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-[#E0F0FF] via-[#D6EEFC] to-[#A8D2FF] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -z-10" />

        {/* Main container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onActiveViewChange={handleActiveViewChange}
          />

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

      {/* Drag overlay for prompt cards */}
      {/* pointer-events-none on DragOverlay so elementFromPoint can detect categories underneath */}
      <DragOverlay dropAnimation={null} className="pointer-events-none">
        {activePrompt ? (
          <div ref={overlayInnerRef} className="opacity-90 scale-[1.03] rotate-[2deg]">
            <PromptCard prompt={activePrompt} searchQuery={searchQuery} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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

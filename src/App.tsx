import { useEffect, useState } from 'react';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import EditPanel from './components/EditPanel';
import SearchBar from './components/SearchBar';
import TagManagement from './components/TagManagement';
import Settings from './components/Settings';
import Toaster from './components/Toaster';

type Page = 'home' | 'tags' | 'settings';

function App() {
  const { loadCategories, loadTags, loadPrompts, loadSnapshots, createSnapshot } = useStore();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  // Initialize theme from saved settings (runs once at app startup)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prompt-caddy-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const theme = settings.theme || 'dark';
        const root = document.documentElement;
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
        if (settings.glassIntensity !== undefined) {
          root.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${settings.glassIntensity / 400})`);
        }
      }
    } catch (e) {
      console.error('Failed to apply saved theme:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadCategories();
      await loadTags();
      await loadPrompts();
      await loadSnapshots();

      // Create startup snapshot if none exists
      try {
        const existingSnapshots = useStore.getState().snapshots;
        if (existingSnapshots.length === 0) {
          await createSnapshot('启动快照');
        }
      } catch (e) {
        console.error('Failed to create startup snapshot:', e);
      }
    };
    init();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'tags':
        return <TagManagement />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <>
            <SearchBar />
            <ContentArea />
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
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderPage()}
        </div>

        {/* Edit panel - only show on home page */}
        {currentPage === 'home' && <EditPanel />}
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App;
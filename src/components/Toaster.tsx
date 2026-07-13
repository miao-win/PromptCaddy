import { useSyncExternalStore } from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

function useDarkMode() {
  return useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains('dark'),
  );
}

export default function Toaster() {
  const isDark = useDarkMode();

  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: isDark
          ? {
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
            }
          : {
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              color: '#1f2937',
              fontSize: '14px',
            },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: isDark ? '#fff' : '#1f2937',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: isDark ? '#fff' : '#1f2937',
          },
        },
      }}
    />
  );
}

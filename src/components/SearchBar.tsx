import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../i18n';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { searchPrompts, searchQuery, setIsSearching, setSearchQuery } = useStore();
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setLocalQuery(query);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchPrompts(query);
    }, 300);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    setIsSearching(false);
    searchPrompts('');
    inputRef.current?.blur();
  };

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="relative max-w-2xl mx-auto">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 search-icon"
        />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t('search.placeholder')}
          className={`w-full pl-10 pr-10 py-2.5 search-input ${isFocused ? 'search-input-focused' : ''}`}
        />
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 search-icon hover:opacity-100 transition-opacity"
            style={{ opacity: 0.6 }}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { searchPrompts, searchQuery, isSearching, setIsSearching, setSearchQuery } = useStore();
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && isSearching) {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearching]);

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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
        />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="搜索 Prompt... (Ctrl+F)"
          className="w-full pl-10 pr-10 py-2.5 glass-input text-white placeholder-white/50"
        />
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
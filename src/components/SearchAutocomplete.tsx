'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchShows, TMDBShow, getImageUrl } from '@/lib/tmdb';

interface SearchAutocompleteProps {
  isScrolled: boolean;
}

export default function SearchAutocomplete({ isScrolled }: SearchAutocompleteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TMDBShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchShows(query);
      // Filter results to only include items with poster images
      const filtered = results.filter((item) => item.poster_path && (item.title || item.name));
      setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setHighlightedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        handleSearch(e as React.FormEvent);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectSuggestion(suggestions[highlightedIndex]);
        } else if (searchQuery.trim()) {
          handleSearch(e as React.FormEvent);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (item: TMDBShow) => {
    if (item.media_type === 'movie') {
      router.push(`/movies/movie/${item.id}`);
    } else {
      router.push(`/series/series/${item.id}`);
    }
    resetSearch();
  };

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      resetSearch();
    }
  };

  // Reset search state
  const resetSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-64">
      <form onSubmit={handleSearch} className="relative transition-all duration-300">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search movies, shows..."
          autoComplete="off"
          className={`rounded-full py-2 px-4 pr-10 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 w-full ${
            isScrolled
              ? 'bg-black/80 border border-gray-700 focus:border-yellow-500'
              : 'bg-black/60 border border-gray-600 focus:border-yellow-500'
          }`}
        />
        <button
          type="submit"
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
            isScrolled
              ? 'text-gray-400 hover:text-yellow-400'
              : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </form>

      {/* Dropdown suggestions */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-md border border-yellow-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto">
              {suggestions.map((item, index) => (
                <li
                  key={`${item.media_type}-${item.id}`}
                  className={`transition-colors cursor-pointer ${
                    index === highlightedIndex
                      ? 'bg-yellow-500/20'
                      : 'hover:bg-yellow-500/10'
                  }`}
                  onClick={() => selectSuggestion(item)}
                >
                  <div className="flex items-center gap-3 p-3 border-b border-gray-800/50 last:border-0">
                    <div className="flex-shrink-0 w-12 h-16 relative rounded overflow-hidden">
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title || item.name || ''}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.title || item.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                        {item.release_date
                          ? ` • ${new Date(item.release_date).getFullYear()}`
                          : item.first_air_date
                          ? ` • ${new Date(item.first_air_date).getFullYear()}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-yellow-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-xs text-gray-300">
                        {item.vote_average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              No results found for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Footer with "View all results" link */}
          {suggestions.length > 0 && (
            <div className="border-t border-gray-800/50 p-3">
              <button
                onClick={handleSearch}
                className="w-full text-center text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                View all results for &quot;{searchQuery}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

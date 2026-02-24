'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isSearchExpanded && !target.closest('.search-container')) {
        setIsSearchExpanded(false);
        setSearchQuery("");
      }
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isSearchExpanded || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchExpanded, isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchExpanded(false);
      setSearchQuery("");
    }
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ease-in-out ${
        isScrolled 
          ? 'bg-black/90 backdrop-blur-sm border-b border-yellow-500/50' 
          : 'bg-transparent backdrop-blur-none border-b border-transparent'
      }`} suppressHydrationWarning>
        <div className="w-full px-4 py-3 flex justify-between items-center" suppressHydrationWarning>
        <Link href="/" className={`text-xl md:text-2xl font-bold hover:opacity-90 transition-opacity ${
          !isScrolled
            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
            : 'bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600'
        }`}>
          TinyBros
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6" suppressHydrationWarning>
          {/* Search Bar */}
          <div className="search-container relative" suppressHydrationWarning>
            {!isSearchExpanded ? (
              <button
                onClick={handleSearchIconClick}
                className={`transition-colors p-2 rounded-full hover:bg-black/30 ${
                  !isScrolled
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
                aria-label="Search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
            ) : (
              <form onSubmit={handleSearch} className="relative transition-all duration-300">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className={`rounded-full py-2 px-4 pr-10 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 w-64 ${
                    !isScrolled
                      ? 'bg-black/60 border border-gray-600 focus:border-yellow-500'
                      : 'bg-black/80 border border-gray-700 focus:border-yellow-500'
                  }`}
                />
                <button
                  type="submit"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                    !isScrolled
                      ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                      : 'text-gray-400 hover:text-yellow-400'
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
            )}
          </div>
          <Link 
            href="/watchlist" 
            className={`transition-colors flex items-center gap-1 ${
              !isScrolled
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <span>Watchlist</span>
          </Link>
          <Link 
            href="/movies" 
            className={`transition-colors ${
              !isScrolled
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            Movies
          </Link>
          <Link 
            href="/series" 
            className={`transition-colors ${
              !isScrolled
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            TV Shows
          </Link>
          <Link 
            href="/anime" 
            className={`transition-colors ${
              !isScrolled
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            Anime
          </Link>
        </div>

        {/* Mobile Menu Button and Search */}
        <div className="flex items-center space-x-3 md:hidden" suppressHydrationWarning>
          {/* Search Icon for Mobile */}
          <div className="search-container relative" suppressHydrationWarning>
            {!isSearchExpanded ? (
              <button
                onClick={handleSearchIconClick}
                className={`transition-colors p-2 rounded-full hover:bg-black/30 ${
                  !isScrolled
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
                aria-label="Search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
            ) : (
              <form onSubmit={handleSearch} className="relative transition-all duration-300">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className={`rounded-full py-2 px-4 pr-10 text-white placeholder-gray-400 focus:outline-none transition-all duration-300 w-48 ${
                    !isScrolled
                      ? 'bg-black/60 border border-gray-600 focus:border-yellow-500'
                      : 'bg-black/80 border border-gray-700 focus:border-yellow-500'
                  }`}
                />
                <button
                  type="submit"
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                    !isScrolled
                      ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                      : 'text-gray-400 hover:text-yellow-400'
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
            )}
          </div>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`mobile-menu-container transition-colors p-2 rounded-full hover:bg-black/30 ${
              !isScrolled
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-container md:hidden border-t border-gray-800/50 bg-black/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-3">
            <Link
              href="/movies"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition-colors ${
                pathname === '/movies'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-yellow-400'
              }`}
            >
              Movies
            </Link>
            <Link
              href="/series"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition-colors ${
                pathname === '/series'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-yellow-400'
              }`}
            >
              TV Shows
            </Link>
            <Link
              href="/anime"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition-colors ${
                pathname === '/anime'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-yellow-400'
              }`}
            >
              Anime
            </Link>
            <Link
              href="/watchlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition-colors ${
                pathname === '/watchlist'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-yellow-400'
              }`}
            >
              Watchlist
            </Link>
          </div>
        </div>
      )}
      </nav>
      
      {/* Video Player Alert Banner - Commented out, ready to reuse if needed */}
      {/* <div className="fixed top-[60px] left-0 right-0 z-50 bg-red-600 text-white py-1.5 overflow-hidden">
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100vw);
            }
          }
          .marquee {
            display: inline-block;
            white-space: nowrap;
            animation: scroll 10s linear infinite;
          }
        `}</style>
        <div className="text-sm font-medium whitespace-nowrap">
          <span className="marquee inline-block">
            Sorry, the video players aren&apos;t currently working •
          </span>
        </div>
      </div> */}
    </>
  );
}
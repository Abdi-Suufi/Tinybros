'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="bg-black/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="w-full px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500 hover:opacity-90 transition-opacity">
          TinyBros
        </Link>
        <div className="flex items-center space-x-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-black/80 border border-gray-700 rounded-full py-2 px-4 pr-10 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 transition-colors w-64"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
          <Link href="/movies" className="text-gray-300 hover:text-white transition-colors">
            Movies
          </Link>
          <Link href="/series" className="text-gray-300 hover:text-white transition-colors">
            TV Shows
          </Link>
          <Link href="/anime" className="text-gray-300 hover:text-white transition-colors">
            Anime
          </Link>
        </div>
      </div>
    </nav>
  );
}


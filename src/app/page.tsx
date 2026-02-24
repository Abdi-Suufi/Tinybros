'use client';

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchTrending, fetchMovies, fetchTVShows, fetchAnime, getImageUrl, TMDBShow } from "@/lib/tmdb";
import WatchlistToggle from "@/components/WatchlistToggle";

export default function Home() {
  const moviesRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const moviesSectionRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<HTMLDivElement>(null);
  const animeRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [trending, setTrending] = useState<TMDBShow[]>([]);
  const [movies, setMovies] = useState<TMDBShow[]>([]);
  const [series, setSeries] = useState<TMDBShow[]>([]);
  const [anime, setAnime] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [draggingSection, setDraggingSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, moviesData, seriesData, animeData] = await Promise.all([
          fetchTrending(),
          fetchMovies(),
          fetchTVShows(),
          fetchAnime()
        ]);
        
        // Remove duplicates based on ID
        const uniqueTrending = Array.from(
          new Map(trendingData.map(item => [item.id, item])).values()
        );
        const uniqueMovies = Array.from(
          new Map(moviesData.map(item => [item.id, item])).values()
        );
        const uniqueSeries = Array.from(
          new Map(seriesData.map(item => [item.id, item])).values()
        );
        const uniqueAnime = Array.from(
          new Map(animeData.map(item => [item.id, item])).values()
        );
        
        setTrending(uniqueTrending);
        setMovies(uniqueMovies);
        setSeries(uniqueSeries);
        setAnime(uniqueAnime);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleShowClick = (id: number, mediaType: string) => {
    // Don't navigate if user was dragging
    if (isDragging) return;
    
    if (mediaType === 'movie') {
      router.push(`/movies/movie/${id}`);
    } else {
      router.push(`/series/series/${id}`);
    }
  };

  // Global mouse move handler for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggingSection) return;
      
      let currentRef: React.RefObject<HTMLDivElement> | null = null;
      if (draggingSection === 'trending') currentRef = trendingRef;
      else if (draggingSection === 'movies') currentRef = moviesSectionRef;
      else if (draggingSection === 'series') currentRef = seriesRef;
      else if (draggingSection === 'anime') currentRef = animeRef;
      
      if (!currentRef?.current) return;
      
      e.preventDefault();
      const x = e.pageX - currentRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      currentRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDraggingSection(null);
      [trendingRef, moviesSectionRef, seriesRef, animeRef].forEach(ref => {
        if (ref.current) {
          ref.current.style.cursor = 'grab';
          ref.current.style.userSelect = '';
        }
      });
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      // Prevent text selection globally while dragging
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, draggingSection, startX, scrollLeft]);

  // Create drag handlers for each section
  const createDragHandlers = useCallback((sectionRef: React.RefObject<HTMLDivElement>, sectionId: string) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      if (!sectionRef.current) return;
      setIsDragging(true);
      setDraggingSection(sectionId);
      setStartX(e.pageX - sectionRef.current.offsetLeft);
      setScrollLeft(sectionRef.current.scrollLeft);
      sectionRef.current.style.cursor = 'grabbing';
      sectionRef.current.style.userSelect = 'none';
      // Prevent text selection
      e.preventDefault();
    };

    const handleMouseLeave = () => {
      // Don't stop dragging on mouse leave, allow dragging outside the element
    };

    return {
      onMouseDown: handleMouseDown,
      onMouseLeave: handleMouseLeave,
      onDragStart: (e: React.DragEvent) => e.preventDefault(), // Prevent image dragging
    };
  }, []);

  // Carousel drag handlers (existing)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: index * carouselRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const scrollPosition = carouselRef.current.scrollLeft;
    const slideWidth = carouselRef.current.offsetWidth;
    const newIndex = Math.round(scrollPosition / slideWidth);
    setCurrentIndex(newIndex);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll);
      return () => carousel.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, trending]);

  // Auto-advance carousel
  useEffect(() => {
    if (trending.length <= 1 || isDragging) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % trending.length;
        if (carouselRef.current) {
          carouselRef.current.scrollTo({
            left: nextIndex * carouselRef.current.offsetWidth,
            behavior: 'smooth'
          });
        }
        return nextIndex;
      });
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [trending.length, isDragging]);


  const showSkeletonArray = Array.from({ length: 8 });

  return (
    <div className="min-h-screen bg-black">
      <style jsx global>{`
        /* Custom scrollbar styling */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Horizontal scrollbar styling for category sections */
        .category-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        
        .category-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        
        .category-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #f97316, #eab308);
          border-radius: 4px;
        }
        
        .category-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #ea580c, #ca8a04);
        }


        /* Snap scrolling */
        .snap-x {
          scroll-snap-type: x mandatory;
        }
        
        .snap-center {
          scroll-snap-align: center;
        }

        /* Line clamp */
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Trending Shows Hero Carousel */}
      <section className="relative h-[70vh] bg-black overflow-hidden">
        {loading ? (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-orange-900/40 via-black to-yellow-900/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 space-y-4">
              <div className="h-12 md:h-16 rounded-full w-3/4 max-w-xl bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
              <div className="space-y-3 w-full max-w-2xl">
                <div className="h-4 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                <div className="h-4 rounded-full w-5/6 bg-gradient-to-r from-orange-500/50 to-yellow-400/50" />
                <div className="h-4 rounded-full w-2/3 bg-gradient-to-r from-orange-500/40 to-yellow-400/40" />
              </div>
              <div className="h-12 rounded-full w-40 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={carouselRef}
              className="flex h-full overflow-x-scroll snap-x snap-mandatory scrollbar-hide"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {trending.map((show, index) => (
                <div
                  key={`trending-${show.id}-${index}`}
                  className="relative flex-none w-full h-full snap-center"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={getImageUrl(show.backdrop_path, 'original')}
                      alt={show.title || show.name || ''}
                      fill
                      className="object-cover"
                      style={{ objectPosition: 'center 30%' }}
                      quality={100}
                      priority={index === 0}
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
                      <h2 className="text-5xl md:text-7xl font-bold mb-4 text-center max-w-4xl">
                        {show.title || show.name}
                      </h2>
                      <p className="text-lg md:text-xl text-gray-300 mb-8 text-center max-w-3xl line-clamp-3">
                        {show.overview}
                      </p>
                      <button
                        onClick={() => handleShowClick(show.id, show.media_type)}
                        className="bg-gradient-orange-yellow-light bg-gradient-to-r from-orange-500 to-yellow-600 px-10 py-4 rounded-full text-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-3 shadow-lg"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Watch Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation Dots */}
            {trending.length > 1 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
                {trending.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-gradient-yellow-dot bg-gradient-to-r from-yellow-400 to-yellow-500 w-8'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Bottom gradient transition to black */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-black/30 to-black z-10 pointer-events-none" />
      </section>

      {/* Content Library */}
      <div className="space-y-12 pb-12">
        {/* Trending Now */}
        <section className="px-4">
          <h2 className="text-2xl font-bold mb-6">Trending Now</h2>
          <div className="relative">
            <div 
              ref={trendingRef}
              className="flex overflow-x-auto gap-6 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(trendingRef, 'trending')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div
                      key={`trend-skel-${idx}`}
                      className="flex-none w-[400px] rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40 relative"
                    >
                      <div className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80" />
                      <div className="relative aspect-[16/9] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                      <div className="p-6 space-y-3">
                        <div className="h-5 rounded-full w-2/3 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                        <div className="h-4 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                      </div>
                    </div>
                  ))
                : trending.map((show, index) => (
                    <div
                      key={`trending-list-${show.id}-${index}`}
                      onClick={() => handleShowClick(show.id, show.media_type)}
                      onDragStart={(e) => e.preventDefault()}
                      className="flex-none w-[400px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group relative select-none"
                    >
                      <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-yellow-500 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold">
                        {index + 1}
                      </div>
                      <div className="relative aspect-[16/9]">
                        <Image
                          src={getImageUrl(show.backdrop_path)}
                          alt={show.title || show.name || ''}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <WatchlistToggle
                          item={{
                            id: show.id,
                            media_type: show.media_type,
                            title: show.title,
                            name: show.name,
                            overview: show.overview,
                            poster_path: show.poster_path,
                            backdrop_path: show.backdrop_path,
                          }}
                          size="sm"
                        />
                        <div className="absolute bottom-0 left-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <h3 className="text-2xl font-bold mb-2">{show.title || show.name}</h3>
                          <p className="text-lg text-gray-300">{show.overview}</p>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-2xl font-bold truncate">{show.title || show.name}</h3>
                        <p className="text-lg text-gray-400 truncate">{show.overview}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* Movies */}
        <section className="px-4" ref={moviesRef}>
          <h2 className="text-2xl font-bold mb-6">Movies</h2>
          <div className="relative">
            <div 
              ref={moviesSectionRef}
              className="flex overflow-x-auto gap-6 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(moviesSectionRef, 'movies')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div
                      key={`movie-skel-${idx}`}
                      className="flex-none w-[300px] rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
                    >
                      <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                      </div>
                    </div>
                  ))
                : movies.map((movie, index) => (
                    <div
                      key={`movie-${movie.id}-${index}`}
                      onClick={() => handleShowClick(movie.id, 'movie')}
                      onDragStart={(e) => e.preventDefault()}
                      className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group select-none"
                    >
                      <div className="relative aspect-[2/3]">
                        <Image
                          src={getImageUrl(movie.poster_path)}
                          alt={movie.title || ''}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <WatchlistToggle
                          item={{
                            id: movie.id,
                            media_type: 'movie',
                            title: movie.title,
                            name: movie.name,
                            overview: movie.overview,
                            poster_path: movie.poster_path,
                            backdrop_path: movie.backdrop_path,
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-xl font-bold truncate">{movie.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{movie.overview}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* TV Shows */}
        <section className="px-4">
          <h2 className="text-2xl font-bold mb-6">TV Shows</h2>
          <div className="relative">
            <div 
              ref={seriesRef}
              className="flex overflow-x-auto gap-6 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(seriesRef, 'series')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div
                      key={`series-skel-${idx}`}
                      className="flex-none w-[300px] rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
                    >
                      <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                      </div>
                    </div>
                  ))
                : series.map((show, index) => (
                    <div
                      key={`series-${show.id}-${index}`}
                      onClick={() => handleShowClick(show.id, 'tv')}
                      onDragStart={(e) => e.preventDefault()}
                      className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group select-none"
                    >
                      <div className="relative aspect-[2/3]">
                        <Image
                          src={getImageUrl(show.poster_path)}
                          alt={show.name || ''}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <WatchlistToggle
                          item={{
                            id: show.id,
                            media_type: 'tv',
                            title: show.title,
                            name: show.name,
                            overview: show.overview,
                            poster_path: show.poster_path,
                            backdrop_path: show.backdrop_path,
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-xl font-bold truncate">{show.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{show.overview}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* Anime */}
        <section className="px-4">
          <h2 className="text-2xl font-bold mb-6">Anime</h2>
          <div className="relative">
            <div 
              ref={animeRef}
              className="flex overflow-x-auto gap-6 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(animeRef, 'anime')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div
                      key={`anime-skel-${idx}`}
                      className="flex-none w-[300px] rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
                    >
                      <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                      </div>
                    </div>
                  ))
                : anime.map((show, index) => (
                    <div
                      key={`anime-${show.id}-${index}`}
                      onClick={() => handleShowClick(show.id, 'tv')}
                      onDragStart={(e) => e.preventDefault()}
                      className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group select-none"
                    >
                      <div className="relative aspect-[2/3]">
                        <Image
                          src={getImageUrl(show.poster_path)}
                          alt={show.name || ''}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <WatchlistToggle
                          item={{
                            id: show.id,
                            media_type: 'tv',
                            title: show.title,
                            name: show.name,
                            overview: show.overview,
                            poster_path: show.poster_path,
                            backdrop_path: show.backdrop_path,
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-xl font-bold truncate">{show.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{show.overview}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

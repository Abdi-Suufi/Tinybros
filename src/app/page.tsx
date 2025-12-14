'use client';

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchTrending, fetchMovies, fetchTVShows, fetchAnime, getImageUrl, TMDBShow } from "@/lib/tmdb";
import Loading from '@/components/Loading';

export default function Home() {
  const moviesRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
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
    router.push(`/shows/${mediaType}/${id}`);
  };

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


  if (loading) {
    return <Loading />;
  }

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
                    className="bg-gradient-to-r from-orange-500 to-yellow-600 px-10 py-4 rounded-full text-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-3 shadow-lg"
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
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 w-8'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Content Library */}
      <div className="space-y-12 pb-12">
        {/* Trending Now */}
        <section className="px-4">
          <h2 className="text-2xl font-bold mb-6">Trending Now</h2>
          <div className="relative">
            <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
              {trending.map((show, index) => (
                <div
                  key={`trending-list-${show.id}-${index}`}
                  onClick={() => handleShowClick(show.id, show.media_type)}
                  className="flex-none w-[400px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group relative"
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
            <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
              {movies.map((movie, index) => (
                <div
                  key={`movie-${movie.id}-${index}`}
                  onClick={() => handleShowClick(movie.id, 'movie')}
                  className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={getImageUrl(movie.poster_path)}
                      alt={movie.title || ''}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
              {series.map((show, index) => (
                <div
                  key={`series-${show.id}-${index}`}
                  onClick={() => handleShowClick(show.id, 'tv')}
                  className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={getImageUrl(show.poster_path)}
                      alt={show.name || ''}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
              {anime.map((show, index) => (
                <div
                  key={`anime-${show.id}-${index}`}
                  onClick={() => handleShowClick(show.id, 'tv')}
                  className="flex-none w-[300px] rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={getImageUrl(show.poster_path)}
                      alt={show.name || ''}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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

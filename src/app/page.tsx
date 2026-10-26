'use client';

import Image from "next/image";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchTrending, fetchMovies, fetchTVShows, fetchAnime, getImageUrl, TMDBShow } from "@/lib/tmdb";
import PosterCard, { releaseYear, tmdbRating } from "@/components/PosterCard";
import WatchlistToggle from "@/components/WatchlistToggle";
import Loading from "@/components/Loading";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";

const showSkeletonArray = Array.from({ length: 8 });

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
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isInteractingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  type DragState = {
    active: boolean;
    pointerId: number;
    startClientX: number;
    startScrollLeft: number;
    moved: boolean;
    captured: boolean;
    prevScrollBehavior: string;
    prevScrollSnapType: string;
    lastTime: number;
    lastScrollLeft: number;
    velocity: number; // px per ms
  };

  const categoryDragRef = useRef<DragState>({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startScrollLeft: 0,
    moved: false,
    captured: false,
    prevScrollBehavior: "",
    prevScrollSnapType: "",
    lastTime: 0,
    lastScrollLeft: 0,
    velocity: 0,
  });

  const heroDragRef = useRef<DragState>({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startScrollLeft: 0,
    moved: false,
    captured: false,
    prevScrollBehavior: "",
    prevScrollSnapType: "",
    lastTime: 0,
    lastScrollLeft: 0,
    velocity: 0,
  });

  const categoryMomentumRef = useRef<{
    rafId: number;
    el: HTMLDivElement | null;
    lastTime: number;
    velocity: number;
    restore: null | (() => void);
  }>({
    rafId: 0,
    el: null,
    lastTime: 0,
    velocity: 0,
    restore: null,
  });

  const heroMomentumRef = useRef<{
    rafId: number;
    el: HTMLDivElement | null;
    lastTime: number;
    velocity: number;
    restore: null | (() => void);
  }>({
    rafId: 0,
    el: null,
    lastTime: 0,
    velocity: 0,
    restore: null,
  });

  const cancelMomentum = useCallback((which: 'category' | 'hero') => {
    const ref = which === 'category' ? categoryMomentumRef : heroMomentumRef;
    if (ref.current.rafId) cancelAnimationFrame(ref.current.rafId);
    if (ref.current.restore) ref.current.restore();
    ref.current.rafId = 0;
    ref.current.el = null;
    ref.current.velocity = 0;
    ref.current.lastTime = 0;
    ref.current.restore = null;
  }, []);

  const startMomentum = useCallback(
    (which: 'category' | 'hero', el: HTMLDivElement, initialVelocity: number, restore: () => void) => {
      cancelMomentum(which);

      const ref = which === 'category' ? categoryMomentumRef : heroMomentumRef;
      ref.current.el = el;
      ref.current.velocity = initialVelocity;
      ref.current.lastTime = performance.now();
      ref.current.restore = restore;

      const friction = 0.95; // per frame-ish (dt adjusted below)
      const minVelocity = 0.02; // px/ms

      const tick = (now: number) => {
        const state = ref.current;
        const node = state.el;
        if (!node) return;

        const dt = Math.max(8, Math.min(32, now - state.lastTime)); // clamp for stability
        state.lastTime = now;

        node.scrollLeft += state.velocity * dt;

        // Exponential-ish decay: scale friction relative to dt (baseline ~16ms)
        const decay = Math.pow(friction, dt / 16);
        state.velocity *= decay;

        if (Math.abs(state.velocity) < minVelocity) {
          cancelMomentum(which);
          return;
        }

        state.rafId = requestAnimationFrame(tick);
      };

      ref.current.rafId = requestAnimationFrame(tick);
    },
    [cancelMomentum]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingResult, moviesResult, seriesResult, animeResult] = await Promise.allSettled([
          fetchTrending(),
          fetchMovies(),
          fetchTVShows(),
          fetchAnime()
        ]);

        if (trendingResult.status === 'fulfilled') {
          setTrending(Array.from(new Map(trendingResult.value.map(item => [item.id, item])).values()));
        } else {
          console.error('Error fetching trending shows:', trendingResult.reason);
        }

        if (moviesResult.status === 'fulfilled') {
          setMovies(Array.from(new Map(moviesResult.value.map(item => [item.id, item])).values()));
        } else {
          console.error('Error fetching movies:', moviesResult.reason);
        }

        if (seriesResult.status === 'fulfilled') {
          setSeries(Array.from(new Map(seriesResult.value.map(item => [item.id, item])).values()));
        } else {
          console.error('Error fetching TV shows:', seriesResult.reason);
        }

        if (animeResult.status === 'fulfilled') {
          setAnime(Array.from(new Map(animeResult.value.map(item => [item.id, item])).values()));
        } else {
          console.error('Error fetching anime:', animeResult.reason);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const timeout = setTimeout(() => setShowLoadingOverlay(false), 700);
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleShowClick = useCallback((id: number, mediaType: string) => {
    // Don't navigate if user was dragging
    if (Date.now() < suppressClickUntilRef.current) return;
    
    if (mediaType === 'movie') {
      router.push(`/movies/movie/${id}`);
    } else {
      router.push(`/series/series/${id}`);
    }
  }, [router]);

  // Create drag handlers for each section
  const createDragHandlers = useCallback((sectionRef: React.RefObject<HTMLDivElement>, sectionId: string) => {
    const onPointerDown = (e: React.PointerEvent) => {
      const el = sectionRef.current;
      if (!el) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      cancelMomentum('category');

      const now = performance.now();
      categoryDragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startScrollLeft: el.scrollLeft,
        moved: false,
        captured: false,
        prevScrollBehavior: el.style.scrollBehavior || "",
        prevScrollSnapType: el.style.scrollSnapType || "",
        lastTime: now,
        lastScrollLeft: el.scrollLeft,
        velocity: 0,
      };
    };

    const onPointerMove = (e: React.PointerEvent) => {
      const el = sectionRef.current;
      const st = categoryDragRef.current;
      if (!el || !st.active || st.pointerId !== e.pointerId) return;

      const dx = e.clientX - st.startClientX;
      if (!st.moved && Math.abs(dx) > 2) {
        st.moved = true;
        isInteractingRef.current = true;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
        el.style.scrollBehavior = 'auto';
        el.style.scrollSnapType = 'none';

        try {
          el.setPointerCapture(e.pointerId);
          st.captured = true;
        } catch {}
      }

      if (!st.moved) return;
      el.scrollLeft = st.startScrollLeft - dx;

      const now = performance.now();
      const dt = now - st.lastTime;
      if (dt > 0) {
        const v = (el.scrollLeft - st.lastScrollLeft) / dt; // px/ms
        // Light smoothing to avoid jitter
        st.velocity = st.velocity * 0.8 + v * 0.2;
        st.lastTime = now;
        st.lastScrollLeft = el.scrollLeft;
      }
      e.preventDefault();
    };

    const end = (e: React.PointerEvent) => {
      const el = sectionRef.current;
      const st = categoryDragRef.current;
      if (!el || !st.active || st.pointerId !== e.pointerId) return;

      st.active = false;
      st.pointerId = -1;

      if (!st.moved) return;

      suppressClickUntilRef.current = Date.now() + 250;

      if (st.captured) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {}
      }

      el.style.cursor = 'grab';
      el.style.userSelect = '';

      const restore = () => {
        el.style.scrollBehavior = st.prevScrollBehavior;
        el.style.scrollSnapType = st.prevScrollSnapType;
        isInteractingRef.current = false;
      };

      if (Math.abs(st.velocity) > 0.02) {
        startMomentum('category', el, st.velocity, restore);
      } else {
        restore();
      }
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
      style: { touchAction: 'pan-y' as const, scrollBehavior: 'auto' as const },
      "data-drag-section": sectionId,
    };
  }, [cancelMomentum, startMomentum]);

  // Carousel drag handlers (1:1 pointer drag)
  const handleCarouselPointerDown = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    cancelMomentum('hero');

    const now = performance.now();
    heroDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
      captured: false,
      prevScrollBehavior: el.style.scrollBehavior || "",
      prevScrollSnapType: el.style.scrollSnapType || "",
      lastTime: now,
      lastScrollLeft: el.scrollLeft,
      velocity: 0,
    };
  };

  const handleCarouselPointerMove = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    const st = heroDragRef.current;
    if (!el || !st.active || st.pointerId !== e.pointerId) return;

    const dx = e.clientX - st.startClientX;
    if (!st.moved && Math.abs(dx) > 2) {
      st.moved = true;
      isInteractingRef.current = true;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
      el.style.scrollBehavior = 'auto';
      el.style.scrollSnapType = 'none';

      try {
        el.setPointerCapture(e.pointerId);
        st.captured = true;
      } catch {}
    }

    if (!st.moved) return;
    el.scrollLeft = st.startScrollLeft - dx;

    const now = performance.now();
    const dt = now - st.lastTime;
    if (dt > 0) {
      const v = (el.scrollLeft - st.lastScrollLeft) / dt; // px/ms
      st.velocity = st.velocity * 0.8 + v * 0.2;
      st.lastTime = now;
      st.lastScrollLeft = el.scrollLeft;
    }
    e.preventDefault();
  };

  const handleCarouselPointerEnd = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    const st = heroDragRef.current;
    if (!el || !st.active || st.pointerId !== e.pointerId) return;

    st.active = false;
    st.pointerId = -1;

    if (!st.moved) return;

    suppressClickUntilRef.current = Date.now() + 250;

    if (st.captured) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }

    el.style.cursor = 'grab';
    el.style.userSelect = '';

    const restore = () => {
      el.style.scrollBehavior = st.prevScrollBehavior;
      el.style.scrollSnapType = st.prevScrollSnapType;
      isInteractingRef.current = false;
    };

    if (Math.abs(st.velocity) > 0.02) {
      startMomentum('hero', el, st.velocity, restore);
    } else {
      restore();
    }
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
    if (trending.length <= 1) return;

    const interval = setInterval(() => {
      if (isInteractingRef.current) return;
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
  }, [trending.length]);

  // Memoized so carousel index changes (autoplay, swipes) only re-render the dots
  const heroSlides = useMemo(
    () =>
      trending.map((show, index) => (
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
                className="bg-gradient-orange-yellow-light bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-10 py-4 rounded-full text-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-3 shadow-lg"
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
      )),
    [trending, handleShowClick]
  );

  const libraryRows = useMemo(
    () => (
      <>
        {/* Top Trending: wide featured #1 card, then ranked posters */}
        <section className="px-4">
          <h2 className="text-2xl font-bold mb-6">Top Trending</h2>
          <div className="relative">
            <div 
              ref={trendingRef}
              className="flex overflow-x-auto gap-4 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(trendingRef, 'trending')}
            >
              {loading
                ? showSkeletonArray.slice(0, 7).map((_, idx) => (
                    <div key={`trend-skel-${idx}`} className={`flex-none ${idx === 0 ? 'w-[min(85vw,600px)]' : 'w-[150px] sm:w-[200px]'}`}>
                      <div className="h-[225px] sm:h-[300px] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 rounded-full w-2/3 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                      </div>
                    </div>
                  ))
                : trending.slice(0, 10).map((show, index) => {
                    const title = show.title || show.name || '';
                    const year = (show.release_date || show.first_air_date || '').slice(0, 4);
                    const isFeatured = index === 0;
                    if (!isFeatured) {
                      return (
                        <PosterCard
                          key={`trending-list-${show.id}-${index}`}
                          item={show}
                          onClick={() => handleShowClick(show.id, show.media_type)}
                          rating={tmdbRating(show.vote_average)}
                          year={year || undefined}
                          rank={index + 1}
                          className="flex-none w-[150px] sm:w-[200px]"
                        />
                      );
                    }
                    return (
                      <div
                        key={`trending-list-${show.id}-${index}`}
                        onClick={() => handleShowClick(show.id, show.media_type)}
                        onDragStart={(e) => e.preventDefault()}
                        className={`flex-none cursor-pointer group select-none ${isFeatured ? 'w-[min(85vw,600px)]' : 'w-[150px] sm:w-[200px]'}`}
                      >
                        <div className="relative h-[225px] sm:h-[300px] rounded-xl overflow-hidden bg-black border border-yellow-500/20 group-hover:border-yellow-400/70 group-hover:shadow-[0_0_16px_rgba(234,179,8,0.35)] transition-all duration-300">
                          <Image
                            src={getImageUrl(isFeatured ? show.backdrop_path : show.poster_path)}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {isFeatured && (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
                              <div className="absolute inset-y-0 left-0 flex w-full sm:w-3/4 flex-col justify-end p-4 sm:p-6">
                                <h3 className="text-2xl sm:text-4xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600 line-clamp-2">
                                  {title}
                                </h3>
                                <p className="mt-2 text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3">{show.overview}</p>
                                <span className="glass glass-button mt-3 self-start rounded-full px-4 py-1.5 text-sm font-semibold text-white">
                                  View details
                                </span>
                              </div>
                            </>
                          )}
                          {/* Rank badge */}
                          <div className="absolute top-0 left-3 z-10 flex flex-col items-center rounded-b-md bg-gradient-to-b from-yellow-400 to-yellow-600 px-2 pb-1 pt-0.5 text-black shadow-lg">
                            <span className="text-[9px] font-extrabold leading-none tracking-wider">TOP</span>
                            <span className="text-base font-extrabold leading-tight">{index + 1}</span>
                          </div>
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
                        </div>
                        <div className="mt-3 px-0.5">
                          <h3 className="truncate font-semibold text-white group-hover:text-yellow-300 transition-colors">{title}</h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="text-yellow-400">★</span>
                            <span>{show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</span>
                            {year && (<><span>·</span><span>{year}</span></>)}
                            <span>·</span>
                            <span>{show.media_type === 'movie' ? 'Movie' : 'Show'}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </section>

        {/* Movies */}
        <section className="px-4" ref={moviesRef}>
          <h2 className="text-2xl font-bold mb-6">Movies</h2>
          <div className="relative">
            <div 
              ref={moviesSectionRef}
              className="flex overflow-x-auto gap-4 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(moviesSectionRef, 'movies')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div key={`movie-skel-${idx}`} className="flex-none w-[150px] sm:w-[200px]">
                      <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                      </div>
                    </div>
                  ))
                : movies.map((movie, index) => (
                    <PosterCard
                      key={`movie-${movie.id}-${index}`}
                      item={{ ...movie, media_type: 'movie' }}
                      onClick={() => handleShowClick(movie.id, 'movie')}
                      rating={tmdbRating(movie.vote_average)}
                      year={releaseYear(movie)}
                      className="flex-none w-[150px] sm:w-[200px]"
                    />
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
              className="flex overflow-x-auto gap-4 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(seriesRef, 'series')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div key={`series-skel-${idx}`} className="flex-none w-[150px] sm:w-[200px]">
                      <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                      </div>
                    </div>
                  ))
                : series.map((show, index) => (
                    <PosterCard
                      key={`series-${show.id}-${index}`}
                      item={{ ...show, media_type: 'tv' }}
                      onClick={() => handleShowClick(show.id, 'tv')}
                      rating={tmdbRating(show.vote_average)}
                      year={releaseYear(show)}
                      className="flex-none w-[150px] sm:w-[200px]"
                    />
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
              className="flex overflow-x-auto gap-4 pb-6 category-scrollbar cursor-grab active:cursor-grabbing"
              style={{ scrollBehavior: 'smooth' }}
              {...createDragHandlers(animeRef, 'anime')}
            >
              {loading
                ? showSkeletonArray.map((_, idx) => (
                    <div key={`anime-skel-${idx}`} className="flex-none w-[150px] sm:w-[200px]">
                      <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                      <div className="mt-3 space-y-2">
                        <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                        <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                      </div>
                    </div>
                  ))
                : anime.map((show, index) => (
                    <PosterCard
                      key={`anime-${show.id}-${index}`}
                      item={{ ...show, media_type: 'tv' }}
                      onClick={() => handleShowClick(show.id, 'tv')}
                      rating={tmdbRating(show.vote_average)}
                      year={releaseYear(show)}
                      className="flex-none w-[150px] sm:w-[200px]"
                    />
                  ))}
            </div>
          </div>
        </section>
      </>
    ),
    [loading, trending, movies, series, anime, handleShowClick, createDragHandlers]
  );


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
          background: #000000;
          border-radius: 4px;
        }
        
        .category-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #facc15, #eab308);
          border-radius: 4px;
        }
        
        .category-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #eab308, #ca8a04);
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
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-yellow-900/40 via-black to-yellow-900/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 space-y-4">
              <div className="h-12 md:h-16 rounded-full w-3/4 max-w-xl bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
              <div className="space-y-3 w-full max-w-2xl">
                <div className="h-4 rounded-full w-full bg-gradient-to-r from-yellow-500/60 to-yellow-400/60" />
                <div className="h-4 rounded-full w-5/6 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                <div className="h-4 rounded-full w-2/3 bg-gradient-to-r from-yellow-500/40 to-yellow-400/40" />
              </div>
              <div className="h-12 rounded-full w-40 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={carouselRef}
              className="flex h-full overflow-x-scroll snap-x snap-mandatory scrollbar-hide"
              onPointerDown={handleCarouselPointerDown}
              onPointerMove={handleCarouselPointerMove}
              onPointerUp={handleCarouselPointerEnd}
              onPointerCancel={handleCarouselPointerEnd}
              onDragStart={(e) => e.preventDefault()}
              style={{ cursor: 'grab', touchAction: 'pan-y' }}
            >
              {heroSlides}
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
                        ? 'bg-gradient-yellow-dot bg-gradient-to-r from-yellow-400 to-yellow-600 w-8'
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
        <ContinueWatchingRow />

        {libraryRows}
      </div>
      {(loading || showLoadingOverlay) && <Loading isExiting={!loading} />}
    </div>
  );
}

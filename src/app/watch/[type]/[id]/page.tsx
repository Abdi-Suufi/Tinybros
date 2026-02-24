'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { getImageUrl } from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';
import { DiscussionEmbed } from 'disqus-react';
import Loading from '@/components/Loading';

interface ShowDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  number_of_seasons?: number;
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string;
  episode_number: number;
  season_number: number;
  air_date: string;
}

interface RecommendedShow {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string;
}

interface PlaybackSource {
  id: string;
  name: string;
  url: string;
  disabled?: boolean;
}

export default function WatchPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedShow[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('vidking');
  const [showPlayer, setShowPlayer] = useState(true);

  // Define available playback sources
  const playbackSources: PlaybackSource[] = [
    { 
      id: 'vidsrc', 
      name: 'VidSrc', 
      url: `https://vidsrc.xyz/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`,
      disabled: true
    },
    { 
      id: 'vidsrc-to', 
      name: 'VidSrc.to', 
      url: `https://vidsrc.to/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`
    },
    { 
      id: 'vidking',
      name: 'VidKing.net', 
      url: `https://www.vidking.net/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'vidora', 
      name: 'Vidora', 
      url: `https://vidora.su/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'vidlink', 
      name: 'VidLink', 
      url: `https://vidlink.pro/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'superembed', 
      name: 'SuperEmbed', 
      url: `https://multiembed.mov/?video_id=${resolvedParams.id}&tmdb=1${resolvedParams.type === 'tv' ? `&s=${searchParams.get('season') || '1'}&e=${searchParams.get('episode') || '1'}` : ''}`,
      disabled: true
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch show details
        const showResponse = await fetch(
          `https://api.themoviedb.org/3/${resolvedParams.type}/${resolvedParams.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        
        if (!showResponse.ok) {
          throw new Error('Failed to fetch show details');
        }

        const showData = await showResponse.json();
        setShow(showData);

        // If it's a TV show, fetch episodes
        if (resolvedParams.type === 'tv') {
          const season = searchParams.get('season') || '1';
          const episodesResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${resolvedParams.id}/season/${season}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          );
          
          if (episodesResponse.ok) {
            const episodesData = await episodesResponse.json();
            setEpisodes(episodesData.episodes);
            setSelectedSeason(Number(season));
          }
        }

        // Fetch recommendations
        const recommendationsResponse = await fetch(
          `https://api.themoviedb.org/3/${resolvedParams.type}/${resolvedParams.id}/recommendations?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );

        if (recommendationsResponse.ok) {
          const recommendationsData = await recommendationsResponse.json();
          const results = (recommendationsData.results || []) as RecommendedShow[];
          setRecommendations(results.filter((item) => item.poster_path));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, resolvedParams.type, searchParams]);

  // Fetch episodes when season changes
  useEffect(() => {
    if (resolvedParams.type === 'tv' && show) {
      const fetchEpisodes = async () => {
        try {
          const episodesResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${resolvedParams.id}/season/${selectedSeason}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          );
          
          if (episodesResponse.ok) {
            const episodesData = await episodesResponse.json();
            setEpisodes(episodesData.episodes || []);
          }
        } catch (error) {
          console.error('Error fetching episodes:', error);
        }
      };

      fetchEpisodes();
    }
  }, [selectedSeason, resolvedParams.id, resolvedParams.type, show]);

  // Update page title when show or episode changes
  useEffect(() => {
    if (show) {
      const title = show.title || show.name || 'Watch';
      const episode = searchParams.get('episode');
      const season = searchParams.get('season');
      if (episode && season) {
        document.title = `${title} - S${season}E${episode} | TinyBros`;
      } else {
        document.title = `${title} | TinyBros`;
      }
    }
  }, [show, searchParams]);

  // Handle source change
  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setShowPlayer(true);
  };

  // Get current source URL
  const getCurrentSourceUrl = () => {
    const source = playbackSources.find(s => s.id === selectedSource);
    return source ? source.url : playbackSources[0].url;
  };

  //NAVIGATION LOGIC
  const currentSeason = Number(searchParams.get('season')) || 1;
  const currentEpisode = Number(searchParams.get('episode')) || 1;
  
  // Next Episode Logic
  let nextEpisodeUrl = '';
  if (resolvedParams.type === 'tv' && show) {
    const hasNextInSeason = episodes.some(ep => ep.episode_number === currentEpisode + 1);
    const hasNextSeason = (show.number_of_seasons || 0) > currentSeason;

    if (hasNextInSeason) {
      nextEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason}&episode=${currentEpisode + 1}`;
    } else if (hasNextSeason) {
      nextEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason + 1}&episode=1`;
    }
  }

  // Previous Episode Logic
  let prevEpisodeUrl = '';
  if (resolvedParams.type === 'tv' && show) {
    // Only support going back to previous episode in the SAME season for simplicity
    if (currentEpisode > 1) {
      prevEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason}&episode=${currentEpisode - 1}`;
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Show not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <style jsx global>{`
        /* Custom scrollbar styling */
        .scrollbar-hide::-webkit-scrollbar {
          height: 8px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-track {
          background: #000;
          border-radius: 4px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #0ea5e9, #14b8a6);
          border-radius: 4px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #0284c7, #0d9488);
        }
      `}</style>

      {/* Video Player */}
      <div className="w-full max-w-5xl mx-auto pt-28 pb-8 px-4">
        {showPlayer ? (
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg shadow-2xl">
            <iframe
  key={selectedSource}
  src={getCurrentSourceUrl()}
  className="w-full h-full rounded-lg"
  allowFullScreen={true}
  // Apply sandbox ONLY when VidKing is the selected source
  sandbox={selectedSource === 'vidking' 
    ? "allow-forms allow-scripts allow-same-origin allow-presentation" 
    : undefined
  }
  allow="fullscreen; autoplay; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope"
  style={{ border: 'none' }}
  referrerPolicy="no-referrer-when-downgrade"
/>
          </div>
        ) : (
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">{show.title || show.name}</h1>
              {searchParams.get('episode') && (
                <h2 className="text-2xl mb-4">
                  Season {searchParams.get('season')} • Episode {searchParams.get('episode')}
                </h2>
              )}
              <div className="mt-6">
                <h3 className="text-xl mb-4">Select a playback source:</h3>
                
                <div className="flex flex-col items-center gap-6">
                  {/* Source Buttons */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {playbackSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => handleSourceChange(source.id)}
                        disabled={source.disabled}
                        className={`px-4 py-2 rounded-full text-white font-semibold transition-opacity ${
                          source.disabled
                            ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                            : source.id === 'vidlink'
                              ? 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black hover:opacity-90' 
                              : 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90'
                        }`}
                      >
                        {source.name}
                        {source.id === 'vidlink' && (
                          <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Navigation Buttons for Placeholder */}
                  <div className="flex gap-4">
                    {prevEpisodeUrl && (
                      <Link
                        href={prevEpisodeUrl}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>Prev</span>
                      </Link>
                    )}
                    {nextEpisodeUrl && (
                      <Link
                        href={nextEpisodeUrl}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity"
                      >
                        <span>Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Episode Display (when player is active) */}
      {showPlayer && resolvedParams.type === 'tv' && (
        <div className="w-full max-w-5xl mx-auto px-4 pb-2">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900/80 backdrop-blur-sm rounded-full border border-gray-700/50">
              <span className="text-white font-semibold text-lg">
                {show.title || show.name}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-orange-400 font-bold text-lg">
                Season {currentSeason} • Episode {currentEpisode}
              </span>
              {episodes.find(ep => ep.episode_number === currentEpisode) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300 text-sm">
                    {episodes.find(ep => ep.episode_number === currentEpisode)?.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Selector & Navigation (when player is active) */}
      {showPlayer && (
        <div className="bg-gray-900 p-4">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl">
            
            {/* Previous Episode Button (Left Side) */}
            <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-start">
              {prevEpisodeUrl ? (
                <Link
                  href={prevEpisodeUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  <span>Prev</span>
                </Link>
              ) : (
                // Invisible spacer to maintain center alignment of sources when Prev is missing
                <div className="hidden md:block w-[100px]" />
              )}
            </div>

            {/* Source Buttons (Center) */}
            <div className="flex flex-wrap gap-3 justify-center flex-1">
              {playbackSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceChange(source.id)}
                  disabled={source.disabled}
                  className={`px-4 py-2 rounded-full text-white font-semibold transition-all ${
                    source.disabled
                      ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                      : selectedSource === source.id
                        ? source.id === 'vidlink'
                          ? 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black'
                          : 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600'
                        : source.id === 'vidlink'
                          ? 'bg-gray-800 hover:bg-gray-700 ring-1 ring-orange-400/50'
                          : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {source.name}
                  {source.id === 'vidlink' && (
                    <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                  )}
                </button>
              ))}
            </div>

            {/* Next Episode Button (Right Side) */}
            <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-end">
              {nextEpisodeUrl ? (
                <Link
                  href={nextEpisodeUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity group"
                >
                  <span>Next</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ) : (
                // Invisible spacer
                <div className="hidden md:block w-[100px]" />
              )}
            </div>

          </div>
        </div>
      )}

      {/* Show Info */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Poster */}
          <div className="w-48 h-72 relative flex-shrink-0 rounded-xl overflow-hidden group hover:scale-105 transition-transform duration-300">
            <Image
              src={getImageUrl(show.poster_path)}
              alt={show.title || show.name || ''}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
              {show.title || show.name}
            </h1>
            <p className="text-gray-300">{show.overview}</p>
          </div>
        </div>

        {/* Episodes (for TV shows) */}
        {resolvedParams.type === 'tv' && episodes.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
                Episodes
              </h2>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  const newSeason = Number(e.target.value);
                  setSelectedSeason(newSeason);
                  // Update URL without reloading
                  const url = new URL(window.location.href);
                  url.searchParams.set('season', newSeason.toString());
                  window.history.pushState({}, '', url.toString());
                }}
                className="bg-gray-800/50 text-white px-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
              >
                {Array.from({ length: show.number_of_seasons || 1 }, (_, i) => i + 1).map(
                  (season) => (
                    <option key={season} value={season}>
                      Season {season}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map((episode) => {
                const isCurrentEpisode = episode.episode_number === currentEpisode && selectedSeason === currentSeason;
                return (
                  <div
                    key={episode.id}
                    className={`rounded-xl overflow-hidden transition-all duration-300 transform ${
                      isCurrentEpisode
                        ? 'bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border-2 border-orange-500/50'
                        : 'bg-gray-800/50 hover:bg-gray-800/80 hover:scale-105 group'
                    }`}
                  >
                    <div className="relative h-40">
                      <Image
                        src={getImageUrl(episode.still_path)}
                        alt={episode.name}
                        fill
                        className="object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent ${
                        isCurrentEpisode ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`} />
                      {isCurrentEpisode && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-600 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Currently Watching
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Episode {episode.episode_number}</h3>
                        <span className="text-sm text-gray-400">{episode.air_date}</span>
                      </div>
                      <h4 className="text-lg font-bold mb-2">{episode.name}</h4>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {episode.overview}
                      </p>
                      {isCurrentEpisode ? (
                        <button
                          disabled
                          className="inline-block w-full text-center px-4 py-2 bg-gray-700/50 text-gray-400 rounded-full font-semibold cursor-not-allowed"
                        >
                          Currently Watching
                        </button>
                      ) : (
                        <Link
                          href={`/watch/${resolvedParams.type}/${resolvedParams.id}?season=${selectedSeason}&episode=${episode.episode_number}`}
                          className="inline-block w-full text-center px-4 py-2 bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full font-semibold hover:opacity-90 transition-opacity"
                        >
                          Watch Episode
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disqus Comments */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Comments</h2>
          <DiscussionEmbed
            shortname="tinybros"
            config={{
              url: `https://tinybros.vercel.app/watch/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `?season=${searchParams.get('season') || '1'}&episode=${searchParams.get('episode') || '1'}` : ''}`,
              identifier: `${resolvedParams.type}-${resolvedParams.id}${resolvedParams.type === 'tv' ? `-s${searchParams.get('season') || '1'}-e${searchParams.get('episode') || '1'}` : ''}`,
              title: show.title || show.name,
              language: 'en'
            }}
          />
        </div>

        {/* Recommended Section */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
              Recommended
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 group"
                >
                  <Link href={`/watch/${resolvedParams.type}/${rec.id}`}>
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={getImageUrl(rec.poster_path)}
                        alt={rec.title || rec.name || ''}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <h3 className="text-sm sm:text-base font-semibold mb-1">
                          {rec.title || rec.name}
                        </h3>
                        {rec.overview && (
                          <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">
                            {rec.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
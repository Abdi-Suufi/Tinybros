// src/app/watch/[type]/[id]/page.tsx

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

interface PlaybackSource {
  id: string;
  name: string;
  url: string;
  disabled?: boolean; // <-- ADDED: to control button state
}

export default function WatchPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('vidking'); // <-- UPDATED: Default to the new preferred source
  const [showPlayer, setShowPlayer] = useState(false);

  // Define available playback sources
  const playbackSources: PlaybackSource[] = [
    { 
      id: 'vidsrc', 
      name: 'VidSrc', 
      url: `https://vidsrc.xyz/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`,
      disabled: true // <-- ADDED: Disable old source
    },
    { 
      id: 'vidsrc-to', 
      name: 'VidSrc.to', 
      url: `https://vidsrc.to/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`,
      disabled: true // <-- ADDED: Disable old source
    },
    { 
      id: 'vidking', // <-- ADDED: New preferred source
      name: 'VidKing.net', 
      url: `https://www.vidking.net/embed/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'superembed', 
      name: 'SuperEmbed', 
      url: `https://multiembed.mov/?video_id=${resolvedParams.id}&tmdb=1${resolvedParams.type === 'tv' ? `&s=${searchParams.get('season') || '1'}&e=${searchParams.get('episode') || '1'}` : ''}`,
      disabled: true // <-- ADDED: Disable old source
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
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, resolvedParams.type, searchParams]);

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

      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-black/70 backdrop-blur-sm">
        <Link href="/" className="inline-block group">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500 group-hover:opacity-90 transition-opacity">
            TinyBros
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/shows/${resolvedParams.type}/${resolvedParams.id}`}
            className="text-white hover:text-gray-300 transition-colors flex items-center gap-1"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Details</span>
          </Link>
        </div>
      </header>

      {/* Video Player */}
      <div className="w-full max-w-5xl mx-auto my-8">
        {showPlayer ? (
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg shadow-2xl">
            <iframe
              src={getCurrentSourceUrl()}
              className="w-full h-full rounded-lg"
              allowFullScreen={true}
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope"
              style={{ border: 'none' }}
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
                <div className="flex flex-wrap justify-center gap-3">
                  {playbackSources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSourceChange(source.id)}
                      disabled={source.disabled} // <-- ADDED: Disable the button
                      className={`px-4 py-2 rounded-full text-white font-semibold transition-opacity ${
                        source.disabled
                          ? 'bg-gray-700/50 cursor-not-allowed opacity-50' // <-- ADDED: Style for disabled button
                          : source.id === 'vidking' // <-- UPDATED: Apply star style to vidking
                            ? 'bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black hover:opacity-90' 
                            : 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90'
                      }`}
                    >
                      {source.name}
                      {source.id === 'vidking' && ( // <-- UPDATED: Display star on VidKing.net
                        <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source Selector (when player is active) */}
      {showPlayer && (
        <div className="bg-gray-900 p-4 flex justify-center">
          <div className="flex flex-wrap gap-3">
            {playbackSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id)}
                disabled={source.disabled} // <-- ADDED: Disable the button
                className={`px-4 py-2 rounded-full text-white font-semibold transition-all ${
                  source.disabled
                    ? 'bg-gray-700/50 cursor-not-allowed opacity-50' // <-- ADDED: Style for disabled button
                    : selectedSource === source.id
                      ? source.id === 'vidking' // <-- UPDATED: Preferred (Selected) Style
                        ? 'bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black'
                        : 'bg-gradient-to-r from-orange-600 to-yellow-600'
                      : source.id === 'vidking' // <-- UPDATED: Preferred (Unselected) Style
                        ? 'bg-gray-800 hover:bg-gray-700 ring-1 ring-orange-400/50'
                        : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {source.name}
                {source.id === 'vidking' && ( // <-- UPDATED: Display star on VidKing.net
                  <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                )}
              </button>
            ))}
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
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
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
              {episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 group"
                >
                  <div className="relative h-40">
                    <Image
                      src={getImageUrl(episode.still_path)}
                      alt={episode.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    <Link
                      href={`/watch/${resolvedParams.type}/${resolvedParams.id}?season=${selectedSeason}&episode=${episode.episode_number}`}
                      className="inline-block w-full text-center px-4 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                      Watch Episode
                    </Link>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  );
}
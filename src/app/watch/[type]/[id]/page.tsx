'use client';

import { useEffect, useState } from 'react';
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
}

export default function WatchPage({ params }: { params: { type: string; id: string } }) {
  const searchParams = useSearchParams();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('vidsrc');
  const [showPlayer, setShowPlayer] = useState(false);

  // Define available playback sources
  const playbackSources: PlaybackSource[] = [
    { 
      id: 'vidsrc', 
      name: 'VidSrc', 
      url: `https://vidsrc.xyz/embed/${params.type}/${params.id}${params.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'vidsrc-to', 
      name: 'VidSrc.to', 
      url: `https://vidsrc.to/embed/${params.type}/${params.id}${params.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}` 
    },
    { 
      id: 'superembed', 
      name: 'SuperEmbed', 
      url: `https://multiembed.mov/?video_id=${params.id}&tmdb=1${params.type === 'tv' ? `&s=${searchParams.get('season') || '1'}&e=${searchParams.get('episode') || '1'}` : ''}` 
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch show details
        const showResponse = await fetch(
          `https://api.themoviedb.org/3/${params.type}/${params.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        
        if (!showResponse.ok) {
          throw new Error('Failed to fetch show details');
        }

        const showData = await showResponse.json();
        setShow(showData);

        // If it's a TV show, fetch episodes
        if (params.type === 'tv') {
          const season = searchParams.get('season') || '1';
          const episodesResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${params.id}/season/${season}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
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
  }, [params.id, params.type, searchParams]);

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
        <Link href="/" className="inline-block flex items-center gap-2 group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-sky-400 group-hover:text-sky-300 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500 group-hover:opacity-90 transition-opacity">
            TinyBros
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/shows/${params.type}/${params.id}`}
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
      <div className="relative w-full max-w-5xl mx-auto aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl my-8">
        {showPlayer ? (
          <iframe
            src={getCurrentSourceUrl()}
            className="w-full h-full"
            allowFullScreen
            allow="fullscreen"
            style={{ border: 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
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
                      className={`px-4 py-2 rounded-full text-white font-semibold hover:opacity-90 transition-opacity ${
                        source.id === 'vidsrc' 
                          ? 'bg-gradient-to-r from-sky-600 to-teal-600 ring-2 ring-sky-400 ring-offset-2 ring-offset-black' 
                          : 'bg-gradient-to-r from-sky-600 to-teal-600'
                      }`}
                    >
                      {source.name}
                      {source.id === 'vidsrc' && (
                        <span className="ml-1 text-xs bg-sky-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disqus Comments */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Comments</h2>
        <DiscussionEmbed
          shortname="tinybros"
          config={{
            url: `https://tinybros.vercel.app/watch/${params.type}/${params.id}${params.type === 'tv' ? `?season=${searchParams.get('season') || '1'}&episode=${searchParams.get('episode') || '1'}` : ''}`,
            identifier: `${params.type}-${params.id}${params.type === 'tv' ? `-s${searchParams.get('season') || '1'}-e${searchParams.get('episode') || '1'}` : ''}`,
            title: show.title || show.name,
            language: 'en'
          }}
        />
      </div>

      {/* Source Selector (when player is active) */}
      {showPlayer && (
        <div className="bg-gray-900 p-4 flex justify-center">
          <div className="flex flex-wrap gap-3">
            {playbackSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id)}
                className={`px-4 py-2 rounded-full text-white font-semibold transition-all ${
                  selectedSource === source.id
                    ? source.id === 'vidsrc'
                      ? 'bg-gradient-to-r from-sky-600 to-teal-600 ring-2 ring-sky-400 ring-offset-2 ring-offset-black'
                      : 'bg-gradient-to-r from-sky-600 to-teal-600'
                    : source.id === 'vidsrc'
                      ? 'bg-gray-800 hover:bg-gray-700 ring-1 ring-sky-400/50'
                      : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {source.name}
                {source.id === 'vidsrc' && (
                  <span className="ml-1 text-xs bg-sky-400 text-black px-1.5 py-0.5 rounded-full">★</span>
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
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500">
              {show.title || show.name}
            </h1>
            <p className="text-gray-300">{show.overview}</p>
          </div>
        </div>

        {/* Episodes (for TV shows) */}
        {params.type === 'tv' && episodes.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500">
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
                      href={`/watch/${params.type}/${params.id}?season=${selectedSeason}&episode=${episode.episode_number}`}
                      className="inline-block w-full text-center px-4 py-2 bg-gradient-to-r from-sky-600 to-teal-600 rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                      Watch Episode
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
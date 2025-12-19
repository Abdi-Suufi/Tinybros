import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import type { Metadata } from 'next';
import { getImageUrl, TMDBShow, TMDBSeason, TMDBEpisode } from '@/lib/tmdb';

async function getShowDetails(id: string): Promise<TMDBShow> {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch show details');
  }

  return response.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const movie = await getShowDetails(resolvedParams.id);
    return {
      title: `${movie.title || movie.name || 'Movie'} | TinyBros`,
      description: movie.overview || 'Watch on TinyBros',
    };
  } catch {
    return {
      title: 'Movie | TinyBros',
      description: 'Watch on TinyBros',
    };
  }
}

export default function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const show = use(getShowDetails(resolvedParams.id));

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Backdrop Image */}
      <div className="relative h-[60vh]">
        <Image
          src={getImageUrl(show.backdrop_path, 'original')}
          alt={show.title || show.name || ''}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-32 container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="md:w-1/3 lg:w-1/4">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={getImageUrl(show.poster_path)}
                alt={show.title || show.name || ''}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{show.title || show.name}</h1>
            
            <div className="flex items-center gap-4 text-gray-400 mb-6">
              {show.release_date && (
                <>
                  <span>
                    {new Date(show.release_date).getFullYear()}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{show.vote_average.toFixed(1)} ★</span>
              {show.runtime && (
                <>
                  <span>•</span>
                  <span>{show.runtime} min</span>
                </>
              )}
            </div>

            <p className="text-lg text-gray-300 mb-8">{show.overview}</p>

            <div className="flex flex-wrap gap-2 mb-8">
              {show.genres?.map((genre: { id: number; name: string }) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <Link
              href={`/watch/movie/${resolvedParams.id}`}
              className="inline-block px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full text-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Watch Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}




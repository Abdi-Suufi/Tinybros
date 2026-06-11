'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, TMDBCast } from '@/lib/tmdb';

interface CastViewProps {
  cast: TMDBCast[];
}

export default function CastView({ cast }: CastViewProps) {
  if (!cast || cast.length === 0) {
    return null;
  }

  // Take the first 12 cast members
  const mainCast = cast.slice(0, 12);

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-500 mb-8">
        Main Cast
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mainCast.map((actor) => (
          <Link
            key={actor.id}
            href={`/search?person=${actor.id}&name=${encodeURIComponent(actor.name)}`}
            className="group block bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label={`View movies and series with ${actor.name}`}
          >
            {/* Actor Image */}
            <div className="relative w-full aspect-[2/3] bg-gray-700/50 flex items-center justify-center overflow-hidden">
              <Image
                src={getImageUrl(actor.profile_path || '', 'w500')}
                alt={actor.name}
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0" />
            </div>

            {/* Actor Info */}
            <div className="p-4">
              <h3 className="font-semibold text-sm truncate text-white">
                {actor.name}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {actor.character}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

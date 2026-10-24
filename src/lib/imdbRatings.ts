// Must match MAX_IDS in /api/imdb-rating
const BATCH_SIZE = 40;

// Highest IMDb rating first. Titles without a rating ("N/A") come next and titles
// whose rating hasn't loaded yet stay at the end; ties keep their original order.
export function sortByImdbRating<T extends { id: number }>(
  items: T[],
  ratings: Record<number, number | null>
): T[] {
  const rank = (item: T) => {
    if (!(item.id in ratings)) return -2;
    return ratings[item.id] ?? -1;
  };
  return [...items].sort((a, b) => rank(b) - rank(a));
}

// Fetch IMDb ratings for many titles, one request per batch of ids.
// Titles without a rating (or whose lookup failed) map to null.
export async function fetchImdbRatings(
  type: 'movie' | 'tv',
  ids: number[]
): Promise<Record<number, number | null>> {
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  const result: Record<number, number | null> = {};
  await Promise.all(
    batches.map(async (batch) => {
      let ratings: Record<string, { imdbRating?: unknown }> = {};
      try {
        const res = await fetch(`/api/imdb-rating?type=${type}&ids=${batch.join(',')}`);
        const json = await res.json();
        ratings = json?.ratings ?? {};
      } catch {
        // Leave this batch's ratings empty
      }
      for (const id of batch) {
        const rating = ratings[id]?.imdbRating;
        result[id] = typeof rating === 'number' ? rating : null;
      }
    })
  );
  return result;
}

// Must match MAX_IDS in /api/imdb-rating
const BATCH_SIZE = 40;

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

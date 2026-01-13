import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { watchlist, era, genreTmdbId } = await request.json();

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // Filter by decade (client-side filtering was already done, but we'll do it here for safety)
    const decadeMatches = watchlist.filter(m =>
      m.year >= era.min && m.year <= era.max
    );

    if (decadeMatches.length === 0) {
      return NextResponse.json(
        { error: `No movies in your watchlist from the ${era.label}.` },
        { status: 400 }
      );
    }

    // Limit to 20 to avoid rate limits
    const candidates = decadeMatches.slice(0, 20);
    const matchedMovies = [];

    for (const movie of candidates) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(movie.name)}&year=${movie.year}&include_adult=false`
        );
        const searchData = await res.json();
        const details = searchData.results?.[0];

        if (details && details.genre_ids.includes(genreTmdbId)) {
          matchedMovies.push({
            title: details.title,
            year: details.release_date?.split('-')[0] || movie.year,
            poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
            backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
            overview: details.overview,
            rating: details.vote_average,
            reason: "Found in your Watchlist"
          });
        }
      } catch (e) {
        console.error(`Error processing ${movie.name}:`, e);
      }
    }

    if (matchedMovies.length === 0) {
      return NextResponse.json(
        { error: `Found ${decadeMatches.length} movies from the ${era.label} in your watchlist, but none matched the genre.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ results: matchedMovies.slice(0, 8) });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup movies' },
      { status: 500 }
    );
  }
}
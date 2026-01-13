import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { genre, era, vibe, favorites, watched } = await request.json();

    if (!process.env.GEMINI_API_KEY || !process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    let userContext = "";
    if (favorites && favorites.length > 0) {
      userContext += `\nUSER'S FAVORITES (Use these to understand their taste, but DO NOT recommend them): ${favorites.join(", ")}.`;
    }
    if (watched && watched.length > 0) {
      userContext += `\nIMPORTANT: The user has seen ${watched.length} movies. I will filter the output, so please generate 8 recommendations so I have backups if some are watched.`;
    }

    const prompt = `You are a master film curator. 
The user wants movie recommendations based on:
Genre: ${genre.label}
Era: ${era.label} (${era.id})
Vibe/Context: "${vibe}"
${userContext}

Constraints:
1. Return strictly a JSON array of 8 objects (titles).
2. Each object must have: "title", "year" (string), and "reason" (a short, punchy sentence explaining why it fits the vibe/taste).
3. Focus on "hidden gems" or matches for the Favorites list if provided.
4. Do NOT number the list. Just raw JSON.
5. Output only valid JSON, no markdown code blocks, no explanations.`;

    // Call Gemini API
    // UPDATED: Switched to v1beta and gemini-2.5-flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            // strict JSON response mime type helps with reliability
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    let content = geminiData.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawRecommendations = JSON.parse(content);

    // Filter watched movies (convert watched array to Set for fast lookup)
    const watchedSet = new Set(watched?.map(m => m.toLowerCase()) || []);
    const filteredRecs = rawRecommendations.filter(movie => {
      const isWatched = watchedSet.has(movie.title.toLowerCase());
      return !isWatched;
    }).slice(0, 8);

    if (filteredRecs.length === 0) {
      return NextResponse.json(
        { error: "You've seen everything good! Try a different vibe." },
        { status: 400 }
      );
    }

    // Hydrate with TMDB data
    const hydratedResults = await Promise.all(filteredRecs.map(async (movie) => {
      try {
        const searchRes = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}&include_adult=false`
        );
        const searchData = await searchRes.json();
        const tmdbDetails = searchData.results?.[0];
        return {
          ...movie,
          poster: tmdbDetails?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}` : null,
          overview: tmdbDetails?.overview || "No overview available.",
          rating: tmdbDetails?.vote_average || "N/A",
          backdrop: tmdbDetails?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}` : null
        };
      } catch (e) {
        return movie;
      }
    }));

    return NextResponse.json({ results: hydratedResults });
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
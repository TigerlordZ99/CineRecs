# CineRecs

Find new movies to watch! If you have a letterboxd you can use that data, otherwise click to get started!

## Web Link
https://cinerecs.vercel.app

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your API keys:
```
GEMINI_API_KEY=your_gemini_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **AI-Powered Recommendations**: Get personalized movie recommendations based on genre, era, and your specific vibe
- **Letterboxd Integration**: Sync your Letterboxd export to personalize recommendations and filter your watchlist
- **Watchlist Filtering**: Filter your Letterboxd watchlist by genre and decade
- **Beautiful UI**: Modern, responsive interface with smooth animations

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Framer Motion
- Lucide React (icons)
- JSZip (for Letterboxd export parsing)

## API Keys

- **Gemini API Key**: Get it from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **TMDB API Key**: Get it from [The Movie Database](https://www.themoviedb.org/settings/api)

## Letterboxd Export

To use the Letterboxd sync feature, export your data from [Letterboxd Data Export](https://letterboxd.com/data/export/) and upload the ZIP file.

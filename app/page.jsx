'use client';

import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { Icon, Card, Button, SettingsModal } from './components';

// Config
const GENRES = [
  { id: 'sci-fi', label: 'Sci-Fi', icon: 'zap', color: 'from-blue-500 to-cyan-500', tmdbId: 878 },
  { id: 'action', label: 'Action', icon: 'swords', color: 'from-orange-500 to-red-500', tmdbId: 28 },
  { id: 'horror', label: 'Horror', icon: 'ghost', color: 'from-purple-900 to-black', tmdbId: 27 },
  { id: 'romance', label: 'Romance', icon: 'heart', color: 'from-pink-500 to-rose-500', tmdbId: 10749 },
  { id: 'drama', label: 'Drama', icon: 'film', color: 'from-yellow-600 to-amber-700', tmdbId: 18 },
  { id: 'comedy', label: 'Comedy', icon: 'smile', color: 'from-yellow-400 to-orange-400', tmdbId: 35 },
];

const ERAS = [
  { id: '1960s', label: '60s', min: 1960, max: 1969 },
  { id: '1970s', label: '70s', min: 1970, max: 1979 },
  { id: '1980s', label: '80s', min: 1980, max: 1989 },
  { id: '1990s', label: '90s', min: 1990, max: 1999 },
  { id: '2000s', label: '00s', min: 2000, max: 2009 },
  { id: '2010s', label: '10s', min: 2010, max: 2019 },
  { id: '2020s', label: '20s', min: 2020, max: 2029 },
];

const VIBE_CHIPS_BY_GENRE = {
  'sci-fi': [
    "Cyberpunk",
    "Space Adventure",
    "Dystopian Future",
    "Time Travel",
    "Alien Invasion",
    "Post-Apocalyptic"
  ],
  'action': [
    "Heist",
    "Martial Arts",
    "Spy Thriller",
    "Revenge",
    "Buddy Cop",
    "Disaster"
  ],
  'horror': [
    "Psychological Thriller",
    "Slasher",
    "Found Footage",
    "Haunted House",
    "Body Horror",
    "Supernatural"
  ],
  'romance': [
    "Enemies to Lovers",
    "Period Drama",
    "Rom-Com",
    "Tragic Love Story",
    "Fantasy Romance",
    "Slow Burn"
  ],
  'drama': [
    "Courtroom Drama",
    "Coming-of-Age",
    "True Story",
    "Family Drama",
    "War Drama",
    "Psychological Drama"
  ],
  'comedy': [
    "Mockumentary",
    "Dark Comedy",
    "Teen Comedy",
    "Slapstick",
    "Action-Comedy",
    "Absurd Comedy"
  ]
};

export default function App() {
  const [stage, setStage] = useState('landing');
  const [data, setData] = useState({ genre: null, era: null, vibe: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Letterboxd Data
  const [lbData, setLbData] = useState({
    favorites: [],
    watched: new Set(),
    watchlist: [],
    watchlistSet: new Set(),
    likes: new Set(),
    loaded: false
  });

  // File Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const processText = (text, isRatings, isWatchlist = false) => {
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.indexOf('name');
      const ratingIdx = headers.indexOf('rating');
      const yearIdx = headers.indexOf('year');

      const localNames = new Set();
      const localFaves = [];
      const localWatchlistObjs = [];

      if (nameIdx === -1) return { names: localNames, favorites: localFaves, watchlistObjs: localWatchlistObjs };

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length < 2) continue;
        const name = row[nameIdx]?.replace(/^"|"$/g, '').trim();
        if (!name) continue;

        localNames.add(name.toLowerCase());

        if (isRatings && ratingIdx !== -1) {
          const rating = parseFloat(row[ratingIdx]);
          if (rating >= 4) localFaves.push(name);
        }

        if (isWatchlist && yearIdx !== -1) {
          const year = row[yearIdx]?.replace(/^"|"$/g, '').trim();
          if (year) {
            localWatchlistObjs.push({ name, year: parseInt(year) });
          }
        }
      }
      return { names: localNames, favorites: localFaves, watchlistObjs: localWatchlistObjs };
    };

    const combinedWatched = new Set();
    const combinedWatchlist = [];
    const combinedWatchlistSet = new Set();
    const combinedLikes = new Set();
    const combinedFavorites = [];

    try {
      setLoadingStep("Reading files...");

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipped = await zip.loadAsync(file);

        const watchedFile = zipped.file(/watched\.csv/i)[0];
        if (watchedFile) {
          const text = await watchedFile.async("string");
          const { names } = processText(text, false);
          names.forEach(m => combinedWatched.add(m));
        }

        const ratingsFile = zipped.file(/ratings\.csv/i)[0];
        if (ratingsFile) {
          const text = await ratingsFile.async("string");
          const { names, favorites } = processText(text, true);
          names.forEach(m => combinedWatched.add(m));
          combinedFavorites.push(...favorites);
        }

        const watchlistFile = zipped.file(/watchlist\.csv/i)[0];
        if (watchlistFile) {
          const text = await watchlistFile.async("string");
          const { names, watchlistObjs } = processText(text, false, true);
          names.forEach(m => combinedWatchlistSet.add(m));
          combinedWatchlist.push(...watchlistObjs);
        }

        const likesFile = zipped.file(/likes\.csv/i)[0];
        if (likesFile) {
          const text = await likesFile.async("string");
          const { names } = processText(text, false);
          names.forEach(m => combinedLikes.add(m));
        }

      } else {
        // fallback csv
        const text = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
        const isRatings = text.toLowerCase().includes('rating');
        const { names, favorites } = processText(text, isRatings);
        names.forEach(m => combinedWatched.add(m));
        combinedFavorites.push(...favorites);
      }

      if (combinedWatched.size > 0 || combinedWatchlistSet.size > 0) {
        setLbData({
          favorites: combinedFavorites.slice(0, 50),
          watched: combinedWatched,
          watchlist: combinedWatchlist,
          watchlistSet: combinedWatchlistSet,
          likes: combinedLikes,
          loaded: true
        });
      } else {
        alert("No valid movie data found. Please check your zip file.");
      }

    } catch (err) {
      alert("Error parsing file: " + err.message);
    }
  };

  const resetApp = () => {
    setData({ genre: null, era: null, vibe: '' });
    setResults([]);
    setStage('genre');
  };

  const filterWatchlist = async () => {
    setLoading(true);
    setLoadingStep("Filtering your watchlist...");

    try {
      // Filter by decade client-side
      const decadeMatches = lbData.watchlist.filter(m =>
        m.year >= data.era.min && m.year <= data.era.max
      );

      if (decadeMatches.length === 0) {
        throw new Error(`No movies in your watchlist from the ${data.era.label}.`);
      }

      setLoadingStep(`Checking genres for ${Math.min(decadeMatches.length, 20)} candidates...`);

      // Call backend API
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist: decadeMatches,
          era: data.era,
          genreTmdbId: data.genre.tmdbId
        })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to filter watchlist');
      }

      setResults(json.results);
      setStage('results');

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      setLoadingStep('Finding Recommendations...');

      // Convert Set to Array for API
      const watchedArray = Array.from(lbData.watched);

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: data.genre,
          era: data.era,
          vibe: data.vibe,
          favorites: lbData.loaded ? lbData.favorites : [],
          watched: lbData.loaded ? watchedArray : []
        })
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to generate recommendations');
      }

      setResults(json.results);
      setStage('results');

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderers
  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4 fade-in">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"></div>
        <Icon name="film" size={64} className="text-white relative z-10 animate-[spin_20s_linear_infinite]" />
      </div>
      <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-600 via-purple-500 to-purple-400 tracking-tighter mb-6">CineRecs</h1>
      <p className="text-zinc-400 text-lg md:text-xl max-w-md mb-10">Find new movies to watch! If you have a Letterboxd you can use that data, otherwise click to get started!</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button onClick={() => setStage('genre')} className="justify-center">Start <Icon name="chevronRight" size={18} /></Button>
        <Button variant="outline" onClick={() => setStage('sync')} className="justify-center border-purple-700/50 text-purple-400 hover:bg-purple-700/20">
          {lbData.loaded ? "Letterboxd Synced" : "Connect Letterboxd"} <Icon name={lbData.loaded ? "check" : "upload"} size={16} />
        </Button>
      </div>
    </div>
  );

  const renderSync = () => (
    <div className="max-w-xl mx-auto w-full min-h-screen flex flex-col justify-center px-4 fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
        <div className="w-16 h-16 bg-purple-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-500">
          <Icon name="upload" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 mb-2">Sync Letterboxd</h2>
        <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
          Upload your <code className="bg-zinc-800 px-1 py-0.5 rounded">letterboxd-export.zip</code> (get it <a href="https://letterboxd.com/data/export/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 underline">here</a>).<br />
          We'll analyze your history to personalize recommendations.
        </p>

        {!lbData.loaded ? (
          <div className="border-2 border-dashed border-zinc-700 hover:border-purple-700 rounded-xl p-10 transition-colors cursor-pointer relative bg-zinc-950/50 group">
            <input type="file" accept=".zip,.csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <div className="pointer-events-none">
              <p className="text-white font-medium group-hover:text-purple-500 transition-colors">Click to Upload ZIP</p>
              <p className="text-zinc-600 text-xs mt-2">Data stays in your browser.</p>
            </div>
          </div>
        ) : (
          <div className="w-full mb-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4 flex items-center justify-center gap-2 text-green-400 font-bold">
              <Icon name="check" /> Synced Successfully
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800/50 border border-purple-700/30 p-4 rounded-xl flex flex-col items-center hover:border-purple-600/60 transition-colors">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-500 to-purple-400 tracking-tight">{lbData.watched.size}</span>
                <span className="text-[10px] text-purple-500/80 uppercase tracking-widest font-semibold mt-1">Watched</span>
              </div>
              <div className="bg-zinc-800/50 border border-purple-700/30 p-4 rounded-xl flex flex-col items-center hover:border-purple-600/60 transition-colors">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-500 to-purple-400 tracking-tight">{lbData.watchlist.length}</span>
                <span className="text-[10px] text-purple-500/80 uppercase tracking-widest font-semibold mt-1">Watchlist</span>
              </div>
              <div className="bg-zinc-800/50 border border-purple-700/30 p-4 rounded-xl flex flex-col items-center hover:border-purple-600/60 transition-colors">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-purple-500 to-purple-400 tracking-tight">{lbData.likes.size > 0 ? lbData.likes.size : lbData.favorites.length}</span>
                <span className="text-[10px] text-purple-500/80 uppercase tracking-widest font-semibold mt-1">{lbData.likes.size > 0 ? 'Liked' : 'Rated 4+'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStage('landing')}>Back</Button>
          <Button onClick={() => setStage('genre')} disabled={!lbData.loaded && false}>
            {lbData.loaded ? "Continue" : "Skip"} <Icon name="chevronRight" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGenre = () => (
    <div className="max-w-5xl mx-auto w-full min-h-screen flex flex-col justify-center px-4 py-10 fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 mb-2">Pick a Genre</h2>
        </div>
        {lbData.loaded && <span className="text-xs text-purple-500 bg-purple-700/20 px-3 py-1 rounded-full border border-purple-600/40">Using Letterboxd Data</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {GENRES.map((genre, i) => (
          <Card key={genre.id} delay={i * 0.1} onClick={() => { setData({ ...data, genre }); setStage('era'); }} className="h-40 flex flex-col justify-between p-6 group hover:bg-zinc-800">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${genre.color}`}></div>
            <div className="relative z-10 flex justify-between items-start">
              <Icon name={genre.icon} className="text-white/80 group-hover:text-white group-hover:scale-110 transition-all duration-300" size={32} />
              <Icon name="chevronRight" className="text-zinc-600 group-hover:text-white -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white">{genre.label}</h3>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex justify-center"><Button variant="ghost" onClick={() => setStage('landing')}>Back</Button></div>
    </div>
  );

  const renderEra = () => (
    <div className="max-w-4xl mx-auto w-full min-h-screen flex flex-col justify-center px-4 fade-in py-10">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 mb-2">Select a Decade</h2>
      </div>

      <div className="flex flex-col items-center gap-3 overflow-y-auto max-h-[60vh] w-full px-2 no-scrollbar pb-20">
        {ERAS.map((era, i) => (
          <div key={era.id} className="w-full max-w-md shrink-0 slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <button
              onClick={() => { setData({ ...data, era }); setStage('mode'); }}
              className="w-full h-24 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl flex items-center justify-between px-8 relative overflow-hidden hover:border-purple-700/60 hover:bg-zinc-800 transition-all duration-300 group shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-6 relative z-10">
                <span className="text-5xl font-black text-zinc-800 group-hover:text-purple-500/50 transition-colors">{era.label}</span>
                <div className="h-12 w-0.5 bg-zinc-800 group-hover:bg-purple-600/60 transition-colors"></div>
                <span className="text-zinc-500 font-medium group-hover:text-purple-400 transition-colors">The {era.id}</span>
              </div>
              <Icon name="chevronRight" className="text-zinc-700 group-hover:text-purple-500 transition-colors transform group-hover:translate-x-1 relative z-10" />
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Button variant="ghost" onClick={() => setStage('genre')} className="bg-black/50 backdrop-blur-md border border-zinc-800">Back</Button>
        </div>
      </div>
    </div>
  );

  const renderMode = () => (
    <div className="max-w-3xl mx-auto w-full min-h-screen flex flex-col justify-center px-4 fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 mb-2">How do you want to find your next movie?</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: AI Chatbot */}
        <div
          onClick={() => setStage('vibe')}
          className="bg-zinc-900/50 border border-zinc-800 hover:border-purple-700 hover:bg-zinc-900 rounded-2xl p-8 cursor-pointer transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-purple-700/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-16 h-16 bg-purple-700/20 rounded-full flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
            <Icon name="brain" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Ask the AI</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Include a short description of what kind of movie you're looking for and the AI will find you some recommendations.
          </p>
        </div>

        {/* Option 2: Watchlist Filter */}
        <div
          onClick={lbData.loaded ? filterWatchlist : null}
          className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 transition-all relative overflow-hidden ${lbData.loaded ? 'cursor-pointer hover:border-green-500 hover:bg-zinc-900 group' : 'opacity-50 cursor-not-allowed'}`}
        >
          {lbData.loaded && <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
            <Icon name="list" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Filter Watchlist</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            Browse movies from your own Watchlist that match the <strong>{data.genre?.label}</strong> genre and <strong>{data.era?.label}</strong>.
          </p>
          {!lbData.loaded && (
            <div className="inline-block bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full">
              Requires Letterboxd Sync
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <Button variant="ghost" onClick={() => setStage('era')}>Back</Button>
      </div>
    </div>
  );

  const renderVibe = () => (
    <div className="max-w-2xl mx-auto w-full min-h-screen flex flex-col justify-center px-4 fade-in">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-purple-700/40 rounded-3xl p-8 shadow-2xl shadow-purple-700/20">
        <div className="flex items-center gap-3 mb-6 text-sm text-zinc-400 uppercase tracking-widest font-bold">
          <Icon name="sparkles" size={14} className="text-purple-600" /><span>The Assistant</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Tell me more.</h2>
        <textarea value={data.vibe} onChange={(e) => setData({ ...data, vibe: e.target.value })} placeholder="Give me more details on what you're looking for." className="w-full bg-black/50 border border-zinc-700 rounded-xl p-4 text-white text-lg focus:border-purple-700 focus:outline-none transition-all h-32 mb-6" autoFocus />
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.genre && VIBE_CHIPS_BY_GENRE[data.genre.id]?.map(chip => (
              <button key={chip} onClick={() => setData({ ...data, vibe: chip })} className="px-3 py-1.5 bg-zinc-800 hover:bg-purple-700/30 text-zinc-300 hover:text-purple-400 text-xs rounded-full border border-zinc-700 hover:border-purple-600/60 transition-all">{chip}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStage('mode')}>Back</Button>
          <Button onClick={generateRecommendations} disabled={!data.vibe.trim()} className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]">Generate <Icon name="sparkles" size={16} /></Button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    const bgImage = results[0]?.backdrop || results[0]?.poster;
    return (
      <div className="w-full min-h-screen relative py-20 px-4 fade-in">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-zinc-950/90 z-10"></div>
          {bgImage && <img src={bgImage} className="w-full h-full object-cover blur-xl opacity-20" alt="Background" />}
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-10 border-b border-purple-700/30 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500">Curated Selection</h2>
              <p className="text-purple-400/80 mt-1">{data.genre?.label} • {data.era?.label} {lbData.loaded && "• Personalized"}</p>
            </div>
            <Button variant="outline" onClick={resetApp} className="border-purple-700/60 text-purple-400 hover:bg-purple-700/20"><Icon name="rotateCcw" size={16} /> Start Over</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {results.map((movie, idx) => (
              <div key={idx} className="group relative h-[450px] perspective-1000 slide-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                <div className="relative w-full h-full transition-all duration-500 preserve-3d group-hover:rotate-y-180">
                  {/* Front */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-zinc-900 rounded-xl overflow-hidden border border-white/5">
                    {movie.poster ? <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} /> : <div className="w-full h-full flex items-center justify-center"><Icon name="film" size={48} className="opacity-50" /></div>}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-20">
                      <h3 className="text-white font-bold text-lg">{movie.title}</h3>
                      <span className="text-zinc-400 text-xs bg-zinc-800 px-2 py-0.5 rounded mt-1 inline-block">{movie.year}</span>
                    </div>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-zinc-900 rounded-xl p-6 border border-purple-700/40 flex flex-col justify-center shadow-[0_0_30px_rgba(147,51,234,0.25)]">
                    <div className="mb-4"><div className="w-10 h-10 rounded-full bg-purple-700/30 flex items-center justify-center mb-3"><Icon name="sparkles" size={20} className="text-purple-500" /></div><h4 className="text-sm text-purple-400 font-bold uppercase">Why it fits</h4></div>
                    <p className="text-white text-lg font-medium italic">"{movie.reason}"</p>
                    <div className="mt-6 pt-6 border-t border-white/10"><p className="text-zinc-400 text-xs line-clamp-4">{movie.overview}</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-screen fade-in"><div className="w-16 h-16 border-4 border-zinc-800 border-t-purple-700 rounded-full animate-spin mb-6"></div><h3 className="text-xl font-bold text-white animate-pulse">{loadingStep}</h3></div>;

  return (
    <>
      {stage === 'landing' && renderLanding()}
      {stage === 'sync' && renderSync()}
      {stage === 'genre' && renderGenre()}
      {stage === 'era' && renderEra()}
      {stage === 'mode' && renderMode()}
      {stage === 'vibe' && renderVibe()}
      {stage === 'results' && renderResults()}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
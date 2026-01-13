'use client';

import {
  Film,
  Zap,
  Sword,
  Ghost,
  Smile,
  Heart,
  Music,
  ChevronRight,
  Settings,
  Sparkles,
  RotateCcw,
  Star,
  X,
  Upload,
  Check,
  List,
  Brain,
} from 'lucide-react';

// Icon mapping component
export const Icon = ({ name, size = 24, className = "" }) => {
  const icons = {
    film: Film,
    zap: Zap,
    swords: Sword, // Using Sword icon for swords
    ghost: Ghost,
    smile: Smile,
    heart: Heart,
    music: Music,
    chevronRight: ChevronRight,
    settings: Settings,
    sparkles: Sparkles,
    rotateCcw: RotateCcw,
    star: Star,
    x: X,
    upload: Upload,
    check: Check,
    list: List,
    brain: Brain,
  };

  const IconComponent = icons[name] || Film;
  return <IconComponent size={size} className={className} strokeWidth={2} />;
};

export const Card = ({ children, className = "", onClick, delay = 0 }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md shadow-xl hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 transform hover:scale-[1.02] group slide-up ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const base = "px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const styles = {
    primary: "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
    outline: "border border-white/20 text-white hover:bg-white/10",
    ghost: "text-zinc-400 hover:text-white",
    brand: "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">API Configuration</h2>
          <button onClick={onClose}><Icon name="x" className="text-zinc-400 hover:text-white" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-2">
              API keys are now configured server-side via environment variables.
            </p>
            <p className="text-xs text-zinc-500">
              Create a <code className="bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> file with <code className="bg-zinc-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> and <code className="bg-zinc-800 px-1 py-0.5 rounded">TMDB_API_KEY</code>.
            </p>
          </div>
          <Button onClick={onClose} className="w-full justify-center mt-4">Close</Button>
        </div>
      </div>
    </div>
  );
};
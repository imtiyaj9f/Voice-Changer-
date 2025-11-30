import React, { useState, useCallback, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { ConnectionState, Game } from './types';
import Visualizer from './components/Visualizer';
import GameLauncher from './components/GameLauncher';
import { Settings, Info, AlertTriangle, Sliders, Power, Mic } from 'lucide-react';

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [volumes, setVolumes] = useState({ input: 0, output: 0 });
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Pitch State (in cents, 100 cents = 1 semitone)
  const [pitch, setPitchState] = useState(200);

  // Volume handler
  const handleVolumeChange = useCallback((input: number, output: number) => {
    setVolumes(prev => ({
      input: input > 0 ? input : prev.input * 0.95, 
      output: output > 0 ? output : prev.output * 0.95
    }));
  }, []);

  const { connect, disconnect, setPitch, connectionState } = useGeminiLive({
    onVolumeChange: handleVolumeChange,
    onError: (err) => {
      if (err.includes("401") || err.includes("403")) {
        setError("Invalid API Key or Permissions. Check Google AI Studio key.");
      } else {
        setError(err);
      }
    },
  });

  useEffect(() => {
    if (process.env.API_KEY) {
      setHasApiKey(true);
    }
  }, []);

  useEffect(() => {
    setPitch(pitch);
  }, [pitch, setPitch]);

  const handleToggle = () => {
    setError(null);
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPitchState(val);
    setPitch(val);
  };

  const handleLaunchGame = (game: Game) => {
    // Android Intent URL to launch app
    const intentUrl = `intent://#Intent;scheme=android-app;package=${game.packageId};end`;
    
    // Fallback for demo/desktop purposes if intent fails (will just do nothing or open new tab)
    console.log(`Launching ${game.name} via ${intentUrl}`);
    
    // Try to open
    window.location.href = intentUrl;
    
    // If not mobile, maybe show an alert
    setTimeout(() => {
        // Visual feedback only
    }, 500);
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 font-sans text-slate-200">
      
      {/* App Header */}
      <div className="max-w-md w-full mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-gaming text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">
            ANJALI VOICE
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">AI Voice Engine v2.0</p>
        </div>
        <div className="bg-slate-800 p-2 rounded-full border border-slate-700">
          <Settings size={18} className="text-slate-400" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md space-y-6">
        
        {/* 1. Voice Changer Control Card */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 shadow-xl relative overflow-hidden">
          {/* Status Light */}
          <div className={`absolute top-0 right-0 w-24 h-24 bg-pink-500 rounded-full blur-[60px] opacity-10 transition-opacity duration-500 ${isConnected ? 'opacity-30' : ''}`}></div>

          <div className="flex justify-between items-center mb-6 relative z-10">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isConnected ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  <Mic size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">Voice Changer</h3>
                  <p className="text-xs text-slate-400">{isConnected ? 'Active & Listening' : 'Engine Offline'}</p>
                </div>
             </div>

             {/* THE TOGGLE SWITCH */}
             <button 
               onClick={handleToggle}
               disabled={!hasApiKey || isConnecting}
               className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 flex items-center relative ${isConnected ? 'bg-green-500' : 'bg-slate-600'}`}
             >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isConnected ? 'translate-x-8' : 'translate-x-0'}`}>
                   {isConnecting && <div className="w-full h-full rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
                </div>
             </button>
          </div>

          {/* Visualizer */}
          <div className="mb-4 relative z-10">
            <Visualizer 
              inputVolume={volumes.input} 
              outputVolume={volumes.output} 
              isActive={isConnected} 
            />
          </div>

          {/* Error & Info Messages */}
          {error && (
            <div className="mt-2 bg-red-900/30 border border-red-500/30 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          {!hasApiKey && (
             <div className="mt-2 bg-yellow-900/30 border border-yellow-500/30 text-yellow-200 text-xs p-3 rounded-lg flex items-center gap-2">
             <AlertTriangle size={14} /> Missing API_KEY in process.env
           </div>
          )}
        </div>

        {/* 2. Pitch Control */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sliders size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Tone / Pitch</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{pitch} cts</span>
          </div>
          <input
            type="range"
            min="-200"
            max="400"
            step="50"
            value={pitch}
            onChange={handlePitchChange}
            className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* 3. Game Launcher */}
        <GameLauncher onLaunch={handleLaunchGame} />

      </div>

      {/* Footer Instructions */}
      <div className="mt-8 text-center max-w-xs mx-auto">
        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <Info size={12} />
          <span>Launch game to enable overlay (Android Only)</span>
        </p>
      </div>

    </div>
  );
};

export default App;
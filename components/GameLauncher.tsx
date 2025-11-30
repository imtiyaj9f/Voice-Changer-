import React, { useState } from 'react';
import { Game } from '../types';
import { Plus, Play, Gamepad2, X } from 'lucide-react';

// Preset "Installed" Apps simulation
const INSTALLED_APPS: Game[] = [
  { id: 'ff', name: 'Free Fire', icon: '🔥', packageId: 'com.dts.freefireth', color: 'from-orange-500 to-red-600' },
  { id: 'bgmi', name: 'BGMI', icon: '🔫', packageId: 'com.pubg.imobile', color: 'from-yellow-600 to-yellow-800' },
  { id: 'cod', name: 'COD Mobile', icon: '💀', packageId: 'com.activision.callofduty.shooter', color: 'from-slate-500 to-slate-700' },
  { id: 'minecraft', name: 'Minecraft', icon: '🧱', packageId: 'com.mojang.minecraftpe', color: 'from-green-600 to-green-800' },
  { id: 'roblox', name: 'Roblox', icon: '🤖', packageId: 'com.roblox.client', color: 'from-blue-500 to-red-500' },
];

interface GameLauncherProps {
  onLaunch: (game: Game) => void;
}

const GameLauncher: React.FC<GameLauncherProps> = ({ onLaunch }) => {
  // Start with Free Fire added by default
  const [myGames, setMyGames] = useState<Game[]>([INSTALLED_APPS[0]]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const handleAddGame = (game: Game) => {
    if (!myGames.find(g => g.id === game.id)) {
      setMyGames([...myGames, game]);
    }
    setIsAdding(false);
  };

  const handleGameClick = (gameId: string) => {
    if (selectedGameId === gameId) {
      // If already selected, launch it
      const game = myGames.find(g => g.id === gameId);
      if (game) onLaunch(game);
    } else {
      setSelectedGameId(gameId);
    }
  };

  const getGameById = (id: string) => myGames.find(g => g.id === id);

  return (
    <div className="w-full bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <Gamepad2 className="text-pink-500" size={20} />
          <h2 className="font-bold font-gaming tracking-wide">GAME LAUNCHER</h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Add Game
        </button>
      </div>

      {/* Game Grid */}
      <div className="p-4 grid grid-cols-4 gap-3">
        {myGames.map(game => (
          <div key={game.id} className="flex flex-col items-center gap-2">
            <button
              onClick={() => handleGameClick(game.id)}
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg transition-all duration-200 border-2
                bg-gradient-to-br ${game.color}
                ${selectedGameId === game.id 
                  ? 'scale-110 border-white ring-2 ring-pink-500/50' 
                  : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                }
              `}
            >
              {game.icon}
            </button>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-full">
              {game.name}
            </span>
          </div>
        ))}
        
        {/* Placeholder if empty */}
        {myGames.length === 0 && (
          <div className="col-span-4 text-center py-4 text-slate-500 text-xs">
            No games added yet. Tap "Add Game".
          </div>
        )}
      </div>

      {/* Launch Action Bar */}
      <div className={`
        bg-slate-900/80 p-4 border-t border-slate-700 transition-all duration-300
        ${selectedGameId ? 'h-auto opacity-100' : 'h-0 opacity-0 py-0 border-0 overflow-hidden'}
      `}>
        {selectedGameId && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">Selected Game</span>
              <span className="font-bold text-white">{getGameById(selectedGameId)?.name}</span>
            </div>
            <button
              onClick={() => {
                const g = getGameById(selectedGameId);
                if (g) onLaunch(g);
              }}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition-transform"
            >
              <Play size={16} fill="currentColor" /> START GAME
            </button>
          </div>
        )}
      </div>

      {/* Add Game Modal Overlay */}
      {isAdding && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white">Select App</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {INSTALLED_APPS.map(app => {
              const isAdded = myGames.some(g => g.id === app.id);
              return (
                <button
                  key={app.id}
                  onClick={() => handleAddGame(app)}
                  disabled={isAdded}
                  className="w-full bg-slate-800 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br ${app.color}`}>
                    {app.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{app.name}</div>
                    <div className="text-xs text-slate-400">{app.packageId}</div>
                  </div>
                  {isAdded ? <span className="text-xs text-green-400">Added</span> : <Plus size={16} className="text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLauncher;
"use client";
import { useEffect, useState } from "react";

import { Ninja, Level } from "@/lib/game-data";
import { GameEngine } from "./GameEngine";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Volume2, VolumeX, Star, Maximize2 } from "lucide-react";

interface BattleViewProps {
  ninja: Ninja;
  level: Level;
  playerName: string;
  initialScore: number;
  retryCount?: number;
  isMuted: boolean;
  isFreshStart: boolean;
  onToggleMute: () => void;
  onNext: (pointsGained: number) => void;
  onGameOver?: (score: number) => void;
  onAbort?: () => void;
}

export function BattleView({
  ninja,
  level,
  playerName,
  initialScore,
  retryCount = 0,
  isMuted,
  isFreshStart,
  onToggleMute,
  onNext,
  onGameOver,
  onAbort
}: BattleViewProps) {
  const [liveScore, setLiveScore] = useState(initialScore);
  const [showVictory, setShowVictory] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOri = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOri();
    window.addEventListener('resize', checkOri);
    return () => window.removeEventListener('resize', checkOri);
  }, []);

  // [v2.14] Orientation & Scroll Lock (Handled centrally in page.tsx)
  useEffect(() => {
    // Vi litar på page.tsx för att hantera låsning/upplåsning
    // men vi behåller prevent-scroll lokalt som en sista utväg
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-black text-white overflow-hidden animate-in fade-in duration-500">
      {/* [v3.54] SOLID HUD - Slimmed in Landscape */}
      <div className={`relative w-full z-[500] bg-black border-b border-white/20 pt-[env(safe-area-inset-top)] shrink-0 ${isLandscape ? 'h-10' : ''}`}>
        <div className={`w-full flex justify-between items-center px-2 gap-1 ${isLandscape ? 'h-full py-0' : 'py-1.5 md:p-4'}`}>
          
          {/* Vänster: Nivå */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            <span className="text-[10px] md:text-sm text-white/40 font-black uppercase tracking-widest mt-0.5">
              {isLandscape ? "v3.55 | STABLE LS" : "v3.55 | FIXED UI"}
            </span>
          </div>

          {/* Mitten: Poäng & Ljud */}
          <div className="flex items-center justify-center gap-2 md:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-3 truncate">
              <span className="text-[8px] md:text-sm text-accent font-black uppercase tracking-widest mt-0.5 hidden sm:inline">Poäng</span>
              <span className="text-xs md:text-3xl font-black text-white italic leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] truncate">
                {(liveScore || 0).toLocaleString()}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onToggleMute === 'function') onToggleMute();
              }}
              className={`${isLandscape ? 'h-7 w-7' : 'h-6 w-6 md:h-12 md:w-12'} rounded md:rounded-xl border p-0 shrink-0 ${isMuted ? "bg-red-500/20 border-red-500/50" : "bg-white/10 border-white/20"}`}
            >
              {isMuted ? <VolumeX className={`${isLandscape ? 'w-3.5 h-3.5' : 'w-3 h-3 md:w-6 md:h-6'} text-red-500`} /> : <Volume2 className={`${isLandscape ? 'w-3.5 h-3.5' : 'w-3 h-3 md:w-6 md:h-6'} text-green-500`} />}
            </Button>
          </div>

          {/* Höger: Avsluta (tydligt röd & alltid synlig) */}
          <Button
            variant="destructive"
            onClick={onAbort}
            className={`bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-2 md:px-6 rounded border-b-2 md:border-b-4 border-red-900 active:border-0 active:translate-y-1 transition-all flex items-center justify-center gap-1 shadow-md shrink-0 ${isLandscape ? 'h-7 text-[7px] min-w-[50px]' : 'h-6 md:h-12 text-[8px] md:text-base min-w-[60px]'}`}
          >
            <LogOut className={`${isLandscape ? 'w-2.5 h-2.5' : 'w-3 h-3 md:w-5 md:h-5'}`} />
            <span className="hidden sm:inline">AVSLUTA</span>
          </Button>
        </div>

        {/* Progress Bar under the header */}
        <div className="w-full h-1 md:h-2 bg-white/10 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ff2e63] to-[#ff4d6d] shadow-[0_0_10px_#ff2e63]"
            style={{ width: `${((level?.number || 1) / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Game Engine - [v3.54] Zoom-out container, expanded in Landscape */}
      <div className={`flex-1 relative w-full overflow-hidden flex items-start md:items-center justify-center bg-black ${isLandscape ? '' : 'portrait:max-h-[50dvh]'}`}>
        <GameEngine
          key={`${level.number}-${ninja.id}-${retryCount}`}
          ninja={ninja}
          level={level}
          playerName={playerName}
          initialScore={isFreshStart ? 0 : initialScore}
          isMuted={isMuted}
          isFreshStart={isFreshStart}
          isLandscape={isLandscape}
          onLevelComplete={(points) => {
            if (level.number === 7) {
              setShowVictory(true);
              // Wait 5 seconds before going to game over screen
              setTimeout(() => onNext(points), 5000);
            } else {
              onNext(points);
            }
          }}
          onGameOver={(finalScore) => onGameOver?.(finalScore)}
          onScoreUpdate={(s) => setLiveScore(s)}
        />
        
        {/* [v3.54] Landscape Overlay Controls target */}
        {isLandscape && (
            <div id="landscape-controls-root" className="absolute inset-0 z-[5000] pointer-events-none" />
        )}
      </div>

      {showVictory && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-1000 p-6">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="flex justify-center gap-4">
              <Star className="w-12 h-12 text-yellow-400 animate-bounce" />
              <Star className="w-16 h-16 text-yellow-400 animate-bounce delay-100" />
              <Star className="w-12 h-12 text-yellow-400 animate-bounce delay-200" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(255,215,0,0.5)]">
              <span className="text-white block">GRATTIS!</span>
              <span className="text-yellow-400 block text-4xl md:text-5xl mt-2">DU ÄR EN SANN</span>
              <span className="text-yellow-500 block">NINJA-MÄSTARE!</span>
            </h1>

            <div className="h-1 w-24 bg-yellow-400 mx-auto rounded-full mt-8 animate-pulse" />

            <p className="text-white/60 font-medium uppercase tracking-[0.3em] text-xs">
              Laddar slutskärmen...
            </p>
          </div>
        </div>
      )}

      {/* [v3.54] Bottom Panel - Hidden in Landscape to maximize game area */}
      {!isLandscape && (
          <div className="flex w-full bg-[#0a0a0a] border-t border-white/10 p-2 md:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] px-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] items-center gap-4 h-[40dvh] md:h-auto md:min-h-20 z-[1000] relative shrink-0">
            {/* Status Info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-[#2a9d8f]/20 p-2 md:p-3 rounded-xl md:rounded-2xl border border-[#2a9d8f]/30 shrink-0">
                <Heart className="w-5 h-5 md:w-7 md:h-7 text-[#2a9d8f] fill-[#2a9d8f]/30" />
              </div>
              <div className="flex flex-col flex-1 min-w-[120px]">
                <span className="text-[9px] md:text-[10px] text-[#2a9d8f] font-black uppercase tracking-[0.2em]">Status</span>
                <span className="text-[11px] md:text-sm font-bold text-white/90 italic leading-tight tracking-wide line-clamp-2">
                  Besegra {level.boss.name || 'bossen'} för att nå nästa nivå!
                </span>
              </div>
            </div>

            {/* [v3.54] Mobile Controls Panel target for Portrait mode */}
            <div id="mobile-controls-root" className="flex-1 h-full" />

            {/* Desktop Controls Legend */}
            <div className="hidden lg:flex flex-col items-end border-l border-white/10 pl-6">
              <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Kontroller (Dator)</span>
              <div className="flex gap-4 text-[11px] font-black text-white/90 italic tracking-wider">
                <span>MELLANSLAG = <span className="text-blue-400">HOPPA</span></span>
                <span className="text-white/20">|</span>
                <span>X = <span className="text-red-500">SKJUTA</span></span>
                <span className="text-white/20">|</span>
                <span>Z = <span className="text-yellow-400">SPIN</span></span>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
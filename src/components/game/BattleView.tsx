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
      {/* HEADER */}
      <div className="w-full flex justify-between items-center bg-[#2d1b1b]/80 p-4 border-b border-white/5 backdrop-blur-xl z-[500]">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Nivå</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff2e63] italic leading-none">{level?.number || 1} / 7</span>
        </div>

        <div className="flex items-center gap-4">
          {/* [v3.15] Manual Fullscreen Toggle */}
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              const elem = document.documentElement as any;
              if (elem.requestFullscreen) elem.requestFullscreen();
              else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
              else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
            }}
            className="h-12 w-12 rounded-xl border-2 bg-white/10 border-white/20 hover:bg-white/20"
            title="Helskärm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-yellow-400">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </Button>
          {/* [v2.14] Live HUD Score */}
          <div className="flex flex-col items-end mr-2">
            <span className="text-[9px] text-accent font-black uppercase tracking-[0.2em] leading-none mb-1">Poäng</span>
            <span className="text-2xl md:text-3xl font-black text-white italic leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {(liveScore || 0).toLocaleString()}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onToggleMute === 'function') {
                onToggleMute();
              }
            }}
            className={`h-12 w-12 rounded-xl border-2 ${isMuted ? "bg-red-500/20 border-red-500/50" : "bg-white/10 border-white/20"}`}
          >
            {isMuted ? <VolumeX className="w-6 h-6 text-red-500" /> : <Volume2 className="w-6 h-6 text-green-500" />}
          </Button>

          <Button
            variant="destructive"
            onClick={onAbort}
            className="bg-[#e63946] hover:bg-red-700 text-white font-black uppercase tracking-widest px-6 h-12 rounded-xl border-b-4 border-[#780116] active:border-0 active:translate-y-1 transition-all flex items-center gap-2 shadow-xl"
          >
            <LogOut className="w-5 h-5" />
            AVSLUTA
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-black/40 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#ff2e63] to-[#ff4d6d] shadow-[0_0_15px_#ff2e63]"
          style={{ width: `${((level?.number || 1) / 7) * 100}%` }}
        />
      </div>

      {/* Game Engine */}
      <div className="flex-1 relative w-full overflow-hidden flex items-center justify-center bg-black">
        <GameEngine
          key={`${level.number}-${ninja.id}-${retryCount}`}
          ninja={ninja}
          level={level}
          playerName={playerName}
          initialScore={isFreshStart ? 0 : initialScore}
          isMuted={isMuted}
          isFreshStart={isFreshStart}
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

      {/* Footer Status Bar */}
      <div className="w-full bg-[#1a0f0f]/95 backdrop-blur-2xl border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] px-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] flex items-center gap-4 h-auto min-h-24 sm:min-h-20 z-[1000] relative">
        <div className="bg-[#2a9d8f]/20 p-3 rounded-2xl border border-[#2a9d8f]/30 ring-1 ring-[#2a9d8f]/20">
          <Heart className="w-7 h-7 text-[#2a9d8f] fill-[#2a9d8f]/30" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[10px] text-[#2a9d8f] font-black uppercase tracking-[0.2em]">Status</span>
          <span className="text-sm font-bold text-white italic leading-tight tracking-wide">
            Besegra bossen för att gå vidare!
          </span>
        </div>

        {/* [v3.46] Desktop Controls Legend */}
        <div className="hidden md:flex flex-col items-end border-l border-white/10 pl-6">
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
    </div>
  );
}
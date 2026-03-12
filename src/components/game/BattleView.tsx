"use client";
import { useEffect } from "react";

import { Ninja, Level } from "@/lib/game-data";
import { GameEngine } from "./GameEngine";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Volume2, VolumeX } from "lucide-react";

interface BattleViewProps {
  ninja: Ninja;
  level: Level;
  playerName: string;
  initialScore: number;
  retryCount?: number;
  isMuted: boolean;
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
  onToggleMute,
  onNext, 
  onGameOver, 
  onAbort 
}: BattleViewProps) {
  // v1.77: Återställer automatisk skärmlåsning (Portrait)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.screen?.orientation) {
      try {
        // Notera: screen.orientation.lock kan kräva Fullscreen-läge först,
        // men vi försöker ändå som vi gjorde i v1.74 då användaren vill ha tillbaka det.
        (window.screen.orientation as any).lock?.('portrait').catch(() => {
          console.log("[v1.77] Orientation lock requires user interaction or isn't supported.");
        });
      } catch (e) {
        console.warn("[v1.77] Orientation error:", e);
      }
    }
    
    // Förhindra skroll på mobilen
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
          <span className="text-3xl md:text-4xl font-black text-[#ff2e63] italic leading-none">{level?.number || 1} / 6</span>
        </div>
        
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                onClick={(e) => { e.stopPropagation(); onToggleMute(); }} 
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
          style={{ width: `${((level?.number || 1) / 6) * 100}%` }}
        />
      </div>

      {/* Game Engine */}
      <div className="flex-1 relative w-full overflow-hidden flex items-center justify-center bg-black">
        <GameEngine 
          key={`${level.number}-${ninja.id}-${retryCount}`}
          ninja={ninja}
          level={level}
          playerName={playerName}
          initialScore={initialScore}
          isMuted={isMuted}
          onLevelComplete={(points) => onNext(points)}
          onGameOver={(finalScore) => onGameOver?.(finalScore)}
        />
      </div>

      {/* Footer Status Bar */}
      <div className="w-full bg-[#1a0f0f]/95 backdrop-blur-2xl border-t border-white/10 p-4 flex items-center gap-4 h-24 sm:h-20 z-[1000] relative">
        <div className="bg-[#2a9d8f]/20 p-3 rounded-2xl border border-[#2a9d8f]/30 ring-1 ring-[#2a9d8f]/20">
            <Heart className="w-7 h-7 text-[#2a9d8f] fill-[#2a9d8f]/30" />
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] text-[#2a9d8f] font-black uppercase tracking-[0.2em]">Status</span>
            <span className="text-sm font-bold text-white italic leading-tight tracking-wide">
                Besegra bossen för att gå vidare!
            </span>
        </div>
      </div>
    </div>
  );
}
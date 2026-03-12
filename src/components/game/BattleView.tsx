"use client";
import { useEffect } from "react";

import { Ninja, Level } from "@/lib/game-data";
import { GameEngine } from "./GameEngine";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sword, Zap, Heart, LogOut, Volume2, VolumeX } from "lucide-react";

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
  // v1.74: Försök låsa skärmen till Portrait för mobil-app-känsla
  useEffect(() => {
    if (typeof window !== 'undefined' && window.screen?.orientation) {
      try {
        console.log("[v1.74] Requesting Orientation Lock: portrait");
        // Notera: screen.orientation.lock kräver ofta Fullscreen-läge först
        (window.screen.orientation as any).lock?.('portrait').catch(() => {
          console.log("[v1.74] Orientation lock requires user interaction or isn't supported on this device.");
        });
      } catch (e) {
        console.warn("[v1.74] Orientation error:", e);
      }
    }
    
    // Förhindra skroll och "elasticity" på mobilen
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-black text-white overflow-hidden animate-in fade-in duration-500">
      {/* HEADER (Nivå, Poäng? No, Nivå + Avsluta per Bild 2) */}
      <div className="w-full flex justify-between items-center bg-[#2d1b1b]/80 p-4 border-b border-white/5 backdrop-blur-xl z-[500]">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Nivå</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff2e63] italic leading-none">{(level?.number || 1)} / 6</span>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="text-right mr-2 hidden md:block">
              <span className="text-[8px] text-muted-foreground uppercase font-black block tracking-widest">{playerName || 'Ninja'}</span>
            </div>

            <Button 
                variant="outline" 
                onClick={(e) => { e.stopPropagation(); onToggleMute(); }} 
                className={`h-12 w-12 rounded-xl active:scale-95 transition-all p-0 flex items-center justify-center border-2 ${
                  isMuted 
                  ? "bg-red-500/20 border-red-500/50" 
                  : "bg-white/10 border-white/20"
                }`}
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

      {/* Progress Bar (Nivå-progress) */}
      <div className="w-full h-3 bg-black/40 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#ff2e63] to-[#ff4d6d] shadow-[0_0_15px_#ff2e63]" 
          style={{ width: `${((level?.number || 1) / 6) * 100}%` }}
        />
      </div>

      {/* GAME ENGINE CONTAINER (Tar upp resten av platsen) */}
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

      {/* FOOTER STATUS BAR (Bild 2 stil) */}
      <div className="w-full bg-[#1a0f0f]/95 backdrop-blur-2xl border-t border-white/10 p-4 flex items-center gap-4 h-24 sm:h-20 z-[1000] relative">
        <div className="bg-[#2a9d8f]/20 p-3 rounded-2xl border border-[#2a9d8f]/30 shadow-[0_0_20px_rgba(42,157,143,0.1)]">
            <Heart className="w-7 h-7 text-[#2a9d8f] fill-[#2a9d8f]/30" />
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] text-[#2a9d8f] font-black uppercase tracking-[0.2em]">Status</span>
            <span className="text-sm font-bold text-white italic leading-tight tracking-wide">
                Besegra {level?.boss?.name || 'bossen'} för att nå <br className="sm:hidden"/>nästa bana!
            </span>
        </div>

        {/* Desktop labels (Döljer dessa på mobil vid behov) */}
        <div className="ml-auto hidden md:flex items-center gap-8">
            <div className="text-right">
                <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Kontroller</div>
                <div className="text-xs font-bold text-white/50">Pilar: Flytta • Mellanslag: Hoppa</div>
            </div>
            <div className="text-right">
                <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">Nivå</div>
                <div className="text-xs font-bold text-[#ff2e63] italic">Bana {level.number}: {level.name}</div>
            </div>
        </div>
      </div>
    </div>
  );
}
  );
}
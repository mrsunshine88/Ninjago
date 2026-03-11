"use client";

import { Ninja, Level } from "@/lib/game-data";
import { GameEngine } from "./GameEngine";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sword, Zap, Heart, LogOut } from "lucide-react";

interface BattleViewProps {
  ninja: Ninja;
  level: Level;
  playerName: string;
  onNext: (pointsGained: number) => void;
  onGameOver?: (score: number) => void;
  onAbort?: () => void;
}

export function BattleView({ ninja, level, playerName, onNext, onGameOver, onAbort }: BattleViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 gap-4 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      <div className="w-full flex justify-between items-center bg-card/60 p-4 rounded-xl border border-primary/30 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Nivå</span>
          <span className="text-3xl font-black text-primary italic leading-none">{level.number} / 6</span>
        </div>
        
        <div className="text-center hidden md:block">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Nuvarande Ninja</span>
          <div className="text-xl font-black text-accent italic flex items-center gap-2 drop-shadow-sm">
            <Sword className="w-5 h-5" /> {playerName} ({ninja.name})
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end hidden lg:flex">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Element</span>
            <span className="text-xl font-black text-white uppercase flex items-center gap-1 italic">
              <Zap className="w-5 h-5 text-accent" /> {ninja.power}
            </span>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={onAbort} 
            className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-6 h-12 rounded-xl border-b-4 border-red-800 active:border-0 active:translate-y-1 transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            AVSLUTA
          </Button>
        </div>
      </div>

      <Progress value={(level.number / 6) * 100} className="h-3 w-full bg-primary/10" />

      <div className="relative w-full aspect-video md:aspect-[16/9] max-h-[70vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <GameEngine 
          ninja={ninja}
          level={level}
          playerName={playerName}
          onLevelComplete={(points) => onNext(points)}
          onGameOver={(finalScore) => onGameOver?.(finalScore)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="bg-card/40 p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-card/60 transition-colors">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <Sword className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ditt Uppdrag</div>
            <div className="text-sm font-bold text-white italic">{level.boss.description}</div>
          </div>
        </div>
        <div className="bg-card/40 p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-card/60 transition-colors">
          <div className="p-3 bg-accent/20 rounded-xl text-accent">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-accent uppercase font-bold tracking-widest">Ninja-kontroller</div>
            <div className="text-sm font-bold text-white">Pilar: Gå • Mellanslag: Hoppa • X: Kraft • Z: Spin</div>
          </div>
        </div>
        <div className="bg-card/40 p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-card/60 transition-colors">
          <div className="p-3 bg-green-500/20 rounded-xl text-green-500">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-green-500 uppercase font-bold tracking-widest">Status</div>
            <div className="text-sm font-bold text-white italic">Besegra {level.boss.name} för att nå nästa bana!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Star, Trophy } from "lucide-react";

interface GameOverViewProps {
  playerName: string;
  finalScore: number;
  isHighScore: boolean;
  isGameWon?: boolean;
  isMuted: boolean;
  onReset: () => void;
  onRetry?: () => void;
}

export function GameOverView({ playerName, finalScore, isHighScore, isGameWon, isMuted, onReset, onRetry }: GameOverViewProps) {
  const [countdown, setCountdown] = useState(20);
  const [displayScore, setDisplayScore] = useState(0);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setDisplayScore(finalScore);
  }, [finalScore]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    if (isHighScore || isGameWon) {
      const colors = ['#ffcc00', '#ff4444', '#00ccff', '#ff00ff', '#ffffff'];
      const newParticles = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 10,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 5
      }));
      setParticles(newParticles);
      
      const audioFile = isHighScore 
        ? "/audio/SPELA UPP NÄR MAN SLÅR REKORD.mp3" 
        : "/audio/music_level_complete_8bit.wav";
      
      const audio = new Audio(audioFile);
      audio.volume = isMuted ? 0 : 0.6;
      audio.play().catch(() => {});
    }

    return () => clearInterval(timer);
  }, [isHighScore, isGameWon, isMuted]);

  useEffect(() => {
    if (countdown === 0) onReset();
  }, [countdown, onReset]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 gap-8 text-center bg-black">
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: 0.8
          }}
        />
      ))}

      <div className="z-10 bg-card/70 backdrop-blur-3xl p-8 rounded-[40px] border-4 border-primary/30 shadow-2xl space-y-4 max-w-md w-full">
        <h1 className="text-5xl font-black uppercase text-white">
          {isHighScore ? "NYTT REKORD!" : "BRA KÄMPAT!"}
        </h1>
        
        <div className="py-6 rounded-[30px] border-4 border-white/10 bg-black/40">
          <div className="text-6xl font-black font-mono text-primary">
            {displayScore.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 font-black">Poäng</div>
        </div>

        <button 
            onClick={() => {
                onReset();
            }}
            className="w-full h-20 bg-red-600 text-white text-3xl font-black uppercase rounded-2xl shadow-lg active:translate-y-2 transition-all mt-6"
        >
            Huvudmeny
        </button>
      </div>
    </div>
  );
}

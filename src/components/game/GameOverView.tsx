
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
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string, size: number, angle: number, speed: number}[]>([]);

  useEffect(() => {
    // Tvinga fram poängen direkt så den inte fastnar på 0
    // v1.65: Lägger till fallback till localStorage om finalScore är 0
    const scoreVal = finalScore > 0 ? finalScore : (Number(localStorage.getItem('ninjago_emergency_score')) || 0);
    setDisplayScore(scoreVal);
  }, [finalScore]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    if (isHighScore || isGameWon) {
      // Skapa konfetti
      const colors = ['#ffcc00', '#ff4444', '#00ccff', '#ff00ff', '#ffffff'];
      const newParticles = Array.from({ length: 100 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 10,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 5
      }));
      setParticles(newParticles);
      
      // I v1.66: Använd det nya rekordljudet
      const audioFile = (isHighScore || isGameWon) ? '/audio/SPELA UPP NÄR MAN SLÅR REKORD.mp3' : '/audio/music_level_complete_8bit.wav';
      const audio = new Audio(audioFile);
      audio.volume = isMuted ? 0 : 0.6;
      audio.play().catch(() => {});
    }

    return () => clearInterval(timer);
  }, [isHighScore, isGameWon, isMuted]);

  useEffect(() => {
    if (isHighScore || isGameWon) {
      const pTimer = setInterval(() => {
        setParticles(prev => prev.map(p => ({
          ...p,
          y: p.y > 110 ? -10 : p.y + p.speed * 0.5,
          angle: p.angle + 0.1
        })));
      }, 50);
      return () => clearInterval(pTimer);
    }
  }, [isHighScore]);

  useEffect(() => {
    if (countdown === 0) {
      onReset();
    }
  }, [countdown, onReset]);

  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 gap-8 text-center animate-in zoom-in duration-700 ${isHighScore ? 'bg-yellow-500/10' : ''}`}>
      {isHighScore && particles.map(p => (
        <div 
          key={p.id}
          className="absolute pointer-events-none z-0"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.angle}rad)`,
            opacity: 0.8,
            boxShadow: `0 0 10px ${p.color}`
          }}
        />
      ))}

      {isHighScore ? (
        <div className="space-y-4 animate-float z-10">
          <div className="p-3 bg-yellow-400 rounded-full inline-block shadow-[0_0_60px_rgba(250,204,21,0.8)] border-4 border-white animate-bounce">
            <Trophy className="w-16 h-16 text-black" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase high-score-text tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] scale-110">
            NYTT REKORD!
          </h1>
          <div className="flex justify-center gap-2">
            {[...Array(7)].map((_, i) => (
              <Star key={i} className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      ) : isGameWon ? (
        <div className="space-y-4 animate-float z-10">
          <div className="p-3 bg-green-500 rounded-full inline-block shadow-[0_0_60px_rgba(34,197,94,0.8)] border-4 border-white animate-bounce">
            <Star className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase text-green-500 tracking-tighter drop-shadow-lg">
            VINST! SPELET KLART
          </h1>
        </div>
      ) : (
        <div className="space-y-3 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-1000">
          <h1 className="text-4xl md:text-6xl font-black uppercase text-primary tracking-tighter drop-shadow-lg">
            BRA KÄMPAT!
          </h1>
          <p className="text-xl text-yellow-500 font-black italic tracking-widest uppercase animate-pulse">
            🥷 Träna mer - du är snart en mästare! 🥷
          </p>
        </div>
      )}

      <div className="bg-card/70 backdrop-blur-3xl p-8 rounded-[40px] border-4 border-primary/30 shadow-[0_0_100px_rgba(0,0,0,0.7)] space-y-4 max-w-md w-full z-10 relative">
        <div className="text-accent uppercase tracking-[0.4em] font-black text-[10px] mb-1">Ninja Slutresultat</div>
        <div className="text-4xl md:text-5xl font-black text-white italic mb-2 drop-shadow-lg">
          {playerName}
        </div>
        
        <div className={`py-6 rounded-[30px] border-4 ${isHighScore ? 'border-yellow-400 bg-yellow-400/10 gold-glow' : 'border-white/10 bg-black/40'}`}>
          <div className={`text-6xl md:text-7xl font-black font-mono tracking-tighter ${isHighScore ? 'high-score-text scale-105' : 'text-primary'}`}>
            {displayScore.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] mt-2 font-black">Poäng Totalt</div>
        </div>

        <div className="flex flex-col gap-4 mt-8">
            <button 
                onClick={onReset}
                onPointerDown={(e) => { e.preventDefault(); onReset(); }}
                className="w-full h-20 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 text-3xl font-black uppercase tracking-widest group rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-[0_12px_0_rgb(127,29,29)] active:shadow-none active:translate-y-3 flex items-center justify-center"
            >
                Huvudmeny
                <RefreshCcw className="ml-4 w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
            </button>
        </div>
        
        <p className="text-sm text-muted-foreground pt-6 font-bold tracking-widest uppercase">
          Återvänder till dojon om {countdown} sekunder...
        </p>
      </div>
    </div>
  );
}

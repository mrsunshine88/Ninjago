
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Star, Trophy } from "lucide-react";

interface GameOverViewProps {
  playerName: string;
  finalScore: number;
  isHighScore: boolean;
  onReset: () => void;
}

export function GameOverView({ playerName, finalScore, isHighScore, onReset }: GameOverViewProps) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      onReset();
    }
  }, [countdown, onReset]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 gap-8 text-center animate-in zoom-in duration-700 ${isHighScore ? 'gold-glow bg-yellow-500/10' : ''}`}>
      {isHighScore ? (
        <div className="space-y-6 animate-float">
          <div className="p-4 bg-yellow-400 rounded-full inline-block shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            <Trophy className="w-20 h-20 text-black" />
          </div>
          <h1 className="text-7xl md:text-9xl font-black uppercase high-score-text tracking-tighter drop-shadow-2xl">
            NYTT HIGH SCORE!
          </h1>
          <div className="flex justify-center gap-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-10 h-10 text-yellow-400 fill-yellow-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black uppercase text-primary tracking-tighter">
            BRA KÄMPAT!
          </h1>
          <p className="text-2xl text-muted-foreground italic font-medium">Träna mer i klostret för att slå rekordet!</p>
        </div>
      )}

      <div className="bg-card/60 backdrop-blur-2xl p-12 rounded-[40px] border-4 border-primary/30 shadow-[0_0_100px_rgba(0,0,0,0.5)] space-y-6 max-w-lg w-full">
        <div className="text-accent uppercase tracking-[0.3em] font-black text-sm">Ninja Slutresultat</div>
        <div className="text-5xl font-black text-white italic mb-4">
          {playerName}
        </div>
        
        <div className="py-10 bg-black/40 rounded-3xl border-2 border-white/10">
          <div className="text-7xl font-black font-mono text-primary tracking-tighter">
            {finalScore.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground uppercase tracking-widest mt-2 font-bold">Poäng Totalt</div>
        </div>

        <Button 
          onClick={onReset}
          className="w-full h-18 bg-white text-black hover:bg-primary hover:text-white text-2xl font-black uppercase tracking-widest mt-8 group rounded-2xl transition-all duration-500 transform hover:scale-105"
        >
          Spela Igen
          <RefreshCcw className="ml-3 w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
        </Button>
        
        <p className="text-sm text-muted-foreground pt-6 font-medium">
          Återvänder till dojon om {countdown} sekunder...
        </p>
      </div>
    </div>
  );
}

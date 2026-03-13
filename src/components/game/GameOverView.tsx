import { useEffect, useState } from "react";
import { ScoreEntry, saveScore } from "@/lib/leaderboard";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Star, Trophy } from "lucide-react";
import { Howl } from 'howler';

interface GameOverViewProps {
  playerName: string;
  finalScore: number;
  ninjaName: string;
  isGameWon?: boolean;
  isMuted: boolean;
  onReset: () => void;
  onRetry?: () => void;
}

export function GameOverView({ playerName, finalScore, ninjaName, isGameWon, isMuted, onReset, onRetry }: GameOverViewProps) {
  const [winVerdict, setWinVerdict] = useState<'LOADING' | 'CHAMPION' | 'DENIED'>('LOADING');
  const [countdown, setCountdown] = useState(20);
  const [displayScore, setDisplayScore] = useState(0);
  const [particles, setParticles] = useState<any[]>([]);

  // "Stony Connected" Logic: Direct sync to DB save
  useEffect(() => {
    const processResult = async () => {
      const result = await saveScore({
        name: playerName,
        score: finalScore,
        ninja: ninjaName,
        date: new Date().toISOString()
      });

      const isActuallyRankOne = result.isRankOne;

      if (isActuallyRankOne || isGameWon) {
        setWinVerdict('CHAMPION');
        new Howl({ src: ["/audio/SPELA UPP NÄR MAN SLÅR REKORD.mp3"], autoplay: true });

        // Guld-partiklar
        const colors = ['#ffcc00', '#ff4444', '#00ccff', '#ff00ff', '#ffffff', '#FFD700'];
        setParticles(Array.from({ length: 150 }).map((_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: -20 - Math.random() * 50,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 5 + Math.random() * 15,
          angle: Math.random() * Math.PI * 2,
          speed: 1.5 + Math.random() * 4
        })));
      } else {
        setWinVerdict('DENIED');
        new Howl({ src: ["/audio/music_game_over_8bit.wav"], autoplay: true });
      }
    };
    processResult();
  }, []);

  useEffect(() => {
    // Visningspoäng
    setDisplayScore(finalScore > 0 ? finalScore : (typeof window !== 'undefined' ? Number(localStorage.getItem('ninjago_last_score')) : 0));

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [finalScore]);

  useEffect(() => {
    if (countdown === 0) onReset();
  }, [countdown, onReset]);

  // [v1.89] Black overlay during loading to prevent standard flicker
  if (winVerdict === 'LOADING') return <div className="min-h-screen bg-black" />;

  const isActuallyRankOne = winVerdict === 'CHAMPION';

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center p-6 gap-8 text-center">
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
            opacity: 0.8,
            transition: 'all 2s ease-out',
            transform: `translateY(100vh) rotate(${p.angle}rad)`
          }}
        />
      ))}

      <div className={`z-10 bg-card/75 backdrop-blur-3xl px-6 py-8 rounded-[40px] border-4 shadow-2xl space-y-4 max-w-md w-full transition-all duration-500 flex flex-col items-start ${isActuallyRankOne
          ? 'shadow-[0_0_50px_rgba(250,204,21,0.6)] border-yellow-400/50'
          : 'border-primary/30'
        }`}>
        <div className="flex flex-col items-start gap-1 w-full text-left">
          {isGameWon ? (
            <>
              <Star className="w-12 h-12 text-yellow-400 animate-bounce mb-2" />
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-[0.9] drop-shadow-[0_4px_10px_rgba(255,215,0,0.5)] text-yellow-500 w-full italic">
                SANN NINJA-MÄSTARE!
              </h1>
            </>
          ) : isActuallyRankOne ? (
            <>
              <Trophy className="w-12 h-12 text-yellow-400 animate-pulse mb-2" />
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] text-yellow-400 w-full">
                NYTT VÄRLDSREKORD!
              </h1>
            </>
          ) : (
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] text-primary w-full">
              BRA KÄMPAT!
            </h1>
          )}
        </div>

        {isGameWon ? (
          <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[12px] text-left w-full pl-0.5">
            Du har besegrat Lord Garmadon och räddat Ninjago!
          </p>
        ) : isActuallyRankOne ? (
          <p className="text-yellow-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[11px] text-left w-full pl-0.5">
            DU ÄR NUMMER 1 I VÄRLDEN!
          </p>
        ) : (
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] text-left w-full pl-0.5">
            Du fick {displayScore} poäng. Du behöver öva mer för att nå toppen!
          </p>
        )}

        <div className="w-full py-6 rounded-[30px] border-4 border-white/10 bg-black/40">
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

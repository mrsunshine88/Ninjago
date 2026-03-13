
"use client";

import { useState, useEffect, useCallback } from "react";
import { Ninja, Level, LEVELS } from "@/lib/game-data";
import { getLeaderboard, saveScore, ScoreEntry } from "@/lib/leaderboard";
import { StartScreen } from "@/components/game/StartScreen";
import { BattleView } from "@/components/game/BattleView";
import { GameOverView } from "@/components/game/GameOverView";

type GameState = 'menu' | 'playing' | 'gameover';

export default function NinjagoGame() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [playerName, setPlayerName] = useState("");
  const [selectedNinja, setSelectedNinja] = useState<Ninja | null>(null);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [gameOverData, setGameOverData] = useState<{ score: number, isHighScore: boolean, isWin: boolean } | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // Load leaderboard and settings on mount
  useEffect(() => {
    const loadData = async () => {
        const scores = await getLeaderboard();
        setLeaderboard(scores);
    };
    loadData();
    const savedMute = localStorage.getItem('ninjago_muted') === 'true';
    setIsMuted(savedMute);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newVal = !prev;
      localStorage.setItem('ninjago_muted', String(newVal));
      return newVal;
    });
  }, []);

  // [v1.82] MASTER AUDIO SYNC
  useEffect(() => {
    console.log("[v1.89] Master Audio Sync. Muted:", isMuted);
    
    // Backup: Muta alla HTML5 Audio-element direkt
    if (typeof document !== 'undefined') {
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach(audio => {
        audio.muted = isMuted;
      });
    }

    // [v1.87] Master Mute Sync (Mobile safe)
    if (typeof window !== 'undefined' && (window as any).Howler) {
      (window as any).Howler.mute(isMuted);
    }
  }, [isMuted]);

  // [v1.87] SCROLL UNLOCK LOGIC
  useEffect(() => {
    if (gameState === 'menu') {
      // Tvinga fram fri skrollning när vi är i menyn
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.body.style.height = 'auto';
        document.body.style.touchAction = 'auto';
        document.body.style.overscrollBehavior = 'auto';
        
        // Avsluta fullskärm om den hänger kvar
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
  }, [gameState]);


  const finishGame = useCallback(async (total: number, isWin: boolean = false) => {
    setGameOverData(null); // Clear old data first
    console.log(`[v1.89] Finishing game with score: ${total}. Awaiting save...`);
    
    // 1. Spara först (vänta på nätverket)
    const result = await saveScore({
      name: playerName,
      score: total,
      ninja: selectedNinja?.name || "Okänd",
      date: new Date().toISOString()
    });
    
    // 2. Sätt data och växla vy först när sparandet är bekräftat
    setGameOverData({ score: total, isHighScore: result.isHighScore, isWin });
    const freshLeaderboard = await getLeaderboard();
    setLeaderboard(freshLeaderboard);
    setGameState('gameover');
    console.log(`[v1.89] Save confirmed & Leaderboard refreshed.`);
  }, [playerName, selectedNinja]);

  const handleStart = useCallback((name: string, ninja: Ninja) => {
    setPlayerName(name);
    setSelectedNinja(ninja);
    setScore(0);
    setGameOverData(null);
    setCurrentLevelIdx(0);
    setGameState('playing');
  }, []);

  const handleLevelComplete = useCallback((pointsGained: number) => {
    // GameEngine returnerar nu det totala värdet (initialScore + levelPoints)
    // Så vi sätter bara poängen direkt.
    setScore(pointsGained);
    
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(idx => idx + 1);
    } else {
      setTimeout(() => finishGame(pointsGained), 10);
    }
  }, [currentLevelIdx, finishGame]);

  const handleGameOver = useCallback(async (totalScore: number) => {
    // v1.89 Expert Sync: Ensure we have the absolute max score
    const currentStored = Number(localStorage.getItem('ninjago_emergency_score')) || 0;
    const finalS = Math.max(score, totalScore, currentStored);
    
    console.log(`[v1.89] handleGameOver triggered. Score: ${finalS}. Awaiting finishGame...`);
    setScore(finalS); // Update local state for display
    await finishGame(finalS); // This function now awaits the network call
  }, [score, finishGame]);

  const handleRetry = useCallback(() => {
    // Spara poängen innan retry (om spelet kördes)
    setScore(0);
    setGameOverData(null);
    setCurrentLevelIdx(0);
    // Öka retryCount direkt för att tvinga GameEngine att återmonteras
    setRetryCount(prev => prev + 1);
    setGameState('playing');
  }, []);

  const handleReset = useCallback(async () => {
    // Avsluta fullskärm om den är aktiv
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.overscrollBehavior = '';
    
    setScore(0);
    setRetryCount(0);
    setGameState('menu');

    // Extra synk för topplistan vid återgång till menyn
    const freshScores = await getLeaderboard();
    setLeaderboard(freshScores);
  }, []);

  const handleAbort = useCallback(() => {
    setGameState('menu');
  }, []);

  return (
    <main className="min-h-screen">
      {gameState === 'menu' && (
        <StartScreen 
          onStart={handleStart} 
          scores={leaderboard} 
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}
      
      {gameState === 'playing' && selectedNinja && (
        <BattleView 
          ninja={selectedNinja} 
          level={LEVELS[currentLevelIdx]} 
          playerName={playerName}
          initialScore={score}
          retryCount={retryCount}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onNext={handleLevelComplete}
          onGameOver={handleGameOver}
          onAbort={handleAbort}
        />
      )}

      {gameState === 'gameover' && gameOverData && (
        <GameOverView 
          playerName={playerName} 
          finalScore={gameOverData.score} 
          isHighScore={gameOverData.isHighScore} 
          isGameWon={gameOverData.isWin}
          leaderboard={leaderboard}
          isMuted={isMuted}
          onReset={handleReset}
          onRetry={handleRetry} 
        />
      )}
    </main>
  );
}

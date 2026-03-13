
"use client";

import { useState, useEffect, useCallback } from "react";
import { Ninja, Level, LEVELS } from "@/lib/game-data";
import { getLeaderboard, saveScore, ScoreEntry } from "@/lib/leaderboard";
import { StartScreen } from "@/components/game/StartScreen";
import { BattleView } from "@/components/game/BattleView";
import { GameOverView } from "@/components/game/GameOverView";
import { Howler } from 'howler';

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
  const [isFreshStart, setIsFreshStart] = useState(false);

  // Load leaderboard and settings on mount
  useEffect(() => {
    const loadData = async () => {
        const scores = await getLeaderboard();
        setLeaderboard(scores);
    };
    loadData();
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // [v2.35] GLOBAL MUTE SYNC & MUSIC RECOVERY
    if (typeof window !== 'undefined') {
      // Force resume on interaction
      if (Howler.ctx && Howler.ctx.state !== 'running') {
        Howler.ctx.resume().then(() => {
          console.log(`[v2.35] AUDIO ENGINE UNLOCKED! (State: ${Howler.ctx.state})`);
        });
      }

      // [v2.35] Use global mute instead of stopping (keeps music "playing" but silent)
      Howler.mute(newMutedState);
      
      // If unmuting, ensure the music context is actually running
      if (!newMutedState) {
        console.log("[v2.35] Unmuting: Global Howler.mute(false) triggered.");
      }

      localStorage.setItem('ninjago_muted', JSON.stringify(newMutedState));
    }
  }, [isMuted]);

  // Sync state on mount
  useEffect(() => {
    const savedMute = localStorage.getItem('ninjago_muted') === 'true';
    setIsMuted(savedMute);
    if (typeof window !== 'undefined') {
        Howler.mute(savedMute);
        
        // [v2.33] GLOBAL UNLOCK: Force AudioContext on ANY click
        const unlock = () => {
          if (Howler.ctx && Howler.ctx.state !== 'running') {
            Howler.ctx.resume().then(() => {
              console.log('[v2.33] AUDIO ENGINE UNLOCKED!');
            });
          }
        };
        window.addEventListener('click', unlock);
        return () => window.removeEventListener('click', unlock);
    }
  }, []);

  // SCROLL UNLOCK LOGIC (Aggressive & Centralized)
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'gameover') {
      const unlock = () => {
        if (typeof document !== 'undefined') {
          // Kraftfull återställning av både body och html
          const targets = [document.body, document.documentElement];
          targets.forEach(t => {
            t.style.overflow = 'auto';
            t.style.overflowX = 'hidden';
            t.style.position = 'static';
            t.style.height = 'auto';
            t.style.touchAction = 'auto';
            t.style.overscrollBehavior = 'auto';
          });
          
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      };
      
      unlock();
      // Kör en gång till efter en liten delay för att garantera att inga sena renders låser igen
      const t = setTimeout(unlock, 100);
      return () => clearTimeout(t);
    }
  }, [gameState]);


  const finishGame = useCallback(async (total: number, isWin: boolean = false) => {
    // Moving saveScore to GameOverView for "Stony Connected" logic
    if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(total));
    setLastFinalScore(total);
    setGameOverData({ score: total, isHighScore: false, isWin }); // isHighScore now handled by GameOverView
    const freshLeaderboard = await getLeaderboard();
    setLeaderboard(freshLeaderboard);
    setGameState('gameover');
  }, [playerName]);

  const handleStart = useCallback((name: string, ninja: Ninja) => {
    // Absolute Reset Lock
    if (typeof window !== 'undefined') {
      localStorage.setItem('ninjago_fresh_start', 'true');
      localStorage.setItem('ninjago_last_score', '0');
      localStorage.setItem('ninjago_emergency_score', '0');
    }
    setIsFreshStart(true);
    setPlayerName(name);
    setSelectedNinja(ninja);
    setScore(0);
    setGameOverData(null);
    setCurrentLevelIdx(0);
    setGameState('playing');
  }, []);

  const handleLevelComplete = useCallback((pointsGained: number) => {
    setScore(pointsGained);
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(idx => idx + 1);
    } else {
      setTimeout(() => finishGame(pointsGained), 10);
    }
  }, [currentLevelIdx, finishGame]);

  // Garanterad poängvisning: "Hinken" som sparar poängen precis innan unmount
  const [lastFinalScore, setLastFinalScore] = useState(0);

  const handleGameOver = useCallback(async (totalScore: number) => {
    if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(totalScore));
    setLastFinalScore(totalScore);
    setScore(totalScore); 
    await finishGame(totalScore);
  }, [finishGame]);

  const handleRetry = useCallback(() => {
    // Absolute Reset Lock
    if (typeof window !== 'undefined') {
      localStorage.setItem('ninjago_fresh_start', 'true');
      localStorage.setItem('ninjago_last_score', '0');
      localStorage.setItem('ninjago_emergency_score', '0');
    }
    setIsFreshStart(true);
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
          isFreshStart={isFreshStart}
          onToggleMute={toggleMute}
          onNext={handleLevelComplete}
          onGameOver={handleGameOver}
          onAbort={handleAbort}
        />
      )}

      {gameState === 'gameover' && gameOverData && (
        <GameOverView 
          playerName={playerName} 
          finalScore={lastFinalScore} 
          isGameWon={gameOverData.isWin}
          ninjaName={selectedNinja?.name || "Okänd"}
          isMuted={isMuted}
          onReset={handleReset}
          onRetry={handleRetry} 
        />
      )}
    </main>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Ninja, Level, LEVELS, NINJAS } from "@/lib/game-data";
import { getLeaderboard, saveScore, ScoreEntry } from "@/lib/leaderboard";
import { StartScreen } from "@/components/game/StartScreen";
import { BattleView } from "@/components/game/BattleView";
import { GameOverView } from "@/components/game/GameOverView";
import { Howler } from 'howler';
import { useMusic } from "@/hooks/useMusic";

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
  const [mounted, setMounted] = useState(false);

  const { playMusic } = useMusic(isMuted);

  // Global Music Management
  useEffect(() => {
    if (!mounted) return;

    if (gameState === 'menu') {
      playMusic('/audio/Meny.wav');
    } else if (gameState === 'playing') {
      const levelNum = LEVELS[currentLevelIdx].number;
      playMusic(`/audio/Niva ${levelNum}.wav`);
    } else if (gameState === 'gameover') {
      // Keep playing current or stop? User didn't specify gameover music, 
      // but usually we stop or play special. For now, just stop to avoid confusion.
      // playMusic('/audio/GameOver.wav'); // if we had one
    }
  }, [gameState, currentLevelIdx, mounted, playMusic]);

  useEffect(() => {
    setMounted(true);
    // Load persisted state safely inside useEffect
    const savedMute = localStorage.getItem('ninjago_muted') === 'true';
    setIsMuted(savedMute);
    Howler.mute(savedMute);

    const checkNya = localStorage.getItem('nya_unlocked') === 'true';
    setIsNyaUnlocked(checkNya);

    // Initial leaderboard load
    getLeaderboard().then(setLeaderboard);
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (typeof window !== 'undefined') {
      if (Howler.ctx && Howler.ctx.state !== 'running') {
        Howler.ctx.resume().then(() => {
          console.log(`[v2.35] AUDIO ENGINE UNLOCKED! (State: ${Howler.ctx.state})`);
        });
      }
      Howler.mute(newMutedState);
      localStorage.setItem('ninjago_muted', JSON.stringify(newMutedState));
    }
  }, [isMuted]);

  // Sync state on interaction
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  // SCROLL UNLOCK LOGIC
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'gameover') {
      const unlock = () => {
        if (typeof document !== 'undefined') {
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
            document.exitFullscreen().catch(() => { });
          }
        }
      };
      unlock();
      const t = setTimeout(unlock, 100);
      return () => clearTimeout(t);
    }
  }, [gameState]);

  const finishGame = useCallback(async (total: number, isWin: boolean = false) => {
    if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(total));
    setLastFinalScore(total);
    setGameOverData({ score: total, isHighScore: false, isWin });
    const freshLeaderboard = await getLeaderboard();
    setLeaderboard(freshLeaderboard);
    setGameState('gameover');
  }, []);

  const handleStart = useCallback((name: string, ninja: Ninja) => {
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

  const [isNyaUnlocked, setIsNyaUnlocked] = useState(false);

  const handleLevelComplete = useCallback((totalPoints: number) => {
    setScore(totalPoints);
    if (totalPoints >= 20000) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nya_unlocked', 'true');
        setIsNyaUnlocked(true);
      }
    }
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(idx => idx + 1);
      setIsFreshStart(false);
    } else {
      setTimeout(() => finishGame(totalPoints, true), 10);
    }
  }, [currentLevelIdx, finishGame]);

  const [lastFinalScore, setLastFinalScore] = useState(0);

  const handleGameOver = useCallback(async (totalScore: number) => {
    if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(totalScore));
    setLastFinalScore(totalScore);
    setScore(totalScore);
    await finishGame(totalScore);
  }, [finishGame]);

  const handleRetry = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ninjago_fresh_start', 'true');
      localStorage.setItem('ninjago_last_score', '0');
      localStorage.setItem('ninjago_emergency_score', '0');
    }
    setIsFreshStart(true);
    setScore(0);
    setGameOverData(null);
    setCurrentLevelIdx(0);
    setRetryCount(prev => prev + 1);
    setGameState('playing');
  }, []);

  const handleReset = useCallback(async () => {
    localStorage.removeItem('ninjago-scores');
    setScore(0);
    setRetryCount(0);
    setGameState('menu');
    const freshScores = await getLeaderboard();
    setLeaderboard(freshScores);
  }, []);

  const handleAbort = useCallback(() => {
    setGameState('menu');
  }, []);

  const handleTestLevel7 = useCallback((name: string, ninja: Ninja) => {
    setPlayerName(name || "Testare");
    setSelectedNinja(ninja || NINJAS.find(n => n.id === 'lloyd')!);
    setScore(30000);
    setCurrentLevelIdx(6);
    setIsFreshStart(false);
    setGameState('playing');
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black" suppressHydrationWarning={true}>
      {mounted && (
        <>
          {gameState === 'menu' && (
            <StartScreen
              onStart={handleStart}
              scores={leaderboard}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              isNyaUnlocked={isNyaUnlocked}
              onReset={handleReset}
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
        </>
      )}
    </main>
  );
}
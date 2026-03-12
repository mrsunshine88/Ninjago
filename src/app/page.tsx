
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
  const [gameOverData, setGameOverData] = useState<{ score: number, isHighScore: boolean } | null>(null);
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


  const finishGame = useCallback(async (total: number) => {
    const result = await saveScore({
      name: playerName,
      score: total,
      ninja: selectedNinja?.name || "Okänd",
      date: new Date().toISOString()
    });
    setGameOverData({ score: total, isHighScore: result.isHighScore });
    const updatedLeaderboard = await getLeaderboard();
    setLeaderboard(updatedLeaderboard);
    setGameState('gameover');
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

  const handleGameOver = useCallback((totalScore: number) => {
    setScore(totalScore);
    setTimeout(() => finishGame(totalScore), 10);
  }, [finishGame]);

  const handleRetry = useCallback(() => {
    // Spara poängen innan retry (om spelet kördes)
    setScore(0);
    setGameOverData(null);
    setCurrentLevelIdx(0);
    // Öka retryCount direkt för att tvinga GameEngine att återmonteras
    setRetryCount(prev => prev + 1);
    setGameState('playing');
  }, []);

  const handleReset = useCallback(() => {
    setScore(0);
    setRetryCount(0);
    setGameState('menu');
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
          isMuted={isMuted}
          onReset={handleReset}
          onRetry={handleRetry} 
        />
      )}
    </main>
  );
}


"use client";

import { useState, useEffect } from "react";
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
  const [isHighScore, setIsHighScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);

  // Load leaderboard on mount
  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  const handleStart = (name: string, ninja: Ninja) => {
    setPlayerName(name);
    setSelectedNinja(ninja);
    setScore(0);
    setCurrentLevelIdx(0);
    setGameState('playing');
  };

  const handleLevelComplete = (pointsGained: number) => {
    const newScore = score + pointsGained;
    setScore(newScore);

    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
    } else {
      finishGame(newScore);
    }
  };

  const handleGameOver = (finalScore: number) => {
    finishGame(score + finalScore);
  };

  const finishGame = (finalScore: number) => {
    const result = saveScore({
      name: playerName,
      score: finalScore,
      ninja: selectedNinja?.name || "Okänd",
      date: new Date().toISOString()
    });
    setIsHighScore(result.isHighScore);
    setLeaderboard(getLeaderboard());
    setGameState('gameover');
  };

  const handleReset = () => {
    setGameState('menu');
  };

  const handleAbort = () => {
    // Direkt återgång till menyn utan confirm-ruta för att garantera att det funkar
    setGameState('menu');
  };

  return (
    <main className="min-h-screen">
      {gameState === 'menu' && (
        <StartScreen onStart={handleStart} scores={leaderboard} />
      )}
      
      {gameState === 'playing' && selectedNinja && (
        <BattleView 
          ninja={selectedNinja} 
          level={LEVELS[currentLevelIdx]} 
          playerName={playerName}
          onNext={handleLevelComplete}
          onGameOver={handleGameOver}
          onAbort={handleAbort}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverView 
          playerName={playerName} 
          finalScore={score} 
          isHighScore={isHighScore} 
          onReset={handleReset} 
        />
      )}
    </main>
  );
}

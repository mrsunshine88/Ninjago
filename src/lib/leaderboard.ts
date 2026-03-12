
export interface ScoreEntry {
  name: string;
  score: number;
  ninja: string;
  date: string;
}

const LEADERBOARD_KEY = 'ninjago_leaderboard_v1';

export function getLeaderboard(): ScoreEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): { isHighScore: boolean } {
  // Validera poäng
  if (entry.score === null || entry.score === undefined || isNaN(entry.score)) {
    entry.score = 0;
  }
  
  const current = getLeaderboard();
  
  // Beräkna om detta är ett high score (bättre än nuvarande #1)
  const isHighScore = current.length === 0 || entry.score > current[0].score;

  const updated = [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  
  // Returnera om det är det absoluta rekordet på topplistan
  const isTopOne = updated.length > 0 && updated[0].score === entry.score;
  return { isHighScore: isTopOne };
}

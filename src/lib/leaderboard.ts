
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
  const current = getLeaderboard();
  const updated = [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  
  // High score check: if this entry is the top one globally
  const isHighScore = updated.length > 0 && updated[0].score === entry.score;
  return { isHighScore };
}

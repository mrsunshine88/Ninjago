
export interface ScoreEntry {
  name: string;
  score: number;
  ninja: string;
  date: string;
}

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

const LEADERBOARD_KEY = 'ninjago_leaderboard_v1';

// Helper function to get scores from local storage
function getLocalLeaderboard(): ScoreEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Error parsing local leaderboard data.");
    return [];
  }
}

export async function getLeaderboard(): Promise<ScoreEntry[]> {
    // [v1.70] Global Sync: Raw fetch from "scores" collection
  try {
    const scoresCol = collection(db, "scores");
    const snapshot = await getDocs(scoresCol);
    
    // Mappa datan och logga antal för felsökning
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      const val = Number(d.score !== undefined ? d.score : (d.points !== undefined ? d.points : 0)) || 0;
      return {
        name: d.name || "Anonym Ninja",
        score: val,
        ninja: d.ninja || "Okänd",
        date: d.date || d.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as ScoreEntry;
    });
    
    // Sortera lokalt (Client-side sort)
    const sorted = data.sort((a, b) => Number(b.score) - Number(a.score));
    console.log(`[v1.70] Global Sync: Found ${sorted.length} scores from cloud`);
    
    if (sorted.length === 0) return getLocalLeaderboard();
    return sorted.slice(0, 5);
  } catch (error) {
    console.error("Global Leaderboard Error:", error);
    return getLocalLeaderboard();
  }
}

export async function saveScore(entry: ScoreEntry): Promise<{ isHighScore: boolean }> {
  const safeScore = Number(entry.score);
  if (isNaN(safeScore) || safeScore <= 0) {
    console.warn("Attempted to save non-positive or invalid score, aborting.");
    return { isHighScore: false };
  }
  entry.score = safeScore;
  
  // 1. Hämta nuvarande topplista INNAN vi sparar för att veta gällande rekord
  const currentLeaderboard = await getLeaderboard();
  const currentBest = currentLeaderboard.length > 0 ? currentLeaderboard[0].score : 0;

  console.log(`[v1.72] Attempting global save for ${entry.name}: ${entry.score}. Current best: ${currentBest}`);

  // 2. Spara till Firestore (Global Collection: scores)
  try {
    await addDoc(collection(db, "scores"), {
      ...entry,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Firestore save error:", e);
  }

  // 3. v1.72: ENDAST RECORD om man blir absolut #1 på listan
  const isNewGlobalBest = entry.score > currentBest;
  const isFirstEver = currentLeaderboard.length === 0 && entry.score > 0;
  const isRank1 = isNewGlobalBest || isFirstEver;

  // Spara lokalt för UI-listan
  const updatedLocalList = [...currentLeaderboard, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLocalList));
  
  console.log(`[v1.72] Rank 1 Check: ${isRank1 ? 'YES (Celebration!)' : 'NO'}`);
  
  return { isHighScore: isRank1 };
}

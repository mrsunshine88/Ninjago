
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
    // definitive v1.65: Raw fetch + client-side sort (No Index required)
  try {
    const scoresCol = collection(db, "leaderboard");
    const snapshot = await getDocs(scoresCol);
    
    // Mappa datan och logga antal för felsökning
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      const val = Number(d.score !== undefined ? d.score : d.points) || 0;
      return {
        name: d.name || "Anonym Ninja",
        score: val,
        ninja: d.ninja || "Okänd",
        date: d.date || d.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
      } as ScoreEntry;
    });
    
    // Sortera lokalt (Client-side sort)
    const sorted = data.sort((a, b) => Number(b.score) - Number(a.score));
    console.log(`[v1.65] Returning ${sorted.length} sorted scores to UI`);
    
    if (sorted.length === 0) return getLocalLeaderboard();
    return sorted.slice(0, 5);
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return getLocalLeaderboard();
  }
}

export async function saveScore(entry: ScoreEntry): Promise<{ isHighScore: boolean }> {
  console.log(`Saving score for ${entry.name}: ${entry.score}`);
  const safeScore = Number(entry.score);
  if (isNaN(safeScore) || safeScore <= 0) {
    console.warn("Attempted to save non-positive or invalid score, aborting.");
    return { isHighScore: false };
  }
  entry.score = safeScore;
  console.log(`[v1.65] Attempting global save for ${entry.name}: ${entry.score}`);

  // 1. Spara till Firestore (Global)
  try {
    await addDoc(collection(db, "leaderboard"), {
      ...entry,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Firestore save error:", e);
  }

  // 2. Spara lokalt och räkna ut rekord
  const current = await getLeaderboard();
  const isHighScore = current.length > 0 && entry.score > current[0].score;
  const isFirstEver = current.length === 0 && entry.score > 0;

  const updated = [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  
  return { isHighScore: (isHighScore || isFirstEver) && updated[0].score === entry.score };
}

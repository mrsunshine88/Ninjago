
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
  // 1. Försök hämta från Firestore (Global) om nyckel finns
  const hasFirebase = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_KEY_APP);
  if (hasFirebase) {
    try {
      console.log("Fetching from Firebase (DEBUG: no orderBy)...");
      const q = query(collection(db, "leaderboard"), limit(20)); // Temp remove orderBy to check index
      const snapshot = await getDocs(q);
      const scores = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Raw doc data:", data);
        // Stöd både 'score' och 'points' ifall gamla data fanns
        const val = Number(data.score !== undefined ? data.score : data.points) || 0;
        return {
          name: data.name || "Anonym Ninja",
          score: val,
          ninja: data.ninja || "Okänd",
          date: data.date || data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
        } as ScoreEntry;
      }).sort((a,b) => b.score - a.score);
      
      console.log(`Successfully fetched and sorted ${scores.length} scores.`);
      if (scores.length === 0) return getLocalLeaderboard();
      return scores;
    } catch (error) {
      console.error("Firebase getLeaderboard error:", error);
      return getLocalLeaderboard();
    }
  }

  // 2. Fallback till LocalStorage if Firebase not configured or not used
  return getLocalLeaderboard();
}

export async function saveScore(entry: ScoreEntry): Promise<{ isHighScore: boolean }> {
  console.log(`Saving score for ${entry.name}: ${entry.score}`);
  const safeScore = Number(entry.score);
  if (isNaN(safeScore) || safeScore <= 0) {
    console.warn("Attempted to save non-positive or invalid score, aborting.");
    return { isHighScore: false };
  }
  entry.score = safeScore;

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


export interface ScoreEntry {
  name: string;
  score: number;
  ninja: string;
  date: string;
}

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, writeBatch } from "firebase/firestore";

export async function getLeaderboard(): Promise<ScoreEntry[]> {
    // Global Sync: Force cloud fetch, NO local fallback
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
    
    // Sortera lokalt (Client-side sort) - v1.73 krav
    const sorted = data.sort((a, b) => Number(b.score) - Number(a.score));
    
    // v2.11: Returnerar tom lista om molnet är tomt
    return sorted.slice(0, 10);
  } catch (error) {
    console.error("Global Leaderboard Error:", error);
    return [];
  }
}

export async function saveScore(entry: ScoreEntry): Promise<{ isRankOne: boolean }> {
  const safeScore = Number(entry.score);
  if (isNaN(safeScore) || safeScore <= 0) {
    console.warn("Attempted to save non-positive or invalid score, aborting.");
    return { isRankOne: false };
  }
  entry.score = safeScore;
  
  // 1. Hämta nuvarande topplista INNAN vi sparar
  const currentLeaderboard = await getLeaderboard();
  const currentBest = currentLeaderboard.length > 0 ? currentLeaderboard[0].score : 0;

  // 2. v2.23: Rank 1 Check (Aggressive Sync)
  // Vi kollar om nya poängen är STÖRRE än det nuvarande rekordet
  const isRank1 = currentLeaderboard.length === 0 ? safeScore > 0 : safeScore > currentBest;

  console.log(`[v2.23] Global Sync Save. Best: ${currentBest}, New: ${safeScore}, Rank 1 Verdict: ${isRank1 ? '👑 CHAMPION!' : 'NO'}`);

  // 3. Spara till Firestore (Global Collection: scores)
  try {
    await addDoc(collection(db, "scores"), {
      name: entry.name,
      ninja: entry.ninja,
      score: Number(entry.score),
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Firestore save error:", e);
  }
  
  return { isRankOne: isRank1 };
}

export async function resetGlobalLeaderboard() {
  try {
    const scoresCol = collection(db, "scores");
    const snapshot = await getDocs(scoresCol);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error("Failed to reset leaderboard:", e);
    return false;
  }
}

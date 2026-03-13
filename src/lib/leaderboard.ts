
export interface ScoreEntry {
  name: string;
  score: number;
  ninja: string;
  date: string;
}

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, writeBatch } from "firebase/firestore";

console.log("[v1.89] Database Project ID:", db.app.options.projectId);

export async function getLeaderboard(): Promise<ScoreEntry[]> {
    // [v1.89] Global Sync: Force cloud fetch, NO local fallback
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
    console.log(`[v1.89] Global Sync: Found ${sorted.length} scores from cloud`);
    
    // v1.89: Returnerar tom lista om molnet är tomt
    return sorted.slice(0, 10);
  } catch (error) {
    console.error("Global Leaderboard Error:", error);
    return [];
  }
}

export async function saveScore(entry: ScoreEntry): Promise<{ isHighScore: boolean }> {
  const safeScore = Number(entry.score);
  if (isNaN(safeScore) || safeScore <= 0) {
    console.warn("Attempted to save non-positive or invalid score, aborting.");
    return { isHighScore: false };
  }
  entry.score = safeScore;
  
  // 1. Hämta nuvarande topplista INNAN vi sparar
  const currentLeaderboard = await getLeaderboard();
  const currentBest = currentLeaderboard.length > 0 ? currentLeaderboard[0].score : 0;

  console.log(`[v1.89] Global Sync Save. Best: ${currentBest}, New: ${entry.score}`);

  // 2. Spara till Firestore (Global Collection: scores)
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

  // 3. v1.82: Rank 1 Check (Använd > för att säkerställa att man faktiskt SLÅR rekordet)
  const isNewGlobalBest = entry.score > currentBest && entry.score > 0;
  const isFirstEver = currentLeaderboard.length === 0 && entry.score > 0;
  const isRank1 = isNewGlobalBest || isFirstEver;
  
  console.log(`[v1.89] Rank 1 Check: ${isRank1 ? 'YES (Celebration!)' : 'NO'}`);
  
  return { isHighScore: isRank1 };
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
    console.log("[v1.89] Global Leaderboard Wiped by Admin");
    return true;
  } catch (e) {
    console.error("Failed to reset leaderboard:", e);
    return false;
  }
}

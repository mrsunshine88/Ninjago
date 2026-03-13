
export interface ScoreEntry {
  name: string;
  score: number;
  ninja: string;
  date: string;
}

import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, writeBatch, where, updateDoc, doc } from "firebase/firestore";

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
    
    // v2.45: Client-side unique filter (just in case of old duplicates)
    const uniqueMap = new Map<string, ScoreEntry>();
    data.forEach(entry => {
      if (!uniqueMap.has(entry.name) || entry.score > uniqueMap.get(entry.name)!.score) {
        uniqueMap.set(entry.name, entry);
      }
    });
    
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => Number(b.score) - Number(a.score));
    
    // v2.11: Returnerar tom lista om molnet är tomt
    return sorted.slice(0, 5); // v2.45: Visar topp 5 unika
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

  // 3. [v2.45] Spara/Uppdatera Firestore (Global Collection: scores)
  try {
    const scoresCol = collection(db, "scores");
    const q = query(scoresCol, where("name", "==", entry.name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Namnet finns redan, kolla bästa poäng
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      const existingScore = Number(existingData.score || 0);

      if (safeScore > existingScore) {
        // Nytt rekord för spelaren! Uppdatera doc
        await updateDoc(doc(db, "scores", existingDoc.id), {
          score: safeScore,
          ninja: entry.ninja,
          timestamp: serverTimestamp()
        });
        console.log(`[v2.45] Updated record for ${entry.name}: ${safeScore}`);
      } else {
        console.log(`[v2.45] Score ${safeScore} is not higher than existing ${existingScore} for ${entry.name}. Skipping update.`);
      }
    } else {
      // Ny spelare! Lägg till doc
      await addDoc(collection(db, "scores"), {
        name: entry.name,
        ninja: entry.ninja,
        score: safeScore,
        timestamp: serverTimestamp()
      });
      console.log(`[v2.45] Created new record for ${entry.name}: ${safeScore}`);
    }
  } catch (e) {
    console.error("Firestore save/update error:", e);
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


"use client";

import { ScoreEntry } from "@/lib/leaderboard";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardProps {
  scores: ScoreEntry[];
}

export function Leaderboard({ scores }: LeaderboardProps) {
  return (
    <div className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border rounded-xl overflow-hidden shadow-xl">
      <div className="bg-primary/20 p-4 border-b flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="text-accent w-5 h-5" />
          Topplista
        </h3>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Topp 5</span>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {scores.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground italic">
            Inga rekord ännu. Bli den första!
          </div>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Ninja</th>
                <th className="px-4 py-2 font-medium">Poäng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {scores.slice(0, 5).map((entry, idx) => (
                <tr key={idx} className={`hover:bg-primary/5 transition-colors ${idx === 0 ? 'bg-primary/10' : ''}`}>
                  <td className="px-4 py-3 text-sm font-bold">
                    {idx === 0 ? (
                      <Medal className="w-4 h-4 text-yellow-400" />
                    ) : (
                      idx + 1
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-[10px] text-accent uppercase tracking-tighter">{entry.ninja}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {(entry.score || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

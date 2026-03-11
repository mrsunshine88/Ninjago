"use client";

import { useState, useRef, useEffect } from "react";
import { Ninja, NINJAS } from "@/lib/game-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Snowflake, Mountain, Zap, Star, Waves, Swords, Volume2, VolumeX } from "lucide-react";
import { Leaderboard } from "./Leaderboard";
import { ScoreEntry } from "@/lib/leaderboard";

const ICONS: Record<string, any> = {
  Flame, Snowflake, Mountain, Zap, Star, Waves
};

interface StartScreenProps {
  onStart: (name: string, ninja: Ninja) => void;
  scores: ScoreEntry[];
}

export function StartScreen({ onStart, scores }: StartScreenProps) {
  const [name, setName] = useState("");
  const [selectedNinja, setSelectedNinja] = useState<Ninja | null>(null);
  const [hoveredNinja, setHoveredNinja] = useState<Ninja | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const adminClicksRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canStart = name.trim().length > 0 && selectedNinja !== null;

  const handleLogoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    adminClicksRef.current += 1;
    clickTimerRef.current = setTimeout(() => { adminClicksRef.current = 0; }, 3000);

    if (adminClicksRef.current >= 5) {
      setIsAdminMode(true);
      setName("");
      adminClicksRef.current = 0;
    }
  };

  const handleAdminReset = () => {
    if (name === "020406") {
      localStorage.clear();
      window.location.reload();
    } else {
      setIsAdminMode(false);
      setName("");
    }
  };

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 gap-8 overflow-hidden cursor-default">
      {/* PWA Install Button */}
      {installPrompt && (
        <button 
          onClick={handleInstall}
          className="absolute top-6 left-6 px-6 py-3 bg-yellow-400 text-black font-black rounded-full shadow-2xl animate-bounce z-50 flex items-center gap-2 border-2 border-black"
        >
          LADDA NER APPEN 📱
        </button>
      )}

      {/* Bakgrund */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-black via-[#1a140f] to-black transition-all duration-1000 -z-20 ${hoveredNinja ? 'opacity-40 blur-sm scale-110' : 'opacity-100'}`}
      />
      
      {/* Mörkt Overlay */}
      <div className="absolute inset-0 bg-black/60 -z-10" />

      <div 
        className="text-center space-y-4 cursor-pointer select-none active:scale-95 transition-transform"
        onClick={handleLogoClick}
      >
        <div className="inline-block p-1 bg-white/10 rounded-full mb-2 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden">
          <img src="/icon.png" alt="Ninjago" className="w-32 h-32 object-cover rounded-full" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic high-score-text drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
          Ninjago
        </h1>
        <p className="text-2xl text-accent font-black tracking-[0.3em] uppercase drop-shadow-md">
          Elemental Clash
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-7xl items-start z-10">
        <div className="space-y-8">
          <div className="space-y-6 bg-black/60 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-xl font-black text-white uppercase tracking-widest">
                {isAdminMode ? "LÖSENORD:" : "Ditt Ninja-namn"}
              </Label>
              <Input 
                id="name"
                type={isAdminMode ? "password" : "text"}
                placeholder={isAdminMode ? "****" : "Skriv ditt namn..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border-white/20 h-14 text-xl font-bold focus:ring-accent text-white placeholder:text-white/40 rounded-2xl"
              />
            </div>

            {!isAdminMode && (
              <div className="space-y-4 pt-4">
                <Label className="text-xl font-black text-white uppercase tracking-widest">Välj din Ninja</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {NINJAS.map((ninja) => {
                    const IconComp = ICONS[ninja.icon] || Flame;
                    const isSelected = selectedNinja?.id === ninja.id;
                    const isHovered = hoveredNinja?.id === ninja.id;
                    
                    return (
                      <button
                        key={ninja.id}
                        onMouseEnter={() => setHoveredNinja(ninja)}
                        onMouseLeave={() => setHoveredNinja(null)}
                        onClick={() => setSelectedNinja(ninja)}
                        className={`
                          group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden
                          ${isSelected 
                            ? 'border-accent bg-accent/30 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' 
                            : 'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10'}
                        `}
                      >
                        <div 
                          className={`absolute inset-0 opacity-20 transition-all duration-500 ${isHovered || isSelected ? 'scale-110' : 'scale-100'}`}
                          style={{ backgroundColor: ninja.color }}
                        />
                        <IconComp className={`w-10 h-10 mb-2 relative z-10 ${isSelected ? 'text-accent' : 'text-white/60 group-hover:text-primary'}`} />
                        <div className="font-black text-sm uppercase relative z-10 text-white">{ninja.name}</div>
                        <div className="text-[10px] text-white/60 uppercase font-bold relative z-10">{ninja.power}</div>
                        {isSelected && <div className="absolute top-3 right-3 w-3 h-3 bg-accent rounded-full animate-ping z-10" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isAdminMode ? (
              <Button 
                onClick={handleAdminReset}
                className="w-full h-16 text-2xl font-black uppercase tracking-widest bg-accent hover:bg-accent/80 btn-game mt-6 rounded-2xl shadow-lg"
              >
                OK
              </Button>
            ) : (
              <Button 
                disabled={!canStart}
                onClick={() => onStart(name, selectedNinja!)}
                className="w-full h-16 text-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/80 btn-game mt-6 rounded-2xl shadow-[0_10px_30px_rgba(239,68,68,0.3)] disabled:opacity-30"
              >
                Starta Spelet
              </Button>
            )}
          </div>
        </div>

      <div className="hidden lg:block space-y-4">
          <Leaderboard scores={scores} />
        </div>
      </div>

      {/* Credit Text */}
      <div 
        className="absolute bottom-5 right-5 text-[#FFD700] text-[14px] md:text-[16px] font-black uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50 pointer-events-none select-none"
      >
        Game Idea & Design by Lukas Persson
      </div>
    </div>
  );
}
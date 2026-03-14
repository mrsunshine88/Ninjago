"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Ninja, NINJAS } from "@/lib/game-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Snowflake, Mountain, Zap, Star, Waves, Swords, Volume2, VolumeX } from "lucide-react";
import { Leaderboard } from "./Leaderboard";
import { ScoreEntry, getLeaderboard, resetGlobalLeaderboard } from "@/lib/leaderboard";
import { Howl } from 'howler';

const ICONS: Record<string, any> = {
  Flame, Snowflake, Mountain, Zap, Star, Waves
};

interface StartScreenProps {
  onStart: (name: string, ninja: Ninja) => void;
  scores: ScoreEntry[];
  isMuted: boolean;
  onToggleMute: () => void;
  isNyaUnlocked: boolean;
  onReset: () => void;
}

export function StartScreen({ onStart, scores, isMuted, onToggleMute, isNyaUnlocked, onReset }: StartScreenProps) {
  const [name, setName] = useState("");
  const [selectedNinja, setSelectedNinja] = useState<Ninja | null>(null);
  const [hoveredNinja, setHoveredNinja] = useState<Ninja | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [localScores, setLocalScores] = useState<ScoreEntry[]>(scores);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const refreshScores = async () => {
      const latest = await getLeaderboard();
      if (latest && latest.length > 0) {
        setLocalScores(latest);
      }
    };
    refreshScores();
  }, []); // Run on mount

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

  const handleAdminReset = useCallback(async () => {
    if (name === "020406") {
      // Cleanest Reset: localStorage + State + Redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ninjago-scores');
        localStorage.setItem('ninjago_emergency_score', '0');

        // Denna rad nollställer karaktärer och spelets inre logik
        onReset();
      }

      await resetGlobalLeaderboard();
      setLocalScores([]);

      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);

      setIsAdminMode(false);
      setName("");
    }
  }, [name, onReset]);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // PWA Install Logic: Capture from global window
    const checkPrompt = () => {
      if ((window as any).deferredPrompt) {
        setInstallPrompt((window as any).deferredPrompt);
        setTimeout(() => setShowInstallBanner(true), 2000);
      }
    };

    checkPrompt();
    window.addEventListener("pwa-prompt-available", checkPrompt);

    const handler = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setInstallPrompt(e);
      setTimeout(() => setShowInstallBanner(true), 1000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-prompt-available", checkPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    // [v2.30] Wake up Audio
    if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume();

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
    setShowInstallBanner(false);
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col items-center justify-start md:justify-center pt-8 pb-24 px-4 md:p-6 gap-6 md:gap-8 overflow-y-auto overflow-x-hidden cursor-default" suppressHydrationWarning>
      {/* PWA Install Banner - [v3.23] Hydration Safe Width Check */}
      {isMounted && showInstallBanner && installPrompt && window.innerWidth < 768 && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg mx-4 mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.5)] border-4 border-white p-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-4">
              <img src="/icon.png" className="w-16 h-16 rounded-2xl shadow-lg flex-shrink-0" alt="Ninjago" />
              <div className="flex-1">
                <div className="text-black font-black text-xl uppercase leading-tight">Lägg till på startsidan!</div>
                <div className="text-black/70 text-sm font-bold mt-0.5">Spela Ninjago som en riktig app 🥷</div>
              </div>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-black/50 text-2xl font-black hover:text-black leading-none w-8 h-8 flex items-center justify-center"
              >✕</button>
            </div>
            <button
              onClick={handleInstall}
              className="mt-4 w-full py-4 bg-black text-yellow-400 font-black text-xl uppercase rounded-2xl shadow-lg active:scale-95 transition-all tracking-widest"
            >
              📲 INSTALLERA NU!
            </button>
          </div>
        </div>
      )}

      {/* [v3.23] Hydration Safe Width Check */}
      {isMounted && installPrompt && !showInstallBanner && window.innerWidth < 768 && (
        <button
          onClick={() => setShowInstallBanner(true)}
          className="absolute top-6 left-6 px-4 py-2 bg-yellow-400 text-black font-black rounded-full shadow-2xl z-50 flex items-center gap-2 border-2 border-black text-sm"
        >
          📲 INSTALLERA
        </button>
      )}

      {/* Mute Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (typeof onToggleMute === 'function') {
            onToggleMute();
          }
        }}
        onPointerDown={(e) => { e.stopPropagation(); }}
        className={`absolute top-6 right-6 p-4 backdrop-blur-xl border rounded-2xl shadow-2xl z-50 transition-all active:scale-95 group ${isMuted
          ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
          : "bg-white/10 border-white/20 hover:bg-white/20"
          }`}
        title={isMuted ? "Slå på ljud" : "Stäng av ljud"}
      >
        {isMounted ? (
          isMuted ? (
            <VolumeX className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          ) : (
            <Volume2 className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
          )
        ) : (
          <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse" />
        )}
      </button>

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
          <img src="/icon.png" alt="Ninjago" className="w-20 h-20 md:w-32 md:h-32 object-cover rounded-full" />
        </div>
        <h1 className="text-4xl md:text-8xl font-black tracking-tighter uppercase italic high-score-text drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
          Ninjago
        </h1>
        <p className="text-lg md:text-2xl text-accent font-black tracking-[0.3em] uppercase drop-shadow-md">
          Elemental Clash
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full max-w-7xl items-start z-10 mb-20 md:mb-0">
        <div className="space-y-6">
          <div className="space-y-4 md:space-y-6 bg-black/60 backdrop-blur-2xl p-4 md:p-8 rounded-[32px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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

            <div className={`space-y-4 pt-2 transition-all ${(!isAdminMode && isMounted) ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden pointer-events-none'}`}>
              <Label className="text-lg md:text-xl font-black text-white uppercase tracking-widest text-center block">Välj din Ninja</Label>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                {NINJAS.map((ninja) => {
                  const IconComp = ICONS[ninja.icon] || Flame;
                  const isSelected = selectedNinja?.id === ninja.id;
                  const isHovered = hoveredNinja?.id === ninja.id;
                  const isNya = ninja.id === 'nya_smith';
                  const isLocked = isNya && !isNyaUnlocked;

                  return (
                    <button
                      key={ninja.id}
                      onMouseEnter={() => !isLocked && setHoveredNinja(ninja)}
                      onMouseLeave={() => setHoveredNinja(null)}
                      onClick={() => !isLocked && setSelectedNinja(ninja)}
                      disabled={isLocked}
                      className={`
                          group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden
                          ${isSelected
                          ? 'border-accent bg-accent/30 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105'
                          : isLocked
                            ? 'border-white/10 bg-black/60'
                            : 'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10'}
                        `}
                    >
                      <div
                        className={`absolute inset-0 opacity-20 transition-all duration-500 ${isHovered || isSelected ? 'scale-110' : 'scale-100'}`}
                        style={{ backgroundColor: isLocked ? '#333' : ninja.color }}
                      />

                      {isLocked ? (
                        <div className="flex flex-col items-center justify-center py-2 relative z-10 w-full translate-y-2">
                          <img src="/Nya Smith.png" alt="Nya Smith" className="w-12 h-12 mb-2 relative z-10 object-contain" />
                          <div className="font-black text-[10px] uppercase text-white/40 text-center leading-tight">Nå 20 000p för att låsa upp</div>
                        </div>
                      ) : (
                        <>
                          <div className="relative mb-2">
                            <IconComp className={`w-10 h-10 relative z-10 ${isSelected ? 'text-accent' : 'text-white/60 group-hover:text-primary'}`} />
                          </div>
                          <div className="font-black text-sm uppercase relative z-10 text-white flex items-center gap-1">
                            {ninja.id === 'kai' && '🔥'}
                            {ninja.id === 'jay' && '⚡'}
                            {ninja.id === 'zane' && '❄️'}
                            {ninja.id === 'cole' && '🪨'}
                            {ninja.id === 'lloyd' && '⭐'}
                            {isMounted && isNya && <Waves className="w-4 h-4 text-[#00ccff]" />}
                            {ninja.name}
                          </div>
                          <div className="text-[10px] text-white/60 uppercase font-bold relative z-10 flex justify-between w-full">
                            <span>{ninja.power}</span>
                            <span className="text-accent">
                              STYRKA: {ninja.id === 'lloyd' ? '95' :
                                ninja.id === 'cole' ? '80' :
                                  ninja.id === 'kai' ? '70' :
                                    ninja.id === 'jay' ? '60' :
                                      ninja.id === 'zane' ? '50' :
                                        ninja.id === 'nya_smith' ? '20' : '0'}
                            </span>
                          </div>
                          {isSelected && <div className="absolute top-3 right-3 w-3 h-3 bg-accent rounded-full animate-ping z-10" />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

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
                onClick={() => {
                  // [v2.30] Wake up Audio
                  if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume();

                  const recordElem = document.documentElement as any;
                  if (recordElem.requestFullscreen) {
                    recordElem.requestFullscreen().catch((err: any) => { });
                  } else if (recordElem.webkitRequestFullscreen) {
                    recordElem.webkitRequestFullscreen();
                  } else if (recordElem.msRequestFullscreen) {
                    recordElem.msRequestFullscreen();
                  }

                  // [v2.42] Removed localStorage.clear() to preserve unlock status

                  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    document.body.style.overflow = 'hidden';
                    document.body.style.touchAction = 'none';
                    document.body.style.overscrollBehavior = 'none';
                  }
                  onStart(name, selectedNinja!);
                }}
                className="w-full h-16 text-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/80 btn-game mt-6 rounded-2xl shadow-[0_10px_30px_rgba(239,68,68,0.3)] disabled:opacity-30"
              >
                Starta Spelet
              </Button>
            )}
          </div>
        </div>

        {/* [v3.51] Leaderboard - Restored and Scrollable on all devices */}
        <div className="w-full mt-4 max-h-[180px] md:max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/60 p-2 shadow-inner">
          <Leaderboard scores={localScores} />
        </div>
      </div>


      {/* [v3.55] Bottom info row - Moved to flow to avoid overlap on small screens */}
      <div className="w-full mt-12 mb-8 px-4 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-none select-none border-t border-white/5 pt-8">
        {/* Version Tag */}
        <div className="text-white/50 text-[12px] font-black uppercase tracking-[0.2em] italic flex items-center gap-2">
          <span className="text-primary group-hover:text-white transition-colors">v3.70</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="bg-red-500/10 text-red-500/60 px-2 py-0.5 rounded text-[10px]">ULTIMATE BOSSES</span>
        </div>
        
        {/* Credit Text */}
        <div className="text-[#FFD700] text-[11px] font-black uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-nowrap opacity-60">
          Game Idea & Design by Lukas Persson
        </div>
      </div>
    </div>
  );
}
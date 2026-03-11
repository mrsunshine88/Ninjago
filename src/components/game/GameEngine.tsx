"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Ninja, Level } from '@/lib/game-data';

const SPRITE_SHEET_URL = "/sprite.png"; 

interface GameEngineProps {
  ninja: Ninja;
  level: Level;
  playerName: string;
  onGameOver: (score: number) => void;
  onLevelComplete: (points: number) => void;
}

function AnimatedScore({ value, onTick }: { value: number, onTick?: () => void }) {
  const [displayValue, setDisplayValue] = useState(0);
  const lastTickValue = useRef(0);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) { setDisplayValue(value); return; }
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      if (Math.floor(current / 100) > Math.floor(lastTickValue.current / 100)) {
        onTick?.();
        lastTickValue.current = current;
      }
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{displayValue.toLocaleString()}</span>;
}

export function GameEngine({ ninja, level, playerName, onGameOver, onLevelComplete }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [spinEnergy, setSpinEnergy] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showLevelWin, setShowLevelWin] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [levelStats, setLevelStats] = useState({ rank: 'B', bonus: 0, time: 0, timeBonus: 0, monsterPoints: 0, baseBossPoints: 0 });
  const levelIntroTimer = useRef(120);
  
  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isiOS, setIsiOS] = useState(false);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const hasTriggeredEnd = useRef(false);
  const gameState = useRef({ started: false, active: true });
  const keys = useRef<{ [key: string]: boolean }>({});
  const touchInput = useRef<{ [key: string]: boolean }>({ left: false, right: false, jump: false, fire: false, spin: false });
  const spriteSheet = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setIsGameOver(false);
    setShowLevelWin(false);
    hasTriggeredEnd.current = false;
    gameState.current.active = true;
  }, [level]);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsiOS(ios);

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => console.log('SW registered: ', registration),
          (registrationError) => console.log('SW registration failed: ', registrationError)
        );
      });
    }

    const loadAudio = (src: string) => {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
    };

    audioRefs.current = {
      menuMusic: loadAudio('/audio/ninjago_menu_music_8bit.wav'),
      battleMusic: loadAudio('/audio/ninjago_battle_music_8bit.wav'),
      bossMusic: loadAudio('/audio/ninjago_boss_music_8bit.wav'),
      spinSfx: loadAudio('/audio/sfx_spinjitzu_8bit.wav'),
      lightningSfx: loadAudio('/audio/sfx_lightning_8bit.wav'),
      hitSfx: loadAudio('/audio/sfx_sword_hit_8bit.wav'),
      victorySfx: loadAudio('/audio/sfx_victory_fanfare.wav'),
      tickSfx: loadAudio('/audio/sfx_tick.wav'),
    };
    
    Object.values(audioRefs.current).forEach(a => { if (a) { a.volume = 0.5; if (a.src.includes('music')) a.loop = true; } });
    
    const img = new Image();
    img.src = SPRITE_SHEET_URL;
    img.onload = () => { spriteSheet.current = img; setImageLoaded(true); };

    const handleKey = (e: KeyboardEvent, val: boolean) => { keys.current[e.code] = val; };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    
    return () => { 
      gameState.current.active = false;
      Object.values(audioRefs.current).forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!imageLoaded || !spriteSheet.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let rafId: number;
    let frameCount = 0;
    let cameraX = 0;
    let scoreInternal = 0;

    const player = {
      x: 100, y: 400, width: 85, height: 105, dx: 0, dy: 0,
      jumping: false, facingRight: true, energy: 0,
      isSpinjitzu: false, spinTimer: 0, rotation: 0, fireCooldown: 0
    };

    const platforms = [
      { x: 0, y: 550, width: 2500, height: 100 },
      ...Array.from({ length: 15 }, (_, i) => ({
        x: 2500 + i * 600, y: 350 + Math.random() * 150, width: 300, height: 50
      })),
      { x: 0, y: 550, width: 10000, height: 100 }
    ];

    const enemies = Array.from({ length: 25 }, (_, i) => ({
      x: 1500 + i * 500, y: 450, width: 90, height: 110, dx: 2, originalX: 1500 + i * 500,
      dy: 0, jumping: false, isAlert: false, spriteRow: 2, spriteCol: Math.floor(Math.random() * 5)
    }));

    const boss = { 
      x: 9500, y: 300, width: 220, height: 260, hp: level.boss.healthMultiplier * 15, maxHp: level.boss.healthMultiplier * 15,
      active: false, spriteRow: level.boss.spriteRow, spriteCol: level.boss.spriteCol, timer: 0
    };

    let particles: any[] = [];
    let projectiles: any[] = [];

    function drawSprite(row: number, col: number, x: number, y: number, w: number, h: number, flip = false, wobble = 0) {
      if (!spriteSheet.current) return;
      ctx!.save();
      ctx!.translate(x + w/2, y + h/2);
      ctx!.rotate(wobble);
      ctx!.scale(flip ? -1 : 1, 1);
      // PERFEKT KALIBRERING: 1024px / 6 kolumner = 170.6px per sprite
      const cols = 6;
      const sw = 1024 / cols; 
      const sh = 682 / 4;
      
      // Offset och padding för att centrera figuren perfekt
      const paddingX = sw * 0.1;
      const paddingY = sh * 0.05;
      const sx = col * sw + paddingX;
      const sy = row * sh + paddingY;
      const swInner = sw - (paddingX * 2);
      const shInner = sh - (paddingY * 1.5);
      ctx!.drawImage(spriteSheet.current, sx, sy, swInner, shInner, -w/2, -h/2, w, h);
      ctx!.restore();
    }

    const loop = () => {
      if (!gameState.current.active) return;
      if (!gameState.current.started) { rafId = requestAnimationFrame(loop); return; }

      frameCount++;
      if (frameCount % 60 === 0) setCurrentTime(p => p + 1);

      const moveL = keys.current['ArrowLeft'] || touchInput.current.left;
      const moveR = keys.current['ArrowRight'] || touchInput.current.right;
      if (moveL) { player.dx -= 1.1; player.facingRight = false; }
      if (moveR) { player.dx += 1.1; player.facingRight = true; }
      player.dx *= 0.85; player.dy += 0.5; player.x += player.dx; player.y += player.dy;

      platforms.forEach(p => {
        if (player.x < p.x + p.width && player.x + player.width > p.x && player.y + player.height > p.y && player.y + player.height < p.y + p.height + player.dy + 1) {
          player.y = p.y - player.height; player.dy = 0; player.jumping = false;
        }
      });
      if ((keys.current['Space'] || touchInput.current.jump) && !player.jumping) { player.dy = -13.5; player.jumping = true; }
      cameraX = Math.max(0, Math.min(player.x - 350, 9500));

      if ((keys.current['KeyX'] || touchInput.current.fire) && player.fireCooldown <= 0 && !player.isSpinjitzu) {
        if (audioRefs.current.lightningSfx) { audioRefs.current.lightningSfx.currentTime = 0; audioRefs.current.lightningSfx.play().catch(()=>{}); }
        projectiles.push({ x: player.facingRight ? player.x + 80 : player.x, y: player.y + 50, dx: player.facingRight ? 16 : -16, color: ninja.color, size: 15 });
        player.fireCooldown = 25;
      }
      if (player.fireCooldown > 0) player.fireCooldown--;

      if ((keys.current['KeyZ'] || keys.current['Keyz'] || touchInput.current.spin) && player.energy >= 100 && !player.isSpinjitzu) {
        player.isSpinjitzu = true; player.spinTimer = 180; player.energy = 0; setSpinEnergy(0);
        if (audioRefs.current.spinSfx) { audioRefs.current.spinSfx.currentTime = 0; audioRefs.current.spinSfx.play().catch(()=>{}); }
      }
      if (player.isSpinjitzu) { player.spinTimer--; player.rotation += 0.8; player.dx = player.facingRight ? 12 : -12; if (player.spinTimer <= 0) player.isSpinjitzu = false; }

      enemies.forEach((e, i) => {
        const distToPlayer = Math.abs(player.x - e.x);
        if (distToPlayer < 600 && !e.isAlert) {
          e.isAlert = true;
          enemies.forEach(n => { if (Math.abs(n.x - e.x) < 800) n.isAlert = true; });
        }
        if (e.isAlert) {
          e.dx = (player.x > e.x ? 4.5 : -4.5);
          e.x += e.dx;
          if (distToPlayer < 300 && !e.jumping && Math.random() < 0.02) { e.dy = -11; e.jumping = true; }
        } else {
          e.x += e.dx; if (Math.abs(e.x - e.originalX) > 300) e.dx *= -1;
        }
        e.dy += 0.5; e.y += e.dy;
        platforms.forEach(p => { if (e.x < p.x + p.width && e.x + e.width > p.x && e.y + e.height > p.y && e.y + e.height < p.y + p.height + e.dy) { e.y = p.y - e.height; e.dy = 0; e.jumping = false; } });

        if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) {
          if (player.isSpinjitzu) { 
            enemies.splice(i, 1); scoreInternal += 100; setCurrentScore(scoreInternal);
            for(let k=0; k<12; k++) particles.push({ x: e.x+40, y: e.y+50, dx: (Math.random()-0.5)*12, dy: (Math.random()-0.5)*12, life: 40, color: '#999', size: 10 });
          } else {
            gameState.current.active = false;
            handleGameOver(scoreInternal);
            return;
          }
        }
      });

      projectiles.forEach((p, i) => {
        p.x += p.dx;
        enemies.forEach((e, ei) => {
          if (p.x > e.x && p.x < e.x + e.width && p.y > e.y - 20 && p.y < e.y + e.height) {
            enemies.splice(ei, 1); scoreInternal += 100; setCurrentScore(scoreInternal);
            player.energy = Math.min(100, player.energy + 15); setSpinEnergy(player.energy);
            projectiles.splice(i, 1);
            for(let k=0; k<10; k++) particles.push({ x: e.x+40, y: e.y+50, dx: (Math.random()-0.5)*10, dy: (Math.random()-0.5)*10, life: 35, color: '#f00', size: 8 });
          }
        });
        if (boss.active && p.x > boss.x && p.x < boss.x + boss.width && p.y > boss.y && p.y < boss.y + boss.height) { boss.hp--; projectiles.splice(i, 1); if (boss.hp <= 0) { gameState.current.active = false; handleLevelWin(scoreInternal + 10000, frameCount, 10000); } }
        if (Math.abs(p.x - player.x) > 1200) projectiles.splice(i, 1);
      });

      ctx.fillStyle = level.bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(-cameraX, 0);
      ctx.fillStyle = level.platformColor;
      platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
      enemies.forEach(e => {
        drawSprite(e.spriteRow, e.spriteCol, e.x, e.y, e.width, e.height, e.dx > 0, Math.sin(frameCount * 0.15) * 0.1);
        if (e.isAlert) {
            ctx.fillStyle = '#f00'; ctx.font = 'bold 40px Arial'; ctx.textAlign='center'; ctx.fillText('!', e.x + 45, e.y - 30);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeText('!', e.x + 45, e.y - 30);
        }
      });
      if (player.isSpinjitzu) {
        ctx.save(); ctx.translate(player.x + 42, player.y + 52); ctx.rotate(player.rotation); ctx.fillStyle = ninja.color;
        for(let n=0; n<8; n++){ ctx.rotate(Math.PI/4); ctx.beginPath(); ctx.ellipse(0,0, 40, 130, 0, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      } else {
        drawSprite(0, ninja.spriteCol, player.x, player.y, player.width, player.height, !player.facingRight, Math.sin(frameCount * 0.2) * 0.05);
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText(playerName, player.x + 42, player.y - 15);
      if (cameraX > 8500) {
        boss.active = true; boss.timer++; boss.x += Math.sin(boss.timer * 0.04) * 6;
        drawSprite(boss.spriteRow, boss.spriteCol, boss.x, boss.y, boss.width, boss.height, player.x > boss.x);
        ctx.fillStyle = '#111'; ctx.fillRect(cameraX + 150, 40, 500, 25);
        ctx.fillStyle = '#f00'; ctx.fillRect(cameraX + 150, 40, (boss.hp/boss.maxHp)*500, 25);
      }
      particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy; p.life--; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.life <= 0) particles.splice(i, 1);
      });
      ctx.restore();

      if (scoreInternal !== currentScore) setCurrentScore(scoreInternal);
      if (levelIntroTimer.current > 0) {
        levelIntroTimer.current -= 2;
        ctx.fillStyle = `rgba(0,0,0,${Math.max(0, levelIntroTimer.current/120)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (player.y > 800) { gameState.current.active = false; handleGameOver(scoreInternal); }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafId); };
  }, [imageLoaded, level, ninja]);

  const handleGameOver = (score: number) => { 
    if (hasTriggeredEnd.current) return; 
    hasTriggeredEnd.current = true;
    setLastScore(score); setIsGameOver(true); onGameOver(score); 
  };
  
  const handleLevelWin = (score: number, frames: number, bp: number) => { 
    if (hasTriggeredEnd.current) return; 
    hasTriggeredEnd.current = true; 
    setLastScore(score); setShowLevelWin(true); 
    if (audioRefs.current.victorySfx) audioRefs.current.victorySfx.play().catch(()=>{});
  };

  const handleStartGame = () => {
    setGameStarted(true);
    gameState.current.started = true;
    if (audioRefs.current.menuMusic) audioRefs.current.menuMusic.pause();
    const bMusic = audioRefs.current.battleMusic;
    if (bMusic) {
        bMusic.currentTime = 0;
        bMusic.play().catch(e => console.log("Music blocked by browser"));
    }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        }
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      });
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-3xl border-4 border-white/20">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />
      {!gameStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="max-w-md w-full p-10 rounded-[2rem] bg-white/10 border border-white/20 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-8 text-center">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">Mästare {playerName}</h2>
            <div className="w-full space-y-4">
              <button onClick={handleStartGame} className="w-full py-6 bg-gradient-to-r from-red-600 to-orange-500 text-white text-3xl font-black rounded-2xl border-b-8 border-red-800 active:border-0 active:translate-y-2 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]">STARTA SPELET</button>
              
              {showInstallBtn && (
                <button onClick={handleInstallClick} className="w-full py-4 bg-white/10 text-white font-bold rounded-xl border border-white/20 flex items-center justify-center gap-3 hover:bg-white/20 transition-all uppercase text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Hämta Appen
                </button>
              )}

              {isiOS && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                  <p className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Installation på iOS: 
                  </p>
                  <p className="mt-1 opacity-80">Klicka på "Dela" och sedan på "Lägg till på hemskärmen" för att installera.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {gameStarted && (
        <div className="absolute top-4 left-8 flex gap-6 pointer-events-none">
           <div className="p-3 bg-black/60 rounded-2xl border border-white/10 min-w-[100px] flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase font-bold">Tid</span>
              <span className="text-2xl font-black text-white">{Math.floor(currentTime / 60).toString().padStart(2, '0')}:{(currentTime % 60).toString().padStart(2, '0')}</span>
           </div>
           <div className="p-3 bg-black/60 rounded-2xl border border-white/10 min-w-[120px] flex flex-col items-center">
              <span className="text-[10px] text-white/50 uppercase font-bold">Poäng</span>
              <span className="text-2xl font-black text-red-500">{currentScore}</span>
           </div>
        </div>
      )}
      {showLevelWin && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-2xl">
           <div className="p-12 rounded-[3.5rem] bg-white/10 border border-white/30 shadow-2xl flex flex-col items-center gap-8 text-center max-w-lg w-full text-white">
              <h1 className="text-7xl font-black text-yellow-400 uppercase italic">Bana Klar!</h1>
              <div className="text-5xl font-black"><AnimatedScore value={lastScore} onTick={() => (audioRefs.current.tickSfx?.cloneNode(true) as HTMLAudioElement).play()} /></div>
              <button onClick={() => onLevelComplete(lastScore)} className="w-full py-5 bg-green-600 text-white font-black text-2xl rounded-2xl">NÄSTA BANA</button>
           </div>
        </div>
      )}
      {isGameOver && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl">
           <div className="p-12 rounded-[3.5rem] bg-white/10 border border-red-500/50 shadow-2xl flex flex-col items-center gap-6 text-center text-white">
              <h2 className="text-6xl font-black uppercase text-red-500 italic font-black">Banan Slut</h2>
              <div className="text-7xl font-black text-white">{lastScore}</div>
              <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white/10 text-white rounded-2xl border-2 border-white/20 font-black uppercase transition-all">FÖRSÖK IGEN</button>
           </div>
        </div>
      )}
      <div className="absolute top-4 right-8">
        <div className="w-48 h-8 bg-black/60 rounded-full border-2 border-white/20 p-1">
          <div className={`h-full bg-yellow-400 rounded-full transition-all duration-300 ${spinEnergy >= 100 ? 'animate-pulse shadow-[0_0_15px_#fbbf24]' : ''}`} style={{ width: `${spinEnergy}%` }} />
        </div>
      </div>
      {isMobile && gameStarted && (
        <div className="absolute inset-0 pointer-events-none p-6 select-none">
          <div className="absolute bottom-10 left-10 flex gap-6 pointer-events-auto">
            <button onPointerDown={()=>touchInput.current.left=true} onPointerUp={()=>touchInput.current.left=false} className="w-24 h-24 bg-white/10 rounded-2xl text-white text-5xl flex items-center justify-center border-b-4 border-white/20 active:border-0 active:translate-y-1">←</button>
            <button onPointerDown={()=>touchInput.current.right=true} onPointerUp={()=>touchInput.current.right=false} className="w-24 h-24 bg-white/10 rounded-2xl text-white text-5xl flex items-center justify-center border-b-4 border-white/20 active:border-0 active:translate-y-1">→</button>
          </div>
          <div className="absolute bottom-10 right-10 flex flex-row items-end gap-5 pointer-events-auto">
            <button onPointerDown={()=>touchInput.current.spin=true} onPointerUp={()=>touchInput.current.spin=false} className={`w-28 h-28 rounded-full border-4 font-black transition-all flex items-center justify-center shadow-xl ${spinEnergy >= 100 ? 'bg-yellow-400 text-black border-yellow-200 scale-110 shadow-[0_0_30px_#fbbf24]' : 'bg-white/5 text-white/40 border-white/10'}`}>SPIN</button>
            <button onPointerDown={()=>touchInput.current.fire=true} onPointerUp={()=>touchInput.current.fire=false} className="w-24 h-24 bg-red-600/40 rounded-full text-white font-black flex items-center justify-center border-4 border-red-500/20 active:scale-95 shadow-lg text-[10px]">ANFALL</button>
            <button onPointerDown={()=>touchInput.current.jump=true} onPointerUp={()=>touchInput.current.jump=false} className="w-32 h-32 bg-blue-600/40 rounded-full text-white font-black text-2xl flex items-center justify-center border-4 border-blue-500/20 active:scale-95 shadow-xl">HOPP</button>
          </div>
        </div>
      )}
    </div>
  );
}

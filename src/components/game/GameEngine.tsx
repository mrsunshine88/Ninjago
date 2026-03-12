"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Ninja, Level } from '@/lib/game-data';
import { getLeaderboard } from '@/lib/leaderboard';

interface Particle {
    x: number; y: number; dx: number; dy: number; 
    life: number; size: number; color: string; 
    type: 'smoke' | 'spark' | 'ember' | 'snow' | 'rain' | 'dust' | 'vortex' | 'fire' | 'lightning' | 'void';
}

interface GameEngineProps {
  ninja: Ninja;
  level: Level;
  playerName: string;
  initialScore: number;
  isMuted: boolean;
  onGameOver: (score: number) => void;
  onLevelComplete: (points: number) => void;
}

export function GameEngine({ ninja, level, playerName, initialScore = 0, isMuted, onGameOver, onLevelComplete }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showLevelIntro, setShowLevelIntro] = useState(false);
  const cleanedImages = useRef<Record<string, HTMLCanvasElement>>({});
  const [currentScore, setCurrentScore] = useState(Number(initialScore) || 0);
  const [spinEnergy, setSpinEnergy] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  // Använd refs för att undvika stale closures i loopen
  const onGameOverRef = useRef(onGameOver);
  const onLevelCompleteRef = useRef(onLevelComplete);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onLevelCompleteRef.current = onLevelComplete;
    isMutedRef.current = isMuted;

    // Uppdatera volym på bakgrundsmusik direkt
    if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : 0.4;
    }
  }, [onGameOver, onLevelComplete, isMuted]);
  const [lives, setLives] = useState(3);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const state = useRef({
    started: false,
    active: true,
    score: Number(initialScore) || 0,
    energy: 0,
    cameraX: 0,
    timeLeft: 0,
    highScore: 0,
    x: 100, y: 350, dx: 0, dy: 0,
    fR: true, jump: false, jumpReq: false, spin: false, spinT: 0, 
    enemies: [] as any[],
    projs: [] as any[],
    bossProjs: [] as any[],
    plats: [] as any[],
    particles: [] as Particle[],
    boss: { hp: 1, max: 1, active: false, x: 0, y: 0, w: 0, h: 0, img: '', attackCd: 0, hitT: 0 },
    shake: 0,
    initDone: false,
    // Nya features
    lives: 3,
    invincible: 0,      // Nedcount i frames (60fps = 120 frames = 2 sek)
    combo: 0,           // Antal kills i rad
    comboTimer: 0,      // Nedcount för att nollställa combo
    coins: [] as {x: number, y: number, collected: boolean}[],
    comboTextLife: 0,   // Hur länge combo-texten visas
    comboTextVal: 0,    // Vilket combovärde att visa
    fireReq: false,     // Skjut-begäran (för klick istället för hold)
    scorePopups: [] as {x: number, y: number, text: string, life: number}[],
  });

  const touch = useRef({ left: false, right: false, jump: false, fire: false, spin: false });
  const keys = useRef<{ [key: string]: boolean }>({});
  const images = useRef<{ [key: string]: HTMLImageElement }>({});

  const monsterFiles = [
    'Blå orm.png', 'Grön demon.png', 'Grön orm.png', 'Guld svart orm.png', 
    'Lila orm.png', 'Röd orm.png', 'Skelette.png', 'fiender ond.png', 
    'lila svart monster.png', 'lila svart stor orm.png', 'stor drake.png', 'storm arg orm.png'
  ];

  const playSFX = (file: string, vol = 0.4) => {
    if (isMutedRef.current) return;
    const audio = new Audio(`/audio/${file}`);
    audio.volume = vol;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    
    state.current.initDone = false;
    setGameStarted(false);
    setShowLevelIntro(true); // Visa nivå-introduktion
    
    // Visa nivå-introduktion i 3 sekunder, starta sedan (eller visa startknapp)
    const timer = setTimeout(() => {
        setShowLevelIntro(false);
        if (level.number > 1) {
            setGameStarted(true);
        }
    }, 3000);
    
    const handleInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    const loadLB = async () => {
        const lb = await getLeaderboard();
        if (lb && lb.length > 0) {
            setHighScore(lb[0].score);
            state.current.highScore = lb[0].score;
        }
    };
    loadLB();

    const heroFiles = ['kai.png', 'Jay.png', 'zane.png', 'Cole.png', 'Lloyd.png', 'Nya.png'];
    heroFiles.forEach(f => {
      const img = new Image();
      img.src = `/${f}`;
      images.current[f.split('.')[0].toLowerCase()] = img;
    });

    monsterFiles.forEach(f => {
      const img = new Image();
      img.src = `/${encodeURIComponent(f)}`;
      images.current[f.toLowerCase()] = img;
    });

    const handleKey = (e: KeyboardEvent, v: boolean) => {
        const k = e.key.toLowerCase();
        if (k === 'x' && v && !keys.current['KeyX']) {
            state.current.fireReq = true;
        }
        keys.current[e.code] = v;
        if (k === 'x') keys.current['KeyX'] = v;
        if (k === 'z') {
            keys.current['KeyZ'] = v;
            if (v && state.current.energy >= 100) { state.current.spin = true; state.current.spinT = 150; state.current.energy = 0; }
        }
        if (k === ' ' || e.code === 'Space') {
            keys.current['Space'] = v;
            if (v) state.current.jumpReq = true;
        }
    };

    const kd = (e: KeyboardEvent) => handleKey(e, true);
    const ku = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    return () => { 
        clearTimeout(timer);
        state.current.active = false; 
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [level, ninja]);

  const handleStartGame = async () => {
    state.current.started = true;
    setGameStarted(true);
    
    // Automatisk helskärm på mobil
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } catch (e) {}
    
    playSFX('lolo_s-start-474092.mp3', 0.8);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    state.current.active = true;

    if (!state.current.initDone) {
        const len = level?.length || 8000;
        const platforms: any[] = [];
        platforms.push({ x: 0, y: 560, w: len, h: 200 }); 
        
        let curX = 1200;
        while (curX < len - 1000) { 
            // Höjd (y-position): 150 till 350 för att garantera spelrum under plattformen (marken är på 560)
            const h = 150 + Math.random() * 200; 
            const w = 400 + Math.random() * 800;
            platforms.push({ x: curX, y: h, w, h: 40 }); 
            if (Math.random() > 0.5) platforms.push({ x: curX - 100, y: 480, w: 100, h: 60 });
            curX += w + 200 + Math.random() * 400;
        }
        
        // Garantera en arena-plattform vid bossen som spelaren faktiskt ser
        platforms.push({ x: len - 1800, y: 560, w: 1800, h: 200 }); // Förläng marken i slutet
        platforms.push({ x: len - 1500, y: 450, w: 1000, h: 50 });  // Extra plattform hos bossen
        
        state.current.plats = platforms;
        
        // Smart fiendegenerering: Anpassad svårighetsgrad per nivå
        const enemies: any[] = [];
        const lvlNum = level.number || 1;
        
        platforms.forEach((p, i) => {
            if (i === 0 || p.w < 200) return;
            
            // Nivå 1: max 2 fiender per plattform, nivå 6: max 5
            const maxE = Math.min(5, 1 + Math.floor(lvlNum * 0.8));
            const count = Math.floor(Math.random() * maxE) + 1; 
            
            for (let j = 0; j < count; j++) {
                // Högre tröskel = färre fiender på lägre nivåer
                const spawnThreshold = 0.7 - (lvlNum * 0.08); // Nivå 1: 62% chans, Nivå 6: 22% chans (inverterat: Math.random() > threshold)
                if (Math.random() > spawnThreshold) {
                    const offset = (p.w / (count + 1)) * (j + 1);
                    const enemyX = p.x + offset;
                    const mFile = monsterFiles[Math.floor(Math.random() * monsterFiles.length)];
                    // Hastighet skalas med nivå: Nivå 1 slow, Nivå 6 fast
                    const speed = 1.0 + (lvlNum - 1) * 0.5 + Math.random() * 0.5;
                    enemies.push({ 
                        x: enemyX, 
                        y: p.y - 140, 
                        w: 120, 
                        h: 140, 
                        dx: -speed,
                        dy: 0, 
                        img: mFile.toLowerCase(), 
                        origX: enemyX, 
                        range: p.w / (count > 1 ? 1.5 : 1), 
                        onG: true 
                    });
                }
            }
        });

        // Extra markfiender: Fler på högre nivåer
        const groundEnemyInterval = Math.max(600, 2000 - lvlNum * 250);
        for (let gx = 1500; gx < len - 3000; gx += (groundEnemyInterval + Math.random() * 800)) {
            const mFile = monsterFiles[Math.floor(Math.random() * monsterFiles.length)];
            const speed = 1.0 + (lvlNum - 1) * 0.5 + Math.random() * 0.8;
            enemies.push({
                x: gx, 
                y: 420,
                w: 120, h: 140,
                dx: -speed, 
                dy: 0,
                img: mFile.toLowerCase(),
                origX: gx, 
                range: 400 + Math.random() * 600,
                onG: true
            });
        }
        state.current.enemies = enemies;

        let bossImg = 'overlord.png';
        if (level.number === 1) bossImg = 'stor drake.png';
        else if (level.number === 2) bossImg = 'lila svart stor orm.png';
        else if (level.number === 3) bossImg = 'storm arg orm.png';
        else if (level.number === 4) bossImg = 'grön demon.png';
        else if (level.number === 5) bossImg = 'lila svart monster.png';
        else if (level.number === 6 && !images.current['overlord']) bossImg = 'fiender ond.png'; // Fallback om bilden saknas

        // Om overlord.png saknas (vi har tagit bort den från heroFiles för att undvika 404), använd fallback
        if (level.number === 6) bossImg = 'fiender ond.png';

        // Bossens HP: Buffad så de inte dör på ett skott. Bas-HP 45 istället för 15.
        const bossHP = Math.min(300, (level.boss?.healthMultiplier || 1) * 45);
        // Flytta bossen till len - 400 så den hamnar på höger sida och spelaren ser den komma
        state.current.boss = { x: len - 400, y: 100, w: 500, h: 500, hp: bossHP, max: bossHP, active: false, img: bossImg.toLowerCase(), attackCd: 120, hitT: 0 };
        state.current.timeLeft = level?.timeLimit || 120;

        // Generera mynt/kristaller på plattformar
        const coins: {x: number, y: number, collected: boolean}[] = [];
        platforms.forEach((p, pi) => {
            if (pi === 0 || p.w < 150) return;
            const numCoins = Math.floor(Math.random() * 3) + 2; // 2-4 mynt per plattform
            for (let ci = 0; ci < numCoins; ci++) {
                coins.push({ 
                    x: p.x + (p.w / (numCoins + 1)) * (ci + 1),
                    y: p.y - 25,
                    collected: false
                });
            }
        });
        // Extra mynt på markplan
        for (let gx = 800; gx < len - 2000; gx += 600 + Math.random() * 800) {
            coins.push({ x: gx, y: 535, collected: false });
        }
        state.current.coins = coins;
        state.current.lives = 3;
        state.current.invincible = 0;
        state.current.combo = 0;
        state.current.comboTimer = 0;
        state.current.initDone = true;
    }
  }, [level, ninja]);

  useEffect(() => {
    if (!gameStarted || !state.current.active) return;
    if (!audioRef.current) {
        // Starta med stridsmusik när banan börjar
        const audio = new Audio('/audio/ninjago_battle_music_8bit.wav');
        audio.loop = true; audio.volume = isMutedRef.current ? 0 : 0.4; audio.play().catch(() => {});
        audioRef.current = audio;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let raf: number;
    let frames = 0;
    let lastTime = Date.now();

    const loop = () => {
        if (!state.current.active) return;
        frames++;
        const s = state.current;
        const now = Date.now();
        if (now - lastTime >= 1000) { 
            s.timeLeft = Math.max(0, s.timeLeft - 1); 
            lastTime = now; 
            if (s.timeLeft <= 0 && s.active) { 
                s.active = false; 
                const finalS = Number(s.score) || 0;
                setCurrentScore(finalS);
                setTimeout(() => onGameOverRef.current(finalS), 1500); 
            } 
        }

        ctx.fillStyle = level.bgColor || '#1a140f';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for(let i=0; i<20; i++) { const px = (i*2000-s.cameraX*0.05)%(level.length+2000); ctx.fillRect(px, 100, 600, 500); }
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        for(let i=0; i<40; i++) { const px = (i*1200-s.cameraX*0.15)%(level.length+1200); ctx.fillRect(px, 200, 300, 400); }

        const mL = keys.current['ArrowLeft'] || touch.current.left;
        const mR = keys.current['ArrowRight'] || touch.current.right;
        const oldX = s.x;
        const oldY = s.y;
        
        if (mL) { s.dx = Math.max(s.dx - 1.2, -11); s.fR = false; }
        if (mR) { s.dx = Math.min(s.dx + 1.2, 11); s.fR = true; }

        // 1. Horisontell rörelse och kollision
        s.dx *= 0.88;
        s.x += s.dx;
        
        let onGround = false;
        const hbP = 25; // Hitbox padding (ninjan är 140 bred)
        const ninjaW = 140;
        const ninjaH = 160;

        s.plats.forEach(plat => {
            // Kolla om vi är i samma höjdspann som plattformen (för väggkollision)
            if (s.y + ninjaH > plat.y + 10 && s.y < plat.y + plat.h - 10) {
                // Vänster vägg på plattformen
                if (oldX + ninjaW - hbP <= plat.x && s.x + ninjaW - hbP > plat.x) {
                    s.x = plat.x - (ninjaW - hbP);
                    s.dx = 0;
                }
                // Höger vägg på plattformen
                else if (oldX + hbP >= plat.x + plat.w && s.x + hbP < plat.x + plat.w) {
                    s.x = plat.x + plat.w - hbP;
                    s.dx = 0;
                }
            }
        });

        // 2. Vertikal rörelse och kollision
        s.dy += 0.8;
        s.y += s.dy;
        const newY = s.y;

        s.plats.forEach(plat => {
            // Kolla om vi är inom plattformens bredd (för mark/tak-kollision)
            if (s.x + hbP < plat.x + plat.w && s.x + ninjaW - hbP > plat.x) {
                const playerFeetOld = oldY + ninjaH;
                const playerFeetNew = newY + ninjaH;
                
                // Mark-kollision
                if (s.dy >= 0 && playerFeetOld <= plat.y + 5 && playerFeetNew >= plat.y) {
                    if (s.dy > 5) {
                        s.shake = s.dy * 0.5;
                        for(let k=0; k<8; k++) s.particles.push({ 
                            x: s.x + 70, y: plat.y, 
                            dx: (Math.random()-0.5)*10, dy: -Math.random()*5, 
                            life: 25, size: 4, color: level.platformColor || '#555', type: 'spark' 
                        });
                    }
                    s.y = plat.y - ninjaH; 
                    s.dy = 0; 
                    s.jump = false; 
                    onGround = true; 
                }
                // Tak-kollision
                else if (s.dy < 0 && s.y > plat.y + plat.h - 20 && s.y < plat.y + plat.h + 20) {
                    s.y = plat.y + plat.h + 2;
                    s.dy = 0.5;
                }
            }
        });

        if (touch.current.jump) s.jumpReq = true;
        if (s.jumpReq && !s.jump && onGround) { s.dy = -23; s.jump = true; s.jumpReq = false; }
        if (s.jump || !onGround) { if (frames % 60 === 0) s.jumpReq = false; }
        if (s.y > 650) { s.y = 400; s.dy = 0; }

        s.cameraX = Math.max(0, Math.min(s.x - 300, level.length - 800));
        s.energy = Math.min(100, s.energy + 0.2); 
        
        if ((state.current.fireReq || touch.current.fire) && !s.spin) { 
            s.projs.push({ x: s.fR?s.x+110:s.x+30, y: s.y+80, dx: s.fR?22:-22, c: ninja.color });  
            touch.current.fire = false; 
            state.current.fireReq = false; // Konsumera skott-begäran
            
            // Olika ljud för olika ninjor
            let shotSFX = 'sfx_lightning_8bit.wav';
            if (ninja.id === 'kai') shotSFX = 'sfx_sword_hit_8bit.wav';
            else if (ninja.id === 'cole') shotSFX = 'sfx_sword_hit_8bit.wav';
            else if (ninja.id === 'zane') shotSFX = 'sfx_lightning_8bit.wav';
            
            playSFX(shotSFX); 
        }
        if (touch.current.spin && s.energy >= 100) { s.spin = true; s.spinT = 150; s.energy = 0; touch.current.spin = false; playSFX('sfx_spinjitzu_8bit.wav'); }
        if (s.spin) { s.spinT--; s.dx = s.fR ? 17 : -17; if(frames%2===0) s.particles.push({ x: s.x+70+Math.cos(frames*0.5)*100, y: s.y+80+Math.sin(frames*0.5)*100, dx: 0, dy: 0, life: 30, size: 5, color: ninja.color, type: 'vortex' }); if(s.spinT <= 0) s.spin = false; }

        if (frames % 4 === 0) {
            const at = level.atmosphereType;
            if (at === 'snow') s.particles.push({ x: s.cameraX+Math.random()*800, y: -20, dx: (Math.random()-0.5)*2, dy: 2+Math.random()*3, life: 200, size: 2+Math.random()*3, color: 'white', type: 'snow' });
            if (at === 'embers') s.particles.push({ x: s.cameraX+Math.random()*800, y: 620, dx: (Math.random()-0.5)*2, dy: -2-Math.random()*2, life: 100, size: 2+Math.random()*3, color: '#ff6600', type: 'ember' });
            if (at === 'rain') s.particles.push({ x: s.cameraX+Math.random()*800, y: -20, dx: 4, dy: 15, life: 60, size: 1, color: '#aaaaff88', type: 'rain' });
        }

        ctx.save(); ctx.translate(-s.cameraX, 0);
        // Optimering: Begränsa antalet partiklar för att förhindra lagg på mobila enheter
        if (s.particles.length > 30) s.particles.splice(0, s.particles.length - 30);
        
        s.particles.forEach((p, i) => {
            p.x += p.dx; p.y += p.dy; p.life--;
            if (p.life <= 0) { s.particles.splice(i, 1); return; }
            // Optimering: Rita bara partiklar som syns på skärmen
            if (p.x < s.cameraX - 100 || p.x > s.cameraX + 900) return;
            ctx.fillStyle = p.color;
            if (p.type === 'vortex') { ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; }
            else ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        s.plats.forEach(plat => {
            const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
            grad.addColorStop(0, level.platformColor || '#3d2b1f'); grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(plat.x, plat.y, plat.w, 4);
        });

        // --- NEDCOUNT: combo-timer & invincibility ---
        if (s.comboTimer > 0) s.comboTimer--;
        else if (s.combo > 0) { s.combo = 0; }
        if (s.invincible > 0) s.invincible--;
        if (s.comboTextLife > 0) s.comboTextLife--;

        // --- MYNT/KRISTALLER ---
        s.coins.forEach((coin, ci) => {
            if (coin.collected) return;
            // Kolla kollision med spelaren (lite mer förlåtande radie)
            if (Math.abs((s.x + 70) - coin.x) < 70 && Math.abs((s.y + 80) - coin.y) < 80) {
                coin.collected = true;
                s.score += 50;
                setCurrentScore(s.score);
                s.scorePopups.push({ x: coin.x, y: coin.y, text: "+50", life: 60 });
                playSFX('sfx_lightning_8bit.wav', 0.2);
                for (let k = 0; k < 12; k++) s.particles.push({
                    x: coin.x, y: coin.y,
                    dx: (Math.random()-0.5)*10, dy: -Math.random()*8,
                    life: 35, size: 5, color: '#ffcc00', type: 'spark'
                });
                return;
            }
            // Rita mynt som glänsande gul cirkel
            const bob = Math.sin(frames * 0.1 + ci) * 3; // Lätt svävning
            ctx.save();
            ctx.shadowBlur = 12; ctx.shadowColor = '#ffcc00';
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(coin.x - 3, coin.y + bob - 3, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('★', coin.x, coin.y + bob + 4);
            ctx.restore();
        });

        for (let i = s.enemies.length - 1; i >= 0; i--) {
            const e = s.enemies[i];
            e.dy += 0.8; e.y += e.dy;
            let enemyOnGround = false;
            s.plats.forEach(plat => {
                if (e.x + 10 < plat.x + plat.w && e.x + e.w - 10 > plat.x) {
                    if (e.y + e.h > plat.y && e.y + e.h < plat.y + 40 + e.dy) { e.y = plat.y - e.h; e.dy = 0; enemyOnGround = true; }
                }
            });
            const dist = (s.x + 70) - (e.x + 50);
            // Positiv distY = spelaren är UNDER fienden (s.y > e.y)
            const distY = s.y - e.y;
            
            // Svårighetsbaserad hastighet per nivå
            const lvl = level.number || 1;
            const baseSpeed = 1.5 + (lvl - 1) * 0.6; // Nivå 1: 1.5, Nivå 6: 4.5
            
            if (Math.abs(dist) < 700 && Math.abs(distY) < 500) { 
                // Kolla om fienden är på en plattform (och inte på marken)
                let currentPlat = null;
                for (const p of s.plats) {
                    if (e.x + 10 < p.x + p.w && e.x + e.w - 10 > p.x && Math.abs(e.y + e.h - p.y) < 10) {
                        currentPlat = p;
                        break;
                    }
                }

                const isVisible = e.x > s.cameraX - 50 && e.x < s.cameraX + 850;
                // Spelaren är UNDER fienden (distY > 80 = fienden är högre upp)
                const playerIsBelow = distY > 80;
                // Spelaren är OVANFÖR fienden – fienden ska ALDRIG hoppa upp
                const playerIsAbove = distY < -20;

                // Om vi redan är i jumpMode (hoppar ner), fortsätt tills vi lämnat plattformen
                if (e.jumpMode) {
                    e.dx = e.jumpMode === 'left' ? -(baseSpeed + 3) : (baseSpeed + 3);
                    
                    if (currentPlat) {
                        const toLeftEdge = e.x - currentPlat.x;
                        const toRightEdge = (currentPlat.x + currentPlat.w) - (e.x + e.w);
                        
                        if (toLeftEdge < 30 && e.jumpMode === 'left') { 
                            e.x -= 100; // Knuffa ut och falla ner
                            e.jumpMode = null; 
                        }
                        else if (toRightEdge < 30 && e.jumpMode === 'right') { 
                            e.x += 100;
                            e.jumpMode = null; 
                        }
                    } else {
                        e.jumpMode = null; // Vi faller redan
                    }
                } 
                else if (playerIsBelow && currentPlat && enemyOnGround && isVisible) {
                    // Spelaren är nedanför – hoppa NED mot spelaren
                    e.jumpMode = dist < 0 ? 'left' : 'right';
                    e.dx = e.jumpMode === 'left' ? -(baseSpeed + 3) : (baseSpeed + 3);
                }
                else if (!playerIsAbove) {
                    // Springer mot spelaren på samma plan (aldrig hoppa upp)
                    e.jumpMode = null; 
                    e.dx = dist > 0 ? baseSpeed : -baseSpeed; 
                    // ALDRIG hoppa uppåt – tag bort den gamla upphopp-logiken helt
                }
                else {
                    // Spelaren är ovanför – patrullera istället, hoppa INTE
                    e.jumpMode = null;
                    e.dx = dist > 0 ? baseSpeed * 0.5 : -baseSpeed * 0.5;
                }
                e.x += e.dx; 
            }
            else { e.x += e.dx; if (e.x < e.origX || e.x > e.origX + e.range) e.dx *= -1; }
            
            const mImg = images.current[e.img];
            if (mImg?.complete && mImg.naturalWidth > 0) {
                if (!cleanedImages.current[e.img]) {
                    const canvas = document.createElement('canvas');
                    canvas.width = mImg.naturalWidth; canvas.height = mImg.naturalHeight;
                    const tempCtx = canvas.getContext('2d');
                    if (tempCtx) {
                        tempCtx.drawImage(mImg, 0, 0);
                        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        for (let j = 0; j < data.length; j += 4) { if (data[j] > 230 && data[j+1] > 230 && data[j+2] > 230) data[j+3] = 0; }
                        tempCtx.putImageData(imageData, 0, 0); cleanedImages.current[e.img] = canvas;
                    }
                }
                const cleanedImg = cleanedImages.current[e.img] || mImg;
                ctx.save();
                if (e.dx > 0) { ctx.translate(e.x + e.w, e.y); ctx.scale(-1, 1); ctx.drawImage(cleanedImg, 0, 0, e.w, e.h); }
                else { ctx.drawImage(cleanedImg, e.x, e.y, e.w, e.h); }
                ctx.restore();
            } else { ctx.fillStyle = "#8b5cf6"; ctx.fillRect(e.x, e.y, e.w, e.h); }

            // Kollisionshantering spelare <-> fiende
            if (s.x < e.x + e.w - 25 && s.x + 140 > e.x + 25 && s.y < e.y + e.h - 35 && s.y + 140 > e.y + 15) {
                const isClashingFromAbove = s.dy > 0 && s.y + 120 < e.y + 30;
                
                if (s.spin || isClashingFromAbove) { 
                    s.enemies.splice(i, 1);
                    // COMBO-system
                    s.combo++;
                    s.comboTimer = 120; // 2 sekunder
                    const bonus = s.combo > 1 ? s.combo * 50 : 0;
                    s.score += 100 + bonus;
                    if (s.combo > 1) {
                        s.comboTextVal = s.combo;
                        s.comboTextLife = 90;
                    }
                    setCurrentScore(s.score);
                    s.energy = Math.min(100, s.energy + 20); 
                    playSFX('soundreality-explosion-8-bit-13-314697.mp3', 0.6);
                    for(let k=0; k<12; k++) s.particles.push({ x: e.x+50, y: e.y+60, dx: (Math.random()-0.5)*12, dy: (Math.random()-0.5)*12, life: 40, size: 5, color: '#ffcc00', type: 'spark' }); 
                    
                    if (isClashingFromAbove) { s.dy = -15; s.y -= 20; }
                }
                else if (s.active && s.invincible === 0) { 
                  let floorBetween = false;
                  for (const p of s.plats) {
                      if (s.x + 70 > p.x && s.x + 70 < p.x + p.w) {
                          if (p.y > s.y + 100 && p.y < e.y + 20) { floorBetween = true; break; }
                      }
                  }

                  if (!floorBetween) {
                    s.lives--;
                    setLives(s.lives);
                    playSFX('lolo_s-down-474082.mp3', 0.8); 
                    s.shake = 15;
                    s.combo = 0; // Reset combo vid skada
                    if (s.lives <= 0) {
                        s.active = false;
                        const finalS = Number(s.score) || 0;
                        setCurrentScore(finalS);
                        setTimeout(() => onGameOverRef.current(finalS), 1500);
                    } else {
                        // Respawn med invincibility
                        s.invincible = 120; // 2 sekunder
                        s.x = Math.max(100, s.cameraX + 50);
                        s.y = 350; s.dx = 0; s.dy = 0;
                    }
                  }
                }
            }
        }

        for (let i = s.projs.length - 1; i >= 0; i--) {
            const pr = s.projs[i];
            pr.x += pr.dx;
            const pGrad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 40);
            pGrad.addColorStop(0, 'white'); pGrad.addColorStop(0.3, pr.c); pGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(pr.x, pr.y, 40, 0, Math.PI*2); ctx.fill();

            for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
                const e = s.enemies[ei];
                if (pr.x > e.x && pr.x < e.x + e.w && pr.y > e.y && pr.y < e.y + e.h) { 
                    s.enemies.splice(ei, 1); s.projs.splice(i, 1); 
                    s.score += 100; setCurrentScore(s.score);
                    s.energy = Math.min(100, s.energy + 10); 
                    playSFX('u_b32baquv5u-explosion-2-340454.mp3', 0.8);
                    for(let k=0; k<15; k++) s.particles.push({ x: e.x+60, y: e.y+70, dx: (Math.random()-0.5)*15, dy: (Math.random()-0.5)*15, life: 30, size: 3, color: pr.c, type: 'spark' }); 
                    break;
                }
            }
            if (!s.projs[i]) continue;

            const b = s.boss;
            if (pr.x > b.x && pr.x < b.x + b.w && pr.y > b.y && pr.y < b.y + b.h && b.x < s.cameraX + 850) { 
                b.hp -= 1; b.hitT = 10; s.projs.splice(i, 1); s.shake = 5;
                if (b.hp <= 0 && s.active) { 
                    s.active = false; 
                    playSFX('lesiakower-level-up-enhancement-8-bit-retro-sound-effect-153002.mp3', 1.0); 
                    for(let k=0; k<50; k++) s.particles.push({ x: b.x + b.w/2, y: b.y + b.h/2, dx: (Math.random()-0.5)*30, dy: (Math.random()-0.5)*30, life: 100, size: 8, color: '#ffcc00', type: 'spark' });
                    const finalS = s.score + (level?.bossPoints || 0) + (s.timeLeft * 50);
                    setTimeout(() => onLevelCompleteRef.current(finalS), 2000); 
                } 
            }
        }

        if (s.x > level.length - 3000) {
            s.boss.attackCd--;
            if (s.boss.attackCd <= 0) {
                const bX = s.boss.x + s.boss.w/2, bY = s.boss.y + s.boss.h/2;
                // Siktar lite lägre mot marken (s.y + 140) för att göra det lättare att undvika
                const angle = Math.atan2((s.y + 140) - bY, (s.x + 70) - bX);
                
                // Unika attacker baserat på nivå
                let speed = 6 + level.number * 1.5;
                let color = '#ff4400'; // Default röd (Eld)
                let type: any = 'fire';
                
                if (level.number === 2) { color = '#00ccff'; type = 'ice'; speed = 5; } // Is-skott
                else if (level.number === 3) { color = '#ffaa00'; speed = 9; } // Snabb eld
                else if (level.number === 4) { color = '#eeff00'; type = 'lightning'; } // Blixt
                else if (level.number === 5) { color = '#8800ff'; type = 'void'; } // Mörker
                else if (level.number === 6) { color = '#ff0000'; type = 'void'; speed = 11; } // Overlord blixtar
                
                s.bossProjs.push({ x: bX, y: bY, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, c: color, r: 25 + level.number * 5, type });
                s.boss.attackCd = Math.max(30, 180 - level.number * 25);
                for(let k=0; k<10; k++) s.particles.push({ x: bX, y: bY, dx: (Math.random()-0.5)*10, dy: (Math.random()-0.5)*10, life: 20, size: 4, color: color, type: 'spark' });
            }
        }

        for (let i = s.bossProjs.length - 1; i >= 0; i--) {
            const bp = s.bossProjs[i];
            bp.x += bp.dx; bp.y += bp.dy;
            const bpG = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, bp.r);
            bpG.addColorStop(0, 'white'); bpG.addColorStop(0.4, bp.c); bpG.addColorStop(1, 'transparent');
            ctx.fillStyle = bpG; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI*2); ctx.fill();
            
            if (Math.hypot(bp.x - (s.x + 70), bp.y - (s.y + 80)) < bp.r + 40 && !s.spin && s.invincible === 0) { 
                if (bp.type === 'ice') { s.dx *= 0.3; } // Is saktar ner...
                
                // ALLA skott (inklusive is) skadar nu spelaren
                if (s.active) {
                    s.lives--;
                    setLives(s.lives);
                    playSFX('lolo_s-down-474082.mp3', 0.8);
                    s.shake = 12; s.combo = 0;
                    if (s.lives <= 0) {
                        s.active = false;
                        const finalS = Number(s.score) || 0;
                        setCurrentScore(finalS);
                        setTimeout(() => onGameOverRef.current(finalS), 1500);
                    } else {
                        s.invincible = 120;
                        s.x = Math.max(100, s.cameraX + 50);
                        s.y = 350; s.dx = 0; s.dy = 0;
                    }
                }
                s.bossProjs.splice(i, 1);
            }
            else if (bp.x < s.cameraX - 100 || bp.x > s.cameraX + 900 || bp.y < -100 || bp.y > 700) s.bossProjs.splice(i, 1);
        }

        const nImg = images.current[ninja.id.toLowerCase()];
        // Spelarens blink-effekt under invincibility
        const shouldDrawPlayer = s.invincible === 0 || frames % 8 < 5;
        if (shouldDrawPlayer) {
            ctx.save(); ctx.translate(s.x + 70, s.y + 80); if (!s.fR) ctx.scale(-1, 1);
            if (s.invincible > 0) ctx.filter = 'brightness(2) sepia(1) hue-rotate(180deg)';
            if (nImg?.complete && nImg.naturalWidth > 0) ctx.drawImage(nImg, -70, -80, 140, 160);
            else { ctx.fillStyle = ninja.color; ctx.fillRect(-70, -80, 140, 160); }
            ctx.restore();
        }

        // Combo-text på canvas
        if (s.comboTextLife > 0) {
            const alpha = s.comboTextLife / 90;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 36px Orbitron, sans-serif';
            ctx.fillStyle = '#ffcc00';
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff8800';
            ctx.textAlign = 'center';
            ctx.fillText(`${s.comboTextVal}× COMBO! +${s.comboTextVal * 50}p`, s.x + 70, s.y - 20);
            ctx.restore();
        }

        // Score popups (+50 etc)
        for (let i = s.scorePopups.length - 1; i >= 0; i--) {
            const p = s.scorePopups[i];
            p.y -= 1.5;
            p.life--;
            if (p.life <= 0) { s.scorePopups.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = p.life / 60;
            ctx.font = 'bold 24px Orbitron, sans-serif';
            ctx.fillStyle = '#ffcc00';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }

        if (s.spin) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sG = ctx.createRadialGradient(s.x+70, s.y+80, 0, s.x+70, s.y+80, 140); sG.addColorStop(0, 'white'); sG.addColorStop(0.5, ninja.color); sG.addColorStop(1, 'transparent'); ctx.fillStyle = sG; ctx.beginPath(); ctx.arc(s.x+70, s.y+80, 140, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
        
        // Boss-avståndsindikator (visas alltid utom när bossen är aktiv)
        if (s.x < level.length - 2800) {
          const progress = Math.min(1, s.x / (level.length - 3000));
          ctx.save();
          const bx = s.cameraX + 200, bw = 400;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, 575, bw, 12);
          ctx.fillStyle = '#ffcc00'; ctx.fillRect(bx, 575, bw * progress, 12);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(bx, 575, bw, 12);
          ctx.fillStyle = 'white'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('⚔️ BOSS', bx + bw + 24, 585);
          ctx.restore();
        }
        
        if (s.x > level.length - 2800) {
            const b = s.boss;
            // Byt till boss-musik när bossen dyker upp (respektera mute)
            if (audioRef.current && audioRef.current.src.indexOf('boss') === -1) {
                audioRef.current.pause();
                const bossAudio = new Audio('/audio/imij-stairs-to-the-boss-fight-322652.mp3');
                bossAudio.loop = true; 
                bossAudio.volume = isMutedRef.current ? 0 : 0.5;
                bossAudio.play().catch(() => {});
                audioRef.current = bossAudio;
            }

             // Kollision med bossen (bara om bossen är "aktiverad" / i närheten)
            if (b && b.hp > 0 && b.x < s.cameraX + 1000) {
              if (Math.abs(s.x + 70 - (b.x + b.w/2)) < 150 && Math.abs(s.y + 80 - (b.y + b.h/2)) < 200) {
                if (s.spin) {
                    b.hp -= 2; // Spin gör mer skada på bossen
                    b.hitT = 10;
                    if (b.hp <= 0) {
                        s.active = false;
                        s.score += 2000; 
                        setCurrentScore(s.score);
                        playSFX('lesiakower-level-up-enhancement-8-bit-retro-sound-effect-153002.mp3');
                        s.shake = 20;
                        for(let k=0; k<30; k++) s.particles.push({ 
                            x: b.x + b.w/2, y: b.y + b.h/2, 
                            dx: (Math.random()-0.5)*20, dy: (Math.random()-0.5)*20, 
                            life: 60, size: 8, color: '#f0f', type: 'void' 
                        });
                        const timeBonus = Math.floor(s.timeLeft * 50);
                        const finalS = s.score + timeBonus;
                        setTimeout(() => onLevelCompleteRef.current(finalS), 2000);
                    }
                } else if (s.active) { 
                    s.active = false;
                    playSFX('lolo_s-down-474082.mp3', 1.0); 
                    const finalS = Number(s.score) || 0;
                    setCurrentScore(finalS);
                    setTimeout(() => onGameOverRef.current(finalS), 1500);
                }
              }
            }

            if (b.hitT > 0) b.hitT--;
            const bImg = images.current[b.img];
            if (bImg?.complete && bImg.naturalWidth > 0) {
                if (!cleanedImages.current[b.img]) {
                    const canvas = document.createElement('canvas');
                    canvas.width = bImg.naturalWidth; canvas.height = bImg.naturalHeight;
                    const tempCtx = canvas.getContext('2d');
                    if (tempCtx) {
                        tempCtx.drawImage(bImg, 0, 0);
                        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        for (let j = 0; j < data.length; j += 4) { if (data[j] > 230 && data[j+1] > 230 && data[j+2] > 230) data[j+3] = 0; }
                        tempCtx.putImageData(imageData, 0, 0);
                        cleanedImages.current[b.img] = canvas;
                    }
                }
                const cleanedBossImg = cleanedImages.current[b.img] || bImg;
                ctx.save();
                if (b.hitT % 2 === 1) ctx.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
                ctx.drawImage(cleanedBossImg, b.x, b.y, b.w, b.h);
                ctx.restore();
            }

            // Boss HP Bar & Name - VISAS BARA NÄR BOSSEN ÄR SYNLIG
            if (b.x < s.cameraX + 800) {
              ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(s.cameraX+200, 30, 400, 30);
              ctx.fillStyle = b.hp/b.max < 0.3 ? '#ff4444' : '#ffcc00'; ctx.fillRect(s.cameraX+200, 30, 400*(b.hp/b.max), 30);
              ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.strokeRect(s.cameraX+200, 30, 400, 30);
              ctx.fillStyle = "white"; ctx.font = "black 18px Orbitron, sans-serif"; ctx.textAlign = "center";
              const bossName = level.number === 6 ? "THE OVERLORD" : b.img.toUpperCase().replace('.PNG', '');
              ctx.fillText(bossName, s.cameraX+400, 52);
            }
        }
        ctx.restore();

        if (s.shake > 0) {
            ctx.translate((Math.random()-0.5)*s.shake, (Math.random()-0.5)*s.shake);
            s.shake *= 0.9;
            if (s.shake < 0.2) s.shake = 0;
        }

        if (frames % 3 === 0) { 
            const safeScore = Number(s.score) || 0;
            setCurrentScore(safeScore); 
            setSpinEnergy(s.energy); 
            setDisplayTime(s.timeLeft); 
            setLives(s.lives); 
        }
        raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameStarted]);

  return (
    <div 
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black no-select no-touch-callout ${isMobile ? 'fixed inset-0 z-[10000] h-[100dvh]' : 'aspect-video rounded-3xl border-4 border-white/10 shadow-2xl'}`}
    >
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />

      {/* Nivå Intro Overlay */}
      {showLevelIntro && (
        <div className="absolute inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="text-center transform animate-in zoom-in duration-700">
                <h2 className="text-7xl font-black text-primary italic uppercase tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">NIVÅ {level.number}</h2>
                <h3 className="text-3xl font-bold text-white uppercase tracking-[0.3em] mt-2 drop-shadow-lg">{level.name}</h3>
                <div className="h-1 w-48 bg-primary mx-auto mt-6 rounded-full shadow-lg" />
            </div>
        </div>
      )}
      
      {!gameStarted && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-black/85 backdrop-blur-3xl px-12 text-center text-white">
            <div className={`bg-white/10 rounded-full mb-6 p-4 border border-white/20 animate-pulse overflow-hidden ${isMobile ? 'w-20 h-20' : 'w-32 h-32'}`}>
                <img src="/icon.png" className="w-full h-full object-cover rounded-full" alt="Ninjago" />
            </div>
            <h2 className={`${isMobile ? 'text-3xl' : 'text-6xl'} font-black italic mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 uppercase`}>BANA {level.number}</h2>
            <h3 className={`${isMobile ? 'text-xl' : 'text-4xl'} font-bold text-white uppercase mb-4 tracking-widest`}>{level.name}</h3>
            
            <div className="flex flex-col gap-4 items-center">
                <button 
                    onClick={handleStartGame}
                    onPointerDown={handleStartGame} 
                    className={`group relative bg-gradient-to-br from-red-600 to-red-800 text-white font-black rounded-[2rem] shadow-[0_15px_40px_rgba(255,0,0,0.5)] border-b-[12px] border-red-950 active:border-0 active:translate-y-2 transition-all duration-75 ${isMobile ? 'px-8 py-4 text-2xl' : 'px-20 py-10 text-5xl'}`}
                >
                    STARTA STRIDEN!
                </button>
                {deferredPrompt && <button onPointerDown={handleInstallClick} className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white font-bold text-sm animate-bounce mt-2">📲 INSTALLERA SNABBT</button>}
            </div>
        </div>
      )}

      {gameStarted && (
        <div className="absolute top-4 inset-x-4 z-[200] flex justify-between items-start pointer-events-none">
            {/* Poäng */}
            <div className={`px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white font-black shadow-xl flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-3xl'}`}>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> {currentScore}
            </div>
            
            {/* Spin-energi i mitten */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center gap-0.5">
                <div className="text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Spinjitzu (Z)</div>
                <div className={`${isMobile ? 'w-24 h-2.5' : 'w-48 h-5'} bg-black/40 rounded-full border border-white/10 overflow-hidden relative`}>
                    <div className={`h-full transition-all duration-300 ${spinEnergy >= 100 ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${spinEnergy}%` }} />
                </div>
            </div>

            {/* Liv + Tid – höger sida */}
            <div className="flex flex-col items-end gap-1">
                {/* Hjärtan – liv */}
                <div className={`flex gap-0.5 ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                    {[1,2,3].map(i => (
                        <span key={i} className={i <= lives ? 'text-red-500 drop-shadow-[0_0_6px_red]' : 'text-white/20'}>
                            {i <= lives ? '❤️' : '🖤'}
                        </span>
                    ))}
                </div>
                {/* Timer */}
                <div className={`px-3 py-0.5 bg-black/40 backdrop-blur-md rounded-lg border ${displayTime < 30 ? 'border-red-500 text-red-500' : 'border-white/10 text-white'} font-black shadow-xl ${isMobile ? 'text-base' : 'text-2xl'}`}>
                    {displayTime}s
                </div>
            </div>
        </div>
      )}

      {gameStarted && isMobile && (
        <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
          {/* Vänsterstyrning: Vänster/Höger pilar - Flyttade upp lite för att undvika system-gester */}
          <div className="absolute bottom-10 left-4 flex gap-2 pointer-events-auto">
            <button 
                onPointerDown={(e)=>{ e.preventDefault(); touch.current.left=true; }} onPointerUp={(e)=>{ e.preventDefault(); touch.current.left=false; }} onPointerLeave={(e)=>{ e.preventDefault(); touch.current.left=false; }}
                style={{width:'80px',height:'80px'}}
                className="bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-2xl border-2 border-white/30 select-none active:bg-white/40 text-white"
            >←</button>
            <button 
                onPointerDown={(e)=>{ e.preventDefault(); touch.current.right=true; }} onPointerUp={(e)=>{ e.preventDefault(); touch.current.right=false; }} onPointerLeave={(e)=>{ e.preventDefault(); touch.current.right=false; }}
                style={{width:'80px',height:'80px'}}
                className="bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-2xl border-2 border-white/30 select-none active:bg-white/40 text-white"
            >→</button>
          </div>

          {/* Högerstyrning: Eld/Hopp/Spin - Flyttade isär för att undvika överlapp i portrait */}
          <div className="absolute bottom-10 right-4 flex flex-col items-end gap-2 pointer-events-auto">
            {/* SPIN – visas tydligt när energi är full */}
            <button 
                onPointerDown={(e)=>{ e.preventDefault(); touch.current.spin=true; }} 
                style={{width:'56px',height:'56px'}}
                className={`rounded-full border-2 font-black transition-all select-none text-[10px] tracking-widest ${
                  spinEnergy >= 100 
                    ? 'bg-yellow-400/70 text-black border-yellow-300 animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.8)]' 
                    : 'bg-white/5 text-white/30 border-white/10'
                }`}
            >SPIN</button>
            
            <div className="flex gap-2 items-end">
                {/* ELD/SKJUT-knapp – stor och tydlig */}
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.fire=true; }}
                    style={{width:'74px',height:'74px'}}
                    className="bg-red-600/50 backdrop-blur-md rounded-full font-black text-2xl shadow-2xl border-2 border-red-400/60 active:bg-red-500/80 text-white flex items-center justify-center"
                >🔥</button>
                {/* HOPP-knapp */}
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.jump=true; }} onPointerUp={(e)=>{ e.preventDefault(); touch.current.jump=false; }} onPointerLeave={(e)=>{ e.preventDefault(); touch.current.jump=false; }}
                    style={{width:'84px',height:'84px'}}
                    className="bg-blue-600/50 backdrop-blur-md rounded-full font-black text-sm shadow-2xl border-2 border-blue-400/60 active:bg-blue-500/80 text-white flex items-center justify-center uppercase tracking-widest"
                >HOPP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Ninja, Level } from '@/lib/game-data';
import { getLeaderboard } from '@/lib/leaderboard';
import { Howl } from 'howler';
import { createPortal } from 'react-dom';

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
    isFreshStart?: boolean;
    isLandscape?: boolean;
    onGameOver: (score: number) => void;
    onLevelComplete: (points: number) => void;
    onScoreUpdate?: (score: number) => void;
}

export function GameEngine({
    ninja,
    level,
    playerName,
    initialScore = 0,
    isMuted,
    isFreshStart = false,
    isLandscape: isLandscapeProp = false,
    onGameOver,
    onLevelComplete,
    onScoreUpdate
}: GameEngineProps) {
    const lastTimestamp = useRef<number>(0);
    const [gameStarted, setGameStarted] = useState(false);

    const monsterFiles = [
        'Blå orm.png', 'Grön orm.png', 'Guld svart orm.png',
        'Lila orm.png', 'Röd orm.png', 'Skelette.png', 'fiender ond.png'
    ];

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showLevelIntro, setShowLevelIntro] = useState(false);
    const cleanedImages = useRef<Record<string, HTMLCanvasElement>>({});
    const [currentScore, setCurrentScore] = useState(initialScore);
    const [spinEnergy, setSpinEnergy] = useState(0);
    const [displayTime, setDisplayTime] = useState(0);
    const [lives, setLives] = useState(3);
    const [highScore, setHighScore] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const onGameOverRef = useRef(onGameOver);
    const onLevelCompleteRef = useRef(onLevelComplete);
    const isMutedRef = useRef(isMuted);

    useEffect(() => {
        onGameOverRef.current = onGameOver;
        onLevelCompleteRef.current = onLevelComplete;
        isMutedRef.current = isMuted;
    }, [onGameOver, onLevelComplete, isMuted]);

    const state = useRef({
        started: false, active: true, score: initialScore, maxScore: 0, energy: 0,
        lastReportedScore: 0, cameraX: 0, timeLeft: 0, highScore: 0,
        x: 100, y: 350, dx: 0, dy: 0, frames: 0, fR: true, jump: false, jumpReq: false, spin: false, spinT: 0,
        enemies: [] as any[], projs: [] as any[], bossProjs: [] as any[], plats: [] as any[], particles: [] as Particle[],
        boss: { hp: 1, max: 1, active: false, x: 0, y: 0, w: 0, h: 0, img: '', attackCd: 0, hitT: 0, phase: 0, startY: 0, slowT: 0, drenchedT: 0 },
        shake: 0, initDone: false, lives: 3, invincible: 0, combo: 0, comboTimer: 0,
        coins: [] as { x: number, y: number, collected: boolean }[],
        comboTextLife: 0, comboTextVal: 0, fireReq: false, scorePopups: [] as { x: number, y: number, text: string, life: number }[],
        nyaShieldCd: 0, wavePhase: 0, touchJumpActive: false,
        freezeTime: 0, lastRapidFire: 0, skillActive: false,
    });

    const touch = useRef({ left: false, right: false, jump: false, fire: false, spin: false });
    const keys = useRef<{ [key: string]: boolean }>({});
    const images = useRef<{ [key: string]: HTMLImageElement }>({});

    useEffect(() => {
        state.current.initDone = false;
        setGameStarted(false);
        setShowLevelIntro(true); // Visa nivå-introduktion

        // Visa nivå-introduktion i 3 sekunder, starta sedan (eller visa startknapp)
        const timer = setTimeout(() => {
            setShowLevelIntro(false);
            if (level && level.number > 1) {
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
            // Score Recovery logic REMOVED permanently.
            // Game will always start at 0.
        };
        loadLB();


        const heroFiles = ['kai.png', 'Jay.png', 'zane.png', 'Cole.png', 'Lloyd.png', 'Nya Smith.png'];
        heroFiles.forEach(f => {
            const img = new Image();
            img.src = `/${encodeURIComponent(f)}`;
            const key = f.split('.')[0].toLowerCase().replace(' ', '_');
            images.current[key] = img;
        });

        const bossFiles = ['overlord.png', 'stor drake.png', 'lila svart stor orm.png', 'storm arg orm.png', 'grön demon.png', 'lila svart monster.png', 'Lord Garmadon.png'];
        [...monsterFiles, ...bossFiles].forEach(f => {
            const img = new Image();
            img.src = `/${encodeURIComponent(f)}`;
            images.current[f.toLowerCase()] = img;
        });

        const handleKey = (e: KeyboardEvent, v: boolean) => {
            const k = e.key.toLowerCase();
            if (k === 'x' && v && !keys.current['KeyX']) {
                state.current.fireReq = true;
            }
            if (k === 'z' && v && !keys.current['KeyZ'] && state.current.energy >= 100) {
                state.current.spin = true; state.current.spinT = 150; state.current.energy = 0;
            }
            if ((k === ' ' || e.code === 'Space' || k === 'w') && v && !keys.current['jump_lock']) {
                state.current.jumpReq = true;
                keys.current['jump_lock'] = true;
            }
            if (!v && (k === ' ' || e.code === 'Space' || k === 'w')) {
                keys.current['jump_lock'] = false;
            }

            keys.current[e.code] = v;
            keys.current[k] = v;
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
            if (typeof document !== 'undefined') {
                document.body.style.overflow = 'auto';
                document.body.style.position = 'static';
            }
        };
    }, [level, ninja, isFreshStart]);

    // [v3.01] Mobil-detektering & Resize-lyssnare
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            setIsMobile(mobile);
            // Local state is now just a fallback if prop isn't provided or needed for internal timing
            setIsLandscapeInternal(window.innerWidth > window.innerHeight);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [isLandscapeInternal, setIsLandscapeInternal] = useState(false);
    // Prefer the prop if provided, otherwise use internal detection
    const isLandscape = isLandscapeProp || isLandscapeInternal;

    // [v3.01] Återställd SFX-funktion
    const playSFX = (file: string, vol = 0.5) => {
        if (isMutedRef.current) return;
        try {
            const sfx = new Howl({
                src: [`/audio/${file}`],
                volume: vol,
                autoplay: true
            });
        } catch (e) { }
    };

    const handleStartGame = async () => {
        state.current.started = true;
        setGameStarted(true);

        // Automatisk helskärm på mobil
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        } catch (e) { }

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
                        // [v3.26] ULTIMATE BALANCE: Extremely slow scaling (0.15 -> 0.08)
                        const speed = 1.0 + (lvlNum - 1) * 0.08 + Math.random() * 0.5;
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
                            onG: true,
                            slowT: 0 // [v2.42] Added
                        });
                    }
                }
            });

            // Extra markfiender: Fler på högre nivåer
            const groundEnemyInterval = Math.max(600, 2000 - lvlNum * 250);
            for (let gx = 1500; gx < len - 3000; gx += (groundEnemyInterval + Math.random() * 800)) {
                const mFile = monsterFiles[Math.floor(Math.random() * monsterFiles.length)];
                // [v3.26] ULTIMATE BALANCE: Extremely slow scaling (0.15 -> 0.08)
                const speed = 1.0 + (lvlNum - 1) * 0.08 + Math.random() * 0.8;
                enemies.push({
                    x: gx,
                    y: 420,
                    w: 120, h: 140,
                    dx: -speed,
                    dy: 0,
                    img: mFile.toLowerCase(),
                    origX: gx,
                    range: 400 + Math.random() * 600,
                    onG: true,
                    slowT: 0 // [v2.42] Added
                });
            }
            state.current.enemies = enemies;

            // [v3.47] Use standardized image key from game-data
            const bossImg = level.boss.imageKey || 'overlord.png';
            // Bossens HP: [v2.80] Massive Increase
            let bossHP = 1000;
            if (level.number === 2) bossHP = 2000;
            else if (level.number === 3) bossHP = 3000;
            else if (level.number === 4) bossHP = 4000;
            else if (level.number === 5) bossHP = 5000;
            else if (level.number === 6) bossHP = 7500;
            else if (level.number === 7) bossHP = 10000;

            state.current.boss = {
                x: len - 400,
                y: 100,
                w: 500,
                h: 500,
                hp: bossHP,
                max: bossHP,
                active: false,
                img: bossImg.toLowerCase(),
                attackCd: 120,
                hitT: 0,
                startY: 100, // [v2.40] For movement patterns
                phase: 0,    // [v2.40] For movement patterns
                slowT: 0,    // [v2.42]
                drenchedT: 0 // [v2.42]
            };
            state.current.timeLeft = level?.timeLimit || 120;

            // Generera mynt/kristaller på plattformar
            const coins: { x: number, y: number, collected: boolean }[] = [];
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

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let raf: number;
        let frames = 0;
        let lastTime = Date.now();

        const loop = (timestamp: number) => {
            if (!state.current.active) return;
            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return;

            // [v2.57] DeltaTime calculation
            const dt = lastTimestamp.current ? Math.min(2.0, (timestamp - lastTimestamp.current) / (1000 / 60)) : 1;
            lastTimestamp.current = timestamp;

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



            const mL = keys.current['ArrowLeft'] || touch.current.left;
            const mR = keys.current['ArrowRight'] || touch.current.right;
            const oldX = s.x;
            const oldY = s.y;

            if (mL) { s.dx = Math.max(s.dx - 1.2 * dt, -11); s.fR = false; }
            if (mR) { s.dx = Math.min(s.dx + 1.2 * dt, 11); s.fR = true; }

            // 1. Horisontell rörelse och kollision
            s.dx *= Math.pow(0.88, dt);
            s.x += s.dx * dt;

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
            s.dy += 0.8 * dt;
            s.y += s.dy * dt;
            const newY = s.y;

            s.plats.forEach(plat => {
                // Kolla om vi är inom plattformens bredd (för mark/tak-kollision)
                if (s.x + hbP < plat.x + plat.w && s.x + ninjaW - hbP > plat.x) {
                    const playerFeetOld = oldY + ninjaH;
                    const playerFeetNew = newY + ninjaH;

                    // [v2.48] Physics Fix: Landning
                    if (s.dy >= 0 && playerFeetOld <= plat.y + 15 && playerFeetNew >= plat.y) {
                        s.y = plat.y - ninjaH;
                        s.dy = 0;
                        s.jump = false;
                        onGround = true;
                        if (s.dy > 5) s.shake = s.dy * 0.3;
                    }
                    // [v2.53] Solid Ceiling Collision: Slå i underifrån
                    else if (s.dy < 0 && oldY >= plat.y + plat.h && s.y < plat.y + plat.h) {
                        s.y = plat.y + plat.h;
                        s.dy = 0;
                    }
                }
            });

            // [v3.19] ENHANCED UNSTUCK LOGIC
            s.plats.forEach(plat => {
                const hPadding = 45;
                if (s.x + hPadding < plat.x + plat.w && s.x + ninjaW - hPadding > plat.x) {
                    if (s.y + ninjaH - 10 > plat.y && s.y + 10 < plat.y + plat.h) {
                        // Inside platform? Push to nearest exit
                        const distUp = (s.y + ninjaH) - plat.y;
                        const distDown = (plat.y + plat.h) - s.y;
                        const distLeft = (s.x + ninjaW - hPadding) - plat.x;
                        const distRight = (plat.x + plat.w) - (s.x + hPadding);

                        const minDist = Math.min(distUp, distDown, distLeft, distRight);
                        if (minDist === distUp) s.y -= distUp;
                        else if (minDist === distDown) { s.y += distDown; s.dy = 0; }
                        else if (minDist === distLeft) { s.x -= distLeft; s.dx = 0; }
                        else if (minDist === distRight) { s.x += distRight; s.dx = 0; }
                    }
                }
            });

            if (touch.current.jump) {
                if (!s.touchJumpActive) {
                    s.jumpReq = true;
                    s.touchJumpActive = true;
                }
            } else {
                s.touchJumpActive = false;
            }

            if (s.jumpReq && !s.jump && onGround) { s.dy = -23; s.jump = true; s.jumpReq = false; }
            if (s.jump || !onGround) { if (frames % 60 === 0) s.jumpReq = false; }

            const isNyaHero = ninja.id === 'nya_smith';

            if (s.active) {
                s.frames++;
                // Bulletproof Sync: Spara till localStorage varje sekund
                if (s.frames % 60 === 0 && s.score > 0) {
                    // Mid-game save removed as requested
                }

                // Camera (Fixed v1.89: Bi-directional following)
                const targetX = s.x - 300;
                s.cameraX = Math.min(Math.max(0, targetX), level.length - 800);
                s.energy = Math.min(100, s.energy + 0.2);

                // Removed per-frame mirroring

                // Fall-Death check (Moved here for safety)
                if (s.y > 600 && s.active) {
                    s.active = false;
                    const finalS = Math.max(Number(s.score) || 0, Number(s.maxScore) || 0);
                    // Fall Death.
                    setCurrentScore(finalS);
                    if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(finalS));
                    onGameOverRef.current(finalS);
                }
            }

            if ((state.current.fireReq || touch.current.fire) && !s.spin) {
                if (isNyaHero) {
                    // [v2.42] Water Stream Attack
                    s.projs.push({
                        x: s.fR ? s.x + 110 : s.x + 30,
                        y: s.y + 80,
                        dx: s.fR ? 18 : -18,
                        c: '#00ccff',
                        type: 'water',
                        startY: s.y + 80,
                        phase: 0
                    });
                } else {
                    s.projs.push({ x: s.fR ? s.x + 110 : s.x + 30, y: s.y + 80, dx: s.fR ? 22 : -22, c: ninja.color });
                }
                touch.current.fire = false;
                state.current.fireReq = false; // Konsumera skott-begäran

                // Olika ljud för olika ninjor
                let shotSFX = 'sfx_lightning_8bit.wav';
                if (ninja.id === 'kai') shotSFX = 'sfx_sword_hit_8bit.wav';
                else if (ninja.id === 'cole') shotSFX = 'sfx_sword_hit_8bit.wav';
                else if (ninja.id === 'zane') shotSFX = 'sfx_lightning_8bit.wav';
                else if (isNyaHero) shotSFX = 'soundreality-explosion-8-bit-13-314697.mp3'; // Water splash-ish

                playSFX(shotSFX, 0.3);
            }
            if (touch.current.spin && s.energy >= 100) {
                s.spin = true; s.spinT = 150; s.energy = 0; touch.current.spin = false;
                playSFX('sfx_spinjitzu_8bit.wav');

                // [v3.10] Unique Power Trigger
                switch (ninja.id) {
                    case 'lloyd':
                        s.enemies.forEach(e => {
                            for (let k = 0; k < 8; k++) s.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, dx: (Math.random() - 0.5) * 15, dy: (Math.random() - 0.5) * 15, life: 30, size: 4, color: '#4ade80', type: 'spark' });
                        });
                        s.enemies = [];
                        s.shake = 10;
                        break;
                    case 'jay':
                        const sortedEnemies = [...s.enemies].sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
                        sortedEnemies.slice(0, 4).forEach(e => {
                            const idx = s.enemies.indexOf(e);
                            if (idx !== -1) s.enemies.splice(idx, 1);
                            for (let k = 0; k < 12; k++) s.particles.push({ x: e.x + 50, y: e.y + 70, dx: (Math.random() - 0.5) * 20, dy: (Math.random() - 0.5) * 20, life: 25, size: 3, color: '#3b82f6', type: 'lightning' });
                        });
                        playSFX('sfx_lightning_8bit.wav', 0.6);
                        break;
                    case 'zane':
                        s.freezeTime = 180; // 3 seconds
                        playSFX('sfx_lightning_8bit.wav', 0.5);
                        break;
                    case 'cole':
                        s.enemies = s.enemies.filter(e => {
                            if (e.y > 400) {
                                for (let k = 0; k < 10; k++) s.particles.push({ x: e.x + 50, y: e.y + 100, dx: (Math.random() - 0.5) * 12, dy: -Math.random() * 15, life: 40, size: 5, color: '#4b2c20', type: 'dust' });
                                return false;
                            }
                            return true;
                        });
                        s.shake = 25;
                        playSFX('soundreality-explosion-8-bit-13-314697.mp3', 0.7);
                        break;
                    case 'nya_smith':
                        s.invincible = 150;
                        break;
                }
            }
            if (s.spin) {
                s.spinT--; s.dx = s.fR ? 17 : -17;
                if (frames % 2 === 0) s.particles.push({ x: s.x + 70 + Math.cos(frames * 0.5) * 100, y: s.y + 80 + Math.sin(frames * 0.5) * 100, dx: 0, dy: 0, life: 30, size: 5, color: ninja.color, type: 'vortex' });

                // [v3.10] Boss Damage Cap
                const b = s.boss;
                if (b.active && Math.abs(s.x + 70 - (b.x + b.w / 2)) < 180 && Math.abs(s.y + 80 - (b.y + b.h / 2)) < 220) {
                    b.hp -= 0.6 * dt; // Balanced damage
                    b.hitT = 2;
                }

                if (isNyaHero && frames % 5 === 0) {
                    for (let k = 0; k < 2; k++) s.particles.push({
                        x: s.x + 70 + (Math.random() - 0.5) * 150,
                        y: s.y + 140, dx: 0, dy: -5, life: 40, size: 6, color: '#00ccff', type: 'vortex'
                    });
                }
                if (s.spinT <= 0) s.spin = false;
            }

            // [v3.10] Nya Rapid Fire & Zane Freeze State
            if (ninja.id === 'nya_smith' && s.spin && frames % 6 === 0) s.fireReq = true;
            if (s.freezeTime > 0) s.freezeTime--;

            if (frames % 4 === 0) {
                const at = level.atmosphereType;
                if (at === 'snow') s.particles.push({ x: s.cameraX + Math.random() * 800, y: -20, dx: (Math.random() - 0.5) * 2, dy: 2 + Math.random() * 3, life: 200, size: 2 + Math.random() * 3, color: 'white', type: 'snow' });
                if (at === 'embers') s.particles.push({ x: s.cameraX + Math.random() * 800, y: 620, dx: (Math.random() - 0.5) * 2, dy: -2 - Math.random() * 2, life: 100, size: 2 + Math.random() * 3, color: '#ff6600', type: 'ember' });
                if (at === 'rain') s.particles.push({ x: s.cameraX + Math.random() * 800, y: -20, dx: 4, dy: 15, life: 60, size: 1, color: '#aaaaff88', type: 'rain' });
            }

            ctx.save(); ctx.translate(-s.cameraX, 0);
            // Optimering: Begränsa antalet partiklar för att förhindra lagg på mobila enheter
            if (s.particles.length > 30) s.particles.splice(0, s.particles.length - 30);

            s.particles.forEach((p, i) => {
                p.x += p.dx; p.y += p.dy; p.life--;
                if (p.life <= 0) { s.particles.splice(i, 1); return; }
                // [v3.45] Performance Culling: Skip particles off-screen
                if (p.x < s.cameraX - 100 || p.x > s.cameraX + 900) return;
                ctx.fillStyle = p.color;
                if (p.type === 'vortex') { ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
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
                    const coinVal = level.number === 1 ? 25 : 50;
                    s.score += coinVal;
                    s.maxScore = Math.max(s.maxScore, s.score); // v1.89
                    s.lastReportedScore = s.maxScore;
                    setCurrentScore(s.score);
                    s.scorePopups.push({ x: coin.x, y: coin.y, text: `+${coinVal}`, life: 60 });
                    playSFX('sfx_lightning_8bit.wav', 0.2);
                    for (let k = 0; k < 12; k++) s.particles.push({
                        x: coin.x, y: coin.y,
                        dx: (Math.random() - 0.5) * 10, dy: -Math.random() * 8,
                        life: 35, size: 5, color: '#ffcc00', type: 'spark'
                    });
                    return;
                }
                // Rita mynt som glänsande gul cirkel
                const bob = Math.sin(frames * 0.1 + ci) * 3; // Lätt svävning
                ctx.save();
                ctx.shadowBlur = 12; ctx.shadowColor = '#ffcc00';
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath(); ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(coin.x - 3, coin.y + bob - 3, 3, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('★', coin.x, coin.y + bob + 4);
                ctx.restore();
            });

            for (let i = s.enemies.length - 1; i >= 0; i--) {
                const e = s.enemies[i];

                // [v3.10] Zane Freeze Logic
                if (s.freezeTime > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = '#00ccff';
                    ctx.fillRect(e.x, e.y, e.w, e.h);
                    ctx.restore();
                    continue;
                }

                e.dy += 0.8 * dt; e.y += e.dy * dt;
                let enemyOnGround = false;
                s.plats.forEach(plat => {
                    if (e.x + 10 < plat.x + plat.w && e.x + e.w - 10 > plat.x) {
                        // [v1.81] Enemy Platform Collision (One-Way)
                        if (e.dy >= 0 && e.y + e.h > plat.y && e.y + e.h < plat.y + 15 + e.dy) {
                            e.y = plat.y - e.h;
                            e.dy = 0;
                            enemyOnGround = true;
                        }
                    }
                });
                const dist = (s.x + 70) - (e.x + 50);
                // Positiv distY = spelaren är UNDER fienden (s.y > e.y)
                const distY = s.y - e.y;

                // Svårighetsbaserad hastighet per nivå - [v3.32] Minskar skalningen för att undvika "för snabbt"
                const lvl = level.number || 1;
                const baseSpeed = 1.6 + (lvl - 1) * 0.42; // Nivå 7 blir ca 4.1 istället för 5.1

                let currentPlat = null;
                if (Math.abs(dist) < 750 && Math.abs(distY) < 550) {
                    // Kolla om fienden är på en plattform (och inte på marken)
                    for (const p of s.plats) {
                        if (e.x + 10 < p.x + p.w && e.x + e.w - 10 > p.x && Math.abs(e.y + e.h - p.y) < 10) {
                            currentPlat = p;
                            break;
                        }
                    }

                    const isVisible = e.x > s.cameraX - 100 && e.x < s.cameraX + 900;
                    // Spelaren är UNDER fienden (distY > 80 = fienden är högre upp)
                    const playerIsBelow = distY > 80;

                    // [v3.01] Aggressive Pursuit Logic: Instant Flip and Chase
                    const enemyMidX = e.x + e.w / 2;
                    const ninjaMidX = s.x + 70;
                    const distToNinja = Math.hypot(ninjaMidX - enemyMidX, (s.y + 80) - (e.y + e.h / 2));
                    const isDetected = distToNinja < 650;
                    const chaseSpeed = baseSpeed * 1.45;

                    if (isDetected) {
                        e.alert = true;
                        e.dx = ninjaMidX < enemyMidX ? -chaseSpeed : chaseSpeed;
                    } else {
                        e.alert = false;
                    }

                    // [v3.18/v3.34] AGGRESSIVE PROACTIVE DROP
                    // If player is below and within 750px, JUMP DOWN proactively!
                    const isNearBelow = playerIsBelow && Math.abs(dist) < 750;
                    if (isNearBelow && currentPlat && !e.jumpMode) {
                        // [v3.33/v3.34] UNDERNEATH LOGIC: Find NEAREST edge to clear platform
                        if (Math.abs(dist) < 200) {
                            const toLeft = e.x - currentPlat.x;
                            const toRight = (currentPlat.x + currentPlat.w) - (e.x + e.w);
                            e.jumpMode = (toLeft < toRight) ? 'left' : 'right';
                        } else {
                            e.jumpMode = dist > 0 ? 'right' : 'left';
                        }
                        e.dy = -13; // Stronger jump [v3.34]
                        e.alert = true; // High speed
                    }
                }

                const isDetected = e.alert;
                if (e.jumpMode || isDetected) {
                    if (e.jumpMode) {
                        e.dx = e.jumpMode === 'left' ? -(baseSpeed + 3) : (baseSpeed + 3);
                        if (currentPlat) {
                            const toLeftEdge = e.x - currentPlat.x;
                            const toRightEdge = (currentPlat.x + currentPlat.w) - (e.x + e.w);
                            if (toLeftEdge < 30 && e.jumpMode === 'left') { e.x -= 100; e.jumpMode = null; }
                            else if (toRightEdge < 30 && e.jumpMode === 'right') { e.x += 100; e.jumpMode = null; }
                        } else e.jumpMode = null;
                    }
                    e.x += e.dx * dt * (e.slowT > 0 ? 0.7 : 1);
                } else {
                    e.x += e.dx * dt * (e.slowT > 0 ? 0.7 : 1);
                    if (e.x < e.origX || e.x > e.origX + e.range) e.dx *= -1;
                }

                // [v3.27] ULTRA SWARM SEPARATION: Very strong push for high-density clusters
                for (let j = 0; j < s.enemies.length; j++) {
                    if (i === j) continue;
                    const other = s.enemies[j];
                    const dx = e.x - other.x;
                    const dy = e.y - other.y;
                    const enemyDistX = Math.abs(dx);
                    const enemyDistY = Math.abs(dy);
                    const minEnemyDist = 120; // Increased from 100
                    if (enemyDistX < minEnemyDist && enemyDistY < 100) {
                        const push = (minEnemyDist - enemyDistX) * 0.4; // Stronger push (0.25 -> 0.4)
                        // If exactly same spot, use index as tie breaker
                        if (dx === 0) {
                            e.x += (i < j) ? -10 : 10;
                        } else if (dx < 0) {
                            e.x -= push;
                        } else {
                            e.x += push;
                        }
                    }
                }

                // [v3.15] Leap Behavior: Chance to dash/jump towards ninja when close
                if (isDetected && !e.jumpMode && Math.abs(dist) < 300 && frames % 120 === 0) {
                    const leapChance = 0.3 + (level.number * 0.05);
                    if (Math.random() < leapChance) {
                        e.dy = -12; // Small jump
                        e.dx *= 2; // Temporary speed boost
                    }
                }

                if (e.slowT > 0) e.slowT -= dt;

                // [v2.42] Nya Aura Damage (proximity)
                const isNya = ninja.id === 'nya_smith';
                if (isNya && s.active) {
                    const dx = (s.x + 70) - (e.x + e.w / 2), dy = (s.y + 80) - (e.y + e.h / 2);
                    if (Math.hypot(dx, dy) < 110 && frames % 10 === 0) {
                        e.x += dx > 0 ? -20 : 20; // Push back
                        // Normal logic follows for "killing" enemy on aura touch/spin
                    }
                }

                // [v3.45] Performance Culling: Skip rendering if far off-screen
                const isOnScreen = e.x > s.cameraX - 200 && e.x < s.cameraX + 1000;
                
                const mImg = images.current[e.img];
                if (isOnScreen && mImg?.complete && mImg.naturalWidth > 0) {
                    if (!cleanedImages.current[e.img]) {
                        const canvas = document.createElement('canvas');
                        canvas.width = mImg.naturalWidth; canvas.height = mImg.naturalHeight;
                        const tempCtx = canvas.getContext('2d');
                        if (tempCtx) {
                            tempCtx.drawImage(mImg, 0, 0);
                            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            for (let j = 0; j < data.length; j += 4) { 
                                // [v3.70] Aggressive transparency cleanup for Level 6 and others ("net" issue)
                                const r = data[j], g = data[j + 1], bDigit = data[j + 2];
                                // Catch near-white, light gray, and very bright colors
                                // Level 6 often has artifacts in the 170-200 range
                                const threshold = (level.number === 6) ? 160 : 190;
                                if ((r > threshold && g > threshold && bDigit > threshold) || (r > 240 || g > 240 || bDigit > 240)) data[j + 3] = 0; 
                            }
                            tempCtx.putImageData(imageData, 0, 0); cleanedImages.current[e.img] = canvas;
                        }
                    }
                    const cleanedImg = cleanedImages.current[e.img] || mImg;
                    ctx.save();
                    if (e.dx > 0) { ctx.translate(e.x + e.w, e.y); ctx.scale(-1, 1); ctx.drawImage(cleanedImg, 0, 0, e.w, e.h); }
                    else { ctx.drawImage(cleanedImg, e.x, e.y, e.w, e.h); }
                    ctx.restore();

                    // [v2.98] Alert Icon (!)
                    if (e.alert) {
                        ctx.save();
                        ctx.fillStyle = '#ffcc00';
                        ctx.strokeStyle = 'black';
                        ctx.lineWidth = 3;
                        ctx.font = 'bold 40px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.strokeText('!', e.x + e.w / 2, e.y - 20);
                        ctx.fillText('!', e.x + e.w / 2, e.y - 20);
                        ctx.restore();
                    }
                } else if (!isOnScreen) {
                   // No draw - [v3.60] Ensure strict removal if far behind camera
                   if (e.x < s.cameraX - 500) {
                       s.enemies.splice(i, 1);
                       continue;
                   }
                } else { ctx.fillStyle = "#8b5cf6"; ctx.fillRect(e.x, e.y, e.w, e.h); }

                // Kollisionshantering spelare <-> fiende
                if (s.x < e.x + e.w - 25 && s.x + 140 > e.x + 25 && s.y < e.y + e.h - 35 && s.y + 140 > e.y + 15) {
                    // [v3.34] Increased vertical tolerance for clashing from above (Perfect Hit)
                    const isClashingFromAbove = (s.dy > -2 && s.y + 130 < e.y + 40);

                    if (s.spin || isClashingFromAbove) {
                        // [v3.33] CLASHING FIX: Handle Radius Kill BEFORE removing the primary target
                        const centerX = e.x + 50;
                        const centerY = e.y + 60;

                        if (isClashingFromAbove) {
                            s.dy = -15; s.y -= 25; // Slightly higher bounce

                            // [v3.27/v3.33] RADIUS KILL: Search for clusters
                            for (let n = s.enemies.length - 1; n >= 0; n--) {
                                if (n === i) continue; // Don't remove target inside this loop
                                const otherE = s.enemies[n];
                                const distToImpact = Math.hypot((otherE.x + 50) - centerX, (otherE.y + 70) - centerY);
                                if (distToImpact < 180) {
                                    for (let k = 0; k < 8; k++) s.particles.push({
                                        x: otherE.x + 50, y: otherE.y + 60,
                                        dx: (Math.random() - 0.5) * 15, dy: (Math.random() - 0.5) * 15,
                                        life: 30, size: 4, color: '#ffcc00', type: 'spark'
                                    });
                                    s.score += (level.number === 1 ? 50 : 100);
                                    s.enemies.splice(n, 1);
                                    if (n < i) i--; // Sync index
                                }
                            }
                        }

                        // Remove the primary hit target (only once!)
                        s.enemies.splice(i, 1);

                        // COMBO-system
                        s.combo++;
                        s.comboTimer = 120; // 2 sekunder
                        const enemyVal = level.number === 1 ? 50 : 100;
                        const bonus = s.combo > 1 ? s.combo * (level.number === 1 ? 25 : 50) : 0;
                        s.score += enemyVal + bonus;
                        s.maxScore = Math.max(s.maxScore, s.score);
                        s.lastReportedScore = s.maxScore;
                        if (typeof window !== 'undefined' && s.y > 700) localStorage.setItem('ninjago_emergency_score', String(s.maxScore));
                        if (s.combo > 1) {
                            s.comboTextVal = s.combo;
                            s.comboTextLife = 90;
                        }
                        setCurrentScore(s.score);
                        s.energy = Math.min(100, s.energy + 20);
                        playSFX('soundreality-explosion-8-bit-13-314697.mp3', 0.6 + (isClashingFromAbove ? 0.2 : 0));
                        for (let k = 0; k < 12; k++) s.particles.push({ x: centerX, y: centerY, dx: (Math.random() - 0.5) * 12, dy: (Math.random() - 0.5) * 12, life: 40, size: 5, color: '#ffcc00', type: 'spark' });

                        if (isClashingFromAbove) continue; // Skip to next enemy correctly
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
                                const finalS = Math.max(Number(s.maxScore) || 0, s.lastReportedScore || 0, Number(localStorage.getItem('ninjago_emergency_score')) || 0);
                                setCurrentScore(finalS);
                                if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(finalS));
                                setTimeout(() => onGameOverRef.current(finalS), 1500);
                            } else {
                                // Respawn med invincibility
                                s.invincible = 120; // 2 sekunder
                                s.x = Math.max(100, s.cameraX + 50);
                                s.y = 350; s.dx = 0; s.dy = 0;
                            }
                        }
                    } else if (s.active) {
                        // [v3.13] Robust Repulsion: Prevent "merging" or "sharing same spot"
                        const diff = (s.x + 70) - (e.x + e.w / 2);
                        const minDist = 60;
                        if (Math.abs(diff) < minDist) {
                            const push = (minDist - Math.abs(diff)) * 0.5;
                            if (diff < 0) s.x -= push;
                            else s.x += push;
                        }
                    }
                }
            }

            for (let i = s.projs.length - 1; i >= 0; i--) {
                const pr = s.projs[i];
                pr.x += pr.dx * dt;

                // [v2.42] Nya's Water Stream Wave Effect
                if (pr.type === 'water') {
                    pr.phase += 0.2;
                    pr.y = pr.startY + Math.sin(pr.phase) * 50;

                    // Drawing water beam (wider)
                    const grad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 60);
                    grad.addColorStop(0, 'white'); grad.addColorStop(0.3, '#00ccff'); grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 60, 40, 0, 0, Math.PI * 2); ctx.fill();
                } else {
                    const pGrad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 40);
                    pGrad.addColorStop(0, 'white'); pGrad.addColorStop(0.3, pr.c); pGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(pr.x, pr.y, 40, 0, Math.PI * 2); ctx.fill();
                }

                for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
                    const e = s.enemies[ei];
                    if (pr.x > e.x && pr.x < e.x + e.w && pr.y > e.y && pr.y < e.y + e.h) {
                        if (pr.type === 'water') {
                            // [v2.42] Slow effect (30% speed reduction for 1.5s = 90 frames)
                            e.slowT = 90;
                        }
                        s.enemies.splice(ei, 1); s.projs.splice(i, 1);
                        const ePoints = level.number === 1 ? 50 : 100;
                        s.score += ePoints; setCurrentScore(s.score);
                        // ... rest of explosion logic
                        s.energy = Math.min(100, s.energy + 10);
                        playSFX('u_b32baquv5u-explosion-2-340454.mp3', 0.8);
                        for (let k = 0; k < 15; k++) s.particles.push({ x: e.x + 60, y: e.y + 70, dx: (Math.random() - 0.5) * 15, dy: (Math.random() - 0.5) * 15, life: 30, size: 3, color: pr.c, type: 'spark' });
                        break;
                    }
                }
                if (!s.projs[i]) continue;

                const b = s.boss;
                const isNya = ninja.id === 'nya_smith';
                if (pr.x > b.x && pr.x < b.x + b.w && pr.y > b.y && pr.y < b.y + b.h && b.x < s.cameraX + 850) {
                    let dmg = 35; // default
                    if (ninja.id === 'lloyd') dmg = 95;
                    else if (ninja.id === 'cole') dmg = 80;
                    else if (ninja.id === 'kai') dmg = 70;
                    else if (ninja.id === 'jay') dmg = 60;
                    else if (ninja.id === 'zane') dmg = 50;
                    else if (ninja.id === 'nya_smith') dmg = 20;

                    b.hp -= dmg; b.hitT = 10; s.projs.splice(i, 1); s.shake = 5;
                    if (pr.type === 'water') {
                        // [v2.42] Debuffs: Slow + Drenched
                        b.slowT = 90;
                        b.drenchedT = 120; // 2 seconds shot slowdown
                    }
                    if (b.hp <= 0 && s.active) {
                        s.active = false;
                        playSFX('lesiakower-level-up-enhancement-8-bit-retro-sound-effect-153002.mp3', 1.0);
                        for (let k = 0; k < 50; k++) s.particles.push({
                            x: b.x + b.w / 2, y: b.y + b.h / 2,
                            dx: (Math.random() - 0.5) * 30, dy: (Math.random() - 0.5) * 30,
                            life: 100, size: 8, color: '#ffcc00', type: 'spark'
                        });

                        // [v2.40] Time Bonus: seconds_left * 50
                        const timeBonus = Math.floor(s.timeLeft * 50);
                        const levelPoints = level?.bossPoints || 500;
                        const finalS = s.score + levelPoints + timeBonus;

                        if (level.number === 7) {
                            // Level 7 Secret Win Screen
                            const winS = s.score + 50000 + timeBonus;
                            setCurrentScore(winS);
                            playSFX('lesiakower-level-up-enhancement-8-bit-retro-sound-effect-153002.mp3', 1.0);
                            setTimeout(() => {
                                onLevelCompleteRef.current(winS);
                            }, 2000);
                            return;
                        }
                        setCurrentScore(finalS);
                        setTimeout(() => onLevelCompleteRef.current(finalS), 2000);
                    }
                }
            }

            // [v3.10] Boss Position Fix (spawn lock)
            if (s.x > level.length - 600) {
                const b = s.boss;
                if (!b.active) {
                    b.active = true;
                    b.attackCd = 20; // [v3.70] First shot even faster
                    // [v3.10] Rensa vägen: Ta bort alla småfiender när duellen börjar
                    s.enemies = [];
                }
                if (!b.phase) b.phase = 0;

                // [v3.10] Zane Freeze also affects boss
                if (s.freezeTime <= 0) {
                    b.phase += 0.035 * dt;

                    // [v3.01] Ultimate Boss Positioning: Hard Clamped for 100% Visibility
                    const targetX = Math.max(s.x + 350, level.length - 700);
                    const margin = 20;
                    const screenRight = s.cameraX + 800 - b.w - margin;
                    const screenLeft = Math.max(s.cameraX + margin, s.x + 100);

                    let rawX = targetX + Math.sin(b.phase * 0.5) * 50;
                    b.x = Math.min(screenRight, Math.max(screenLeft, rawX));

                    // [v3.00] Aiming: Boss tracks ninja's Y position
                    const desiredY = Math.min(300, Math.max(50, s.y + 80 - b.h / 2));
                    b.y += (desiredY - b.y) * 0.05 * dt;
                }
            }

            // [v3.70] Persistent Shooting Logic: Boss keeps shooting as long as it's active
            if (s.boss.active && s.boss.hp > 0) {
                const b = s.boss;
                b.attackCd -= dt;
                if (b.attackCd <= 0 && s.freezeTime <= 0) {
                    const bX = b.x + b.w / 2, bY = b.y + b.h / 2;
                    const angle = Math.atan2((s.y + 140) - bY, (s.x + 70) - bX);

                    const lvlNum = level.number || 1;
                    const isHoming = lvlNum >= 4 && Math.random() < 0.3;

                    if (lvlNum === 7) {
                        // [v3.70] Lord Garmadon: 2-shot fan
                        for (let j = 0; j < 2; j++) {
                            const spreadAngle = angle + (j === 0 ? -0.15 : 0.15);
                            s.bossProjs.push({
                                x: bX, y: bY,
                                dx: Math.cos(spreadAngle) * 9 * 1.3,
                                dy: Math.sin(spreadAngle) * 9 * 1.3,
                                c: '#8800ff', r: 35, type: 'zigzag',
                                isHoming, phase: 0, baseY: bY
                            });
                        }
                        b.attackCd = 12;
                    } else {
                        // [v3.70] Level 1-6 shooting frequency
                        const speed = (6 + lvlNum * 0.35) * 1.3;
                        let color = '#ff4400';
                        let type: any = 'fire';
                        if (lvlNum === 2) { color = '#00ccff'; type = 'ice'; }
                        else if (lvlNum === 3) color = '#ffaa00';
                        else if (lvlNum === 4) { color = '#eeff00'; type = 'lightning'; }
                        else if (lvlNum === 5) { color = '#8800ff'; type = 'void'; }
                        else if (lvlNum === 6) { color = '#ff0000'; type = 'void'; }

                        s.bossProjs.push({
                            x: bX, y: bY,
                            dx: Math.cos(angle) * speed,
                            dy: Math.sin(angle) * speed,
                            c: color, r: 25 + lvlNum * 5, type, isHoming
                        });

                        // [v3.70] Clear intervals: Lv1: 0.6s, Lv6: 0.25s
                        // Calculation: 45 - (lvlNum * 5) -> 40, 35, 30, 25, 20, 15
                        b.attackCd = Math.max(15, 45 - (lvlNum * 5));

                        // [v3.70] Particles for Lv 1-6
                        for (let k = 0; k < 10; k++) s.particles.push({ 
                            x: bX, y: bY, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, 
                            life: 20, size: 4, color: color, type: 'spark' 
                        });
                    }
                    
                    // [v3.70] Garmadon Particles (handled separately to avoid scope errors)
                    if (lvlNum === 7) {
                        for (let k = 0; k < 10; k++) s.particles.push({ 
                            x: bX, y: bY, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, 
                            life: 20, size: 4, color: '#8800ff', type: 'spark' 
                        });
                    }

                    // [v2.42] Drenched Effect: Shoot 50% slower (Double Cd)
                    if (b.drenchedT > 0) {
                        b.attackCd *= 2;
                        b.drenchedT--;
                    }
                }
            }

            const bRef = s.boss;
            if (bRef.slowT > 0) bRef.slowT--;

            for (let i = s.bossProjs.length - 1; i >= 0; i--) {
                const bp = s.bossProjs[i];
                const b = s.boss;
                // [v2.90] Homing Logic
                if (bp.isHoming) {
                    const targetX = s.x + 70;
                    const targetY = s.y + 140;
                    const angleToPlayer = Math.atan2(targetY - bp.y, targetX - bp.x);
                    const currentAngle = Math.atan2(bp.dy, bp.dx);

                    // Slowly rotate projectile towards player
                    let newAngle = currentAngle + (angleToPlayer - currentAngle) * 0.02 * dt;
                    const curSpeed = Math.hypot(bp.dx, bp.dy);
                    bp.dx = Math.cos(newAngle) * curSpeed;
                    bp.dy = Math.sin(newAngle) * curSpeed;
                }

                // [v3.10] Zane Freeze also affects boss projectiles
                if (s.freezeTime <= 0) {
                    bp.x += bp.dx * dt;
                    if (bp.type === 'zigzag') {
                        bp.phase = (bp.phase || 0) + 0.15 * dt;
                        bp.dy = Math.sin(bp.phase) * 12;
                        bp.y += bp.dy * dt;
                    } else {
                        bp.y += bp.dy * dt;
                    }
                }
                const bpG = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, bp.r);
                bpG.addColorStop(0, 'white'); bpG.addColorStop(0.4, bp.c); bpG.addColorStop(1, 'transparent');
                ctx.fillStyle = bpG; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2); ctx.fill();

                if (Math.hypot(bp.x - (s.x + 70), bp.y - (s.y + 80)) < bp.r + 40 && !s.spin && s.invincible === 0) {
                    const isNya = ninja.id === 'nya_smith';
                    // [v2.49] Nya Shield: Block 1 shot, then 10s cooldown
                    if (isNya && s.nyaShieldCd <= 0) {
                        s.nyaShieldCd = 600; // 10 sekunder
                        s.invincible = 30;   // 0.5s protective frames
                        s.bossProjs.splice(i, 1);
                        playSFX('soundreality-explosion-8-bit-13-314697.mp3', 0.6); // "Splash!" SFX
                        for (let k = 0; k < 20; k++) s.particles.push({ x: s.x + 70, y: s.y + 80, dx: (Math.random() - 0.5) * 15, dy: (Math.random() - 0.5) * 15, life: 30, size: 6, color: '#00ccff', type: 'spark' });
                        continue;
                    }

                    if (bp.type === 'ice') { s.dx *= 0.3; } // Is saktar ner...

                    // ALLA skott (inklusive is) skadar nu spelaren
                    if (s.active) {
                        s.lives--;
                        setLives(s.lives);
                        playSFX('lolo_s-down-474082.mp3', 0.8);
                        s.shake = 12; s.combo = 0;
                        if (s.lives <= 0) {
                            s.active = false;
                            const finalS = Math.max(Number(s.maxScore) || 0, s.lastReportedScore || 0);
                            setCurrentScore(finalS);
                            if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(finalS));
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
            const isNya = ninja.id === 'nya_smith';

            if (isNya && s.active) {
                if (s.nyaShieldCd <= 0) {
                    // [v2.42] Pulse Blue Glow Behind Nya
                    const pulse = 0.5 + Math.sin(frames * 0.1) * 0.2;
                    ctx.save();
                    ctx.shadowBlur = 40 * pulse;
                    ctx.shadowColor = '#00ccff';
                    ctx.beginPath();
                    ctx.arc(s.x + 70, s.y + 80, 80, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 204, 255, 0.1)';
                    ctx.fill();
                    ctx.restore();

                    // [v2.42] Constant Water Aura
                    ctx.save();
                    const auraG = ctx.createRadialGradient(s.x + 70, s.y + 80, 40, s.x + 70, s.y + 80, 110);
                    auraG.addColorStop(0, 'rgba(0, 204, 255, 0.4)');
                    auraG.addColorStop(1, 'transparent');
                    ctx.fillStyle = auraG;
                    ctx.beginPath();
                    ctx.arc(s.x + 70, s.y + 80, 110, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // [v2.42] Water Tornado during high speed or jump
                if (s.jump || Math.abs(s.dx) > 5) {
                    for (let k = 0; k < 3; k++) {
                        s.particles.push({
                            x: s.x + 70 + (Math.random() - 0.5) * 40,
                            y: s.y + 140,
                            dx: (Math.random() - 0.5) * 10,
                            dy: -Math.random() * 10,
                            life: 20, size: 4, color: '#00ccff', type: 'vortex'
                        });
                    }
                }

                // [v2.42] Shield Cooldown update
                if (s.nyaShieldCd > 0) s.nyaShieldCd--;
            }

            if (shouldDrawPlayer) {
                ctx.save(); ctx.translate(s.x + 70, s.y + 80); if (!s.fR) ctx.scale(-1, 1);
                if (s.invincible > 0) ctx.filter = 'brightness(2) sepia(1) hue-rotate(180deg)';

                if (isNya) {
                    // Use a generic blue placeholder or draw image if available
                    if (nImg?.complete && nImg.naturalWidth > 0) ctx.drawImage(nImg, -70, -80, 140, 160);
                    else { ctx.fillStyle = '#00ccff'; ctx.fillRect(-70, -80, 140, 160); }
                } else if (nImg?.complete && nImg.naturalWidth > 0) ctx.drawImage(nImg, -70, -80, 140, 160);
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
                p.y -= 1.5 * dt; // Apply dt
                p.life -= dt; // Apply dt
                if (p.life <= 0) { s.scorePopups.splice(i, 1); continue; }
                ctx.save();
                ctx.globalAlpha = p.life / 60;
                ctx.font = 'bold 24px Orbitron, sans-serif';
                ctx.fillStyle = '#ffcc00';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            }

            if (s.spin) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sG = ctx.createRadialGradient(s.x + 70, s.y + 80, 0, s.x + 70, s.y + 80, 140); sG.addColorStop(0, 'white'); sG.addColorStop(0.5, ninja.color); sG.addColorStop(1, 'transparent'); ctx.fillStyle = sG; ctx.beginPath(); ctx.arc(s.x + 70, s.y + 80, 140, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

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

            if (s.x > level.length - 3500) {
                const b = s.boss;
                // Kollision med bossen
                if (b && b.hp > 0 && b.x < s.cameraX + 1000) {
                    if (Math.abs(s.x + 70 - (b.x + b.w / 2)) < 150 && Math.abs(s.y + 80 - (b.y + b.h / 2)) < 200) {
                        if (s.spin) {
                            b.hp -= 2; // Spin gör mer skada på bossen
                            b.hitT = 10;
                            if (b.hp <= 0) {
                                s.active = false;
                                s.score += 2000;
                                setCurrentScore(s.score);
                                playSFX('lesiakower-level-up-enhancement-8-bit-retro-sound-effect-153002.mp3');
                                s.shake = 20;
                                for (let k = 0; k < 30; k++) s.particles.push({
                                    x: b.x + b.w / 2, y: b.y + b.h / 2,
                                    dx: (Math.random() - 0.5) * 20, dy: (Math.random() - 0.5) * 20,
                                    life: 60, size: 8, color: '#f0f', type: 'void'
                                });
                                // [v2.40] Time Bonus: seconds_left * 50
                                const timeBonus = Math.floor(s.timeLeft * 50);
                                const finalS = s.score + 2000 + timeBonus;
                                setCurrentScore(finalS);
                                setTimeout(() => onLevelCompleteRef.current(finalS), 2000);
                            }
                        } else if (s.active) {
                            s.active = false;
                            playSFX('lolo_s-down-474082.mp3', 1.0);
                            const finalS = Math.max(Number(s.maxScore) || 0, s.lastReportedScore || 0);
                            setCurrentScore(finalS);
                            if (typeof window !== 'undefined') localStorage.setItem('ninjago_last_score', String(finalS));
                            setTimeout(() => onGameOverRef.current(finalS), 1500);
                        }
                    }
                }

                if (b.hitT > 0) b.hitT -= dt;
                // [v3.45] Boss Rendering Stabilization
                const isBossOnScreen = s.boss.x > s.cameraX - 500 && s.boss.x < s.cameraX + 1100;
                const bImage = images.current[b.img];

                if (isBossOnScreen && bImage?.complete && bImage.naturalWidth > 0) {
                    if (!cleanedImages.current[b.img]) {
                        const canvas = document.createElement('canvas');
                        canvas.width = bImage.naturalWidth; canvas.height = bImage.naturalHeight;
                        const tempCtx = canvas.getContext('2d');
                        if (tempCtx) {
                            tempCtx.drawImage(bImage, 0, 0);
                            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            for (let j = 0; j < data.length; j += 4) { 
                                 if (data[j] > 220 && data[j + 1] > 220 && data[j + 2] > 220) data[j + 3] = 0; 
                            }
                            tempCtx.putImageData(imageData, 0, 0);
                            cleanedImages.current[b.img] = canvas;
                        }
                    }
                    const isGarmadon = b.img.toLowerCase().includes('garmadon');
                    const cleanedBImg = cleanedImages.current[b.img] || bImage;
                    ctx.save();
                    try {
                        if (b.hitT % 2 === 1) ctx.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
                        
                        if (isGarmadon) {
                            ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
                            ctx.scale(Math.cos(timestamp / 500) * 0.1 + 1, 1);
                            ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
                        }

                        // [v3.70] Selective Boss Flip: 1, 4, 5 No Flip; 2, 3, 6, 7 Flip
                        const needsFlip = [2, 3, 6, 7].includes(level.number);
                        if (needsFlip) {
                            ctx.translate(b.x + b.w, b.y);
                            ctx.scale(-1, 1);
                            ctx.drawImage(cleanedBImg, 0, 0, b.w, b.h);
                        } else {
                            ctx.drawImage(cleanedBImg, b.x, b.y, b.w, b.h);
                        }
                    } finally {
                        ctx.restore();
                    }
                } else if (isBossOnScreen) {
                    // [v3.45] Placeholder for loading state
                    ctx.fillStyle = "#4c1d95";
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                }

                // Boss HP Bar & Name - VISAS BARA NÄR BOSSEN ÄR SYNLIG
                if (b.x < s.cameraX + 850) {
                    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(s.cameraX + 200, 30, 400, 30);
                    ctx.fillStyle = b.hp / b.max < 0.3 ? '#ff4444' : '#ffcc00'; ctx.fillRect(s.cameraX + 200, 30, 400 * (b.hp / b.max), 30);
                    // [v2.80] Numeric HP Display
                    ctx.fillStyle = 'white'; ctx.font = 'black 14px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(`${Math.ceil(b.hp)} / ${b.max} HP`, s.cameraX + 400, 50);
                    ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.strokeRect(s.cameraX + 200, 30, 400, 30);
                    ctx.fillStyle = "white"; ctx.font = "black 18px Orbitron, sans-serif"; ctx.textAlign = "center";
                    const bossName = level.boss.name.toUpperCase();
                    ctx.fillText(bossName, s.cameraX + 400, 52);
                }
            }
            ctx.restore();

            if (s.shake > 0) {
                ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
                s.shake *= 0.9;
                if (s.shake < 0.2) s.shake = 0;
            }

            if (frames % 3 === 0) {
                const safeScore = Number(s.score) || 0;
                setCurrentScore(safeScore);
                onScoreUpdate?.(safeScore);
                setSpinEnergy(s.energy);
                setDisplayTime(s.timeLeft);
                setLives(s.lives);
            }
            ctx.filter = 'none'; // [v3.45] Explicit reset
        } catch (err) {
            console.error('[v3.60] Render Crash Recovered:', err);
        }
        raf = requestAnimationFrame(loop);
    };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [gameStarted]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden bg-black no-select no-touch-callout ${isMobile
                    ? 'h-full w-full'
                    : 'aspect-video rounded-3xl border-4 border-white/10 shadow-2xl h-full'
                }`}
            style={{ touchAction: 'none' }}
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
                <div className="absolute inset-0 z-[200] pointer-events-none">
                    {/* [v3.51] TOP LEFT: Ninja + HP (Hearts) - Moved slightly down to avoid solid header overlap if needed, but header is outside this div now */}
                    <div className="absolute top-1 left-2 md:top-4 md:left-4 flex flex-col gap-1 items-start pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-2 overflow-hidden bg-black/40 ${spinEnergy >= 100 ? 'border-yellow-400 shadow-[0_0_20px_#fbbf24]' : 'border-white/20'}`}>
                                <img src={`/${ninja.id}.png`} className="w-full h-full object-cover" alt={ninja.name} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">{ninja.name}</span>
                                <div className="flex gap-0.5 text-sm md:text-2xl">
                                    {[1, 2, 3].map(i => (
                                        <span key={i} className={i <= lives ? 'text-red-500 drop-shadow-[0_0_6px_red]' : 'text-white/10'}>
                                            {i <= lives ? '❤️' : '🖤'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* [v3.50] TOP CENTER: Spin-energi */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-10 md:top-2 flex flex-col items-center gap-0.5">
                        <div className="text-[7px] md:text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Spinjitzu (Z)</div>
                        <div className={`${isMobile ? 'w-20 h-1.5' : 'w-48 h-5'} bg-black/40 rounded-full border border-white/10 overflow-hidden relative`}>
                            <div className={`h-full transition-all duration-300 ${spinEnergy >= 100 ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${spinEnergy}%` }} />
                        </div>
                    </div>

                    {/* [v3.50] TOP RIGHT: Timer */}
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 pointer-events-auto">
                        <div className={`px-2 py-0.5 md:px-3 md:py-1 bg-black/40 backdrop-blur-md rounded-lg border ${displayTime < 30 ? 'border-red-500 text-red-500' : 'border-white/10 text-white'} font-black shadow-xl text-xs md:text-2xl`}>
                            {displayTime}s
                        </div>
                    </div>
                </div>
            )}

            {/* [v3.60] Touch-kontroller optimerade för både Porträtt och Landskap via Portal - Robust Crash Fix */}
            {gameStarted && isMobile && typeof document !== 'undefined' && (
                (() => {
                    const targetId = isLandscape ? 'landscape-controls-root' : 'mobile-controls-root';
                    const targetElement = document.getElementById(targetId);
                    
                    if (!targetElement) return null; // Safe guard against null target during rotation transitions

                    return createPortal(
                        <div className={`w-full h-full flex items-end justify-between px-4 pb-4 md:px-8 ${isLandscape ? 'pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]' : ''}`}>
                            
                            {/* 1. Vänsterstyrning: Pilar */}
                            <div className={`flex gap-4 pointer-events-auto items-center ${isLandscape ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}>
                                <button
                                    onPointerDown={(e) => { e.preventDefault(); touch.current.left = true; }} onPointerUp={(e) => { e.preventDefault(); touch.current.left = false; }} onPointerLeave={(e) => { e.preventDefault(); touch.current.left = false; }}
                                    className={`${isLandscape ? 'w-16 h-16' : 'w-16 h-16 md:w-24 md:h-24'} bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-3xl shadow-2xl border-2 border-white/20 select-none active:bg-white/30 text-white`}
                                >←</button>
                                <button
                                    onPointerDown={(e) => { e.preventDefault(); touch.current.right = true; }} onPointerUp={(e) => { e.preventDefault(); touch.current.right = false; }} onPointerLeave={(e) => { e.preventDefault(); touch.current.right = false; }}
                                    className={`${isLandscape ? 'w-16 h-16' : 'w-16 h-16 md:w-24 md:h-24'} bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-3xl shadow-2xl border-2 border-white/20 select-none active:bg-white/30 text-white`}
                               >→</button>
                            </div>

                            {/* 2. Högerstyrning: [v3.60] CLUSTERED ACTION TRIAD */}
                            <div className={`flex flex-col items-center gap-1 pointer-events-auto ${isLandscape ? 'opacity-40 hover:opacity-100 transition-opacity mb-2' : ''}`}>
                                {/* SPIN (🌪️) - Överst centrerad */}
                                <button
                                    onPointerDown={(e) => { e.preventDefault(); if(spinEnergy >= 100) { state.current.spin = true; state.current.spinT = 150; state.current.energy = 0; } }}
                                    className={`${isLandscape ? 'w-14 h-14' : 'w-14 h-14 md:w-20 md:h-20'} rounded-full border-2 font-black transition-all select-none text-[8px] flex items-center justify-center mb-1 ${spinEnergy >= 100
                                            ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_20px_#fbbf24] animate-pulse opacity-100'
                                            : 'bg-black/60 text-white/40 border-white/10 opacity-30 pointer-events-none'
                                        }`}
                                >Spin</button>

                                <div className="flex items-center gap-4">
                                    {/* SKJUT (🔥) - Till vänster om Hoppa */}
                                    <button
                                        onPointerDown={(e) => { e.preventDefault(); state.current.fireReq = true; touch.current.fire = true; }}
                                        onPointerUp={() => touch.current.fire = false}
                                        className={`${isLandscape ? 'w-16 h-16' : 'w-16 h-16 md:w-24 md:h-24'} bg-red-600/80 backdrop-blur-lg rounded-full font-black text-[10px] shadow-2xl border-2 border-red-400/30 active:bg-red-600/100 active:opacity-100 opacity-80 transition-all text-white flex flex-col items-center justify-center pt-1`}
                                    >
                                        <span className="text-xl">🔥</span>
                                        <span className="uppercase tracking-tighter">Skjut</span>
                                    </button>

                                    {/* HOPP (Blå) - Längst till höger */}
                                    <button
                                        onPointerDown={(e) => { e.preventDefault(); state.current.jumpReq = true; touch.current.jump = true; }} onPointerUp={(e) => { e.preventDefault(); touch.current.jump = false; }} onPointerLeave={(e) => { e.preventDefault(); touch.current.jump = false; }}
                                        className={`${isLandscape ? 'w-20 h-20' : 'w-20 h-20 md:w-32 md:h-32'} bg-blue-600/80 backdrop-blur-lg rounded-full font-black text-[12px] shadow-2xl border-4 border-blue-400/40 active:bg-blue-600/100 active:opacity-100 opacity-80 transition-all text-white flex items-center justify-center uppercase tracking-widest`}
                                    >HOPPA</button>
                                </div>
                            </div>
                        </div>,
                        targetElement
                    );
                })()
            )}
        </div>
    );
}

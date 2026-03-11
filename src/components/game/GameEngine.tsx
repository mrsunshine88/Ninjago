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
  onGameOver: (score: number) => void;
  onLevelComplete: (points: number) => void;
}

export function GameEngine({ ninja, level, playerName, onGameOver, onLevelComplete }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [spinEnergy, setSpinEnergy] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const state = useRef({
    started: false,
    active: true,
    score: 0,
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
    hazards: [] as any[],
    particles: [] as Particle[],
    boss: { hp: 1, max: 1, active: false, x: 0, y: 0, w: 0, h: 0, img: '', attackCd: 0 },
    initDone: false
  });

  const touch = useRef({ left: false, right: false, jump: false, fire: false, spin: false });
  const keys = useRef<{ [key: string]: boolean }>({});
  const images = useRef<{ [key: string]: HTMLImageElement }>({});

  const monsterFiles = [
    'Blå orm.png', 'Grön demon.png', 'Grön orm.png', 'Guld svart orm.png', 
    'Lila orm.png', 'Röd orm.png', 'Skelette.png', 'fiender ond.png', 
    'lila svart monster.png', 'lila svart stor orm.png', 'stor drake.png', 'storm arg orm.png'
  ];

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const lb = getLeaderboard();
    if (lb && lb.length > 0) {
        const top = lb[0].score;
        setHighScore(top);
        state.current.highScore = top;
    }

    const heroFiles = ['kai.png', 'Jay.png', 'zane.png', 'Cole.png', 'Lloyd.png', 'Nya.png', 'overlord.png'];
    
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
        keys.current[e.code] = v;
        const k = e.key.toLowerCase();
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
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    return () => { 
        state.current.active = false; 
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    state.current.active = true;

    if (!state.current.initDone) {
        const len = level.length;
        const platforms: any[] = [];
        platforms.push({ x: 0, y: 560, w: len, h: 200 }); 
        
        let curX = 1200;
        while (curX < len - 3000) {
            const h = 300 + Math.random() * 200;
            const w = 400 + Math.random() * 800;
            platforms.push({ x: curX, y: h, w, h: 40 }); 
            if (Math.random() > 0.5) {
                platforms.push({ x: curX - 100, y: 500, w: 100, h: 60 });
            }
            curX += w + 200 + Math.random() * 400;
        }
        
        state.current.plats = platforms;
        state.current.enemies = platforms.filter((p,i) => i > 0 && p.w > 200 && Math.random()>0.4).map((p,i) => {
            const enemyX = p.x + 100;
            const mFile = monsterFiles[i % monsterFiles.length];
            return {
                x: enemyX, y: p.y - 140, w: 120, h: 140, dx: -1.8, dy: 0, 
                img: mFile.toLowerCase(), origX: enemyX, range: p.w - 150, onG: true 
            };
        });

        let bossImg = 'overlord';
        if (level.number === 1) bossImg = 'stor drake.png';
        else if (level.number === 2) bossImg = 'lila svart stor orm.png';
        else if (level.number === 3) bossImg = 'storm arg orm.png';
        else if (level.number === 4) bossImg = 'grön demon.png';
        else if (level.number === 5) bossImg = 'lila svart monster.png';

        state.current.boss = { 
            x: len - 1200, y: 150, w: 420, h: 480, 
            hp: level.boss.healthMultiplier * 20, 
            max: level.boss.healthMultiplier * 20, 
            active: false,
            img: bossImg.toLowerCase(),
            attackCd: 120
        };
        state.current.timeLeft = level.timeLimit;
        state.current.initDone = true;
    }
  }, [level, ninja]);

  useEffect(() => {
    if (!gameStarted || !state.current.active) return;
    if (!audioRef.current) {
        const audio = new Audio('/audio/ninjago_menu_music_8bit.wav');
        audio.loop = true; audio.volume = 0.5; audio.play().catch(() => {});
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
        if (now - lastTime >= 1000) { s.timeLeft = Math.max(0, s.timeLeft - 1); lastTime = now; if (s.timeLeft <= 0) { s.active = false; onGameOver(s.score); } }

        ctx.fillStyle = level.bgColor || '#1a140f';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for(let i=0; i<20; i++) { const px = (i*2000-s.cameraX*0.05)%(level.length+2000); ctx.fillRect(px, 100, 600, 500); }
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        for(let i=0; i<40; i++) { const px = (i*1200-s.cameraX*0.15)%(level.length+1200); ctx.fillRect(px, 200, 300, 400); }

        const mL = keys.current['ArrowLeft'] || touch.current.left;
        const mR = keys.current['ArrowRight'] || touch.current.right;
        if (mL) { s.dx = Math.max(s.dx - 1.2, -11); s.fR = false; }
        if (mR) { s.dx = Math.min(s.dx + 1.2, 11); s.fR = true; }
        s.dx *= 0.88; s.dy += 0.8; s.x += s.dx; s.y += s.dy;

        let onGround = false;
        const hitboxPadding = 30;
        s.plats.forEach(plat => {
            if (s.x + hitboxPadding < plat.x + plat.w && s.x + 140 - hitboxPadding > plat.x) {
                if (s.y + 160 > plat.y && s.y + 160 < plat.y + 60 + Math.max(0, s.dy)) {
                    s.y = plat.y - 160; s.dy = 0; s.jump = false; onGround = true;
                }
            }
        });

        if (touch.current.jump) s.jumpReq = true;
        if (s.jumpReq && !s.jump && onGround) { s.dy = -23; s.jump = true; s.jumpReq = false; }
        if (s.jump || !onGround) { if (frames % 60 === 0) s.jumpReq = false; }
        if (s.y > 650) { s.y = 400; s.dy = 0; }

        s.cameraX = Math.max(0, Math.min(s.x - 300, level.length - 800));
        s.energy = Math.min(100, s.energy + 0.2); 
        
        if ((keys.current['KeyX'] || touch.current.fire) && !s.spin) { s.projs.push({ x: s.fR?s.x+110:s.x+30, y: s.y+80, dx: s.fR?22:-22, c: ninja.color }); keys.current['KeyX'] = false; touch.current.fire = false; }
        if (touch.current.spin && s.energy >= 100) { s.spin = true; s.spinT = 150; s.energy = 0; touch.current.spin = false; }
        if (s.spin) { s.spinT--; s.dx = s.fR ? 17 : -17; if(frames%2===0) s.particles.push({ x: s.x+70+Math.cos(frames*0.5)*100, y: s.y+80+Math.sin(frames*0.5)*100, dx: 0, dy: 0, life: 30, size: 5, color: ninja.color, type: 'vortex' }); if(s.spinT <= 0) s.spin = false; }

        if (frames % 4 === 0) {
            const at = level.atmosphereType;
            if (at === 'snow') s.particles.push({ x: s.cameraX+Math.random()*800, y: -20, dx: (Math.random()-0.5)*2, dy: 2+Math.random()*3, life: 200, size: 2+Math.random()*3, color: 'white', type: 'snow' });
            if (at === 'embers') s.particles.push({ x: s.cameraX+Math.random()*800, y: 620, dx: (Math.random()-0.5)*2, dy: -2-Math.random()*2, life: 100, size: 2+Math.random()*3, color: '#ff6600', type: 'ember' });
            if (at === 'rain') s.particles.push({ x: s.cameraX+Math.random()*800, y: -20, dx: 4, dy: 15, life: 60, size: 1, color: '#aaaaff88', type: 'rain' });
        }

        ctx.save(); ctx.translate(-s.cameraX, 0);
        s.particles.forEach((p, i) => {
            p.x += p.dx; p.y += p.dy; p.life--;
            if (p.life <= 0) { s.particles.splice(i, 1); return; }
            ctx.fillStyle = p.color;
            if (p.type === 'vortex') { ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; }
            else { ctx.fillRect(p.x, p.y, p.size, p.size); }
        });

        s.plats.forEach(plat => {
            const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
            grad.addColorStop(0, level.platformColor || '#3d2b1f'); grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(plat.x, plat.y, plat.w, 4);
        });

        s.enemies.forEach((e, i) => {
            e.dy += 0.8; e.y += e.dy;
            s.plats.forEach(plat => {
                if (e.x + 10 < plat.x + plat.w && e.x + e.w - 10 > plat.x) {
                    if (e.y + e.h > plat.y && e.y + e.h < plat.y + 40 + e.dy) { e.y = plat.y - e.h; e.dy = 0; }
                }
            });
            const dist = (s.x + 70) - (e.x + 50);
            if (Math.abs(dist) < 600 && Math.abs(s.y - e.y) < 300) { e.dx = dist > 0 ? 3.4 : -3.4; e.x += e.dx; }
            else { e.x += e.dx; if (e.x < e.origX || e.x > e.origX + e.range) e.dx *= -1; }
            
            const mImg = images.current[e.img];
            if (mImg?.complete && mImg.naturalWidth > 0) {
                ctx.save();
                if (e.dx > 0) { ctx.translate(e.x + e.w, e.y); ctx.scale(-1, 1); ctx.drawImage(mImg, 0, 0, e.w, e.h); }
                else ctx.drawImage(mImg, e.x, e.y, e.w, e.h);
                ctx.restore();
                // BORTTAGEN LILA RUTA!
            } else { 
                ctx.fillStyle = "#8b5cf6"; ctx.fillRect(e.x, e.y, e.w, e.h);
            }

            if (s.x < e.x + e.w - 15 && s.x + 140 > e.x + 15 && s.y < e.y + e.h - 15 && s.y + 160 > e.y + 15) {
                if (s.spin) { 
                    s.enemies.splice(i, 1); s.score += 100; s.energy = Math.min(100, s.energy + 20); 
                    for(let k=0; k<12; k++) s.particles.push({ x: e.x+50, y: e.y+60, dx: (Math.random()-0.5)*12, dy: (Math.random()-0.5)*12, life: 40, size: 5, color: '#ffcc00', type: 'spark' }); 
                } else { s.active = false; onGameOver(s.score); }
            }
        });

        s.projs.forEach((pr, i) => {
            pr.x += pr.dx;
            const pGrad = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 40);
            pGrad.addColorStop(0, 'white'); pGrad.addColorStop(0.3, pr.c); pGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pGrad; ctx.beginPath(); ctx.arc(pr.x, pr.y, 40, 0, Math.PI*2); ctx.fill();
            s.enemies.forEach((e, ei) => {
                if (pr.x > e.x && pr.x < e.x + e.w && pr.y > e.y && pr.y < e.y + e.h) { s.enemies.splice(ei, 1); s.projs.splice(i, 1); s.score += 100; s.energy = Math.min(100, s.energy + 10); for(let k=0; k<15; k++) s.particles.push({ x: e.x+60, y: e.y+70, dx: (Math.random()-0.5)*15, dy: (Math.random()-0.5)*15, life: 30, size: 3, color: pr.c, type: 'spark' }); }
            });
            if (pr.x > s.boss.x && pr.x < s.boss.x + s.boss.w && pr.y > s.boss.y && pr.y < s.boss.y + s.boss.h) { s.boss.hp--; s.projs.splice(i, 1); if (s.boss.hp <= 0) { s.active = false; onLevelComplete(s.score + level.bossPoints + (s.timeLeft * 50)); } }
        });

        // BOSS ATTACK LOGIC & PROJECTILES
        if (s.x > level.length - 3000) {
            s.boss.attackCd--;
            if (s.boss.attackCd <= 0) {
                const bX = s.boss.x + s.boss.w/2;
                const bY = s.boss.y + s.boss.h/2;
                const targetX = s.x + 70;
                const targetY = s.y + 80;
                const angle = Math.atan2(targetY - bY, targetX - bX);
                
                // Diff skalar med nivå (1 = lättast, 6 = svårast)
                const speed = 6 + level.number * 1.5;
                const color = level.number === 1 ? '#ff4400' : level.number === 6 ? '#8b5cf6' : '#00ffcc';
                
                s.bossProjs.push({ x: bX, y: bY, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, c: color, r: 25 + level.number * 5 });
                s.boss.attackCd = Math.max(30, 180 - level.number * 25); // Tätare attacker vid högre nivå
                
                // Partiklar vid avfyring
                for(let k=0; k<10; k++) s.particles.push({ x: bX, y: bY, dx: (Math.random()-0.5)*10, dy: (Math.random()-0.5)*10, life: 20, size: 4, color: color, type: 'spark' });
            }
        }

        s.bossProjs.forEach((bp, i) => {
            bp.x += bp.dx; bp.y += bp.dy;
            const bpGrad = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, bp.r);
            bpGrad.addColorStop(0, 'white'); bpGrad.addColorStop(0.4, bp.c); bpGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bpGrad; ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI*2); ctx.fill();
            
            // Ninja Hit Test
            const dist = Math.hypot(bp.x - (s.x + 70), bp.y - (s.y + 80));
            if (dist < bp.r + 40 && !s.spin) { s.active = false; onGameOver(s.score); }
            
            if (bp.x < s.cameraX - 100 || bp.x > s.cameraX + 900 || bp.y < -100 || bp.y > 700) s.bossProjs.splice(i, 1);
        });

        const nImg = images.current[ninja.id.toLowerCase()];
        ctx.save(); ctx.translate(s.x + 70, s.y + 80); if (!s.fR) ctx.scale(-1, 1);
        if (nImg?.complete && nImg.naturalWidth > 0) ctx.drawImage(nImg, -70, -80, 140, 160);
        else { ctx.fillStyle = ninja.color; ctx.fillRect(-70, -80, 140, 160); }
        ctx.restore();

        if (s.spin) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sGrad = ctx.createRadialGradient(s.x+70, s.y+80, 0, s.x+70, s.y+80, 140); sGrad.addColorStop(0, 'white'); sGrad.addColorStop(0.5, ninja.color); sGrad.addColorStop(1, 'transparent'); ctx.fillStyle = sGrad; ctx.beginPath(); ctx.arc(s.x+70, s.y+80, 140, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
        
        if (s.x > level.length - 2500) {
            const bImg = images.current[s.boss.img];
            if (bImg?.complete && bImg.naturalWidth > 0) ctx.drawImage(bImg, s.boss.x, s.boss.y, s.boss.w, s.boss.h);
            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(s.cameraX+200, 30, 400, 25);
            ctx.fillStyle = "#ff4444"; ctx.fillRect(s.cameraX+200, 30, 400*(s.boss.hp/s.boss.max), 25);
            ctx.strokeStyle = "white"; ctx.strokeRect(s.cameraX+200, 30, 400, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
            ctx.fillText(s.boss.img.toUpperCase().replace('.PNG', ''), s.cameraX+400, 25);
        }
        ctx.restore();

        if (frames % 10 === 0) { setCurrentScore(s.score); setSpinEnergy(s.energy); setDisplayTime(s.timeLeft); }
        raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); };
  }, [gameStarted]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />
      
      {!gameStarted && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-black/85 backdrop-blur-3xl px-12 text-center text-white">
            <div className="w-32 h-32 bg-white/10 rounded-full mb-6 p-4 border border-white/20 animate-pulse overflow-hidden">
                <img src="/icon.png" className="w-full h-full object-cover rounded-full" alt="Ninjago" />
            </div>
            <h2 className="text-6xl font-black italic mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">BANA {level.number}</h2>
            <h3 className="text-4xl font-bold text-white uppercase mb-4 tracking-widest">{level.name}</h3>
            <p className="max-w-md text-white/50 mb-10 text-xl font-medium leading-relaxed italic">"{level.description}"</p>
            <button 
                onPointerDown={() => { state.current.started = true; setGameStarted(true); }}
                className="group relative px-20 py-10 bg-gradient-to-br from-red-600 to-red-800 text-white text-5xl font-black rounded-[2.5rem] shadow-[0_20px_60px_rgba(255,0,0,0.6)] border-b-[16px] border-red-950 active:border-0 active:translate-y-4 transition-all duration-75"
            >
                STARTA STRIDEN!
            </button>
        </div>
      )}

      {gameStarted && (
        <>
            <div className="absolute top-4 inset-x-6 z-[200] flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-2">
                    <div className="px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 text-white font-black text-3xl shadow-2xl flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full bg-red-500 animate-ping" />
                        {currentScore}
                    </div>
                    <div className="px-4 py-1 bg-yellow-500/20 backdrop-blur-sm rounded-xl border border-yellow-500/40 text-yellow-500 font-bold text-sm tracking-widest uppercase">
                        REKORD: {highScore}
                    </div>
                </div>
                
                <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase">Spinjitzu (Z)</div>
                    <div className="w-48 h-5 bg-black/50 rounded-full border border-white/20 overflow-hidden backdrop-blur-md shadow-inner relative">
                        <div 
                            className={`h-full transition-all duration-300 ${spinEnergy >= 100 ? 'bg-yellow-400 shadow-[0_0_20px_yellow]' : 'bg-blue-500'}`} 
                            style={{ width: `${spinEnergy}%` }} 
                        />
                        {spinEnergy >= 100 && <div className="absolute inset-0 animate-pulse bg-white/20" />}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                    <div className={`px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border ${displayTime < 30 ? 'border-red-500 text-red-500 animate-pulse' : 'border-white/20 text-white'} font-black text-3xl shadow-2xl`}>
                        TID: {displayTime}s
                    </div>
                </div>
            </div>
        </>
      )}

      {gameStarted && isMobile && (
        <div className="absolute inset-x-0 bottom-0 top-0 z-[200] pointer-events-none p-6">
             <div className="absolute bottom-8 left-8 flex gap-6 pointer-events-auto">
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.left=true; }} 
                    onPointerUp={(e)=>{ e.preventDefault(); touch.current.left=false; }} 
                    onPointerLeave={(e)=>{ e.preventDefault(); touch.current.left=false; }}
                    className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-6xl shadow-2xl border border-white/20 select-none active:bg-white/30 transition-all font-black text-white"
                >←</button>
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.right=true; }} 
                    onPointerUp={(e)=>{ e.preventDefault(); touch.current.right=false; }} 
                    onPointerLeave={(e)=>{ e.preventDefault(); touch.current.right=false; }}
                    className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-6xl shadow-2xl border border-white/20 select-none active:bg-white/30 transition-all font-black text-white"
                >→</button>
            </div>
            <div className="absolute bottom-8 right-8 flex items-end gap-5 pointer-events-auto">
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.spin=true; }} 
                    className={`w-18 h-18 rounded-full border-4 font-black mt-2 text-xs transition-all select-none ${spinEnergy >= 100 ? 'bg-yellow-400 text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.8)] scale-110' : 'bg-white/5 text-white/10 border-white/5'}`}
                >SPIN</button>
                <button 
                    onPointerDown={(e)=>{ e.preventDefault(); touch.current.jump=true; }} 
                    onPointerUp={(e)=>{ e.preventDefault(); touch.current.jump=false; }} 
                    onPointerLeave={(e)=>{ e.preventDefault(); touch.current.jump=false; }}
                    className="w-28 h-28 bg-blue-600/40 backdrop-blur-xl rounded-full font-black text-3xl shadow-2xl border-4 border-white/30 active:scale-90 transition-all select-none text-white"
                >HOPP</button>
            </div>
        </div>
      )}
    </div>
  );
}

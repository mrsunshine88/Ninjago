
export interface Ninja {
  id: string;
  name: string;
  power: string;
  description: string;
  color: string;
  icon: string;
  spriteCol: number;
}

export interface Enemy {
  name: string;
  description: string;
  imageKey: string;
  behavior?: 'normal' | 'ice' | 'mine' | 'swamp' | 'city' | 'final';
  spriteCol: number;
  spriteRow: number;
  healthMultiplier: number;
  speedMultiplier?: number;
  canShoot?: boolean;
}

export interface Level {
  number: number;
  name: string;
  description: string;
  boss: Enemy;
  length: number;
  bgColor: string;
  platformColor: string;
  atmosphereType?: 'dust' | 'snow' | 'embers' | 'rain' | 'void';
  hazardType?: 'lava' | 'ice' | 'none';
  difficulty: 1 | 2 | 3 | 4 | 5 | 6;
  bossPoints: number;
  timeLimit: number;
}

// Mappning enligt din sprite-sheet (Rad 1: Hjältar, Rad 2: Bossar)
export const NINJAS: Ninja[] = [
  { id: 'kai', name: 'Kai', power: 'Eld', description: 'Mästare av Eld. Skjuter eldklot!', color: '#EF4444', icon: 'Flame', spriteCol: 0 },
  { id: 'jay', name: 'Jay', power: 'Blixt', description: 'Mästare av Blixt. Kedjeblixtar!', color: '#2563EB', icon: 'Zap', spriteCol: 3 },
  { id: 'zane', name: 'Zane', power: 'Is', description: 'Mästare av Is. Fryser fiender!', color: '#F8FAFC', icon: 'Snowflake', spriteCol: 1 },
  { id: 'cole', name: 'Cole', power: 'Jord', description: 'Mästare av Jord. Skapar jordskalv!', color: '#171717', icon: 'Mountain', spriteCol: 2 },
  { id: 'lloyd', name: 'Lloyd', power: 'Energi', description: 'Den Gröna Ninjan. Massiv kraft!', color: '#22C55E', icon: 'Star', spriteCol: 4 },
];

export const LEVELS: Level[] = [
  { 
    number: 1, 
    name: 'Träning i Dojon',
    description: 'Inomhus i dojon. Lär dig Hoppa (Mellanslag) och Spin (Z).',
    length: 8000,
    bgColor: '#1a140f',
    platformColor: '#3d2b1f',
    atmosphereType: 'dust',
    difficulty: 1,
    bossPoints: 2000,
    timeLimit: 120,
    boss: { 
      name: 'Träningsrobot', 
      description: 'Enkel robot som står ganska still.', 
      imageKey: 'enemy-bot', 
      behavior: 'normal',
      spriteRow: 3,
      spriteCol: 0,
      healthMultiplier: 1,
      speedMultiplier: 0.5
    } 
  },
  { 
    number: 2, 
    name: 'Hypnobrai-grottorna',
    description: 'Blå kristaller och is. Akta dig för hypnosen som fryser dig!',
    length: 18000,
    bgColor: '#051122',
    platformColor: '#1e3a8a',
    atmosphereType: 'snow',
    hazardType: 'ice',
    difficulty: 2,
    bossPoints: 4000,
    timeLimit: 240,
    boss: { 
      name: 'Hypnobrai', 
      description: 'Blå Serpentine. Fryser dig vid träff!', 
      imageKey: 'enemy-hypnobrai', 
      behavior: 'ice',
      spriteRow: 1,
      spriteCol: 0,
      healthMultiplier: 1.5,
      speedMultiplier: 1
    } 
  },
  { 
    number: 3, 
    name: 'Eldtemplet',
    description: 'Plattformar över lava. Fiender skjuter nu eldklot!',
    length: 30000,
    bgColor: '#330000',
    platformColor: '#7f1d1d',
    atmosphereType: 'embers',
    hazardType: 'lava',
    difficulty: 3,
    bossPoints: 6000,
    timeLimit: 400,
    boss: { 
      name: 'Fangpyre', 
      description: 'Röd Serpentine. Skjuter snabba projektiler!', 
      imageKey: 'enemy-fangpyre', 
      behavior: 'normal',
      spriteRow: 1,
      spriteCol: 1,
      healthMultiplier: 2.5,
      canShoot: true
    } 
  },
  { 
    number: 4, 
    name: 'Ninjago City (Natt)',
    description: 'Hustak och neon. Nindroids jagar dig mellan husen!',
    length: 45000,
    bgColor: '#020617',
    platformColor: '#1e1b4b',
    atmosphereType: 'rain',
    difficulty: 4,
    bossPoints: 8000,
    timeLimit: 600,
    boss: { 
      name: 'Nindroid General', 
      description: 'Robot-ninja som kan hoppa efter dig!', 
      imageKey: 'enemy-nindroid', 
      behavior: 'city',
      spriteRow: 3,
      spriteCol: 1,
      healthMultiplier: 4,
      canShoot: true
    } 
  },
  { 
    number: 5, 
    name: 'De bortglömda ruinerna',
    description: 'Sandstormar och fallande pelare. Stenskruttar är tuffa!',
    length: 65000,
    bgColor: '#2d1e0a',
    platformColor: '#451a03',
    atmosphereType: 'dust',
    difficulty: 5,
    bossPoints: 10000,
    timeLimit: 800,
    boss: { 
      name: 'Anacondrai Champion', 
      description: 'Enorm styrka och snabbhet!', 
      imageKey: 'enemy-anacondrai', 
      behavior: 'swamp',
      spriteRow: 1,
      spriteCol: 4,
      healthMultiplier: 6,
      canShoot: true
    } 
  },
  { 
    number: 6, 
    name: 'Slutstriden mot Overlord',
    description: 'Den ultimata ondskan har återvänt. Endast en sann mästare kan besegra honom!',
    length: 90000,
    bgColor: '#000000',
    platformColor: '#1e1b4b',
    atmosphereType: 'void',
    difficulty: 6,
    bossPoints: 20000,
    timeLimit: 1200,
    boss: { 
      name: 'Overlord', 
      description: 'Den absoluta huvudfienden. Undvik hans röda blixtar!', 
      imageKey: 'overlord', 
      behavior: 'final',
      spriteRow: 3,
      spriteCol: 3,
      healthMultiplier: 20,
      canShoot: true
    } 
  },
];

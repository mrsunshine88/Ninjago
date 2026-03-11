
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
  hazardType?: 'lava' | 'ice' | 'none';
  difficulty: 1 | 2 | 3 | 4 | 5 | 6;
}

// Mappning enligt din sprite-sheet (Rad 1: Hjältar, Rad 2: Bossar)
export const NINJAS: Ninja[] = [
  { id: 'kai', name: 'Kai', power: 'Eld', description: 'Mästare av Eld. Skjuter eldklot!', color: '#EF4444', icon: 'Flame', spriteCol: 0 },
  { id: 'jay', name: 'Jay', power: 'Blixt', description: 'Mästare av Blixt. Kedjeblixtar!', color: '#2563EB', icon: 'Zap', spriteCol: 3 },
  { id: 'zane', name: 'Zane', power: 'Is', description: 'Mästare av Is. Fryser fiender!', color: '#F8FAFC', icon: 'Snowflake', spriteCol: 1 },
  { id: 'cole', name: 'Cole', power: 'Jord', description: 'Mästare av Jord. Skapar jordskalv!', color: '#171717', icon: 'Mountain', spriteCol: 2 },
  { id: 'lloyd', name: 'Lloyd', power: 'Energi', description: 'Den Gröna Ninjan. Massiv kraft!', color: '#22C55E', icon: 'Star', spriteCol: 4 },
  { id: 'nya', name: 'Nya', power: 'Vatten', description: 'Mästare av Vatten. Trycker bort fiender!', color: '#38BDF8', icon: 'Waves', spriteCol: 5 },
];

export const LEVELS: Level[] = [
  { 
    number: 1, 
    name: 'Träning i Dojon',
    description: 'Inomhus i dojon. Lär dig Hoppa (Mellanslag) och Spin (Z).',
    length: 4000,
    bgColor: '#1a140f', // Trä-brun/mörk
    platformColor: '#3d2b1f',
    difficulty: 1,
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
    length: 5500,
    bgColor: '#051122', // Mörkblå grotta
    platformColor: '#1e3a8a',
    hazardType: 'ice',
    difficulty: 2,
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
    length: 7000,
    bgColor: '#330000', // Mörkröd/Lava
    platformColor: '#7f1d1d',
    hazardType: 'lava',
    difficulty: 3,
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
    length: 8500,
    bgColor: '#020617', // Svart natt
    platformColor: '#1e1b4b',
    difficulty: 4,
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
    length: 10000,
    bgColor: '#2d1e0a', // Sand/Brun
    platformColor: '#451a03',
    difficulty: 5,
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
    name: 'Slutstriden mot Great Devourer',
    description: 'Arenan går sönder. Det krävs perfekt timing för att överleva!',
    length: 13000,
    bgColor: '#000000', // Totalt mörker
    platformColor: '#0f172a',
    difficulty: 6,
    boss: { 
      name: 'Great Devourer', 
      description: 'Den gigantiska ormen. Använd Spin (Z) för att reflektera skott!', 
      imageKey: 'enemy-oni', 
      behavior: 'final',
      spriteRow: 3,
      spriteCol: 3,
      healthMultiplier: 15,
      canShoot: true
    } 
  },
];

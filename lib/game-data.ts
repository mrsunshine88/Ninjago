
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
}

export interface Level {
  number: number;
  boss: Enemy;
  length: number;
}

// Mappning enligt din sprite-sheet (Rad 1: Hjältar, Rad 2: Bossar)
export const NINJAS: Ninja[] = [
  { id: 'kai', name: 'Kai', power: 'Eld', description: 'Mästare av Eld. Skjuter eldklot!', color: '#EF4444', icon: 'Flame', spriteCol: 0 },
  { id: 'jay', name: 'Jay', power: 'Blixt', description: 'Mästare av Blixt. Kedjeblixtar!', color: '#2563EB', icon: 'Zap', spriteCol: 1 },
  { id: 'zane', name: 'Zane', power: 'Is', description: 'Mästare av Is. Fryser fiender!', color: '#F8FAFC', icon: 'Snowflake', spriteCol: 2 },
  { id: 'cole', name: 'Cole', power: 'Jord', description: 'Mästare av Jord. Skapar jordskalv!', color: '#171717', icon: 'Mountain', spriteCol: 3 },
  { id: 'lloyd', name: 'Lloyd', power: 'Energi', description: 'Den Gröna Ninjan. Massiv kraft!', color: '#22C55E', icon: 'Star', spriteCol: 4 },
  { id: 'nya', name: 'Nya', power: 'Vatten', description: 'Mästare av Vatten. Trycker bort fiender!', color: '#38BDF8', icon: 'Waves', spriteCol: 5 },
];

export const LEVELS: Level[] = [
  { 
    number: 1, 
    length: 5000,
    boss: { 
      name: 'Hypnobrai', 
      description: 'Blå Serpentine. Akta dig för hypnosen!', 
      imageKey: 'enemy-hypnobrai', 
      behavior: 'ice',
      spriteRow: 1,
      spriteCol: 0,
      healthMultiplier: 1
    } 
  },
  { 
    number: 2, 
    length: 6000,
    boss: { 
      name: 'Fangpyre', 
      description: 'Röd Serpentine. Hugger snabbt!', 
      imageKey: 'enemy-fangpyre', 
      behavior: 'normal',
      spriteRow: 1,
      spriteCol: 1,
      healthMultiplier: 1.5
    } 
  },
  { 
    number: 3, 
    length: 7000,
    boss: { 
      name: 'Constrictai', 
      description: 'Orange Serpentine. Stryper sitt byte!', 
      imageKey: 'enemy-constrictai', 
      behavior: 'mine',
      spriteRow: 1,
      spriteCol: 2,
      healthMultiplier: 2
    } 
  },
  { 
    number: 4, 
    length: 8000,
    boss: { 
      name: 'Venomari', 
      description: 'Grön Serpentine. Giftigt spott!', 
      imageKey: 'enemy-venomari', 
      behavior: 'swamp',
      spriteRow: 1,
      spriteCol: 3,
      healthMultiplier: 2.5
    } 
  },
  { 
    number: 5, 
    length: 9000,
    boss: { 
      name: 'Anacondrai', 
      description: 'Lila Serpentine. Den farligaste stammen!', 
      imageKey: 'enemy-anacondrai', 
      behavior: 'city',
      spriteRow: 1,
      spriteCol: 4,
      healthMultiplier: 3
    } 
  },
  { 
    number: 6, 
    length: 12000,
    boss: { 
      name: 'Oni', 
      description: 'Mörkrets härskare. Endast en sann Master kan vinna!', 
      imageKey: 'enemy-oni', 
      behavior: 'final',
      spriteRow: 1,
      spriteCol: 5,
      healthMultiplier: 5
    } 
  },
];

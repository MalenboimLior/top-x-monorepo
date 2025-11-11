import type { GameBadgeKey, GameCreator } from '../types/game';

export type GameBadgeDefinition = {
  icon: [string, string];
  labels: Record<'en' | 'il', string>;
};

export const GAME_BADGE_DEFINITIONS: Record<GameBadgeKey, GameBadgeDefinition> = {
  onFire: {
    icon: ['fas', 'fire'],
    labels: {
      en: 'On Fire',
      il: 'בוער 🔥',
    },
  },
  hardcore: {
    icon: ['fas', 'skull'],
    labels: {
      en: 'Hardcore',
      il: 'לוחמים 💀',
    },
  },
  womenOnly: {
    icon: ['fas', 'venus'],
    labels: {
      en: 'Women Only',
      il: 'לנשים בלבד',
    },
  },
} as const;

export const DEFAULT_TOPX_CREATOR: GameCreator = {
  userid: 'topx-official',
  username: 'TOP-X',
  image: 'https://www.top-x.co/assets/profile.png',
};


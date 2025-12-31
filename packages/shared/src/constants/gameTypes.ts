// Define the icon tuple type without leaking FontAwesome internals
export type GameTypeIcon = [string, string];

export const DEFAULT_GAME_TYPE_ICON: GameTypeIcon = ['fas', 'gamepad'];

export const GAME_TYPE_ICON_MAP: Record<string, GameTypeIcon> = {
  pyramid: ['fas', 'cubes'],
  pyramidtier: ['fas', 'cubes'],
  trivia: ['fas', 'brain'],
  quiz: ['fas', 'question-circle'],
  zonereveal: ['fas', 'map'],
  pacman: ['fas', 'ghost'],
  fishergame: ['fas', 'fish'],
} as const;





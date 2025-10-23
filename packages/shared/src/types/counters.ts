export const GAME_COUNTER_KEYS = {
  TOTAL_PLAYERS: 'totalPlayers',
  FAVORITES: 'favorites',
  SESSIONS_PLAYED: 'sessionsPlayed',
  UNIQUE_SUBMITTERS: 'uniqueSubmitters',
  UPDATED_AT: 'updatedAt',
} as const;

export type GameCounterKey = typeof GAME_COUNTER_KEYS[keyof typeof GAME_COUNTER_KEYS];

export interface GameCounters {
  totalPlayers?: number;
  favorites?: number;
  sessionsPlayed?: number;
  uniqueSubmitters?: number;
  updatedAt?: number;
  [key: string]: number | undefined;
}

export const GAME_COUNTER_EVENTS = {
  SUBMIT_ANSWER: 'submit_answer',
} as const;

export type GameCounterEvent = typeof GAME_COUNTER_EVENTS[keyof typeof GAME_COUNTER_EVENTS];

export interface RecordGameEventRequest {
  gameId: string;
  events: GameCounterEvent[];
}

export interface RecordGameEventResponse {
  success: boolean;
  appliedEvents: GameCounterEvent[];
}

export interface SetGameFavoriteRequest {
  gameId: string;
  favorite: boolean;
}

export interface SetGameFavoriteResponse {
  success: boolean;
  favorite: boolean;
}

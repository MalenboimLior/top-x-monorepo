// packages/shared/src/types/game.ts
import { PyramidConfig } from "./pyramid";
import { TriviaConfig } from "./trivia";
import { ZoneRevealConfig } from "./zoneReveal";
import { PacmanConfig } from "./pacman";
import { FisherGameConfig } from "./fisherGame";
import type { LeaderboardEntry, LeaderboardDateIndexes, LeaderboardEntryDate } from "./leaderboard";

export interface GameType {
  id: string;
  name: string;
  description: string;
  custom: 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig' | 'FisherGameConfig'; // String to specify config type
  availableToBuild: boolean;
}

export type GameCustomConfig =
  | PyramidConfig
  | TriviaConfig
  | ZoneRevealConfig
  | PacmanConfig
  | FisherGameConfig;

export interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  active: boolean;
  gameHeader?: string;
  shareText?: string;
  /** Instructions displayed to the user before playing */
  gameInstruction?: string;
  /** Language for the game, either 'en' or 'il'. Defaults to 'en'. */
  language: 'en' | 'il';
  /** Optional link shown on shared images */
  shareLink?: string;
  image: string;
  vip: string[];
  /** Union of possible config payloads. TriviaConfig now includes fixed/endless metadata. */
  custom: GameCustomConfig;
  creator?: { userid: string; username: string };
  community?: boolean;
  hideFromHome?: boolean;
  dailyChallengeActive?: boolean;
  /** Date identifier for the challenge shown when today's is missing */
  dailyChallengeCurrent?: string;
  /**
   * Aggregated leaderboard totals compiled from daily-challenge runs. The
   * per-challenge leaderboards themselves are stored under
   * `/daily_challenges/{challengeId}`.
   */
  leaderboard?: {
    updatedAt: string;
    topEntries: LeaderboardEntry[];
    totalPlayers?: number;
  };
  createdAt?: number;
  updatedAt?: number;
}

// Leaderboard types are now in ./leaderboard.ts
// Re-exported here for backward compatibility
export type { LeaderboardEntry, LeaderboardDateIndexes, LeaderboardEntryDate } from "./leaderboard";

export type ConfigType = 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig' | 'FisherGameConfig';
export const CONFIG_TYPES: ConfigType[] = ['PyramidConfig', 'TriviaConfig', 'ZoneRevealConfig', 'PacmanConfig', 'FisherGameConfig'];

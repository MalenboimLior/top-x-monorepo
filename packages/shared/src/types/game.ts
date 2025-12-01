// packages/shared/src/types/game.ts
import { PyramidConfig } from "./pyramid";
import { TriviaConfig } from "./trivia";
import { ZoneRevealConfig } from "./zoneReveal";
import { PacmanConfig } from "./pacman";
import { FisherGameConfig } from "./fisherGame";
import { QuizConfig } from "./quiz";
import type { LeaderboardEntry, LeaderboardDateIndexes, LeaderboardEntryDate } from "./leaderboard";

export interface DefaultConfig {
  name: string;
  config: GameCustomConfig;
  show: boolean;
  order: number;
  image?: string; // Thumbnail/preview image URL
}

export interface GameType {
  id: string;
  name: string;
  description: string;
  custom: 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig' | 'FisherGameConfig' | 'QuizConfig'; // String to specify config type
  availableToBuild: boolean;
  defaultConfigs?: DefaultConfig[];
}

export type GameCustomConfig =
  | PyramidConfig
  | TriviaConfig
  | ZoneRevealConfig
  | PacmanConfig
  | FisherGameConfig
  | QuizConfig;

export type GameBadgeKey = 'onFire' | 'hardcore' | 'womenOnly';

export interface GameCreator {
  userid: string;
  username: string;
  image?: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  /** Controls game playability. Defaults to true.
   * - active=true: Game is playable
   * - active=false: Game is not visible on home page and cannot be played */
  active: boolean;
  gameHeader?: string;
  shareText?: string;
  /** Instructions displayed to the user before playing */
  gameInstruction?: string;
  /** Language for the game, either 'en' or 'il'. Defaults to 'en'. */
  language: 'en' | 'il';
  /** Optional link shown on shared images */
  shareLink?: string;
  image?: string; // Optional - if missing, will show first letter of name as placeholder
  /** Optional gradient colors for image placeholder: [startColor, endColor] in hex format */
  imageGradient?: [string, string];
  /** Optional text color for game name in gradient placeholder, in hex format */
  imageGradientTextColor?: string;
  vip: string[];
  /** Optional visual badges applied by admins */
  badges?: GameBadgeKey[];
  /** Controls visibility on home page. Defaults to false.
   * - unlisted=false: Game is visible on home page and playable (requires active=true)
   * - unlisted=true: Game is hidden from home page but still playable via direct link (requires active=true) */
  unlisted?: boolean;
  /** Union of possible config payloads. TriviaConfig now includes fixed/endless metadata. */
  custom: GameCustomConfig;
  creator?: GameCreator;
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

export type ConfigType = 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig' | 'FisherGameConfig' | 'QuizConfig';
export const CONFIG_TYPES: ConfigType[] = ['PyramidConfig', 'TriviaConfig', 'ZoneRevealConfig', 'PacmanConfig', 'FisherGameConfig', 'QuizConfig'];

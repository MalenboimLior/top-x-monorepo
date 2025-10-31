// Updated packages/shared/types/game.ts
import type { DailyChallengeLeaderboardSummary } from "./dailyChallenge";
import { PyramidConfig } from "./pyramid";
import { TriviaConfig } from "./trivia";
import { ZoneRevealConfig } from "./zoneReveal";
import { PacmanConfig } from "./pacman";


export interface GameType {
  id: string;
  name: string;
  description: string;
  custom: 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig'; // String to specify config type
  availableToBuild: boolean;
}

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
  custom: PyramidConfig | TriviaConfig | ZoneRevealConfig | PacmanConfig; // Union of possible config types
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
  leaderboard?: DailyChallengeLeaderboardSummary;
  createdAt?: number;
  updatedAt?: number;
}

export interface LeaderboardDateIndexes {
  daily: string;
  weekly: string;
  monthly: string;
  allTime: string;
}

export interface LeaderboardEntryDate {
  recordedAt: number;
  indexes: LeaderboardDateIndexes;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
  streak: number;
  updatedAt?: number;
  date?: LeaderboardEntryDate;
  custom?: Record<string, any>;
}

export type ConfigType = 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' | 'PacmanConfig';
export const CONFIG_TYPES: ConfigType[] = ['PyramidConfig', 'TriviaConfig', 'ZoneRevealConfig', 'PacmanConfig'];

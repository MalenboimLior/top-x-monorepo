// packages/shared/src/types/dailyChallenge.ts
import type { LeaderboardEntry } from './game';
import type { GameStats } from './stats';
import { PyramidConfig } from './pyramid';
import { TriviaConfig } from './trivia';
import { ZoneRevealConfig } from './zoneReveal';
import { PacmanConfig } from './pacman';
import { FisherGameConfig } from './fisherGame';

export interface DailyChallengeSchedule {
  availableAt: string; // ISO timestamp — when the level becomes available to play
  closesAt: string;    // ISO timestamp — when the challenge closes/promos next challenge
  revealAt: string;    // ISO timestamp — when the answer is revealed
}

export interface DailyChallenge {
  // Meta
  number: number;             // Sequential challenge number (e.g. 183)
  date: string;               // "YYYY-MM-DD" — the logical date of the challenge
  createdAt: string;          // ISO timestamp — when the challenge was created/uploaded
  schedule: DailyChallengeSchedule;

  // Game content
  custom: PyramidConfig | TriviaConfig | ZoneRevealConfig | PacmanConfig | FisherGameConfig; // Union of possible config types

  // Optional display settings
  showCountdown?: boolean;   // Whether to show time until reveal
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;         // e.g., "logic", "visual", "history", etc.

  // Social & marketing
  shareText?: string;        // Suggested post: "Today's riddle is 🔥!"
  discussionUrl?: string;    // Link to share/discuss the level

  // Analytics (write/update later via backend or Cloud Functions)
  analytics?: Partial<GameStats>;

  // Leaderboard aggregation
  leaderboardSummary?: {
    updatedAt: string;
    topEntries: LeaderboardEntry[];
    totalPlayers?: GameStats['totalPlayers'];
  };

  // Flags (optional)
  isArchived?: boolean;      // For cleanup or migration
  isFeatured?: boolean;      // For editor's picks or replay promotion
}
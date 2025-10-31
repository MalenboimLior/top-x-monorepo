import type { GameCounters } from './counters';
import type { LeaderboardEntry } from './game';
import type { GameStats } from './stats';
import { PyramidConfig } from './pyramid';
import { TriviaConfig } from './trivia';
import { ZoneRevealConfig } from './zoneReveal';
import { PacmanConfig } from './pacman';

export interface DailyChallengeAttemptMetadata {
  normalizedAnswer?: string;
  distance?: number | null;
  isMatch?: boolean;
  recordedAt?: string;
}

export interface DailyChallengeSchedule {
  availableAt: string; // ISO timestamp — when the level becomes available to play
  closesAt: string;    // ISO timestamp — when the challenge closes/promos next challenge
  revealAt: string;    // ISO timestamp — when the answer is revealed
}

export interface DailyChallengeLeaderboardSummary {
  updatedAt: string;
  topEntries: LeaderboardEntry[];
  totalPlayers?: GameCounters['totalPlayers'];
}

/**
 * A leaderboard entry stored inside `/daily_challenges/{challengeId}/leaderboard`.
 * These documents track the relationship between a user and a specific challenge.
 */
export interface DailyChallengeLeaderboardEntry extends LeaderboardEntry {
  /** Identifier for the parent challenge document. */
  challengeId: string;
  /** Logical challenge date (YYYY-MM-DD). */
  challengeDate: string;
  /** ISO timestamp noting when the player first submitted a score. */
  playedAt: string;
  /** ISO timestamp for the best solving attempt, if solved. */
  solvedAt?: string;
  /** How many attempts the player made for this challenge, if tracked. */
  attemptCount?: number;
  /** Metadata captured for the latest attempt. */
  attempt?: DailyChallengeAttemptMetadata;
}

export interface DailyChallenge {
  // Meta
  number: number;             // Sequential challenge number (e.g. 183)
  date: string;               // "YYYY-MM-DD" — the logical date of the challenge
  createdAt: string;          // ISO timestamp — when the challenge was created/uploaded
  schedule: DailyChallengeSchedule;

  // Game content
  custom: PyramidConfig | TriviaConfig | ZoneRevealConfig | PacmanConfig; // Union of possible config types

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
  leaderboardSummary?: DailyChallengeLeaderboardSummary;

  // Flags (optional)
  isArchived?: boolean;      // For cleanup or migration
  isFeatured?: boolean;      // For editor's picks or replay promotion
}

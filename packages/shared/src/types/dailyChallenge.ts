import { PyramidConfig } from './pyramid';
import { TriviaConfig } from './trivia';
import { ZoneRevealConfig } from './zoneReveal';

export interface DailyChallengeSchedule {
  availableAt: string; // ISO timestamp — when the level becomes available to play
  closesAt: string;    // ISO timestamp — when the challenge closes/promos next challenge
  revealAt: string;    // ISO timestamp — when the answer is revealed
}

export interface DailyChallengeLeaderboardEntry {
  userId: string;
  score: number;
  displayName?: string;
  avatarUrl?: string;
  rank?: number;
}

export interface DailyChallengeLeaderboardSummary {
  updatedAt: string;
  topEntries: DailyChallengeLeaderboardEntry[];
  totalPlayers?: number;
}

interface DailyChallengeAnalytics {
  totalAttempts?: number;
  correctAttempts?: number;
  averageSolveTimeSec?: number;
}

export interface DailyChallenge {
  // Meta
  number: number;             // Sequential challenge number (e.g. 183)
  date: string;               // "YYYY-MM-DD" — the logical date of the challenge
  createdAt: string;          // ISO timestamp — when the challenge was created/uploaded
  schedule: DailyChallengeSchedule;

  // Game content
  custom: PyramidConfig | TriviaConfig | ZoneRevealConfig; // Union of possible config types

  // Optional display settings
  showCountdown?: boolean;   // Whether to show time until reveal
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;         // e.g., "logic", "visual", "history", etc.

  // Social & marketing
  shareText?: string;        // Suggested post: "Today's riddle is 🔥!"
  discussionUrl?: string;    // Link to share/discuss the level

  // Analytics (write/update later via backend or Cloud Functions)
  analytics?: DailyChallengeAnalytics;

  // Leaderboard aggregation
  leaderboardSummary?: DailyChallengeLeaderboardSummary;

  // Flags (optional)
  isArchived?: boolean;      // For cleanup or migration
  isFeatured?: boolean;      // For editor's picks or replay promotion
}

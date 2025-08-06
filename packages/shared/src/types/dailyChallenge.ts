import { PyramidConfig } from './pyramid';
import { TriviaConfig } from './trivia';
import { ZoneRevealConfig } from './zoneReveal';

export interface DailyChallenge {
  // Meta
  number: number;             // Sequential challenge number (e.g. 183)
  date: string;               // "YYYY-MM-DD" — the logical date of the challenge
  createdAt: string;          // ISO timestamp — when the challenge was created/uploaded
  challengeAvailableUTC: string; // ISO timestamp — when the level becomes available to play
  answerRevealUTC: string;    // ISO timestamp — when the answer is revealed
  nextChallengeAnnounceUTC: string; // ISO timestamp — when next challenge is promoted (optional)

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
  totalAttempts?: number;
  correctAttempts?: number;
  averageSolveTimeSec?: number;

  // Flags (optional)
  isArchived?: boolean;      // For cleanup or migration
  isFeatured?: boolean;      // For editor's picks or replay promotion
}

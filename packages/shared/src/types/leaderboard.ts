// packages/shared/src/types/leaderboard.ts
// Leaderboard-specific types extracted from game.ts

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


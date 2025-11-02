// User and user game data models

export interface DailyChallengeAttemptMetadata {
  normalizedAnswer?: string;
  distance?: number | null;
  isMatch?: boolean;
  recordedAt?: string;
}

export interface DailyChallengeUserProgress {
  /** Whether the user has attempted the challenge. */
  played: boolean;
  /** Whether the user solved the challenge. */
  solved: boolean;
  /** Highest score achieved for this challenge, if applicable. */
  bestScore?: number;
  /** ISO timestamp of the first time the user launched the challenge. */
  firstPlayedAt?: string;
  /** ISO timestamp of the most recent attempt. */
  lastPlayedAt?: string;
  /** ISO timestamp recorded when the challenge was solved. */
  solvedAt?: string;
  /** ISO timestamp for when {@link bestScore} was recorded. */
  bestScoreAt?: string;
  /** How many attempts the user has made for the challenge. */
  attemptCount?: number;
  /** Snapshot of the most recent attempt metadata. */
  attemptMetadata?: DailyChallengeAttemptMetadata;
  /** Tracks which unique counters have been applied for this user. */
  counters?: Record<string, boolean>;
}

export type DailyChallengeSolveState = 'solved' | 'failed' | 'skipped' | 'timeout';

export type DailyChallengeRewardStatus = 'pending' | 'claimed' | 'expired';

export interface DailyChallengeRewardRecord {
  gameId: string;
  gameTypeId: string;
  dailyChallengeId: string;
  dailyChallengeDate: string;
  /** ISO timestamp for when the challenge reveal unlocks rewards. */
  revealAt: string;
  /** ISO timestamp for when the queue entry was first created. */
  createdAt: string;
  /** ISO timestamp for the latest submission that updated this entry. */
  updatedAt: string;
  /** Outcome of the user's solve attempt for messaging context. */
  solveState: DailyChallengeSolveState;
  /** Lifecycle state for the reward entry. */
  status: DailyChallengeRewardStatus;
  /** Snapshot of the last submission metadata used for messaging. */
  attemptMetadata?: DailyChallengeAttemptMetadata;
  /** ISO timestamp recorded when the reward was claimed. */
  claimedAt?: string;
}

export interface UserGameCustomData {
  /** Challenge-specific metadata captured for the latest attempt. */
  dailyChallengeProgress?: DailyChallengeUserProgress;
  /**
   * Additional custom data for the game. The value type is intentionally
   * flexible to support legacy and feature-specific metadata.
   */
  [key: string]: unknown;
}

export interface UserGameData {
  score: number;
  streak: number;
  lastPlayed: number;
  achievements?: Array<{ id: string; earnedAt: string }>;
  /** Per-challenge snapshots keyed by challenge identifier. */
  dailyChallenges?: Record<string, UserGameData>;
  custom?: UserGameCustomData;
}

export type UserGameDataSubmission = Omit<UserGameData, 'lastPlayed'> & {
  lastPlayed?: number;
};

export interface UserEngagement {
  games?: Record<string, Record<string, boolean>>;
}

export interface User {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isAdmin?: boolean;
  followersCount: number;
  followingCount: number;
  xAccessToken?: string;
  xAccessSecret?: string;
  frenemies: string[];
  addedBy: string[];
  games: Record<string, Record<string, UserGameData>>;
  badges: Array<{ id: string; earnedAt: string }>;
  favoriteGames?: string[];
  engagement?: UserEngagement;
}

export interface SubmitGameScoreRequest {
  gameTypeId: string;
  gameId: string;
  gameData: UserGameDataSubmission;
  /** Optional identifier when the score submission is tied to a daily challenge. */
  dailyChallengeId?: string;
  /** Logical date for the challenge (YYYY-MM-DD). */
  dailyChallengeDate?: string;
  /** Additional metadata captured for audit/analytics around the challenge. */
  challengeMetadata?: Record<string, unknown>;
}

export interface SubmitGameScoreResponse {
  success: boolean;
  message?: string;
  previousScore?: number | null;
  newScore?: number;
  challengeBestScore?: number;
  dailyChallengeId?: string;
  dailyChallengeDate?: string;
  pendingReward?: DailyChallengeRewardRecord;
}

export interface ClaimDailyChallengeRewardsRequest {
  dailyChallengeId?: string;
  gameId?: string;
}

export interface ClaimedDailyChallengeRewardSummary {
  id: string;
  dailyChallengeId: string;
  solveState: DailyChallengeSolveState;
  status: DailyChallengeRewardStatus;
}

export interface ClaimDailyChallengeRewardsResponse {
  success: boolean;
  processed: ClaimedDailyChallengeRewardSummary[];
  deferred: string[];
  alreadyClaimed: string[];
}

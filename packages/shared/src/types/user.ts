// User and user game data models
export interface UserGameData {
  score: number;
  streak: number;
  lastPlayed: number;
  achievements?: Array<{ id: string; earnedAt: string }>;
  custom?: Record<string, any>;
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
}

export interface SubmitGameScoreResponse {
  success: boolean;
  message?: string;
  previousScore?: number | null;
  newScore?: number;
}

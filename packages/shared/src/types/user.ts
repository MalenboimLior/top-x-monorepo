// User and user game data models
export interface UserGameData {
  score: number;
  streak: number;
  lastPlayed: string;
  achievements?: Array<{ id: string; earnedAt: string }>;
  custom?: Record<string, any>;
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
  xSecret?: string;
  frenemies: string[];
  addedBy: string[];
  games: Record<string, Record<string, UserGameData>>;
  badges: Array<{ id: string; earnedAt: string }>;
}
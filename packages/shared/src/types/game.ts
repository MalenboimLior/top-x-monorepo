// Updated packages/shared/types/game.ts
import { PyramidConfig } from "./pyramid";
import { TriviaConfig } from "./trivia";
import { ZoneRevealConfig } from "./zoneReveal";


export interface GameType {
  id: string;
  name: string;
  description: string;
  custom: 'PyramidConfig' | 'TriviaConfig' | 'zoneReveal' ; // String to specify config type
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
  custom: PyramidConfig | TriviaConfig | ZoneRevealConfig // Union of possible config types
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
  streak: number;
  custom?: Record<string, any>;
}

export type ConfigType = 'PyramidConfig' | 'TriviaConfig' | 'ZoneRevealConfig' ;
export const CONFIG_TYPES: ConfigType[] = ['PyramidConfig', 'TriviaConfig', 'ZoneRevealConfig'];
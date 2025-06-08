export interface GameType {
  id: string;
  name: string;
  description: string;
  custom?: Record<string, any>;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  custom?: Record<string, any>;
}
export interface SetGameFavoriteRequest {
  gameId: string;
  favorite: boolean;
}

export interface SetGameFavoriteResponse {
  success: boolean;
  favorite: boolean;
}

export interface LeaderboardRankResult {
    rank: number;
    percentile: number;
    totalUsers: number;
}
/**
 * Computes the user's leaderboard rank and percentile for a game
 *
 * Performance: Uses Firestore count aggregations - only 3 reads total regardless of leaderboard size
 * - 1 read: Count total entries
 * - 1 read: Count entries with better scores (score > userScore)
 * - 1 read: Count entries with same score but better streak (score == userScore AND streak > userStreak)
 *
 * @param gameId - The game ID
 * @param uid - The user ID
 * @param score - The user's score
 * @param streak - The user's streak
 * @param dailyChallengeId - Optional daily challenge ID
 * @returns Promise with rank and percentile (0-100, where 0 is best and 100 is worst)
 */
export declare function computeLeaderboardRank(gameId: string, uid: string, score: number, streak: number, dailyChallengeId?: string): Promise<LeaderboardRankResult>;

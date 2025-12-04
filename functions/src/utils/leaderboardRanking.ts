import * as admin from 'firebase-admin';
import { getLeaderboardCollectionRef } from './leaderboardHelpers';

const db = admin.firestore();

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
export async function computeLeaderboardRank(
  gameId: string,
  uid: string,
  score: number,
  streak: number,
  dailyChallengeId?: string
): Promise<LeaderboardRankResult> {
  const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
  
  try {
    // Use count aggregations for efficient reads (1 read per count query)
    // Total cost: 3 reads regardless of leaderboard size
    // This is MUCH more efficient than fetching all documents (which would be N reads)
    
    // 1. Count total entries (1 read)
    const totalCountSnapshot = await leaderboardRef.count().get();
    const totalEntries = totalCountSnapshot.data().count;
    
    if (totalEntries === 0) {
      return { rank: 1, percentile: 0, totalUsers: 0 };
    }

    // 2. Count entries with better scores (score > userScore) (1 read)
    // These are definitely ranked higher than the user
    const betterScoreQuery = leaderboardRef.where('score', '>', score);
    const betterScoreCountSnapshot = await betterScoreQuery.count().get();
    const entriesWithBetterScore = betterScoreCountSnapshot.data().count;

    // 3. Count entries with same score but better streak (score == userScore AND streak > userStreak) (1 read)
    // These are also ranked higher due to tiebreaker rule (score desc, then streak desc)
    const sameScoreBetterStreakQuery = leaderboardRef
      .where('score', '==', score)
      .where('streak', '>', streak);
    const sameScoreBetterStreakCountSnapshot = await sameScoreBetterStreakQuery.count().get();
    const entriesWithSameScoreBetterStreak = sameScoreBetterStreakCountSnapshot.data().count;

    // Rank = number of entries better than user + 1
    // Better entries = entries with higher score OR (same score AND higher streak)
    const rank = entriesWithBetterScore + entriesWithSameScoreBetterStreak + 1;

    // Calculate percentile: (rank - 1) / totalEntries * 100
    // Lower rank = lower percentile (better)
    // Example: rank 1 = 0th percentile (best), rank 100 out of 100 = 99th percentile
    const percentile = Math.max(0, Math.min(100, Math.round(((rank - 1) / totalEntries) * 100)));

    return { rank, percentile, totalUsers: totalEntries };
  } catch (error) {
    console.error('Error computing leaderboard rank:', error);
    // Return default values on error
    return { rank: 0, percentile: 100, totalUsers: 0 };
  }
}


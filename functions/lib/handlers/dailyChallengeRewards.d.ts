import * as functions from 'firebase-functions/v2';
import { ClaimDailyChallengeRewardsRequest, ClaimDailyChallengeRewardsResponse } from '@top-x/shared/types/user';
import '../utils/firebaseAdmin';
/**
 * Claims daily challenge rewards for an authenticated user.
 *
 * This function processes pending rewards that have passed their reveal time and applies
 * them to the user's leaderboard scores. Rewards can be claimed individually by dailyChallengeId
 * or in bulk (all pending rewards).
 *
 * Business Rules:
 * - Only rewards with status 'pending' can be claimed
 * - Rewards must have passed their revealAt timestamp to be claimable
 * - Correct answers add 1 point to the main leaderboard score
 * - Incorrect answers add 1 to the main leaderboard streak counter
 *
 * @returns Response containing processed, deferred, and already-claimed reward IDs
 */
export declare const claimDailyChallengeRewards: functions.https.CallableFunction<ClaimDailyChallengeRewardsRequest, Promise<ClaimDailyChallengeRewardsResponse>, unknown>;

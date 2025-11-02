import * as functions from 'firebase-functions/v2';
import { SubmitGameScoreRequest, SubmitGameScoreResponse } from '@top-x/shared/types/user';
import '../utils/firebaseAdmin';
/**
 * Submits a game score for an authenticated user.
 *
 * This is the main function for recording game results. It handles both regular game submissions
 * and daily challenge submissions with different logic paths.
 *
 * Key Features:
 * - Validates and processes regular game scores (only updates if score is higher)
 * - Handles daily challenge submissions with separate leaderboards
 * - Evaluates ZoneReveal game answers using fuzzy matching
 * - Updates user game data, leaderboards, and statistics
 * - Creates reward records for daily challenges
 * - Tracks PyramidTier custom data changes (pyramid structure, worst item)
 * - Updates game statistics (distribution, counters, custom analytics)
 *
 * Business Rules:
 * - Regular games: Only updates if new score > previous score (PyramidTier exception for custom data changes)
 * - Daily challenges: Always updates, tracks best score and attempt metadata
 * - ZoneReveal: Evaluates answer correctness using distance metrics
 * - Daily challenge rewards increment leaderboard score or streak when claimed
 * - VIP status: Users with followersCount >= 0 are added to game VIP list on first play
 *
 * @returns SubmitGameScoreResponse with success status, scores, and reward info (if applicable)
 */
export declare const submitGameScore: functions.https.CallableFunction<SubmitGameScoreRequest, Promise<SubmitGameScoreResponse>, unknown>;

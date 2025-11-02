import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  User,
  DailyChallengeRewardRecord,
  ClaimDailyChallengeRewardsRequest,
  ClaimDailyChallengeRewardsResponse,
  ClaimedDailyChallengeRewardSummary,
} from '@top-x/shared/types/user';
import { DEFAULT_LEADERBOARD_PHOTO } from '../utils/leaderboardHelpers';
import './utils/firebaseAdmin';

const db = admin.firestore();

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
export const claimDailyChallengeRewards = functions.https.onCall(async (
  request: functions.https.CallableRequest<ClaimDailyChallengeRewardsRequest>,
): Promise<ClaimDailyChallengeRewardsResponse> => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = auth.uid;
  const payload = (data ?? {}) as ClaimDailyChallengeRewardsRequest;
  const nowMillis = Date.now();
  
  // Track processing results
  const processed: ClaimedDailyChallengeRewardSummary[] = []; // Successfully claimed rewards
  const deferred: string[] = []; // Rewards not yet ready (future revealAt time or invalid data)
  const alreadyClaimed: string[] = []; // Rewards already processed (status !== 'pending')

  console.log('claimDailyChallengeRewards: starting', {
    uid,
    payload: {
      dailyChallengeId: payload.dailyChallengeId,
      gameId: payload.gameId,
    },
    nowMillis,
    nowIso: new Date(nowMillis).toISOString(),
  });

  try {
    // Use transaction to ensure atomicity when updating leaderboards and reward statuses
    await db.runTransaction(async (tx) => {
      // Fetch user data
      const userRef = db.collection('users').doc(uid);
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        console.error('claimDailyChallengeRewards: user profile not found', { uid });
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const userData = userDoc.data() as User;
      const rewardsCollection = userRef.collection('dailyChallengeRewards');

      let rewardSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];

      // Fetch rewards: either a specific reward or all pending rewards
      if (payload.dailyChallengeId) {
        console.log('claimDailyChallengeRewards: fetching specific reward', {
          uid,
          dailyChallengeId: payload.dailyChallengeId,
        });
        const rewardRef = rewardsCollection.doc(payload.dailyChallengeId);
        const snap = await tx.get(rewardRef);
        if (snap.exists) {
          rewardSnapshots = [snap];
          const rewardData = snap.data() as DailyChallengeRewardRecord;
          console.log('claimDailyChallengeRewards: found specific reward', {
            uid,
            dailyChallengeId: payload.dailyChallengeId,
            status: rewardData.status,
            solveState: rewardData.solveState,
            revealAt: rewardData.revealAt,
          });
        } else {
          console.log('claimDailyChallengeRewards: specific reward not found, deferring', {
            uid,
            dailyChallengeId: payload.dailyChallengeId,
          });
          deferred.push(payload.dailyChallengeId);
          return;
        }
      } else {
        // Fetch all pending rewards for the user
        console.log('claimDailyChallengeRewards: fetching all pending rewards', { uid });
        const pendingQuery = rewardsCollection.where('status', '==', 'pending');
        const pendingSnapshot = await tx.get(pendingQuery);
        rewardSnapshots = pendingSnapshot.docs;
        console.log('claimDailyChallengeRewards: found pending rewards', {
          uid,
          count: rewardSnapshots.length,
          rewardIds: rewardSnapshots.map(snap => snap.id),
        });
      }

      if (rewardSnapshots.length === 0) {
        console.log('claimDailyChallengeRewards: no reward snapshots found', { uid });
        return;
      }

      // Prepare data structures for processing
      const leaderboardMap: Map<string, FirebaseFirestore.DocumentSnapshot> = new Map(); // Cache fetched leaderboards by gameId
      const toFetchLeaderboards: FirebaseFirestore.DocumentReference[] = []; // Leaderboard refs we need to fetch
      const qualifiedSnapshots: FirebaseFirestore.DocumentSnapshot[] = []; // Rewards that pass all filters

      console.log('claimDailyChallengeRewards: filtering rewards', {
        uid,
        totalSnapshots: rewardSnapshots.length,
        filterGameId: payload.gameId,
      });

      // Filter and validate rewards
      for (const snap of rewardSnapshots) {
        const rewardData = snap.data() as DailyChallengeRewardRecord;

        console.log('claimDailyChallengeRewards: evaluating reward', {
          uid,
          rewardId: snap.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          gameId: rewardData.gameId,
          status: rewardData.status,
          solveState: rewardData.solveState,
          revealAt: rewardData.revealAt,
        });

        // Filter by gameId if specified in payload
        if (payload.gameId && rewardData.gameId !== payload.gameId) {
          console.log('claimDailyChallengeRewards: reward filtered by gameId mismatch', {
            uid,
            rewardId: snap.id,
            rewardGameId: rewardData.gameId,
            filterGameId: payload.gameId,
          });
          continue;
        }

        // Skip rewards that are already claimed
        if (rewardData.status !== 'pending') {
          console.log('claimDailyChallengeRewards: reward already processed', {
            uid,
            rewardId: snap.id,
            status: rewardData.status,
          });
          alreadyClaimed.push(snap.id);
          continue;
        }

        // Validate revealAt timestamp
        const revealAtMillis = Date.parse(rewardData.revealAt);
        if (Number.isNaN(revealAtMillis)) {
          console.warn('claimDailyChallengeRewards: invalid revealAt timestamp', {
            uid,
            rewardId: snap.id,
            revealAt: rewardData.revealAt,
          });
          deferred.push(snap.id);
          continue;
        }
        
        // Check if reward reveal time has passed (must be claimable)
        if (revealAtMillis > nowMillis) {
          console.log('claimDailyChallengeRewards: reward not yet revealable, deferring', {
            uid,
            rewardId: snap.id,
            revealAt: rewardData.revealAt,
            revealAtMillis,
            nowMillis,
            timeUntilReveal: revealAtMillis - nowMillis,
          });
          deferred.push(snap.id);
          continue;
        }

        // Reward passed all filters - mark for processing
        console.log('claimDailyChallengeRewards: reward qualified for processing', {
          uid,
          rewardId: snap.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          solveState: rewardData.solveState,
        });

        qualifiedSnapshots.push(snap);

        // Queue leaderboard fetch for rewards that affect leaderboards
        // Only 'solved' and 'failed' challenges update the main leaderboard
        if (rewardData.solveState === 'solved' || rewardData.solveState === 'failed') {
          const lbRef = db.collection('games').doc(rewardData.gameId).collection('leaderboard').doc(uid);
          const gameId = rewardData.gameId;
          // Deduplicate: only fetch each leaderboard once
          if (!leaderboardMap.has(gameId)) {
            toFetchLeaderboards.push(lbRef);
            console.log('claimDailyChallengeRewards: queuing leaderboard fetch', {
              uid,
              rewardId: snap.id,
              gameId,
            });
          }
        }
      }

      console.log('claimDailyChallengeRewards: reward filtering complete', {
        uid,
        qualifiedCount: qualifiedSnapshots.length,
        deferredCount: deferred.length,
        alreadyClaimedCount: alreadyClaimed.length,
        leaderboardsToFetch: toFetchLeaderboards.length,
      });

      // Fetch all required leaderboards in parallel
      const leaderboardSnapshots = await Promise.all(toFetchLeaderboards.map(ref => tx.get(ref)));
      toFetchLeaderboards.forEach((ref, index) => {
        const gameId = ref.parent.parent!.id;
        leaderboardMap.set(gameId, leaderboardSnapshots[index]);
        const lbData = leaderboardSnapshots[index]?.exists
          ? leaderboardSnapshots[index].data() as { score?: number; streak?: number }
          : undefined;
        console.log('claimDailyChallengeRewards: fetched leaderboard', {
          uid,
          gameId,
          exists: leaderboardSnapshots[index]?.exists ?? false,
          currentScore: lbData?.score,
          currentStreak: lbData?.streak,
        });
      });

      console.log('claimDailyChallengeRewards: processing qualified rewards', {
        uid,
        count: qualifiedSnapshots.length,
      });

      // Process each qualified reward
      for (const snap of qualifiedSnapshots) {
        const rewardData = snap.data() as DailyChallengeRewardRecord;
        const rewardRef = snap.ref;

        console.log('claimDailyChallengeRewards: processing reward', {
          uid,
          rewardId: rewardRef.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          gameId: rewardData.gameId,
          solveState: rewardData.solveState,
        });

        // Determine leaderboard increments for this reward
        const scoreIncrement = rewardData.solveState === 'solved' ? 1 : 0;
        const streakIncrement = rewardData.solveState !== 'solved' ? 1 : 0;

        // Update leaderboard when applicable
        const shouldUpdateLeaderboard = scoreIncrement > 0 || streakIncrement > 0;

        if (shouldUpdateLeaderboard) {
          const leaderboardSnapshot = leaderboardMap.get(rewardData.gameId);
          const previousLeaderboard = leaderboardSnapshot?.exists
            ? (leaderboardSnapshot.data() as { score?: number; streak?: number; custom?: Record<string, unknown> })
            : undefined;

          const previousScore = typeof previousLeaderboard?.score === 'number' ? previousLeaderboard.score : 0;
          const previousStreak = typeof previousLeaderboard?.streak === 'number' ? previousLeaderboard.streak : 0;

          const nextScore = previousScore + scoreIncrement;
          const nextStreak = previousStreak + streakIncrement;

          console.log('claimDailyChallengeRewards: updating leaderboard totals', {
            uid,
            rewardId: rewardRef.id,
            previousScore,
            previousStreak,
            scoreIncrement,
            streakIncrement,
            nextScore,
            nextStreak,
          });

          const leaderboardUpdate: Record<string, unknown> = {
            uid,
            displayName: userData.displayName,
            username: userData.username,
            photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
            score: nextScore,
            streak: nextStreak,
            updatedAt: Date.now(),
          };

          if (previousLeaderboard?.custom) {
            leaderboardUpdate.custom = previousLeaderboard.custom;
          }

          tx.set(leaderboardSnapshot!.ref, leaderboardUpdate, { merge: true });
        }

        // Mark reward as claimed
        const claimTimestampIso = new Date(nowMillis).toISOString();

        console.log('claimDailyChallengeRewards: marking reward as claimed', {
          uid,
          rewardId: rewardRef.id,
          claimTimestampIso,
        });

        tx.set(rewardRef, {
          status: 'claimed',
          claimedAt: claimTimestampIso,
          updatedAt: claimTimestampIso,
        }, { merge: true });

        // Track successfully processed reward
        processed.push({
          id: rewardRef.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          solveState: rewardData.solveState,
          status: 'claimed',
        });
      }

      console.log('claimDailyChallengeRewards: transaction complete', {
        uid,
        processedCount: processed.length,
        deferredCount: deferred.length,
        alreadyClaimedCount: alreadyClaimed.length,
      });
    });

    console.log('claimDailyChallengeRewards: function complete', {
      uid,
      result: {
        success: true,
        processedCount: processed.length,
        deferredCount: deferred.length,
        alreadyClaimedCount: alreadyClaimed.length,
        processed: processed.map(p => ({
          id: p.id,
          dailyChallengeId: p.dailyChallengeId,
          solveState: p.solveState,
        })),
        deferred,
        alreadyClaimed,
      },
    });

    return {
      success: true,
      processed,
      deferred,
      alreadyClaimed,
    } satisfies ClaimDailyChallengeRewardsResponse;
  } catch (error: any) {
    console.error('claimDailyChallengeRewards error:', {
      uid,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to claim daily challenge rewards');
  }
});


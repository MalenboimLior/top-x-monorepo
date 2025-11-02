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
  const processed: ClaimedDailyChallengeRewardSummary[] = [];
  const deferred: string[] = [];
  const alreadyClaimed: string[] = [];

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
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        console.error('claimDailyChallengeRewards: user profile not found', { uid });
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const userData = userDoc.data() as User;
      const rewardsCollection = userRef.collection('dailyChallengeRewards');

      let rewardSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];

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
            pendingScore: rewardData.pendingScore,
            pendingStreak: rewardData.pendingStreak,
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

      const leaderboardMap: Map<string, FirebaseFirestore.DocumentSnapshot> = new Map();
      const toFetchLeaderboards: FirebaseFirestore.DocumentReference[] = [];
      const qualifiedSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];

      console.log('claimDailyChallengeRewards: filtering rewards', {
        uid,
        totalSnapshots: rewardSnapshots.length,
        filterGameId: payload.gameId,
      });

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
          pendingScore: rewardData.pendingScore,
          pendingStreak: rewardData.pendingStreak,
        });

        if (payload.gameId && rewardData.gameId !== payload.gameId) {
          console.log('claimDailyChallengeRewards: reward filtered by gameId mismatch', {
            uid,
            rewardId: snap.id,
            rewardGameId: rewardData.gameId,
            filterGameId: payload.gameId,
          });
          continue;
        }

        if (rewardData.status !== 'pending') {
          console.log('claimDailyChallengeRewards: reward already processed', {
            uid,
            rewardId: snap.id,
            status: rewardData.status,
          });
          alreadyClaimed.push(snap.id);
          continue;
        }

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

        console.log('claimDailyChallengeRewards: reward qualified for processing', {
          uid,
          rewardId: snap.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          solveState: rewardData.solveState,
        });

        qualifiedSnapshots.push(snap);

        if (rewardData.solveState === 'solved' || rewardData.solveState === 'failed') {
          const lbRef = db.collection('games').doc(rewardData.gameId).collection('leaderboard').doc(uid);
          const gameId = rewardData.gameId;
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

      for (const snap of qualifiedSnapshots) {
        const rewardData = snap.data() as DailyChallengeRewardRecord;
        const rewardRef = snap.ref;

        console.log('claimDailyChallengeRewards: processing reward', {
          uid,
          rewardId: rewardRef.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          gameId: rewardData.gameId,
          solveState: rewardData.solveState,
          pendingScore: rewardData.pendingScore,
          pendingStreak: rewardData.pendingStreak,
        });

        let aggregatedScore: number | undefined = rewardData.aggregatedScore;
        let aggregatedStreak: number | undefined = rewardData.aggregatedStreak;

        // Aggregate score for both solved and failed challenges
        // Only aggregate streak for solved challenges
        const shouldUpdateLeaderboard = rewardData.solveState === 'solved' || rewardData.solveState === 'failed';
        
        if (shouldUpdateLeaderboard) {
          const leaderboardSnapshot = leaderboardMap.get(rewardData.gameId);
          const previousLeaderboard = leaderboardSnapshot?.exists
            ? (leaderboardSnapshot.data() as { score?: number; streak?: number; custom?: Record<string, unknown> })
            : undefined;

          const previousScore = typeof previousLeaderboard?.score === 'number' ? previousLeaderboard.score : 0;
          const previousStreak = typeof previousLeaderboard?.streak === 'number' ? previousLeaderboard.streak : 0;

          const pendingScoreDelta = Math.max(0, rewardData.pendingScore ?? 0);
          // Only add streak for solved challenges
          const pendingStreakDelta = rewardData.solveState === 'solved' 
            ? Math.max(0, rewardData.pendingStreak ?? 0)
            : 0;

          aggregatedScore = previousScore + pendingScoreDelta;
          aggregatedStreak = previousStreak + pendingStreakDelta;

          console.log('claimDailyChallengeRewards: calculating aggregated values', {
            uid,
            rewardId: rewardRef.id,
            solveState: rewardData.solveState,
            previousScore,
            previousStreak,
            pendingScoreDelta,
            pendingStreakDelta,
            aggregatedScore,
            aggregatedStreak,
          });

          const leaderboardUpdate: Record<string, unknown> = {
            uid,
            displayName: userData.displayName,
            username: userData.username,
            photoURL: userData.photoURL || DEFAULT_LEADERBOARD_PHOTO,
            score: aggregatedScore,
            streak: aggregatedStreak,
            updatedAt: Date.now(),
          };

          if (previousLeaderboard?.custom) {
            leaderboardUpdate.custom = previousLeaderboard.custom;
          }

          console.log('claimDailyChallengeRewards: updating leaderboard', {
            uid,
            rewardId: rewardRef.id,
            gameId: rewardData.gameId,
            solveState: rewardData.solveState,
            newScore: aggregatedScore,
            newStreak: aggregatedStreak,
          });

          tx.set(leaderboardSnapshot!.ref, leaderboardUpdate, { merge: true });
        } else {
          console.log('claimDailyChallengeRewards: reward not eligible for leaderboard update', {
            uid,
            rewardId: rewardRef.id,
            solveState: rewardData.solveState,
          });
        }

        const claimTimestampIso = new Date(nowMillis).toISOString();

        console.log('claimDailyChallengeRewards: marking reward as claimed', {
          uid,
          rewardId: rewardRef.id,
          claimTimestampIso,
          aggregatedScore,
          aggregatedStreak,
        });

        tx.set(rewardRef, {
          status: 'claimed',
          claimedAt: claimTimestampIso,
          aggregatedScore,
          aggregatedStreak,
          updatedAt: claimTimestampIso,
        }, { merge: true });

        processed.push({
          id: rewardRef.id,
          dailyChallengeId: rewardData.dailyChallengeId,
          solveState: rewardData.solveState,
          status: 'claimed',
          aggregatedScore,
          aggregatedStreak,
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
          aggregatedScore: p.aggregatedScore,
          aggregatedStreak: p.aggregatedStreak,
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


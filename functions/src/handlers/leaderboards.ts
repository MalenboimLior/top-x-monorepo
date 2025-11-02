import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import cors from 'cors';
import type { LeaderboardEntry } from '@top-x/shared/types/game';
import type { User } from '@top-x/shared/types/user';
import type { UserGameData } from '@top-x/shared/types/user';
import '../utils/firebaseAdmin';
import {
  getLeaderboardCollectionRef,
  mapLeaderboardDoc,
  toOptionalString,
} from '../utils/leaderboardHelpers';
import {
  getStatsDocumentRef,
  normalizeGameStats,
} from '../utils/gameStatsHelpers';
import {
  applyGameCounterUpdates,
  GAME_COUNTER_KEYS,
} from '../utils/statsManager';

const db = admin.firestore();
const corsHandler = cors({ origin: true });

export const getTopLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const limitParam = parseInt(req.query.limit as string) || 10;
    const validLimits = [10, 20, 30, 40, 50];
    const maxResults = validLimits.includes(limitParam) ? limitParam : 10;

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const snapshot = await leaderboardRef
        .orderBy('score', 'desc')
        .orderBy('streak', 'desc')
        .limit(maxResults)
        .get();
      const leaderboard: LeaderboardEntry[] = snapshot.docs.map((doc) => mapLeaderboardDoc(doc));
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching top leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

export const setGameFavorite = functions.https.onCall(async (request: functions.https.CallableRequest) => {
  const { auth, data } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = data as { gameId?: string; favorite?: boolean } | undefined;
  const gameId = payload?.gameId;
  const favorite = payload?.favorite;

  if (!gameId || typeof favorite !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'gameId and favorite flag are required');
  }

  const uid = auth.uid;

  try {
    const result = await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const gameRef = db.collection('games').doc(gameId);
      const statsRef = gameRef.collection('stats').doc('general');

      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'User profile not found');
      }

      const gameDoc = await tx.get(gameRef);
      if (!gameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', `Game ${gameId} does not exist`);
      }

      const userData = userDoc.data() as User;
      const favoriteGames = userData.favoriteGames || [];
      const currentlyFavorite = favoriteGames.includes(gameId);

      if (currentlyFavorite === favorite) {
        return { success: true, favorite };
      }

      tx.update(userRef, {
        favoriteGames: favorite
          ? admin.firestore.FieldValue.arrayUnion(gameId)
          : admin.firestore.FieldValue.arrayRemove(gameId),
      });

      applyGameCounterUpdates({
        tx,
        userRef,
        statsRef,
        userData,
        gameId,
        updates: [{ key: GAME_COUNTER_KEYS.FAVORITES, type: 'toggle', value: favorite }],
      });

      return { success: true, favorite };
    });

    return result;
  } catch (error: any) {
    console.error('setGameFavorite error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to update favorite state');
  }
});

export const getAroundLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const leaderboardEntryDoc = await leaderboardRef.doc(uid).get();
      if (!leaderboardEntryDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const leaderboardEntryData = mapLeaderboardDoc(leaderboardEntryDoc);
      if (!leaderboardEntryData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = leaderboardEntryData.score;

      const aboveSnapshot = await leaderboardRef
        .orderBy('score', 'desc')
        .orderBy('updatedAt', 'desc')
        .where('score', '>', userScore)
        .limit(5)
        .get();
      const above = aboveSnapshot.docs.map((doc) => mapLeaderboardDoc(doc));

      const belowSnapshot = await leaderboardRef
        .orderBy('score', 'asc')
        .orderBy('updatedAt', 'asc')
        .where('score', '<', userScore)
        .limit(5)
        .get();
      const below = belowSnapshot.docs.map((doc) => mapLeaderboardDoc(doc));

      const leaderboard = [...above, leaderboardEntryData, ...below.reverse()];
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching around leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

export const getFriendsLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
      }
      const userData = userDoc.data();
      if (!userData || !userData.frenemies) {
        res.status(200).json([]);
        return;
      }
      const frenemies: string[] = userData.frenemies;

      const leaderboard: LeaderboardEntry[] = [];
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      for (let i = 0; i < frenemies.length; i += 30) {
        const batch = frenemies.slice(i, i + 30);
        const snapshot = await leaderboardRef
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach((doc) => {
          leaderboard.push(mapLeaderboardDoc(doc));
        });
      }

      leaderboard.sort((a, b) => b.score - a.score);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching friends leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

export const getPercentileRank = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      const userDoc = await leaderboardRef.doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const userData = userDoc.data() as UserGameData;
      if (!userData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = userData.score;

      const statsDoc = await getStatsDocumentRef(gameId, dailyChallengeId).get();
      if (!statsDoc.exists) {
        res.status(404).json({ error: 'Stats not available' });
        return;
      }

      const stats = normalizeGameStats(statsDoc.data());
      const { scoreDistribution } = stats;
      const totalPlayers = Math.max(stats.totalPlayers, 0);

      if (!scoreDistribution || totalPlayers === 0) {
        res.status(200).json({ percentile: 0, usersTopped: 0 });
        return;
      }

      let playersBelowOrEqual = 0;
      Object.entries(scoreDistribution).forEach(([scoreValue, count]) => {
        const numericScore = Number(scoreValue);
        if (!Number.isNaN(numericScore) && numericScore <= userScore) {
          playersBelowOrEqual += count;
        }
      });

      const safeTotal = playersBelowOrEqual > totalPlayers ? playersBelowOrEqual : totalPlayers;
      const percentile = safeTotal === 0
        ? 0
        : Math.round((playersBelowOrEqual / safeTotal) * 100);
      const usersTopped = playersBelowOrEqual;
      res.status(200).json({ percentile, usersTopped });
    } catch (error) {
      console.error('Error fetching percentile rank:', error);
      res.status(500).json({ error: 'Failed to fetch percentile rank' });
    }
  });
});

export const getVipLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const dailyChallengeId = toOptionalString(req.query.dailyChallengeId);

    try {
      const gameDoc = await db.collection('games').doc(gameId).get();
      if (!gameDoc.exists) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }
      const gameData = gameDoc.data();
      if (!gameData || !gameData.vip) {
        res.status(200).json([]);
        return;
      }
      const vipUids: string[] = gameData.vip;

      const leaderboard: LeaderboardEntry[] = [];
      const leaderboardRef = getLeaderboardCollectionRef(gameId, dailyChallengeId);
      for (let i = 0; i < vipUids.length; i += 30) {
        const batch = vipUids.slice(i, i + 30);
        const snapshot = await leaderboardRef
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach((doc) => {
          leaderboard.push(mapLeaderboardDoc(doc));
        });
      }

      leaderboard.sort((a, b) => b.score - a.score);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching VIP leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});


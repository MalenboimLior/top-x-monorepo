// Firebase Cloud Functions for backend APIs
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FirestoreEvent, Change } from 'firebase-functions/v2/firestore';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import cors from 'cors';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import { UserGameData,LeaderboardEntry } from '@top-x/shared/types';

// -------------------------------------------------------------
// Cloud Functions used by the TOP-X backend
// -------------------------------------------------------------
// This file exposes a set of HTTPS callable functions and REST
// endpoints that keep user data in sync with X (Twitter) and
// manage various leaderboard queries. It also updates aggregated
// statistics for each game as users play.
// -------------------------------------------------------------

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });


interface GameStats {
  totalPlayers: number;
  scoreDistribution: { [score: number]: number };
  updatedAt: number;
  custom?: Record<string, any>;
}

const oauth = new OAuth({
  consumer: {
    key: process.env.XAPI_KEY || '',
    secret: process.env.XAPI_SECRET || '',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

// Sync basic user information from X (Twitter) when the client
// explicitly calls this function. The client must be authenticated
// and have previously stored access credentials in Firestore.
export const syncXUserData = functions.https.onCall(async (context: functions.https.CallableRequest) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (!userData || !userData.xAccessToken || !userData.xSecret) {
    console.log(`No X credentials for user ${uid}`);
    return;
  }

  const token = {
    key: userData.xAccessToken,
    secret: userData.xSecret,
  };

  const requestData = {
    url: 'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics',
    method: 'GET',
  };

  try {
    const header = oauth.toHeader(oauth.authorize(requestData, token));
    const response = await axios.get(requestData.url, { headers: { Authorization: header.Authorization } });
    const xData = {
      displayName: response.data.data.name,
      username: response.data.data.username,
      photoURL: response.data.data.profile_image_url ? response.data.data.profile_image_url.replace('_normal.jpg', '_400x400.jpg') : 'https://www.top-x.co/assets/profile.png',
      followersCount: response.data.data.public_metrics.followers_count,
      followingCount: response.data.data.public_metrics.following_count,
    };

    await db.collection('users').doc(uid).update({
      displayName: xData.displayName,
      username: xData.username,
      photoURL: xData.photoURL,
      followersCount: xData.followersCount,
      followingCount: xData.followingCount,
      updatedAt: Date.now(),
    });
    console.log(`Updated user ${uid} with X data:`, xData);
  } catch (error: any) {
    console.error(`Error fetching X data for user ${uid}:`, error.message);
    throw new functions.https.HttpsError('internal', 'Failed to fetch X data');
  }
});

// Firestore trigger that updates the leaderboard and aggregate
// statistics every time a user's game data changes.
export const syncScoresAndVots = functions.firestore.onDocumentWritten('users/{uid}', async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { uid: string }>) => {
  const uid = event.params.uid;
  const change = event.data;

  if (!change || !change.after.data()) {
    console.log(`User ${uid} deleted or no data, no action taken`);
    return;
  }

  const beforeData = change.before.data();
  const afterData = change.after.data();

  if (!afterData) {
    console.log(`No data after change for user ${uid}, no action taken`);
    return;
  }

  const gamesAfter = afterData.games || {};
  const gamesBefore = beforeData?.games || {};

  for (const gameTypeId in gamesAfter) {
    for (const gameId in gamesAfter[gameTypeId]) {
      const gameDataAfter = gamesAfter[gameTypeId][gameId] as UserGameData;
      const gameDataBefore = gamesBefore?.[gameTypeId]?.[gameId] as UserGameData | undefined;

      if (JSON.stringify(gameDataAfter) !== JSON.stringify(gameDataBefore)) {
        console.log(`Updating leaderboard and stats for gameType ${gameTypeId} game ${gameId} for user ${uid}`);

        await db.runTransaction(async (tx) => {
          // Update leaderboard
          const leaderboardRef = db.collection('games').doc(gameId).collection('leaderboard').doc(uid);
          const statsRef = db.collection('games').doc(gameId).collection('stats').doc('general');
          const gameRef = db.collection('games').doc(gameId);

          const [statsDoc, gameDoc] = await Promise.all([
            tx.get(statsRef),
            tx.get(gameRef)
          ]);

          if (!gameDoc.exists) {
            console.error(`Game ${gameId} does not exist`);
            return;
          }

          const currentStats = statsDoc.exists
            ? statsDoc.data() as GameStats
            : { totalPlayers: 0, scoreDistribution: {}, custom: {}, updatedAt: Date.now() };

          const distribution = { ...currentStats.scoreDistribution };
          let totalPlayers = currentStats.totalPlayers;
          let custom = { ...currentStats.custom };

          const beforeScore = gameDataBefore?.score || null;
          const afterScore = gameDataAfter.score;

          if (!gameDataBefore) {
            // New entry
            distribution[afterScore] = (distribution[afterScore] || 0) + 1;
            totalPlayers++;
          } else if (beforeScore !== afterScore) {
            // Score changed
            if (beforeScore !== null) {
              distribution[beforeScore] = Math.max((distribution[beforeScore] || 1) - 1, 0);
            }
            distribution[afterScore] = (distribution[afterScore] || 0) + 1;
          }

          // For pyramid-specific custom stats
          if (gameTypeId === 'PyramidTier') {
            const itemRanks = custom.itemRanks || {};
            const worstItemCounts = custom.worstItemCounts || {};

            // Decrement old custom if exists
            if (gameDataBefore?.custom) {
              gameDataBefore.custom.pyramid.forEach((tier: { tier: number; slots: string[] }) => {
                tier.slots.forEach((itemId: string | null) => {
                  if (itemId) {
                    const rowId = tier.tier;
                    itemRanks[itemId] = itemRanks[itemId] || {};
                    itemRanks[itemId][rowId] = Math.max((itemRanks[itemId][rowId] || 1) - 1, 0);
                  }
                });
              });
              if (gameDataBefore.custom.worstItem) {
                const itemId = gameDataBefore.custom.worstItem.id;
                worstItemCounts[itemId] = Math.max((worstItemCounts[itemId] || 1) - 1, 0);
              }
            }

            // Increment new custom
            if (gameDataAfter.custom) {
              gameDataAfter.custom.pyramid.forEach((tier: { tier: number; slots: string[] }) => {
                tier.slots.forEach((itemId: string | null) => {
                  if (itemId) {
                    const rowId = tier.tier;
                    itemRanks[itemId] = itemRanks[itemId] || {};
                    itemRanks[itemId][rowId] = (itemRanks[itemId][rowId] || 0) + 1;
                  }
                });
              });
              if (gameDataAfter.custom.worstItem) {
                const itemId = gameDataAfter.custom.worstItem.id;
                worstItemCounts[itemId] = (worstItemCounts[itemId] || 0) + 1;
              }
            }

            custom = { itemRanks, worstItemCounts };
          }

          // Set leaderboard data
          tx.set(leaderboardRef, {
            ...gameDataAfter,
            displayName: afterData.displayName,
            username: afterData.username,
            photoURL: afterData.photoURL
          });

          // Update stats
          tx.set(statsRef, {
            scoreDistribution: distribution,
            totalPlayers,
            custom,
            updatedAt: Date.now(),
          });

          // Add to VIP if eligible
          if (!gameDataBefore && afterData.followersCount >=0) {
            let vip = gameDoc.data()?.vip || [];
            if (!vip.includes(uid)) {
              vip = [...vip, uid];
              tx.update(gameRef, { vip });
            }
          }
        });
      }
    }
  }
});

// Returns the top N players for a given game ordered by score
// and streak. The number of results is controlled by the optional
// 'limit' query parameter.
export const getTopLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const limitParam = parseInt(req.query.limit as string) || 10;
    const validLimits = [10, 20, 30, 40, 50];
    const maxResults = validLimits.includes(limitParam) ? limitParam : 10;

    try {
      const snapshot = await db
        .collection('games').doc(gameId).collection('leaderboard')
        .orderBy('score', 'desc')
        .orderBy('streak', 'desc')
        .limit(maxResults)
        .get();
      const leaderboard: LeaderboardEntry[] = snapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Anonymous',
        username: doc.data().username || 'Anonymous',
        photoURL: doc.data().photoURL || 'https://www.top-x.co/assets/profile.png',
        score: doc.data().score,
        streak: doc.data().streak,
      }));
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching top leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

// Returns a slice of the leaderboard centered around the
// requesting user. It fetches a few users above and below the
// given uid so the client can show relative ranking.
export const getAroundLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const leaderboardEntryDoc = await db.collection('games').doc(gameId).collection('leaderboard').doc(uid).get();
      if (!leaderboardEntryDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const leaderboardEntryData = leaderboardEntryDoc.data() as LeaderboardEntry;
      if (!leaderboardEntryData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = leaderboardEntryData.score;

      const aboveSnapshot = await db
        .collection('games').doc(gameId).collection('leaderboard')
        .orderBy('score', 'desc')
        .orderBy('updatedAt', 'desc')
        .where('score', '>', userScore)
        .limit(5)
        .get();
      const above = aboveSnapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
        score: doc.data().score,
        streak: doc.data().streak,
      }));

      const belowSnapshot = await db
        .collection('games').doc(gameId).collection('leaderboard')
        .orderBy('score', 'asc')
        .orderBy('updatedAt', 'asc')
        .where('score', '<', userScore)
        .limit(5)
        .get();
      const below = belowSnapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
        score: doc.data().score,
        streak: doc.data().streak,
      }));

      // const current: LeaderboardEntry = {
      //   uid: uid,
      //   displayName: userData.displayName,
      //   username: userData.username,
      //   photoURL: userData.photoURL || 'https://www.top-x.co/assets/profile.png',
      //   score: userData.score,
      //   streak: userData.streak,
      // };

      const leaderboard = [...above, leaderboardEntryData, ...below.reverse()];
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching around leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
});

// Returns leaderboard entries for the friends of a given user
// based on the list of friend UIDs stored in that user's document.
export const getFriendsLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
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
      for (let i = 0; i < frenemies.length; i += 30) {
        const batch = frenemies.slice(i, i + 30);
        const snapshot = await db
          .collection('games').doc(gameId).collection('leaderboard')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach(doc => {
          const data = doc.data() as LeaderboardEntry;
          leaderboard.push({
            uid: doc.id,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL,
            score: data.score,
            streak: data.streak,
            custom: data.custom,
          });
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

// Calculates the percentile rank for a user in a given game. It
// looks up the user's score in the leaderboard and compares it
// against the stored score distribution statistics.
export const getPercentileRank = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const userDoc = await db.collection('games').doc(gameId).collection('leaderboard').doc(uid).get();
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

      const statsDoc = await db.collection('games').doc(gameId).collection('stats').doc('general').get();
      if (!statsDoc.exists) {
        res.status(404).json({ error: 'Stats not available' });
        return;
      }
      const stats = statsDoc.data() as GameStats;
      if (!stats.scoreDistribution) {
        res.status(500).json({ error: 'Stats distribution is undefined' });
        return;
      }

      let playersBelowOrEqual = 0;
      for (const score in stats.scoreDistribution) {
        if (parseInt(score) <= userScore) {
          playersBelowOrEqual += stats.scoreDistribution[score];
        }
      }

      const percentile = Math.round((playersBelowOrEqual / stats.totalPlayers) * 100);
      const usersTopped = playersBelowOrEqual;
      res.status(200).json({ percentile, usersTopped });
    } catch (error) {
      console.error('Error fetching percentile rank:', error);
      res.status(500).json({ error: 'Failed to fetch percentile rank' });
    }
  });
});

// Fetches leaderboard information for a curated list of VIP users.
// The list of UIDs is stored in the 'config/vip_users' document in Firestore.
export const getVipLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';

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
      for (let i = 0; i < vipUids.length; i += 30) {
        const batch = vipUids.slice(i, i + 30);
        const snapshot = await db
          .collection('games').doc(gameId).collection('leaderboard')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach(doc => {
          const data = doc.data() as LeaderboardEntry;
          leaderboard.push({
            uid: doc.id,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL,
            score: data.score,
            streak: data.streak,
            custom: data.custom,
          });
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
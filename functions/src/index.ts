import * as functions from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import cors from 'cors';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
  streak: number;
}

interface GameStats {
  totalPlayers: number;
  scoreDistribution: { [score: number]: number };
  updatedAt: number;
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
    url: 'https://api.twitter.com/2/users/me?user.fields=username,public_metrics',
    method: 'GET',
  };

  try {
    const header = oauth.toHeader(oauth.authorize(requestData, token));
    const response = await axios.get(requestData.url, { headers: { Authorization: header.Authorization } });
    const xData = {
      username: response.data.data.username,
      followersCount: response.data.data.public_metrics.followers_count,
      followingCount: response.data.data.public_metrics.following_count,
    };

    await db.collection('users').doc(uid).update({
      username: xData.username,
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

export const syncTriviaScore = functions.firestore.onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const data = event.data?.after.data();
  if (!data || !data.games?.smartest_on_x) return;

  await db.collection('leaderboards_smartest_on_x').doc(uid).set({
    uid,
    displayName: data.displayName || 'Anonymous',
    username: data.username || 'Anonymous',
    photoURL: data.photoURL || 'https://www.top-x.co/asstes/profile.png',
    score: data.games.smartest_on_x.score || 0,
    streak: data.games.smartest_on_x.streak || 0,
    updatedAt: Date.now(),
  });
});

export const updateTriviaStats = onSchedule('every 60 minutes', async () => {
  const scoresSnapshot = await db.collection('leaderboards_smartest_on_x').get();
  const totalPlayers = scoresSnapshot.size;
  const scoreDistribution: { [score: number]: number } = {};

  scoresSnapshot.forEach(doc => {
    const score = doc.data().score;
    scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
  });

  await db.collection('stats').doc('smartest_on_x').set({
    totalPlayers,
    scoreDistribution,
    updatedAt: Date.now(),
  });
});

export const getTopLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const limitParam = parseInt(req.query.limit as string) || 10;
    const validLimits = [10, 20, 30, 40, 50];
    const maxResults = validLimits.includes(limitParam) ? limitParam : 10;

    try {
      const snapshot = await db
        .collection(`leaderboards_${gameId}`)
        .orderBy('score', 'desc')
        .orderBy('streak', 'desc')
        .limit(maxResults)
        .get();
      const leaderboard: LeaderboardEntry[] = snapshot.docs.map(doc => ({
        uid: doc.data().uid,
        displayName: doc.data().displayName,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
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

export const getAroundLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const userDoc = await db.collection(`leaderboards_${gameId}`).doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const userData = userDoc.data();
      if (!userData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = userData.score;

      const aboveSnapshot = await db
        .collection(`leaderboards_${gameId}`)
        .orderBy('score', 'desc')
        .orderBy('updatedAt', 'desc')
        .where('score', '>', userScore)
        .limit(5)
        .get();
      const above = aboveSnapshot.docs.map(doc => ({
        uid: doc.data().uid,
        displayName: doc.data().displayName,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
        score: doc.data().score,
        streak: doc.data().streak,
      }));

      const belowSnapshot = await db
        .collection(`leaderboards_${gameId}`)
        .orderBy('score', 'asc')
        .orderBy('updatedAt', 'asc')
        .where('score', '<', userScore)
        .limit(5)
        .get();
      const below = belowSnapshot.docs.map(doc => ({
        uid: doc.data().uid,
        displayName: doc.data().displayName,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
        score: doc.data().score,
        streak: doc.data().streak,
      }));

      const current: LeaderboardEntry = {
        uid: userData.uid,
        displayName: userData.displayName,
        username: userData.username,
        photoURL: userData.photoURL,
        score: userData.score,
        streak: userData.streak,
      };

      const leaderboard = [...above, current, ...below.reverse()];
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
      if (!userData || !userData.friends) {
        res.status(200).json([]);
        return;
      }
      const friends: string[] = userData.friends;

      const leaderboard: LeaderboardEntry[] = [];
      for (let i = 0; i < friends.length; i += 30) {
        const batch = friends.slice(i, i + 30);
        const snapshot = await db
          .collection(`leaderboards_${gameId}`)
          .where('uid', 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach(doc => {
          const data = doc.data();
          leaderboard.push({
            uid: data.uid,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL,
            score: data.score,
            streak: doc.data().streak,
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

export const getPercentileRank = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';
    const uid = req.query.uid as string;

    if (!uid) {
      res.status(400).json({ error: 'Missing uid parameter' });
      return;
    }

    try {
      const userDoc = await db.collection(`leaderboards_${gameId}`).doc(uid).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found in leaderboard' });
        return;
      }
      const userData = userDoc.data();
      if (!userData) {
        res.status(500).json({ error: 'User data is undefined' });
        return;
      }
      const userScore = userData.score;

      const statsDoc = await db.collection('stats').doc(gameId).get();
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

export const getVipLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const gameId = req.query.gameId as string || 'smartest_on_x';

    try {
      const vipDoc = await db.collection('config').doc('vip_users').get();
      if (!vipDoc.exists) {
        res.status(404).json({ error: 'VIP list not found' });
        return;
      }
      const vipData = vipDoc.data();
      if (!vipData || !vipData.uids) {
        res.status(200).json([]);
        return;
      }
      const vipUids: string[] = vipData.uids;

      const leaderboard: LeaderboardEntry[] = [];
      for (let i = 0; i < vipUids.length; i += 30) {
        const batch = vipUids.slice(i, i + 30);
        const snapshot = await db
          .collection(`leaderboards_${gameId}`)
          .where('uid', 'in', batch)
          .orderBy('score', 'desc')
          .get();
        snapshot.forEach(doc => {
          const data = doc.data();
          leaderboard.push({
            uid: data.uid,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL,
            score: data.score,
            streak: doc.data().streak,
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
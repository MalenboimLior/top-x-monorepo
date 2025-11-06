import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import type { User } from '@top-x/shared/types/user';

import '../utils/firebaseAdmin';
import {
  applyGameCounterUpdates,
  GAME_COUNTER_KEYS,
} from '../utils/statsManager';

const db = admin.firestore();

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

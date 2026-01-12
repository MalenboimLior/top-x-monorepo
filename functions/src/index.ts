// Firebase Cloud Functions for backend APIs
import * as admin from 'firebase-admin';
import './utils/firebaseAdmin';

// Initialize Firestore settings
const db = admin.firestore();
if (typeof (db as any).settings === 'function') {
  db.settings({ ignoreUndefinedProperties: true }); // Critical fix
}

// Export all handlers
export { syncXUserData } from './handlers/xApi';
export { postOnX } from './external/xApi';
export { submitGameScore } from './handlers/submitGameScore';
export { claimDailyChallengeRewards } from './handlers/dailyChallengeRewards';
export { setGameFavorite } from './handlers/gameFavorite';
export { getTriviaQuestions } from './handlers/getTriviaQuestions';
export { searchBooks, proxyBookImage } from './handlers/books';
export { notifyNewGame, notifyNewHighProfileUser, sendSessionMilestoneEmail } from './handlers/adminNotifications';

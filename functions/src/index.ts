// Firebase Cloud Functions for backend APIs
import * as admin from 'firebase-admin';
import './utils/firebaseAdmin';

// Initialize Firestore settings
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // Critical fix

// Export all handlers
export { syncXUserData } from './handlers/xApi';
export { postOnX } from './external/xApi';
export { submitGameScore } from './handlers/submitGameScore';
export { claimDailyChallengeRewards } from './handlers/dailyChallengeRewards';

export {
  getTopLeaderboard,
  setGameFavorite,
  getAroundLeaderboard,
  getFriendsLeaderboard,
  getPercentileRank,
  getVipLeaderboard,
} from './handlers/leaderboards';

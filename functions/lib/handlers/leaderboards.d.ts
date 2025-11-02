import * as functions from 'firebase-functions/v2';
import '../utils/firebaseAdmin';
export declare const getTopLeaderboard: functions.https.HttpsFunction;
export declare const setGameFavorite: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    favorite: boolean;
}>, unknown>;
export declare const getAroundLeaderboard: functions.https.HttpsFunction;
export declare const getFriendsLeaderboard: functions.https.HttpsFunction;
export declare const getPercentileRank: functions.https.HttpsFunction;
export declare const getVipLeaderboard: functions.https.HttpsFunction;

import * as functions from 'firebase-functions/v2';
import type { SubmitGameScoreRequest, SubmitGameScoreResponse } from '@top-x/shared/types/user';
import { postOnX } from './external/xApi';
import './utils/firebaseAdmin';
export declare const syncXUserData: functions.https.CallableFunction<any, Promise<void>, unknown>;
export declare const submitGameScore: functions.https.CallableFunction<SubmitGameScoreRequest, Promise<SubmitGameScoreResponse>, unknown>;
export declare const getTopLeaderboard: functions.https.HttpsFunction;
export declare const setGameFavorite: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    favorite: boolean;
}>, unknown>;
export declare const recordGameEvent: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    appliedEvents: "submit_answer"[];
}>, unknown>;
export declare const getAroundLeaderboard: functions.https.HttpsFunction;
export declare const getFriendsLeaderboard: functions.https.HttpsFunction;
export declare const getPercentileRank: functions.https.HttpsFunction;
export declare const getVipLeaderboard: functions.https.HttpsFunction;
export { postOnX };

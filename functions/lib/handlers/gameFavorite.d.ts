import * as functions from 'firebase-functions/v2';
import '../utils/firebaseAdmin';
export declare const setGameFavorite: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    favorite: boolean;
}>, unknown>;

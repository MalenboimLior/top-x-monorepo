import * as functions from 'firebase-functions/v2';
/**
 * Send email notification when a new game is created
 */
export declare const notifyNewGame: functions.CloudFunction<functions.firestore.FirestoreEvent<functions.firestore.QueryDocumentSnapshot, {
    gameId: string;
}>>;
/**
 * Send email notification when a new user with 5000+ followers is created
 */
export declare const notifyNewHighProfileUser: functions.CloudFunction<functions.firestore.FirestoreEvent<functions.firestore.QueryDocumentSnapshot, {
    userId: string;
}>>;
/**
 * Send email notification for session milestones (100 or 1000 sessions)
 * Called from submitGameScore function after transaction completes
 */
export declare function sendSessionMilestoneEmail(gameId: string, gameName: string, milestone: number, currentSessions: number): Promise<void>;

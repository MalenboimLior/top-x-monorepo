import * as functions from 'firebase-functions/v2';
export declare const searchBooks: functions.https.HttpsFunction;
/**
 * Proxies book cover images to avoid CORS issues
 * Fetches the image from Google Books API and returns it with proper CORS headers
 */
export declare const proxyBookImage: functions.https.HttpsFunction;

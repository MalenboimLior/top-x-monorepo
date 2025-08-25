import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { TwitterApi } from 'twitter-api-v2';
import { admin } from '../utils/firebaseAdmin';
import { Buffer } from 'buffer';  // For base64 to buffer

// Typed data with optional media
export const postOnX = onCall<{ text: string; media?: { data: string; mimeType: string }[] }>(async (request) => {
  console.log('postOnX invoked with request:', { authUid: request.auth?.uid, textLength: request.data.text?.length, mediaCount: request.data.media?.length });

  if (!request.auth) {
    console.log('Auth check failed: No auth provided');
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = request.auth.uid;
  console.log('Authenticated user ID:', userId);

  const { text, media = [] } = request.data;

  if (!text || typeof text !== 'string' || text.length > 280) {
    console.log('Invalid text input:', { textProvided: !!text, length: text?.length });
    throw new HttpsError('invalid-argument', 'Text is required and must be <= 280 characters');
  }

  try {
    console.log('Fetching user doc from Firestore for user:', userId);
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    console.log('User doc fetched:', { exists: userDoc.exists, dataKeys: userDoc.exists ? Object.keys(userDoc.data() || {}) : 'none' });

    const userData = userDoc.data() || {};
    const { xAccessToken, xAccessSecret } = userData;
    console.log('Extracted credentials:', { hasAccessToken: !!xAccessToken, hasAccessSecret: !!xAccessSecret });

    if (!xAccessToken || !xAccessSecret) {
      console.log('Credentials missing for user:', userId);
      throw new HttpsError('failed-precondition', 'X credentials not found');
    }

    console.log('Initializing Twitter client');
    const twitterClient = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: xAccessToken,
      accessSecret: xAccessSecret,
    });

    // Upload media if provided (max 4)
    const mediaIds: string[] = [];
    for (const item of media.slice(0, 4)) {
      console.log('Uploading media:', { mimeType: item.mimeType, dataLength: item.data.length });
      const buffer = Buffer.from(item.data, 'base64');
      const mediaId = await twitterClient.v1.uploadMedia(buffer, { mimeType: item.mimeType, target: 'tweet' });
      mediaIds.push(mediaId);
      console.log('Media uploaded, ID:', mediaId);
    }

    // Post tweet with optional media
    const tweetPayload: any = { text };
    if (mediaIds.length > 0) {
      tweetPayload.media = { media_ids: mediaIds };
      console.log('Posting tweet with media IDs:', mediaIds);
    } else {
      console.log('Posting tweet without media');
    }
    const tweet = await twitterClient.v2.tweet(tweetPayload);
    console.log('Tweet posted successfully:', { tweetId: tweet.data.id });

    console.log('Updating user doc with lastPostId');
    await admin.firestore().collection('users').doc(userId).update({
      lastPostId: tweet.data.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, tweetId: tweet.data.id };
  } catch (error) {
    console.error('Error posting to X:', error);
    throw new HttpsError('internal', 'Failed to post to X');
  }
});
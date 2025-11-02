import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import './utils/firebaseAdmin';

const db = admin.firestore();

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
  if (!userData || !userData.xAccessToken || !userData.xAccessSecret) {
    console.log(`No X credentials for user ${uid}`);
    return;
  }

  const token = {
    key: userData.xAccessToken,
    secret: userData.xAccessSecret,
  };

  const requestData = {
    url: 'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics',
    method: 'GET',
  };

  try {
    const header = oauth.toHeader(oauth.authorize(requestData, token));
    const response = await axios.get(requestData.url, { headers: { Authorization: header.Authorization } });
    const xData = {
      displayName: response.data.data.name,
      username: response.data.data.username,
      photoURL: response.data.data.profile_image_url ? response.data.data.profile_image_url.replace('_normal', '_400x400') : 'https://www.top-x.co/assets/profile.png',
      followersCount: response.data.data.public_metrics.followers_count,
      followingCount: response.data.data.public_metrics.following_count,
    };

    await db.collection('users').doc(uid).update({
      displayName: xData.displayName,
      username: xData.username,
      photoURL: xData.photoURL,
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


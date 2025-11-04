// packages/shared/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const detectedHost = typeof window !== 'undefined' ? window.location.hostname : '';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: detectedHost.includes('admin') ? 'admin.top-x.co' : 'top-x.co',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

const isBrowser = typeof window !== 'undefined';

const auth = getAuth(app);

if (isBrowser) {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Failed to set Firebase auth persistence:', error);
  });
}

const db = getFirestore(app);
const functions = getFunctions(app);

const fallbackAnalytics: Analytics = {
  app,
  logEvent: () => undefined,
  setAnalyticsCollectionEnabled: () => undefined,
  setCurrentScreen: () => undefined,
  setUserId: () => undefined,
  setUserProperties: () => undefined,
} as unknown as Analytics;

const analytics: Analytics = (() => {
  if (!isBrowser) {
    return fallbackAnalytics;
  }

  try {
    return getAnalytics(app);
  } catch (error) {
    console.warn('Firebase analytics unavailable:', error);
    return fallbackAnalytics;
  }
})();

const storage = getStorage(app);

export { app, auth, db, functions, analytics, storage };

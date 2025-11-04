// packages/shared/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
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

// Safe init with persistence
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

const db = getFirestore(app);
const functions = getFunctions(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { app, auth, db, functions, analytics, storage };
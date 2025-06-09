import { initializeApp } from 'firebase/app';
import { initializeAuth, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const detectedHost = window.location.hostname;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: detectedHost.includes('admin')
    ? 'admin.top-x.co'
    : 'top-x.co',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  popupRedirectResolver: browserPopupRedirectResolver,
});

const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };

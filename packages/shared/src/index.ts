// Shared Firebase initialization used by all apps
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics} from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

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
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('Auth persistence set to local'))
  .catch((error) => console.error('Error setting persistence:', error));

const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions, analytics, storage };
export * from './utils/analytics';

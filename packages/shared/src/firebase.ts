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

// Delay auth persistence setup to not block initial render
if (isBrowser) {
  // Use requestIdleCallback or setTimeout to defer non-critical initialization
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn('Failed to set Firebase auth persistence:', error);
      });
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn('Failed to set Firebase auth persistence:', error);
      });
    }, 100);
  }
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

// Lazy-load analytics to improve initial page load
let analyticsInstance: Analytics | null = null;

const getAnalyticsInstance = (): Analytics => {
  if (!isBrowser) {
    return fallbackAnalytics;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  try {
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch (error) {
    console.warn('Firebase analytics unavailable:', error);
    analyticsInstance = fallbackAnalytics;
    return analyticsInstance;
  }
};

// Initialize analytics after page load for better performance
const analytics: Analytics = (() => {
  if (!isBrowser) {
    return fallbackAnalytics;
  }
  
  // Return a proxy that lazily initializes analytics on first use
  return new Proxy(fallbackAnalytics, {
    get(target, prop) {
      const instance = getAnalyticsInstance();
      const value = (instance as any)[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    }
  }) as Analytics;
})();

// Initialize analytics after DOM is ready
if (isBrowser) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to not block initial render
      setTimeout(() => getAnalyticsInstance(), 100);
    });
  } else {
    setTimeout(() => getAnalyticsInstance(), 100);
  }
}

const storage = getStorage(app);

export { app, auth, db, functions, analytics, storage };

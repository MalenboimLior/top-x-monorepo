// Shared Vite environment variables for all apps
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_GOOGLE_ADS_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ADS_SLOT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
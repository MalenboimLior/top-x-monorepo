import * as admin from 'firebase-admin';

// Initialize only if no apps exist (prevents duplicates)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export { admin };
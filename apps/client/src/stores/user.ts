import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { auth, db, functions } from '@top-x/shared';
import { signInWithPopup, TwitterAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { httpsCallable, HttpsCallable } from 'firebase/functions';
import { User } from '@top-x/shared/types/user';

// Define a sanitized user type to avoid reactivity issues
interface SanitizedUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<SanitizedUser | null>(null);
  const profile = ref<User | null>(null);
  const error = ref<string | null>(null);

  onAuthStateChanged(auth, (currentUser) => {
    console.log('onAuthStateChanged triggered:', currentUser?.uid || 'No user');
    if (currentUser) {
      // Sanitize Firebase User object to avoid unsafe properties
      user.value = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
      };
      const userDoc = doc(db, 'users', currentUser.uid);
      onSnapshot(userDoc, (snapshot) => {
        if (snapshot.exists()) {
          profile.value = snapshot.data() as User;
          console.log('Profile loaded:', profile.value);
        } else {
          console.log('No profile found, creating new one');
          createUserProfile(currentUser);
        }
      }, (err) => {
        console.error('Firestore error:', err);
        error.value = err.message;
      });
    } else {
      user.value = null;
      profile.value = null;
      console.log('No user logged in');
    }
  });

  const loginWithX = async () => {
    const provider = new TwitterAuthProvider();
    console.log("Using provider ID:", provider.providerId); // should be 'twitter.com'

    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Login successful:', result.user.uid);
      user.value = {
        uid: result.user.uid,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };

      const credential = TwitterAuthProvider.credentialFromResult(result);
      if (!credential || !credential.accessToken || !credential.secret) {
        throw new Error('Failed to get X credentials');
      }
      const xAccessToken = credential.accessToken;
      const xSecret = credential.secret;

      const userDocRef = doc(db, 'users', result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        await updateDoc(userDocRef, {
          xAccessToken,
          xSecret,
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL
            ? result.user.photoURL.replace('_normal.jpg', '_400x400.jpg')
            : 'https://www.top-x.co/assets/profile.png',
        });
        console.log('Updated user profile with X credentials');
      } else {
        await createUserProfile(result.user, { xAccessToken, xSecret });
      }
      console.log('before syncXUserData:');

      const syncXUserData: HttpsCallable<unknown, unknown> = httpsCallable(functions, 'syncXUserData');
      await syncXUserData().catch((err) => {
        console.error('Error calling syncXUserData:', err);
        throw new Error(`Failed to sync X data: ${err.message}`);
      });
      console.log('Triggered syncXUserData');

      if (!profile.value) {
        console.log('Waiting for profile to load...');
        await new Promise<void>((resolve) => {
          const unsubscribe = watch(
            () => profile.value,
            (newProfile) => {
              if (newProfile) {
                console.log('Profile loaded after login:', newProfile);
                unsubscribe();
                resolve();
              }
            },
            { immediate: true }
          );
        });
      }

      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      error.value = err.message;
      return false;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      console.log('Logout successful');
    } catch (err: any) {
      console.error('Logout error:', err);
      error.value = err.message;
    }
  };

  async function createUserProfile(user: FirebaseUser, xCredentials?: { xAccessToken: string; xSecret: string }) {
    const userProfile: User = {
      uid: user.uid,
      username: '@Unknown',
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL
        ? user.photoURL.replace('_normal.jpg', '_400x400.jpg')
        : 'https://www.top-x.co/assets/profile.png',
      isAdmin: false,
      followersCount: 0,
      followingCount: 0,
      xAccessToken: xCredentials?.xAccessToken || '',
      xSecret: xCredentials?.xSecret || '',
      frenemies: [],
      addedBy: [],
      games: {},
      badges: [],
    };
    try {
      console.log('Attempting to create profile:', userProfile);
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log('Profile created:', userProfile);
    } catch (err: any) {
      console.error('Profile creation error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        stack: err.stack,
      });
      error.value = err.message;
    }
  }

  async function addFrenemy(frenemyUid: string) {
    if (!user.value || frenemyUid === user.value.uid) {
      console.log('Cannot add frenemy: no user logged in or same user');
      error.value = 'Cannot add yourself as a frenemy';
      return;
    }
    try {
      console.log(`Adding frenemy ${frenemyUid} for user ${user.value.uid}`);
      const userDocRef = doc(db, 'users', user.value.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.error('User document does not exist:', user.value.uid);
        error.value = 'User profile not found';
        return;
      }
      console.log('User document state:', userDocSnap.data());
      const frenemyDocRef = doc(db, 'users', frenemyUid);
      const frenemyDocSnap = await getDoc(frenemyDocRef);
      if (!frenemyDocSnap.exists()) {
        console.error('Frenemy document does not exist:', frenemyUid);
        error.value = 'Frenemy not found';
        return;
      }
      console.log('Frenemy document state:', frenemyDocSnap.data());
      try {
        await updateDoc(userDocRef, {
          frenemies: arrayUnion(frenemyUid),
        });
        console.log(`Successfully updated user ${user.value.uid} frenemies with ${frenemyUid}`);
      } catch (err: any) {
        console.error('Error updating user frenemies:', {
          userId: user.value.uid,
          frenemyUid,
          message: err.message,
          code: err.code,
          details: err.details,
          stack: err.stack,
        });
        throw err;
      }
      try {
        await updateDoc(frenemyDocRef, {
          addedBy: arrayUnion(user.value.uid),
        });
        console.log(`Successfully updated frenemy ${frenemyUid} addedBy with ${user.value.uid}`);
      } catch (err: any) {
        console.error('Error updating frenemy addedBy:', {
          userId: user.value.uid,
          frenemyUid,
          message: err.message,
          code: err.code,
          details: err.details,
          stack: err.stack,
        });
        throw err;
      }
    } catch (err: any) {
      error.value = err.message;
      console.error('Failed to add frenemy:', {
        userId: user.value.uid,
        frenemyUid,
        message: err.message,
        code: err.code,
        details: err.details,
      });
    }
  }

  async function removeFrenemy(frenemyUid: string) {
    if (!user.value) {
      console.log('Cannot remove frenemy: no user logged in');
      error.value = 'No user logged in';
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.value.uid);
      const frenemyDocRef = doc(db, 'users', frenemyUid);
      await updateDoc(userDocRef, {
        frenemies: arrayRemove(frenemyUid),
      });
      await updateDoc(frenemyDocRef, {
        addedBy: arrayRemove(user.value.uid),
      });
      console.log(`Removed frenemy ${frenemyUid} for user ${user.value.uid}`);
    } catch (err: any) {
      console.error('Error removing frenemy:', err);
      error.value = err.message;
    }
  }

  async function updateGameProgress(
    gameTypeId: string,
    gameId: string,
    score: number,
    streak: number,
    custom?: Record<string, any>
  ) {
    if (!user.value) {
      console.log('Cannot update game progress: no user logged in');
      error.value = 'No user logged in';
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.value.uid);
      const gameData: any = {
        score,
        streak,
        lastPlayed: new Date().toISOString(),
      };
      if (custom) {
        gameData.custom = custom;
      }
      await setDoc(
        userDocRef,
        {
          games: {
            [gameTypeId]: {
              [gameId]: gameData,
            },
          },
        },
        { merge: true }
      );
      console.log(`Updated game progress for ${gameTypeId}/${gameId}`);
    } catch (err: any) {
      console.error('Error updating game progress:', err);
      error.value = err.message;
    }
  }

  return { user, profile, error, loginWithX, logout, addFrenemy, removeFrenemy, updateGameProgress };
}, { persist: true });
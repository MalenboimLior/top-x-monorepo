// Pinia store handling user state and auth
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { auth, db, functions } from '@top-x/shared';
import { signInWithPopup, TwitterAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { httpsCallable, HttpsCallable } from 'firebase/functions';
import { User } from '@top-x/shared/types/user';

export const useUserStore = defineStore('user',() => {
  const user = ref<FirebaseUser | null>(null);
  const profile = ref<User | null>(null);
  const error = ref<string | null>(null);

  onAuthStateChanged(auth, (currentUser) => {
    console.log('onAuthStateChanged triggered:', currentUser?.uid || 'No user');
    user.value = currentUser;
    error.value = null;

    if (currentUser) {
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
      user.value = result.user;

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
      rivals: [],
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

  async function addRival(rivalUid: string) {
    if (!user.value || rivalUid === user.value.uid) {
      console.log('Cannot add rival: no user logged in or same user');
      error.value = 'Cannot add yourself as a rival';
      return;
    }
    try {
      console.log(`Adding rival ${rivalUid} for user ${user.value.uid}`);
      const userDocRef = doc(db, 'users', user.value.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.error('User document does not exist:', user.value.uid);
        error.value = 'User profile not found';
        return;
      }
      console.log('User document state:', userDocSnap.data());
      const rivalDocRef = doc(db, 'users', rivalUid);
      const rivalDocSnap = await getDoc(rivalDocRef);
      if (!rivalDocSnap.exists()) {
        console.error('Rival document does not exist:', rivalUid);
        error.value = 'Rival not found';
        return;
      }
      console.log('Rival document state:', rivalDocSnap.data());
      try {
        await updateDoc(userDocRef, {
          rivals: arrayUnion(rivalUid),
        });
        console.log(`Successfully updated user ${user.value.uid} rivals with ${rivalUid}`);
      } catch (err: any) {
        console.error('Error updating user rivals:', {
          userId: user.value.uid,
          rivalUid,
          message: err.message,
          code: err.code,
          details: err.details,
          stack: err.stack,
        });
        throw err;
      }
      try {
        await updateDoc(rivalDocRef, {
          addedBy: arrayUnion(user.value.uid),
        });
        console.log(`Successfully updated rival ${rivalUid} addedBy with ${user.value.uid}`);
      } catch (err: any) {
        console.error('Error updating rival addedBy:', {
          userId: user.value.uid,
          rivalUid,
          message: err.message,
          code: err.code,
          details: err.details,
          stack: err.stack,
        });
        throw err;
      }
    } catch (err: any) {
      error.value = err.message;
      console.error('Failed to add rival:', {
        userId: user.value.uid,
        rivalUid,
        message: err.message,
        code: err.code,
        details: err.details,
      });
    }
  }

  async function removeRival(rivalUid: string) {
    if (!user.value) {
      console.log('Cannot remove rival: no user logged in');
      error.value = 'No user logged in';
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.value.uid);
      const rivalDocRef = doc(db, 'users', rivalUid);
      await updateDoc(userDocRef, {
        rivals: arrayRemove(rivalUid),
      });
      await updateDoc(rivalDocRef, {
        addedBy: arrayRemove(user.value.uid),
      });
      console.log(`Removed rival ${rivalUid} for user ${user.value.uid}`);
    } catch (err: any) {
      console.error('Error removing rival:', err);
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

  return { user, profile, error, loginWithX, logout, addRival, removeRival, updateGameProgress };
  },
  { persist: true }
);

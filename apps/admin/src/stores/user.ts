// Pinia store managing admin authentication
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth, db } from '@top-x/shared';
import { signInWithPopup, TwitterAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '@top-x/shared/types/user';

export const useUserStore = defineStore(
  'user',
  () => {
  const user = ref<User | null>(null);

  onAuthStateChanged(auth, async (currentUser) => {
    console.log('Auth state changed:', { uid: currentUser?.uid, email: currentUser?.email });
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          user.value = userDoc.data() as User;
          console.log('User data loaded:', {
            uid: user.value.uid,
            username: user.value.username,
            isAdmin: user.value.isAdmin,
          });
        } else {
          console.log('No user document found, creating new one');
          const newUser: User = {
            uid: currentUser.uid,
            username: currentUser.displayName?.toLowerCase().replace(/\s/g, '') || '@Anonymous',
            displayName: currentUser.displayName || 'Anonymous',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || 'https://www.top-x.co/assets/profile.png',
            isAdmin: false,
            followersCount: 0,
            followingCount: 0,
            frenemies: [],
            addedBy: [],
            games: {},
            badges: [],
          };
          await setDoc(userDocRef, newUser);
          user.value = newUser;
          console.log('New user document created:', newUser);
        }
      } catch (err: any) {
        console.error('Error loading user data:', err.message);
        user.value = null;
      }
    } else {
      console.log('No user authenticated, clearing user data');
      user.value = null;
    }
  });

  const login = async () => {
    console.log('Login initiated');
    
    const provider = new TwitterAuthProvider();
    console.log("Using provider ID:", provider.providerId); // should be 'twitter.com'

    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Firebase login successful:', {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
      });
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        user.value = userDoc.data() as User;
        console.log('User data fetched:', {
          uid: user.value.uid,
          username: user.value.username,
          isAdmin: user.value.isAdmin,
        });
      } else {
        console.log('Creating new user document');
        const newUser: User = {
          uid: result.user.uid,
          username: result.user.displayName?.toLowerCase().replace(/\s/g, '') || '@Anonymous',
          displayName: result.user.displayName || 'Anonymous',
          email: result.user.email || '',
          photoURL: result.user.photoURL || 'https://www.top-x.co/assets/profile.png',
          isAdmin: false,
          followersCount: 0,
          followingCount: 0,
          frenemies: [],
          addedBy: [],
          games: {},
          badges: [],
        };
        await setDoc(userDocRef, newUser);
        user.value = newUser;
        console.log('New user document created:', newUser);
      }
    } catch (err: any) {
      console.error('Login error:', err.message);
      throw err;
    }
  };

  const logout = async () => {
    console.log('Logout initiated');
    try {
      await signOut(auth);
      console.log('Logout successful');
      user.value = null;
    } catch (err: any) {
      console.error('Logout error:', err.message);
      throw err;
    }
  };

  return { user, login, logout };
  },
  { persist: true }
);

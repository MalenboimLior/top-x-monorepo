import { defineStore } from 'pinia';
import { auth, db } from '@top-x/shared';
import { signInWithPopup, TwitterAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '@top-x/shared';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    async login() {
      const provider = new TwitterAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      this.user = {
        uid: result.user.uid,
        username: userData.username || result.user.displayName || '',
        displayName: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || undefined,
        isAdmin: userData.isAdmin || false,
        followersCount: userData.followersCount || 0,
        followingCount: userData.followingCount || 0,
        xAccessToken: userData.xAccessToken || undefined,
        xSecret: userData.xSecret || undefined,
        rivals: userData.rivals || [],
        addedBy: userData.addedBy || [],
        games: userData.games || {},
        badges: userData.badges || [],
      };
    },
    async logout() {
      await signOut(auth);
      this.user = null;
    },
  },
});
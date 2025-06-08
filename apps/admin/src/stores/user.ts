import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth, db } from '@top-x/shared';
import { signInWithPopup, TwitterAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '@top-x/shared';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);

  onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      user.value = userDoc.exists() ? userDoc.data() as User : null;
    } else {
      user.value = null;
    }
  });

  const login = async () => {
    const provider = new TwitterAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      user.value = userDoc.exists() ? userDoc.data() as User : null;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      user.value = null;
    } catch (err: any) {
      console.error('Logout error:', err);
      throw err;
    }
  };

  return { user, login, logout };
});
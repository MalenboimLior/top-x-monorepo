import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import { auth, db, functions, analytics, trackEvent } from '@top-x/shared';

import { signInWithPopup, TwitterAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable, HttpsCallable } from 'firebase/functions';
import {
  User,
  SubmitGameScoreRequest,
  SubmitGameScoreResponse,
  UserGameDataSubmission,
  DailyChallengeRewardRecord,
  ClaimDailyChallengeRewardsRequest,
  ClaimDailyChallengeRewardsResponse,
} from '@top-x/shared/types/user';
import type { SetGameFavoriteRequest, SetGameFavoriteResponse } from '@top-x/shared/types/favorites';

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
  const dailyChallengeRewards = ref<Array<DailyChallengeRewardRecord & { id: string }>>([]);
  const rewardClock = ref(Date.now());
  const readyDailyChallengeRewards = computed(() => {
    const now = rewardClock.value;
    return dailyChallengeRewards.value.filter((reward) => {
      if (reward.status !== 'pending') {
        return false;
      }
      const revealAtMillis = Date.parse(reward.revealAt);
      return !Number.isNaN(revealAtMillis) && revealAtMillis <= now;
    });
  });
  let rewardClockInterval: number | null = null;

  // Refresh profile from Firestore
  async function refreshProfile() {
    if (!user.value) {
      console.log('[UserStore] Cannot refresh profile: no user logged in');
      return;
    }

    try {
      const userDoc = doc(db, 'users', user.value.uid);
      const snapshot = await getDoc(userDoc);

      if (snapshot.exists()) {
        const newProfile = snapshot.data() as User;
        const oldProfile = profile.value;

        // Log trivia data changes
        const oldTriviaData = oldProfile?.games?.Trivia;
        const newTriviaData = newProfile.games?.Trivia;
        if (oldTriviaData || newTriviaData) {
          console.log('[UserStore] Trivia profile update:', {
            oldKeys: oldTriviaData ? Object.keys(oldTriviaData) : [],
            newKeys: newTriviaData ? Object.keys(newTriviaData) : [],
            sampleGame: newTriviaData ? Object.keys(newTriviaData)[0] : null,
            sampleTriviaKeys: newTriviaData && Object.keys(newTriviaData)[0]
              ? Object.keys(newTriviaData[Object.keys(newTriviaData)[0]]?.custom?.trivia || {})
              : [],
          });
        }

        // Log quiz-related changes
        if (oldProfile) {
          const oldQuizGames = oldProfile.games?.quiz || {};
          const newQuizGames = newProfile.games?.quiz || {};

          Object.keys(newQuizGames).forEach((gameId) => {
            const oldGameData = oldQuizGames[gameId];
            const newGameData = newQuizGames[gameId];

            if (oldGameData?.custom !== newGameData?.custom) {
              console.log('[UserStore] Profile updated - quiz game data changed:', {
                gameId,
                oldCustomKeys: oldGameData?.custom ? Object.keys(oldGameData.custom) : [],
                newCustomKeys: newGameData?.custom ? Object.keys(newGameData.custom) : [],
                oldPersonalityResult: oldGameData?.custom ? (oldGameData.custom as Record<string, unknown>).personalityResult : undefined,
                newPersonalityResult: newGameData?.custom ? (newGameData.custom as Record<string, unknown>).personalityResult : undefined,
                oldArchetypeResult: oldGameData?.custom ? (oldGameData.custom as Record<string, unknown>).archetypeResult : undefined,
                newArchetypeResult: newGameData?.custom ? (newGameData.custom as Record<string, unknown>).archetypeResult : undefined,
                lastPlayed: newGameData?.lastPlayed,
              });
            }
          });
        }

        profile.value = newProfile;

        // Log when profile is updated from Firestore
        console.log('[UserStore] Profile updated from Firestore:', {
          hasTriviaGames: !!newProfile.games?.Trivia,
          triviaGameCount: newProfile.games?.Trivia ? Object.keys(newProfile.games.Trivia).length : 0,
          sampleTriviaKeys: newProfile.games?.Trivia && Object.keys(newProfile.games.Trivia).length > 0
            ? Object.keys(newProfile.games.Trivia[Object.keys(newProfile.games.Trivia)[0]]?.custom?.trivia || {})
            : [],
        });
        console.log('[UserStore] Profile loaded/updated:', {
          uid: newProfile.uid,
          hasGames: !!newProfile.games,
          quizGames: newProfile.games?.quiz ? Object.keys(newProfile.games.quiz) : [],
        });
      } else {
        console.log('[UserStore] No profile found, creating new one');
        if (user.value) {
          // Get Firebase user from auth
          const currentUser = auth.currentUser;
          if (currentUser) {
            await createUserProfile(currentUser);
            // Refresh after creation
            await refreshProfile();
          }
        }
      }
    } catch (err: any) {
      console.error('[UserStore] Firestore error:', err);
      error.value = err.message;
    }
  }

  // Refresh daily challenge rewards from Firestore
  async function refreshDailyChallengeRewards() {
    if (!user.value) {
      console.log('[UserStore] Cannot refresh rewards: no user logged in');
      return;
    }

    try {
      const rewardsRef = collection(db, 'users', user.value.uid, 'dailyChallengeRewards');
      const rewardsQuery = query(rewardsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(rewardsQuery);

      dailyChallengeRewards.value = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as DailyChallengeRewardRecord),
      }));
      rewardClock.value = Date.now();
    } catch (err: any) {
      console.error('Daily challenge rewards fetch error:', err);
      error.value = err.message;
    }
  }

  onAuthStateChanged(auth, async (currentUser) => {
    console.log('onAuthStateChanged triggered:', currentUser?.uid || 'No user');

    if (rewardClockInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(rewardClockInterval);
      rewardClockInterval = null;
    }

    dailyChallengeRewards.value = [];

    if (currentUser) {
      // Sanitize Firebase User object to avoid unsafe properties
      user.value = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL ? currentUser.photoURL.replace('_normal', '_400x400')
          : '/assets/profile.png',
      };

      // Load profile and rewards on login
      await refreshProfile();
      await refreshDailyChallengeRewards();

      if (typeof window !== 'undefined') {
        rewardClockInterval = window.setInterval(() => {
          rewardClock.value = Date.now();
        }, 60 * 1000);
      }
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
        photoURL: result.user.photoURL ? result.user.photoURL.replace('_normal', '_400x400')
          : '/assets/profile.png',
      };
      console.log('Login result.user.photoURL:', result.user.photoURL);

      const credential = TwitterAuthProvider.credentialFromResult(result);
      if (!credential || !credential.accessToken || !credential.secret) {
        throw new Error('Failed to get X credentials');
      }
      const xAccessToken = credential.accessToken;
      const xAccessSecret = credential.secret;

      const userDocRef = doc(db, 'users', result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        await updateDoc(userDocRef, {
          xAccessToken,
          xAccessSecret,
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL
            ? result.user.photoURL.replace('_normal', '_400x400')
            : '/assets/profile.png',
        });
        console.log('Updated user profile with X credentials');
      } else {
        await createUserProfile(result.user, { xAccessToken, xAccessSecret });
      }
      console.log('before syncXUserData:');

      const syncXUserData: HttpsCallable<unknown, unknown> = httpsCallable(functions, 'syncXUserData');
      await syncXUserData().catch((err) => {
        console.error('Error calling syncXUserData:', err);
        throw new Error(`Failed to sync X data: ${err.message}`);
      });
      console.log('Triggered syncXUserData');

      // Refresh profile after sync
      await refreshProfile();

      trackEvent(analytics, 'user_login', { method: 'x_twitter', context: 'user_store' });

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

  async function createUserProfile(user: FirebaseUser, xCredentials?: { xAccessToken: string; xAccessSecret: string }) {
    const userProfile: User = {
      uid: user.uid,
      username: '@Unknown',
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL
        ? user.photoURL.replace('_normal', '_400x400')
        : '/assets/profile.png',
      isAdmin: false,
      followersCount: 0,
      followingCount: 0,
      xAccessToken: xCredentials?.xAccessToken || '',
      xAccessSecret: xCredentials?.xAccessSecret || '',
      frenemies: [],
      addedBy: [],
      games: {},
      badges: [],
      favoriteGames: [],
    };
    try {
      console.log('Attempting to create profile:', userProfile);
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log('Profile created:', userProfile);
      trackEvent(analytics, 'user_sign_up', { method: 'x_twitter' });
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
      console.log('Cannot follow user: no user logged in or same user');
      error.value = 'Cannot follow yourself';
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
        console.error('Target user document does not exist:', frenemyUid);
        error.value = 'User not found';
        return;
      }
      console.log('Target user document state:', frenemyDocSnap.data());
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
        console.log(`Successfully updated user ${frenemyUid} addedBy with ${user.value.uid}`);
        trackEvent(analytics, 'user_action', { action: 'add_frenemy', frenemy_uid: frenemyUid });
      } catch (err: any) {
        console.error('Error updating user addedBy:', {
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
      console.error('Failed to follow user:', {
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
      console.log(`Removed following ${frenemyUid} for user ${user.value.uid}`);
      trackEvent(analytics, 'user_action', { action: 'remove_frenemy', frenemy_uid: frenemyUid });
    } catch (err: any) {
      console.error('Error removing following user:', err);
      error.value = err.message;
    }
  }

  async function updateGameProgress(
    gameTypeId: string,
    gameId: string,
    gameData: UserGameDataSubmission,
    options?: {
      dailyChallengeId?: string
      dailyChallengeDate?: string
      challengeMetadata?: Record<string, unknown>
    }
  ) {
    if (!user.value) {
      console.log('[UserStore] Cannot update game progress: no user logged in');
      error.value = 'No user logged in';
      return;
    }
    try {
      console.log('[UserStore] updateGameProgress called:', {
        gameTypeId,
        gameId,
        hasCustom: !!gameData.custom,
        customKeys: gameData.custom ? Object.keys(gameData.custom) : [],
        personalityResult: gameData.custom ? (gameData.custom as Record<string, unknown>).personalityResult : undefined,
        archetypeResult: gameData.custom ? (gameData.custom as Record<string, unknown>).archetypeResult : undefined,
      });

      const submitGameScore: HttpsCallable<SubmitGameScoreRequest, SubmitGameScoreResponse> = httpsCallable(functions, 'submitGameScore');
      const payload: SubmitGameScoreRequest = {
        gameTypeId,
        gameId,
        gameData,
      };

      if (options?.dailyChallengeId) {
        payload.dailyChallengeId = options.dailyChallengeId;
      }
      if (options?.dailyChallengeDate) {
        payload.dailyChallengeDate = options.dailyChallengeDate;
      }
      if (options?.challengeMetadata) {
        payload.challengeMetadata = options.challengeMetadata;
      }
      if (!options?.dailyChallengeId && (options?.dailyChallengeDate || options?.challengeMetadata)) {
        console.warn('[UserStore] dailyChallengeId is required when providing challenge metadata or date');
      }

      console.log('[UserStore] Sending payload to submitGameScore:', {
        gameTypeId: payload.gameTypeId,
        gameId: payload.gameId,
        hasGameData: !!payload.gameData,
        hasCustom: !!payload.gameData?.custom,
        customKeys: payload.gameData?.custom ? Object.keys(payload.gameData.custom) : [],
      });

      const { data } = await submitGameScore(payload);

      console.log('[UserStore] submitGameScore response:', {
        success: data?.success,
        message: data?.message,
        data,
      });

      if (!data?.success) {
        const message = data?.message || 'Score was not updated';
        console.log('[UserStore] submitGameScore completed without updating score:', { gameTypeId, gameId, message });
        return;
      }

      console.log(`[UserStore] Submitted game progress for ${gameTypeId}/${gameId}`, data);

      // Refresh profile once after successful submission
      await refreshProfile();

      // Log profile state after update
      console.log('[UserStore] Profile state after update:', {
        hasProfile: !!profile.value,
        gameData: profile.value?.games?.[gameTypeId]?.[gameId],
        customKeys: profile.value?.games?.[gameTypeId]?.[gameId]?.custom ? Object.keys(profile.value.games[gameTypeId][gameId].custom as Record<string, unknown>) : [],
      });
    } catch (err: any) {
      console.error('[UserStore] Error updating game progress:', err);
      error.value = err.message;
    }
  }

  function isGameFavorite(gameId: string): boolean {
    return Boolean(profile.value?.favoriteGames?.includes(gameId));
  }

  async function toggleFavorite(gameId: string) {
    if (!user.value) {
      error.value = 'Please log in to manage favorites';
      return;
    }

    try {
      const setFavorite = httpsCallable<SetGameFavoriteRequest, SetGameFavoriteResponse>(functions, 'setGameFavorite');
      const nextFavorite = !isGameFavorite(gameId);
      const { data } = await setFavorite({ gameId, favorite: nextFavorite });

      if (!data?.success) {
        console.warn('toggleFavorite: backend rejected update');
        return;
      }

      const existingFavorites = new Set(profile.value?.favoriteGames ?? []);
      if (nextFavorite) {
        existingFavorites.add(gameId);
      } else {
        existingFavorites.delete(gameId);
      }

      if (profile.value) {
        profile.value = {
          ...profile.value,
          favoriteGames: Array.from(existingFavorites),
        };
      }

      trackEvent(analytics, 'user_action', {
        action: nextFavorite ? 'favorite_game' : 'unfavorite_game',
        game_id: gameId,
      });
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      error.value = err.message;
    }
  }

  async function claimDailyChallengeReward(
    options?: ClaimDailyChallengeRewardsRequest,
  ): Promise<ClaimDailyChallengeRewardsResponse | void> {
    if (!user.value) {
      error.value = 'You need to be logged in to view challenge answers';
      return;
    }

    try {
      const callable = httpsCallable<ClaimDailyChallengeRewardsRequest, ClaimDailyChallengeRewardsResponse>(
        functions,
        'claimDailyChallengeRewards',
      );
      const { data } = await callable(options ?? {});

      // Refresh rewards after claiming
      await refreshDailyChallengeRewards();

      return data;
    } catch (err: any) {
      console.error('Error claiming daily challenge rewards:', err);
      error.value = err.message;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    user,
    profile,
    error,
    dailyChallengeRewards,
    readyDailyChallengeRewards,
    loginWithX,
    logout,
    addFrenemy,
    removeFrenemy,
    updateGameProgress,
    toggleFavorite,
    isGameFavorite,
    claimDailyChallengeReward,
    refreshProfile,
    refreshDailyChallengeRewards,
    clearError,
  };
}, {
  persist: {
    // Only persist user auth data and other non-Firestore data
    // Profile comes from Firestore, so don't persist it
    pick: ['user', 'dailyChallengeRewards', 'readyDailyChallengeRewards']
  }
});
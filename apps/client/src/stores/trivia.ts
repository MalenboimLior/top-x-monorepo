import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useUserStore } from './user';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { getTopLeaderboard } from '@/services/trivia';
import { User } from '@top-x/shared';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctHash: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  group: string;
}

interface TriviaLeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
}

type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
type DifficultyCounts = Record<DifficultyLevel, number>;


export const useTriviaStore = defineStore('trivia', () => {
  const userStore = useUserStore();
  const currentScreen = ref<'start' | 'playing' | 'gameover'>('start');
  const questions = ref<Question[]>([]);
  const currentQuestion = ref<Question | null>(null);
  const lives = ref(3);
  const score = ref(0);
  const bestScore = ref(0);
  const bestStreak = ref(0);
  const selectedAnswer = ref<number | null>(null);
  const isCorrect = ref<boolean | null>(null);
  const timeLeft = ref(10);
  const timerId = ref<number | null>(null);
  const streak = ref(0);
  const sessionBestStreak = ref(0);
  const usedQuestionIds = ref<string[]>([]);
  const difficultyCounts = ref<DifficultyCounts>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const leaderboard = ref<TriviaLeaderboardEntry[]>([]);
  const pendingScore = ref<number | null>(null);
  const pendingStreak = ref<number | null>(null);
  const isLoading = ref(false);
  const inviter = ref<{ uid: string; displayName: string; photoURL: string; score: number } | null>(null);

  const SECRET_KEY = 'your-secret-key-123';

  async function hashAnswer(answerIndex: number): Promise<string> {
    const msgBuffer = new TextEncoder().encode(answerIndex.toString());
    const keyBuffer = new TextEncoder().encode(SECRET_KEY);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const hashBuffer = await crypto.subtle.sign('HMAC', key, msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function fetchLeaderboard() {
    try {
      const topEntries = await getTopLeaderboard('trivia', 10);
      leaderboard.value = topEntries;
      console.log('Leaderboard updated:', leaderboard.value);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }

  async function loadInviter(inviterUid: string, inviterScore: number) {
    try {
      const userDoc = doc(db, 'users', inviterUid);
      const docSnap = await getDoc(userDoc);
      if (docSnap.exists()) {
        const data = docSnap.data() as User;
        inviter.value = {
          uid: inviterUid,
          displayName: data.displayName,
          photoURL: data.photoURL,
          score: inviterScore,
        };
        console.log('Inviter loaded:', inviter.value);
      } else {
        console.log('Inviter not found');
        inviter.value = null;
      }
    } catch (err) {
      console.error('Error loading inviter:', err);
      inviter.value = null;
    }
  }

  watch(
    () => userStore.profile,
    (profile) => {
      if (profile?.games?.trivia) {
        bestScore.value = profile.games.trivia.score || 0;
        bestStreak.value = profile.games.trivia.streak || 0;
        console.log('Profile loaded, bestScore:', bestScore.value, 'bestStreak:', bestStreak.value);
      } else {
        bestScore.value = 0;
        bestStreak.value = 0;
        console.log('No trivia stats in profile, resetting bestScore and bestStreak to 0');
      }
    },
    { immediate: true }
  );

  watch(
    () => streak.value,
    (newStreak) => {
      if (newStreak > sessionBestStreak.value) {
        sessionBestStreak.value = newStreak;
        console.log('New session best streak:', sessionBestStreak.value);
      }
    }
  );

  async function startGame() {
    console.log('Starting game, resetting pendingScore and pendingStreak');
    currentScreen.value = 'playing';
    lives.value = 3;
    score.value = 0;
    streak.value = 0;
    sessionBestStreak.value = 0;
    usedQuestionIds.value = [];
    difficultyCounts.value = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    questions.value = [];
    pendingScore.value = null;
    pendingStreak.value = null;
    currentQuestion.value = null;
    isLoading.value = true;
    await loadNextQuestion();
    isLoading.value = false;
  }

  async function loadNextQuestion() {
    if (questions.value.length === 0) {
      await loadQuestions();
    }
    if (questions.value.length === 0) {
      usedQuestionIds.value = [];
      difficultyCounts.value = { easy: 0, medium: 0, hard: 0 };
      await loadQuestions();
    }
    const index = Math.floor(Math.random() * questions.value.length);
    currentQuestion.value = questions.value[index];
    questions.value.splice(index, 1);
    shuffleArray(currentQuestion.value.options);
    selectedAnswer.value = null;
    isCorrect.value = null;
    startTimer();
  }

  async function loadQuestions() {
    console.log('Loading questions');
    isLoading.value = true;
    const targetCount = 10;
    const desired: DifficultyCounts = { 1: 3, 2: 3, 3: 2, 4: 2, 5: 0 }; // Example: 2 questions from each level
    const newQuestions: Question[] = [];
    console.log('before while');
    while (newQuestions.length < targetCount && usedQuestionIds.value.length < 200) {
      console.log('newQuestions.length:',newQuestions.length);

      const id = Math.floor(Math.random() * 200 + 1).toString();
      if (usedQuestionIds.value.includes(id)) continue;

      const docRef = doc(db, 'questions', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) continue;

      const question = { id, ...docSnap.data() } as Question;
      const diff = question.difficulty as DifficultyLevel;

      if (difficultyCounts.value[diff] < desired[diff]) {
        newQuestions.push(question);
        usedQuestionIds.value.push(id);
        difficultyCounts.value[diff]++;
      }
    }
    console.log('after while');


    shuffleArray(newQuestions);
    questions.value = newQuestions;
    isLoading.value = false;
  }

  async function answerQuestion(selectedIndex: number) {
    stopTimer();
    selectedAnswer.value = selectedIndex;
    const answerHash = await hashAnswer(selectedIndex);
    isCorrect.value = answerHash === currentQuestion.value?.correctHash;
    if (isCorrect.value) {
      score.value += 1;
      streak.value += 1;
    } else {
      lives.value -= 1;
      streak.value = 0;
    }
    setTimeout(async () => {
      if (lives.value > 0) {
        await loadNextQuestion();
      } else {
        currentScreen.value = 'gameover';
        pendingScore.value = score.value;
        pendingStreak.value = sessionBestStreak.value;
        console.log('Game over, pendingScore:', pendingScore.value, 'pendingStreak:', pendingStreak.value);
        if (userStore.user) {
          console.log('User logged in, saving score and streak immediately');
          await updateBestStats();
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchLeaderboard();
        }
      }
    }, 1000);
  }

  function startTimer() {
    timeLeft.value = 10;
    if (timerId.value) clearInterval(timerId.value);
    timerId.value = setInterval(() => {
      timeLeft.value -= 1;
      if (timeLeft.value <= 0) {
        if (timerId.value !== null) {
          clearInterval(timerId.value);
        }
        handleTimeout();
      }
    }, 1000);
  }

  async function handleTimeout() {
    lives.value -= 1;
    selectedAnswer.value = null;
    isCorrect.value = false;
    streak.value = 0;
    setTimeout(async () => {
      if (lives.value > 0) {
        await loadNextQuestion();
      } else {
        stopTimer();
        currentScreen.value = 'gameover';
        pendingScore.value = score.value;
        pendingStreak.value = sessionBestStreak.value;
        console.log('Timeout game over, pendingScore:', pendingScore.value, 'pendingStreak:', pendingStreak.value);
        if (userStore.user) {
          console.log('User logged in, saving score and streak immediately');
          await updateBestStats();
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchLeaderboard();
        }
      }
    }, 1000);
  }

  async function updateBestStats() {
    if (userStore.user) {
      const user = userStore.user;
      const scoreToSave = pendingScore.value !== null ? pendingScore.value : score.value;
      const streakToSave = pendingStreak.value !== null ? pendingStreak.value : sessionBestStreak.value;
      console.log('Updating best stats, scoreToSave:', scoreToSave, 'streakToSave:', streakToSave, 'user:', user.uid);

      const shouldUpdateScore = scoreToSave > bestScore.value || !userStore.profile?.games?.trivia?.score;

      if (shouldUpdateScore || streakToSave > bestStreak.value) {
        bestScore.value = shouldUpdateScore ? scoreToSave : bestScore.value;
        bestStreak.value = streakToSave > bestStreak.value ? streakToSave : bestStreak.value;
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            'games.trivia': { score: bestScore.value, streak: bestStreak.value },
          }).catch(async (err) => {
            if (err.code === 'not-found') {
              console.log('User doc not found, creating new one');
              await setDoc(userDocRef, {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                username: '@Unknown',
                photoURL: user.photoURL || 'https://www.top-x.co/asstes/profile.png',
                followersCount: 0,
                followingCount: 0,
                games: { trivia: { score: bestScore.value, streak: bestStreak.value } },
                rivals: [],
                addedBy: [],
              });
            } else {
              throw err;
            }
          });
          console.log('Best stats saved to Firestore:', { score: bestScore.value, streak: bestStreak.value });
          const updatedDoc = await getDoc(userDocRef);
          console.log('Verified user document after update:', updatedDoc.exists() ? updatedDoc.data() : 'Not found');
          pendingScore.value = null;
          pendingStreak.value = null;
        } catch (err) {
          console.error('Error updating best stats:', err);
        }
      } else {
        console.log('No update needed, scoreToSave:', scoreToSave, 'bestScore:', bestScore.value);
        pendingScore.value = null;
        pendingStreak.value = null;
      }
    } else {
      console.log('No user logged in, cannot update best stats');
    }
  }

  function stopTimer() {
    if (timerId.value) {
      clearInterval(timerId.value);
      timerId.value = null;
    }
  }

  function resetGame() {
    console.log('Resetting game, clearing pendingScore and pendingStreak');
    stopTimer();
    currentScreen.value = 'start';
    streak.value = 0;
    sessionBestStreak.value = 0;
    questions.value = [];
    usedQuestionIds.value = [];
    difficultyCounts.value = { easy: 0, medium: 0, hard: 0 };
    pendingScore.value = null;
    pendingStreak.value = null;
    currentQuestion.value = null;
    inviter.value = null;
  }

  function shareScore() {
    if (!userStore.user) {
      console.log('User not logged in, prompting login');
      userStore.loginWithX();
      return;
    }
    const text = `I scored ${score.value} in the Trivia Game on TOP-X! Can you beat me?`;
    const url = `https://top-x.co/games/trivia?inviterUid=${userStore.user.uid}&gameId=trivia&score=${score.value}`;
    const shareText = `${text} ${url}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(tweetUrl, '_blank');
    console.log('Sharing score on X:', score.value, 'streak:', sessionBestStreak.value, 'url:', url);
  }

  async function saveScoreAfterLogin() {
    console.log('Attempting to save score after login, pendingScore:', pendingScore.value, 'pendingStreak:', pendingStreak.value);
    if (userStore.user && pendingScore.value !== null) {
      console.log('User logged in:', userStore.user.uid);
      await updateBestStats();
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchLeaderboard();
    } else {
      console.log('No user or no pending stats to save');
    }
  }

  function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  return {
    currentScreen,
    questions,
    currentQuestion,
    lives,
    score,
    bestScore,
    bestStreak,
    selectedAnswer,
    isCorrect,
    timeLeft,
    streak,
    sessionBestStreak,
    leaderboard,
    isLoading,
    inviter,
    startGame,
    loadNextQuestion,
    answerQuestion,
    resetGame,
    shareScore,
    saveScoreAfterLogin,
    hashAnswer,
    loadInviter,
  };
});
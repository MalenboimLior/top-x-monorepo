const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('node:path');

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const deepMerge = (target, source) => {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null
      && typeof value === 'object'
      && !Array.isArray(value)
      && typeof result[key] === 'object'
      && result[key] !== null
      && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
      continue;
    }

    result[key] = clone(value);
  }

  return result;
};

class FakeDocumentSnapshot {
  constructor(path, storedValue) {
    this.path = path;
    this.storedValue = storedValue;
  }

  get exists() {
    return this.storedValue !== undefined;
  }

  data() {
    if (!this.exists) {
      throw new Error(`Document at ${this.path} does not exist`);
    }

    return clone(this.storedValue);
  }
}

class FakeCollectionRef {
  constructor(firestore, pathValue) {
    this.firestore = firestore;
    this.path = pathValue;
  }

  doc(id) {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }
}

class FakeDocRef {
  constructor(firestore, pathValue) {
    this.firestore = firestore;
    this.path = pathValue;
    const segments = pathValue.split('/');
    this.id = segments[segments.length - 1];
  }

  collection(id) {
    return new FakeCollectionRef(this.firestore, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  constructor(firestore) {
    this.firestore = firestore;
  }

  async get(docRef) {
    return this.firestore._getSnapshot(docRef.path);
  }

  set(docRef, data, options) {
    this.firestore._set(docRef.path, data, Boolean(options && options.merge));
    return this;
  }

  update(docRef, data) {
    if (!this.firestore._has(docRef.path)) {
      throw new Error(`Document at ${docRef.path} does not exist`);
    }

    this.firestore._set(docRef.path, data, true);
    return this;
  }
}

class FakeFirestore {
  constructor(initialData = {}) {
    this.documents = new Map();

    for (const [pathValue, value] of Object.entries(initialData)) {
      this.documents.set(pathValue, clone(value));
    }
  }

  collection(id) {
    return new FakeCollectionRef(this, id);
  }

  doc(pathValue) {
    return new FakeDocRef(this, pathValue);
  }

  async runTransaction(updateFunction) {
    const transaction = new FakeTransaction(this);
    return updateFunction(transaction);
  }

  _getSnapshot(pathValue) {
    return new FakeDocumentSnapshot(
      pathValue,
      this.documents.has(pathValue) ? clone(this.documents.get(pathValue)) : undefined,
    );
  }

  _set(pathValue, data, merge) {
    if (merge) {
      const previous = this.documents.has(pathValue) ? this.documents.get(pathValue) : {};
      this.documents.set(pathValue, deepMerge(previous, data));
      return;
    }

    this.documents.set(pathValue, clone(data));
  }

  _has(pathValue) {
    return this.documents.has(pathValue);
  }

  getDocument(pathValue) {
    if (!this.documents.has(pathValue)) {
      return undefined;
    }

    return clone(this.documents.get(pathValue));
  }
}

const defaultEvaluateResult = { normalizedAnswer: '', distance: 0, isMatch: false };

const createSubmitGameScore = (initialData, evaluateResponses = []) => {
  const responses = Array.isArray(evaluateResponses) ? [...evaluateResponses] : [];
  const firestore = new FakeFirestore(initialData);
  const adminApps = [];

  const firestoreFn = () => firestore;
  firestoreFn.FieldValue = {
    arrayUnion: (...values) => ({ arrayUnion: values }),
    arrayRemove: (...values) => ({ arrayRemove: values }),
    increment: (amount) => ({ increment: amount }),
  };

  const mockAdmin = {
    get apps() {
      return adminApps;
    },
    initializeApp: () => {
      adminApps.push({});
      return {};
    },
    firestore: firestoreFn,
  };

  const counterManagerStub = {
    GAME_COUNTER_KEYS: {
      TOTAL_PLAYERS: 'totalPlayers',
      FAVORITES: 'favorites',
      SESSIONS_PLAYED: 'sessionsPlayed',
      UNIQUE_SUBMITTERS: 'uniqueSubmitters',
      UPDATED_AT: 'updatedAt',
    },
    GAME_COUNTER_EVENT_MAP: {},
    applyGameCounterUpdates: () => {},
    applyChallengeCounterUpdates: (params) => params.counterState || {},
  };

  const originalLoad = Module._load;

  Module._load = (request, parent, isMain) => {
    if (request === 'firebase-admin') {
      return mockAdmin;
    }

    if (request === 'firebase-functions/v2') {
      class MockHttpsError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      }

      return {
        https: {
          HttpsError: MockHttpsError,
          onCall: (handler) => handler,
          onRequest: (handler) => handler,
        },
      };
    }

    if (request === '@top-x/shared/utils/zoneRevealAnswer') {
      return {
        evaluateZoneRevealAnswer: (...args) => {
          if (responses.length === 0) {
            return defaultEvaluateResult;
          }

          const next = responses.shift();
          return typeof next === 'function' ? next(...args) : next;
        },
      };
    }

    if (request.endsWith('/utils/counterManager') || request === './utils/counterManager') {
      return counterManagerStub;
    }

    return originalLoad(request, parent, isMain);
  };

  const indexPath = path.resolve(__dirname, '../../lib/index.js');
  const firebaseAdminPath = path.resolve(__dirname, '../../lib/utils/firebaseAdmin.js');
  const counterManagerPath = path.resolve(__dirname, '../../lib/utils/counterManager.js');

  delete require.cache[indexPath];
  if (require.cache[firebaseAdminPath]) {
    delete require.cache[firebaseAdminPath];
  }
  if (require.cache[counterManagerPath]) {
    delete require.cache[counterManagerPath];
  }

  const { submitGameScore } = require(indexPath);

  Module._load = originalLoad;

  return { submitGameScore, firestore };
};

const baseUser = {
  uid: 'user-123',
  username: 'topx-user',
  displayName: 'TopX Player',
  email: 'player@example.com',
  followersCount: 0,
  followingCount: 0,
  frenemies: [],
  addedBy: [],
  games: {},
  badges: [],
};

const baseGame = { vip: [] };

const challengeId = 'challenge-2024-01-01';
const challengeDate = '2024-01-01';
const gameId = 'zone-reveal-game';
const gameTypeId = 'ZoneReveal';

const userPath = `users/${baseUser.uid}`;
const gamePath = `games/${gameId}`;
const challengePath = `${gamePath}/daily_challenges/${challengeId}`;
const challengeLeaderboardPath = `${challengePath}/leaderboard/${baseUser.uid}`;

test('increments aggregated score and streak for the first correct attempt', async () => {
  const { submitGameScore, firestore } = createSubmitGameScore({
    [userPath]: clone(baseUser),
    [gamePath]: clone(baseGame),
    [challengePath]: {
      date: challengeDate,
      custom: { answer: 'correct-answer' },
    },
  }, [
    () => ({ normalizedAnswer: 'correct-answer', distance: 0, isMatch: true }),
  ]);

  const response = await submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 123,
        streak: 0,
        lastPlayed: Date.now(),
        custom: { answer: 'correct-answer' },
      },
      dailyChallengeId: challengeId,
      dailyChallengeDate: challengeDate,
      isDailyChallenge: true,
    },
  });

  assert.equal(response.success, true);
  assert.equal(response.aggregatedScore, 1);
  assert.equal(response.aggregatedStreak, 1);

  const userDoc = firestore.getDocument(userPath);
  assert.ok(userDoc);
  const userGame = userDoc.games[gameTypeId][gameId];
  assert.equal(userGame.score, 1);
  assert.equal(userGame.streak, 1);

  const leaderboardDoc = firestore.getDocument(challengeLeaderboardPath);
  assert.ok(leaderboardDoc);
  assert.equal(leaderboardDoc.score, 123);
  assert.equal(leaderboardDoc.streak, 1);
});

test('keeps aggregated score and streak unchanged for repeated correct attempts', async () => {
  const priorTimestamp = new Date('2024-01-01T05:00:00Z').toISOString();
  const { submitGameScore, firestore } = createSubmitGameScore({
    [userPath]: {
      ...clone(baseUser),
      games: {
        [gameTypeId]: {
          [gameId]: {
            score: 1,
            streak: 1,
            lastPlayed: Date.now(),
            custom: {
              dailyChallenges: {
                [challengeId]: {
                  played: true,
                  solved: true,
                  bestScore: 150,
                  firstPlayedAt: priorTimestamp,
                  lastPlayedAt: priorTimestamp,
                  solvedAt: priorTimestamp,
                  bestScoreAt: priorTimestamp,
                  attemptCount: 1,
                  counters: {},
                },
              },
            },
          },
        },
      },
    },
    [gamePath]: clone(baseGame),
    [challengePath]: {
      date: challengeDate,
      custom: { answer: 'correct-answer' },
    },
  }, [
    () => ({ normalizedAnswer: 'correct-answer', distance: 0, isMatch: true }),
  ]);

  const response = await submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 200,
        streak: 1,
        lastPlayed: Date.now(),
        custom: { answer: 'correct-answer' },
      },
      dailyChallengeId: challengeId,
      dailyChallengeDate: challengeDate,
      isDailyChallenge: true,
    },
  });

  assert.equal(response.success, true);
  assert.equal(response.aggregatedScore, 1);
  assert.equal(response.aggregatedStreak, 1);

  const userDoc = firestore.getDocument(userPath);
  assert.ok(userDoc);
  const userGame = userDoc.games[gameTypeId][gameId];
  assert.equal(userGame.score, 1);
  assert.equal(userGame.streak, 1);

  const progress = userGame.custom.dailyChallenges[challengeId];
  assert.equal(progress.attemptCount, 2);
  assert.equal(progress.solved, true);
  assert.equal(progress.bestScore, 200);

  const leaderboardDoc = firestore.getDocument(challengeLeaderboardPath);
  assert.ok(leaderboardDoc);
  assert.equal(leaderboardDoc.score, 200);
  assert.equal(leaderboardDoc.streak, 1);
});

test('increments aggregated score only after a correct attempt following an incorrect one', async () => {
  const { submitGameScore, firestore } = createSubmitGameScore({
    [userPath]: clone(baseUser),
    [gamePath]: clone(baseGame),
    [challengePath]: {
      date: challengeDate,
      custom: { answer: 'correct-answer' },
    },
  }, [
    () => ({ normalizedAnswer: 'wrong', distance: 10, isMatch: false }),
    () => ({ normalizedAnswer: 'correct-answer', distance: 0, isMatch: true }),
  ]);

  const incorrectResponse = await submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 90,
        streak: 0,
        lastPlayed: Date.now(),
        custom: { answer: 'wrong' },
      },
      dailyChallengeId: challengeId,
      dailyChallengeDate: challengeDate,
      isDailyChallenge: true,
    },
  });

  assert.equal(incorrectResponse.success, true);
  assert.equal(incorrectResponse.aggregatedScore, 0);
  assert.equal(incorrectResponse.aggregatedStreak, 1);

  const afterIncorrectUserDoc = firestore.getDocument(userPath);
  assert.ok(afterIncorrectUserDoc);
  const afterIncorrectGame = afterIncorrectUserDoc.games[gameTypeId][gameId];
  assert.equal(afterIncorrectGame.score, 0);
  assert.equal(afterIncorrectGame.streak, 1);

  const incorrectProgress = afterIncorrectGame.custom.dailyChallenges[challengeId];
  assert.equal(incorrectProgress.attemptCount, 1);
  assert.equal(incorrectProgress.solved, false);

  const incorrectLeaderboardDoc = firestore.getDocument(challengeLeaderboardPath);
  assert.ok(incorrectLeaderboardDoc);
  assert.equal(incorrectLeaderboardDoc.score, 90);
  assert.equal(incorrectLeaderboardDoc.streak, 1);

  const correctResponse = await submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 140,
        streak: 1,
        lastPlayed: Date.now(),
        custom: { answer: 'correct-answer' },
      },
      dailyChallengeId: challengeId,
      dailyChallengeDate: challengeDate,
      isDailyChallenge: true,
    },
  });

  assert.equal(correctResponse.success, true);
  assert.equal(correctResponse.aggregatedScore, 1);
  assert.equal(correctResponse.aggregatedStreak, 1);

  const finalUserDoc = firestore.getDocument(userPath);
  assert.ok(finalUserDoc);
  const finalGame = finalUserDoc.games[gameTypeId][gameId];
  assert.equal(finalGame.score, 1);
  assert.equal(finalGame.streak, 1);

  const finalProgress = finalGame.custom.dailyChallenges[challengeId];
  assert.equal(finalProgress.attemptCount, 2);
  assert.equal(finalProgress.solved, true);

  const finalLeaderboardDoc = firestore.getDocument(challengeLeaderboardPath);
  assert.ok(finalLeaderboardDoc);
  assert.equal(finalLeaderboardDoc.score, 140);
  assert.equal(finalLeaderboardDoc.streak, 1);
});


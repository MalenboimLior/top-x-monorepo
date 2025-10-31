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
    this.writeCounts = new Map();

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
    const previous = this.documents.has(pathValue) ? this.documents.get(pathValue) : {};

    if (merge && this.documents.has(pathValue)) {
      this.documents.set(pathValue, deepMerge(previous, data));
    } else if (merge) {
      this.documents.set(pathValue, clone(data));
    } else {
      this.documents.set(pathValue, clone(data));
    }

    const currentCount = this.writeCounts.get(pathValue) ?? 0;
    this.writeCounts.set(pathValue, currentCount + 1);
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

  getWriteCount(pathValue) {
    return this.writeCounts.get(pathValue) ?? 0;
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

    if (request.endsWith('/utils/firebaseAdmin') || request === './utils/firebaseAdmin') {
      return { admin: mockAdmin };
    }

    if (request.endsWith('/external/xApi') || request === './external/xApi') {
      return { postOnX: () => Promise.resolve({ success: true }) };
    }

    return originalLoad(request, parent, isMain);
  };

  const indexPath = path.resolve(__dirname, '../../../lib/index.js');
  const firebaseAdminPath = path.resolve(__dirname, '../../../lib/utils/firebaseAdmin.js');
  const counterManagerPath = path.resolve(__dirname, '../../../lib/utils/counterManager.js');

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
const gameId = 'zone-reveal-game';
const gameTypeId = 'ZoneReveal';

const userPath = `users/${baseUser.uid}`;
const gamePath = `games/${gameId}`;
const leaderboardPath = `${gamePath}/leaderboard/${baseUser.uid}`;
const challengePath = `${gamePath}/daily_challenges/${challengeId}`;
const challengeLeaderboardPath = `${challengePath}/leaderboard/${baseUser.uid}`;

const getWriteDelta = (firestore, pathValue, callback) => {
  const before = firestore.getWriteCount(pathValue);
  return callback().then((result) => {
    const after = firestore.getWriteCount(pathValue);
    return { result, writes: after - before };
  });
};

test('records non-challenge submissions without aggregated fields and writes leaderboard once', async () => {
  const { submitGameScore, firestore } = createSubmitGameScore({
    [userPath]: clone(baseUser),
    [gamePath]: clone(baseGame),
  }, [
    () => ({ normalizedAnswer: 'correct-answer', distance: 0, isMatch: true }),
  ]);

  const { result: response, writes } = await getWriteDelta(firestore, leaderboardPath, () => submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 150,
        streak: 1,
        lastPlayed: Date.now(),
        custom: { answer: 'correct-answer' },
      },
    },
  }));

  assert.equal(response.success, true);
  assert.equal(response.previousScore, null);
  assert.equal(response.newScore, 150);
  assert.equal(response.challengeBestScore, undefined);
  assert.equal('aggregatedScore' in response, false);
  assert.equal('aggregatedStreak' in response, false);

  const userDoc = firestore.getDocument(userPath);
  assert.ok(userDoc);
  const storedGame = userDoc.games[gameTypeId][gameId];
  assert.equal(storedGame.score, 150);
  assert.equal(storedGame.streak, 1);

  const leaderboardDoc = firestore.getDocument(leaderboardPath);
  assert.ok(leaderboardDoc);
  assert.equal(leaderboardDoc.score, 150);
  assert.equal(leaderboardDoc.streak, 1);
  assert.equal('aggregatedScore' in leaderboardDoc, false);
  assert.equal('aggregatedStreak' in leaderboardDoc, false);
  assert.equal(writes, 1);
});

test('merges challenge submissions without aggregated fields and persists best score once', async () => {
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
            dailyChallenges: {
              [challengeId]: {
                score: 150,
                streak: 1,
                lastPlayed: Date.now(),
                custom: {
                  dailyChallengeProgress: {
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
            custom: {},
          },
        },
      },
    },
    [gamePath]: clone(baseGame),
    [challengePath]: {
      date: '2024-01-01',
      custom: { answer: 'correct-answer' },
    },
  }, [
    () => ({ normalizedAnswer: 'correct-answer', distance: 0, isMatch: true }),
  ]);

  const { result: response, writes } = await getWriteDelta(firestore, challengeLeaderboardPath, () => submitGameScore({
    auth: { uid: baseUser.uid },
    data: {
      gameTypeId,
      gameId,
      gameData: {
        score: 200,
        streak: 2,
        lastPlayed: Date.now(),
        custom: { answer: 'correct-answer' },
      },
      dailyChallengeId: challengeId,
    },
  }));

  assert.equal(response.success, true);
  assert.equal(response.previousScore, 1);
  assert.equal(response.newScore, 200);
  assert.equal(response.challengeBestScore, 200);
  assert.equal('aggregatedScore' in response, false);
  assert.equal('aggregatedStreak' in response, false);
  assert.equal(response.dailyChallengeId, challengeId);
  assert.equal(typeof response.dailyChallengeDate, 'string');

  const userDoc = firestore.getDocument(userPath);
  assert.ok(userDoc);
  const storedGame = userDoc.games[gameTypeId][gameId];
  assert.equal(storedGame.score, 200);
  assert.equal(storedGame.streak, 2);
  const challengeGameData = storedGame.dailyChallenges[challengeId];
  assert.equal(challengeGameData.score, 200);
  const challengeProgress = challengeGameData.custom.dailyChallengeProgress;
  assert.equal(challengeProgress.bestScore, 200);
  assert.equal(challengeProgress.attemptCount, 2);

  const leaderboardDoc = firestore.getDocument(challengeLeaderboardPath);
  assert.ok(leaderboardDoc);
  assert.equal(leaderboardDoc.score, 200);
  assert.equal(leaderboardDoc.challengeId, challengeId);
  assert.equal('aggregatedScore' in leaderboardDoc, false);
  assert.equal('aggregatedStreak' in leaderboardDoc, false);
  assert.equal(writes, 1);
});

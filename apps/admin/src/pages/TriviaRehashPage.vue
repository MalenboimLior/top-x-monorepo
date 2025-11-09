<template>
  <div class="rehash-page">
    <section class="box">
      <div class="header">
        <div>
          <h2 class="title is-4">Rehash Trivia Questions</h2>
          <p class="subtitle is-6">
            Recompute answer hashes with the current secret and push updates to the selected game configuration. Use this after rotating
            <code>VITE_TRIVIA_HASH_SECRET</code>.
          </p>
        </div>
        <span v-if="!secretAvailable" class="tag is-danger is-light">Hash secret missing</span>
      </div>

      <div class="field">
        <label class="label" for="rehash-game-id">Game ID</label>
        <div class="control">
          <input
            id="rehash-game-id"
            v-model="gameId"
            class="input"
            type="text"
            placeholder="smartest_on_x"
            :disabled="loading || isRehashing"
            @keyup.enter="handleLoad"
          />
        </div>
        <p class="help">Enter the Firestore document ID under <code>games</code>.</p>
      </div>

      <div class="buttons">
        <button
          class="button is-info"
          type="button"
          :disabled="!canLoad"
          :class="{ 'is-loading': loading }"
          @click="handleLoad"
        >
          Load game
        </button>
        <button
          class="button is-primary"
          type="button"
          :disabled="!canRehash"
          :class="{ 'is-loading': isRehashing }"
          @click="rehashAll"
        >
          Rehash &amp; save
        </button>
      </div>
    </section>

    <section v-if="summary" class="box">
      <h3 class="title is-5">Current status</h3>

      <div class="summary-grid">
        <div class="summary-tile">
          <span class="summary-label">Total questions</span>
          <span class="summary-value">{{ summary.totalQuestions }}</span>
        </div>
        <div class="summary-tile">
          <span class="summary-label">Hashed</span>
          <span class="summary-value">{{ summary.hashedCount }}</span>
        </div>
        <div class="summary-tile">
          <span class="summary-label">Missing hash</span>
          <span class="summary-value has-text-warning">{{ summary.missingHashes.length }}</span>
        </div>
        <div class="summary-tile">
          <span class="summary-label">Missing correct answer</span>
          <span class="summary-value has-text-danger">{{ summary.missingCorrectAnswers.length }}</span>
        </div>
        <div class="summary-tile">
          <span class="summary-label">Pool docs</span>
          <span class="summary-value">{{ summary.subcollectionCount }}</span>
        </div>
      </div>

      <div v-if="summary.missingHashes.length" class="list-section">
        <h4 class="title is-6">Questions lacking hash/salt</h4>
        <div class="tags">
          <span v-for="id in summary.missingHashes" :key="`hash-${id}`" class="tag is-warning is-light">{{ id }}</span>
        </div>
      </div>

      <div v-if="summary.missingCorrectAnswers.length" class="list-section">
        <h4 class="title is-6">Questions missing correct answers</h4>
        <div class="tags">
          <span v-for="id in summary.missingCorrectAnswers" :key="`correct-${id}`" class="tag is-danger is-light">{{ id }}</span>
        </div>
        <p class="help is-danger">
          Rehashing skips these entries. Update their answers in the game editor before attempting again.
        </p>
      </div>
    </section>

    <section v-if="results" class="box">
      <h3 class="title is-5">Latest run</h3>
      <p>
        Updated <strong>{{ results.updatedCount }}</strong> question hashes,
        skipped <strong>{{ results.skippedCount }}</strong>.
      </p>
      <p v-if="results.subcollectionUpdated > 0">
        Synced <strong>{{ results.subcollectionUpdated }}</strong> documents in the <code>games/&lt;id&gt;/questions</code> collection.
      </p>
      <p class="is-size-7 has-text-grey">
        Completed {{ results.completedAt }}
      </p>
    </section>

    <section v-if="warnings.length || errors.length" class="box messages">
      <h3 class="title is-5">Messages</h3>
      <article v-for="(message, index) in warnings" :key="`warn-${index}`" class="message is-warning">
        <div class="message-body">{{ message }}</div>
      </article>
      <article v-for="(message, index) in errors" :key="`error-${index}`" class="message is-danger">
        <div class="message-body">{{ message }}</div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { collection, doc, getDoc, getDocs, updateDoc, writeBatch, type DocumentReference } from 'firebase/firestore';
import type { Game } from '@top-x/shared/types/game';
import type { TriviaConfig, TriviaQuestion } from '@top-x/shared/types/trivia';
import { db } from '@top-x/shared';
import { computeAnswerHash, ensureSalt, hasHashSecret } from '@/utils/triviaHash';

interface LoadedSubQuestion {
  id: string;
  ref: DocumentReference;
  data: TriviaQuestion;
}

interface LoadedData {
  gameId: string;
  gameRef: DocumentReference;
  config: TriviaConfig;
  questions: TriviaQuestion[];
  correctAnswers: Record<string, string>;
  subQuestions: LoadedSubQuestion[];
}

interface LoadedSummary {
  totalQuestions: number;
  hashedCount: number;
  missingHashes: string[];
  missingCorrectAnswers: string[];
  subcollectionCount: number;
}

interface RehashResult {
  updatedCount: number;
  skippedCount: number;
  subcollectionUpdated: number;
  completedAt: string;
}

interface ResolveResult {
  value: string | null;
  issue?: string;
  source: 'map' | 'question' | null;
}

const gameId = ref('');
const loading = ref(false);
const isRehashing = ref(false);
const warnings = ref<string[]>([]);
const errors = ref<string[]>([]);
const summary = ref<LoadedSummary | null>(null);
const results = ref<RehashResult | null>(null);
const secretAvailable = hasHashSecret();

const loadedData = ref<LoadedData | null>(null);

const canLoad = computed(() => !loading.value && !isRehashing.value && gameId.value.trim().length > 0);
const canRehash = computed(() => secretAvailable && loadedData.value !== null && !isRehashing.value);

function clearMessages() {
  warnings.value = [];
  errors.value = [];
}

async function handleLoad(): Promise<void> {
  if (!canLoad.value) {
    return;
  }
  await loadConfiguration();
}

async function loadConfiguration(): Promise<void> {
  const trimmedId = gameId.value.trim();
  if (!trimmedId) {
    errors.value = ['Enter a valid game ID.'];
    return;
  }

  clearMessages();
  results.value = null;
  loading.value = true;

  try {
    const gameRef = doc(db, 'games', trimmedId);
    const snapshot = await getDoc(gameRef);
    if (!snapshot.exists()) {
      errors.value = [`Game document "${trimmedId}" was not found.`];
      summary.value = null;
      loadedData.value = null;
      return;
    }

    const gameData = snapshot.data() as Game | undefined;
    const config = (gameData?.custom ?? null) as TriviaConfig | null;
    if (!config || !Array.isArray(config.questions)) {
      errors.value = ['The selected game does not contain a Trivia configuration with embedded questions.'];
      summary.value = null;
      loadedData.value = null;
      return;
    }

    const questions = config.questions ?? [];
    const correctAnswers = { ...(config.correctAnswers ?? {}) };

    const subcollectionRef = collection(db, 'games', trimmedId, 'questions');
    const subcollectionSnapshot = await getDocs(subcollectionRef);
    const subQuestions: LoadedSubQuestion[] = subcollectionSnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ref: docSnapshot.ref,
      data: docSnapshot.data() as TriviaQuestion,
    }));

    const loaded: LoadedData = {
      gameId: trimmedId,
      gameRef,
      config,
      questions: questions.map((question) => ({ ...question })),
      correctAnswers,
      subQuestions,
    };

    loadedData.value = loaded;
    summary.value = buildSummary(loaded);
  } catch (error) {
    console.error('[TriviaRehash] Failed to load configuration', error);
    errors.value = ['Failed to load configuration. Check console for details.'];
    summary.value = null;
    loadedData.value = null;
  } finally {
    loading.value = false;
  }
}

function buildSummary(loaded: LoadedData): LoadedSummary {
  const missingHashes: string[] = [];
  const missingCorrect: string[] = [];

  let hashedCount = 0;

  loaded.questions.forEach((question) => {
    if (question.hash && question.salt) {
      hashedCount += 1;
    } else {
      missingHashes.push(question.id);
    }

    const resolution = resolveCorrectAnswer(question, loaded.correctAnswers);
    if (!resolution.value) {
      missingCorrect.push(question.id);
    }
  });

  return {
    totalQuestions: loaded.questions.length,
    hashedCount,
    missingHashes,
    missingCorrectAnswers: missingCorrect,
    subcollectionCount: loaded.subQuestions.length,
  };
}

function resolveCorrectAnswer(question: TriviaQuestion, correctAnswers: Record<string, string>): ResolveResult {
  const answers = question.answers ?? [];
  const normalizedOptions = new Set(
    answers
      .map((answer) => answer.text?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  const mapped = correctAnswers[question.id]?.trim();
  if (mapped) {
    if (normalizedOptions.has(mapped)) {
      return { value: mapped, source: 'map' };
    }
    return {
      value: null,
      issue: `Correct answer "${mapped}" for ${question.id} does not match any answer option.`,
      source: null,
    };
  }

  const embedded = question.correctAnswer?.trim();
  if (embedded && normalizedOptions.has(embedded)) {
    return { value: embedded, source: 'question' };
  }

  return {
    value: null,
    issue: `No correct answer recorded for ${question.id}.`,
    source: null,
  };
}

async function rehashAll(): Promise<void> {
  if (!loadedData.value || isRehashing.value) {
    return;
  }

  if (!secretAvailable) {
    errors.value = ['VITE_TRIVIA_HASH_SECRET is not configured. Update your environment before rehashing.'];
    return;
  }

  clearMessages();
  isRehashing.value = true;

  const loaded = loadedData.value;
  const updates: Record<string, { hash: string; salt: string; correctAnswer: string }> = {};
  let updatedCount = 0;
  let skippedCount = 0;

  for (const question of loaded.questions) {
    const resolution = resolveCorrectAnswer(question, loaded.correctAnswers);
    if (resolution.issue) {
      warnings.value.push(resolution.issue);
    }

    if (!resolution.value) {
      skippedCount += 1;
      continue;
    }

    const salt = ensureSalt(question.salt);
    try {
      const hash = await computeAnswerHash(question.id, resolution.value, salt);
      updates[question.id] = { hash, salt, correctAnswer: resolution.value };
      updatedCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.error('[TriviaRehash] Failed hashing question', question.id, error);
      errors.value.push(`Failed to hash question ${question.id}. Aborting.`);
      break;
    }
  }

  if (errors.value.length > 0) {
    isRehashing.value = false;
    return;
  }

  if (updatedCount === 0) {
    warnings.value.push('No questions were eligible for hashing. Resolve the warnings above and try again.');
    isRehashing.value = false;
    return;
  }

  try {
    const updatedQuestions = loaded.questions.map((question) => {
      const update = updates[question.id];
      if (!update) {
        return question;
      }

      const nextQuestion: TriviaQuestion = {
        ...question,
        salt: update.salt,
        hash: update.hash,
      };

      delete (nextQuestion as Record<string, unknown>).correctAnswer;
      return nextQuestion;
    });

    const nextCorrectAnswers = { ...loaded.correctAnswers };
    for (const [questionId, update] of Object.entries(updates)) {
      nextCorrectAnswers[questionId] = update.correctAnswer;
    }

    await updateDoc(loaded.gameRef, {
      'custom.questions': updatedQuestions,
      'custom.correctAnswers': nextCorrectAnswers,
    });

    let subcollectionUpdated = 0;
    if (loaded.subQuestions.length > 0) {
      const batch = writeBatch(db);
      loaded.subQuestions.forEach((entry) => {
        const update = updates[entry.id];
        if (!update) {
          return;
        }
        batch.set(
          entry.ref,
          {
            hash: update.hash,
            salt: update.salt,
            correctAnswer: update.correctAnswer,
          },
          { merge: true },
        );
        subcollectionUpdated += 1;
      });

      if (subcollectionUpdated > 0) {
        await batch.commit();
      }
    }

    // Update in-memory snapshot for subsequent runs
    loaded.questions = updatedQuestions;
    loaded.correctAnswers = nextCorrectAnswers;
    summary.value = buildSummary(loaded);

    results.value = {
      updatedCount,
      skippedCount,
      subcollectionUpdated,
      completedAt: new Date().toLocaleString(),
    };
  } catch (error) {
    console.error('[TriviaRehash] Failed to persist updates', error);
    errors.value.push('Failed to persist updated hashes. No changes were saved.');
  } finally {
    isRehashing.value = false;
  }
}
</script>

<style scoped>
.rehash-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.summary-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-bottom: 1rem;
}

.summary-tile {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.summary-label {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
}

.list-section .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.messages .message + .message {
  margin-top: 0.75rem;
}
</style>


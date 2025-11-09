<template>
  <div class="add-trivia">
    <h3 class="title is-4">Trivia Configuration</h3>

    <section class="config-section box">
      <h4 class="subtitle is-5">Session Settings</h4>
      <div class="columns is-multiline">
        <div class="column is-half">
          <label class="label">Mode</label>
          <div class="select is-fullwidth">
            <select v-model="config.mode">
              <option value="fixed">Fixed</option>
              <option value="endless">Endless</option>
            </select>
          </div>
        </div>

        <div class="column is-half">
          <label class="label">Language</label>
          <input class="input" v-model="config.language" placeholder="en" />
        </div>

        <div v-if="config.mode === 'fixed'" class="column is-half">
          <label class="label">Unlimited Lives</label>
          <label class="checkbox">
            <input type="checkbox" v-model="config.unlimitedLives" />
            No lives limit, no timer
          </label>
        </div>

        <div class="column is-half">
          <label class="label">Batch Size</label>
          <input class="input" type="number" v-model.number="config.questionBatchSize" min="1" />
        </div>

        <div class="column is-half">
          <label class="label">Lives</label>
          <input class="input" type="number" v-model.number="config.lives" min="0" />
        </div>

        <div v-if="config.mode === 'endless'" class="column is-half">
          <label class="label">Allow Repeats</label>
          <label class="checkbox">
            <input type="checkbox" v-model="config.allowRepeats" />
            Reuse questions when pool is exhausted
          </label>
        </div>

        <div class="column is-half">
          <label class="label">Solve Threshold</label>
          <input class="input" type="number" step="0.01" min="0" max="1" v-model.number="config.solveThreshold" />
        </div>

        <div class="column is-half">
          <label class="label">Show Correct Answers</label>
          <label class="checkbox">
            <input type="checkbox" v-model="config.showCorrectAnswers" />
            Reveal answers after each question
          </label>
        </div>

        <div class="column is-half">
          <label class="label">Show Correct Answers On End</label>
          <label class="checkbox">
            <input type="checkbox" v-model="config.showCorrectAnswersOnEnd" />
            Display full answer summary on end screen
          </label>
        </div>
      </div>
    </section>

    <section class="config-section box">
      <h4 class="subtitle is-5">Global Timer</h4>
      <label class="checkbox">
        <input type="checkbox" v-model="config.globalTimer.enabled" />
        Enable global timer
      </label>
      <div class="columns" v-if="config.globalTimer.enabled">
        <div class="column is-half">
          <label class="label">Duration (seconds)</label>
          <input class="input" type="number" min="0" v-model.number="config.globalTimer.durationSeconds" />
        </div>
      </div>
    </section>

    <section class="config-section box">
      <h4 class="subtitle is-5">Power-Ups</h4>
      <div v-if="config.powerUps.length === 0" class="has-text-grey">No power-ups configured.</div>
      <div v-for="(powerUp, index) in config.powerUps" :key="powerUp.id || index" class="box">
        <div class="columns is-multiline">
          <div class="column is-half">
            <label class="label">Identifier</label>
            <input class="input" v-model="powerUp.id" placeholder="shield" />
          </div>
          <div class="column is-half">
            <label class="label">Label</label>
            <input class="input" v-model="powerUp.label" placeholder="Shield" />
          </div>
          <div class="column is-one-third">
            <label class="label">Spawn Rate (0-1)</label>
            <input class="input" type="number" step="0.01" min="0" max="1" v-model.number="powerUp.spawnRate" />
          </div>
          <div class="column is-one-third">
            <label class="label">Max Uses</label>
            <input class="input" type="number" min="0" v-model.number="powerUp.maxUses" />
          </div>
          <div class="column is-one-third">
            <label class="label">Cooldown (s)</label>
            <input class="input" type="number" min="0" v-model.number="powerUp.cooldownSeconds" />
          </div>
          <div class="column is-full">
            <label class="label">Description</label>
            <textarea class="textarea" v-model="powerUp.description" placeholder="Explain how the power-up works"></textarea>
          </div>
        </div>
        <div class="has-text-right">
          <button class="button is-danger is-light" @click="removePowerUp(index)">Remove</button>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Power-Up" @click="addPowerUp" />
    </section>

    <section class="config-section box">
      <h4 class="subtitle is-5">Theme</h4>
      <div class="columns is-multiline">
        <div class="column is-one-third" v-for="field in themeFields" :key="field.key">
          <label class="label">{{ field.label }}</label>
          <input
            class="input"
            :type="field.type"
            v-model="config.theme[field.key as keyof typeof config.theme]"
            :placeholder="field.placeholder"
          />
        </div>
      </div>
    </section>

    <section class="config-section box">
      <div class="section-header">
        <h4 class="subtitle is-5">Questions ({{ config.questions.length }})</h4>
        <div class="actions">
          <CustomButton
            type="is-info"
            label="Request xAI Questions"
            @click="requestAiQuestions"
            :disabled="isRequestingAi"
          />
        </div>
      </div>

      <p v-if="aiError" class="help is-danger">{{ aiError }}</p>
      <p v-if="isRequestingAi" class="help has-text-info">Requesting questions from xAI…</p>

      <div v-if="generatedCandidates.length" class="generated-list">
        <h5 class="subtitle is-6">AI Suggestions</h5>
        <div v-for="candidate in generatedCandidates" :key="candidate.id" class="box ai-candidate">
          <div class="candidate-header">
            <div>
              <strong>{{ candidate.question.text }}</strong>
              <span v-if="candidate.question.category" class="tag is-info is-light">{{ candidate.question.category }}</span>
            </div>
            <div class="candidate-actions">
              <button class="button is-small is-primary" @click="acceptCandidate(candidate)">Add to Config</button>
              <button
                class="button is-small is-link"
                :class="{ 'is-loading': candidate.isSaving && candidate.lastAction === 'game' }"
                @click="storeCandidate(candidate, 'game')"
              >
                Send to Game Pool
              </button>
              <button
                class="button is-small is-info"
                :class="{ 'is-loading': candidate.isSaving && candidate.lastAction === 'global' }"
                @click="storeCandidate(candidate, 'global')"
              >
                Save to Shared Pool
              </button>
              <button class="button is-small" @click="discardCandidate(candidate)">Dismiss</button>
            </div>
          </div>
          <p v-if="candidate.error" class="help is-danger">{{ candidate.error }}</p>
          <p v-else-if="candidate.lastAction" class="help is-success">
            {{ candidate.lastAction === 'game' ? 'Stored in game question pool.' : 'Stored in shared pool.' }}
          </p>
          <ul class="candidate-options">
            <li v-for="(answer, index) in candidate.question.answers" :key="index">
              <span :class="{ 'has-text-success': answer.text === candidate.question.correctAnswer }">
                {{ answer.text }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="questions-wrapper">
        <details v-for="(question, index) in config.questions" :key="question.id || index" class="question-collapsible">
          <summary class="question-summary">
            <span class="summary-icon" aria-hidden="true">❓</span>
            <span class="question-title-text">
              {{ question.text || `Question ${index + 1}` }}
            </span>
            <span class="summary-arrow" aria-hidden="true">▸</span>
          </summary>
          <div class="question-box">
            <div class="question-content">
              <div class="field">
                <label class="label">Identifier</label>
                <input class="input" v-model="question.id" placeholder="question-id" />
              </div>

              <div class="field">
                <label class="label">Question Text</label>
                <textarea class="textarea" v-model="question.text" placeholder="Ask your question"></textarea>
              </div>

              <div class="columns is-multiline">
                <div class="column is-half">
                  <label class="label">Category</label>
                  <input class="input" v-model="question.category" placeholder="general" />
                </div>
                <div class="column is-half">
                  <label class="label">Difficulty</label>
                  <div class="select is-fullwidth">
                    <select v-model="question.difficulty">
                      <option value="">Unset</option>
                      <option v-for="level in difficulties" :key="level" :value="level">{{ level }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="label">Question Image</label>
                <ImageUploader
                  v-model="question.imageUrl"
                  :uploadFolder="`trivia/${validatedGameId}/questions/${question.id}`"
                  :cropWidth="512"
                  :cropHeight="512"
                />
              </div>

              <div class="answers">
                <h6 class="subtitle is-6">Answers</h6>
                <div v-for="(answer, answerIndex) in question.answers" :key="answerIndex" class="box answer-option">
                  <div class="columns is-multiline">
                    <div class="column is-three-fifths">
                      <label class="label">Answer {{ answerIndex + 1 }}</label>
                      <input class="input" v-model="answer.text" placeholder="Answer text" />
                    </div>
                    <div class="column is-two-fifths">
                      <label class="label">Image</label>
                      <ImageUploader
                        v-model="answer.imageUrl"
                        :uploadFolder="`trivia/${validatedGameId}/answers/${question.id}/${answerIndex}`"
                        :cropWidth="256"
                        :cropHeight="256"
                      />
                    </div>
                    <div class="column is-full answer-footer">
                      <label class="radio">
                        <input type="radio" :name="`correct-${question.id}`" :value="answer.text" v-model="question.correctAnswer" />
                        Correct Answer
                      </label>
                      <button class="button is-text is-small" @click="removeAnswer(question, answerIndex)">Remove</button>
                    </div>
                  </div>
                </div>
                <CustomButton type="is-success is-small" label="Add Answer" @click="addAnswer(question)" />
              </div>
            </div>

            <div class="question-actions">
              <button class="button is-danger" @click="removeQuestion(index)">Remove Question</button>
              <button class="button is-primary" @click="duplicateQuestion(index)">Duplicate Question</button>
            </div>
          </div>
        </details>
        <div class="question-add">
          <CustomButton type="is-success" label="Add Question" @click="addQuestion" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { httpsCallable } from 'firebase/functions';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { db, functions } from '@top-x/shared';
import { collection, doc, setDoc } from 'firebase/firestore';
import type {
  TriviaConfig,
  TriviaQuestion,
  TriviaAnswer,
  TriviaPowerUpRule,
} from '@top-x/shared/types/trivia';
import { computeAnswerHash, ensureSalt, hasHashSecret } from '@/utils/triviaHash';

interface TriviaConfigWithTheme extends TriviaConfig {
  theme: NonNullable<TriviaConfig['theme']>;
  globalTimer: NonNullable<TriviaConfig['globalTimer']>;
  powerUps: TriviaPowerUpRule[];
  allowRepeats?: boolean;
  unlimitedLives?: boolean;
}

interface GeneratedCandidate {
  id: string;
  question: TriviaQuestion;
  isSaving?: boolean;
  lastAction?: 'game' | 'global';
  error?: string;
}

const props = defineProps<{
  modelValue: TriviaConfig;
  gameId?: string;
}>();

const emit = defineEmits(['update:modelValue']);

if (!hasHashSecret()) {
  console.warn('[AddTrivia] Missing VITE_TRIVIA_HASH_SECRET. Hashing will fail.');
}

const themeFields = [
  { key: 'primaryColor', label: 'Primary Color', type: 'color', placeholder: '#ff0066' },
  { key: 'secondaryColor', label: 'Secondary Color', type: 'color', placeholder: '#0066ff' },
  { key: 'backgroundColor', label: 'Background Color', type: 'color', placeholder: '#0b0b0b' },
  { key: 'backgroundImageUrl', label: 'Background Image URL', type: 'text', placeholder: 'https://…' },
  { key: 'backgroundVideoUrl', label: 'Background Video URL', type: 'text', placeholder: 'https://…' },
  { key: 'backgroundOverlayColor', label: 'Overlay Color', type: 'color', placeholder: '#00000088' },
] as const;

const difficulties = ['very_easy', 'easy', 'medium', 'hard', 'very_hard', 'expert'];

const isSyncing = ref(false);
const generatedCandidates = ref<GeneratedCandidate[]>([]);
const isRequestingAi = ref(false);
const aiError = ref('');

const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\\/]/g, '');
});

const config = ref<TriviaConfigWithTheme>(hydrateConfig(props.modelValue));
let sanitizeRevision = 0;

watch(
  () => props.modelValue,
  (value) => {
    isSyncing.value = true;
    config.value = hydrateConfig(value);
    nextTick(() => {
      isSyncing.value = false;
      if (configNeedsHashing(config.value)) {
        void emitSanitizedConfig();
      }
    });
  },
  { deep: true },
);

watch(
  config,
  () => {
    if (isSyncing.value) return;
    void emitSanitizedConfig();
  },
  { deep: true, immediate: false },
);

function hydrateConfig(value: TriviaConfig): TriviaConfigWithTheme {
  const base: TriviaConfig = value
    ? JSON.parse(JSON.stringify(value))
    : ({ mode: 'fixed', questions: [], language: 'en' } as TriviaConfig);

  if (!base.globalTimer) {
    base.globalTimer = { enabled: false };
  }
  if (!base.theme) {
    base.theme = {};
  }

  base.theme.primaryColor = base.theme.primaryColor || '#000000';
  base.theme.secondaryColor = base.theme.secondaryColor || '#000000';
  base.theme.backgroundColor = base.theme.backgroundColor || '#000000';
  base.theme.backgroundOverlayColor = base.theme.backgroundOverlayColor || '#000000';

  if (!base.powerUps) {
    base.powerUps = [];
  }
  base.showCorrectAnswers = Boolean(base.showCorrectAnswers);
  base.showCorrectAnswersOnEnd = Boolean(base.showCorrectAnswersOnEnd);
  const correctAnswerMap = base.correctAnswers ?? {};
  base.correctAnswers = correctAnswerMap;
  base.questions = base.questions?.map((question) => hydrateQuestion(question, correctAnswerMap)) ?? [];

  if (base.mode === 'endless') {
    base.questionBatchSize = base.questionBatchSize ?? 10;
    base.lives = base.lives ?? 3;
  } else {
    base.questionBatchSize = base.questionBatchSize ?? undefined;
    base.lives = base.lives ?? undefined;
    base.unlimitedLives = base.unlimitedLives ?? false;
  }

  return base as TriviaConfigWithTheme;
}

function hydrateQuestion(question: TriviaQuestion, correctAnswers: Record<string, string>): TriviaQuestion {
  const hydrated: TriviaQuestion = JSON.parse(JSON.stringify(question));
  hydrated.id = hydrated.id?.trim() || createQuestionId();
  
  // Migrate from old format if needed
  if ((question as any).options && !question.answers) {
    // Convert old options array to answers array
    const oldOptions = (question as any).options as string[];
    const oldImages = (question as any).media?.optionImageUrls as (string | null)[] | undefined;
    hydrated.answers = oldOptions.map((text, index) => ({
      text: text || '',
      imageUrl: oldImages?.[index] ?? undefined,
    }));
    // Migrate question image
    if ((question as any).media?.imageUrl) {
      hydrated.imageUrl = (question as any).media.imageUrl;
    }
  } else {
    // Ensure answers array exists and is properly formatted
    hydrated.answers = (hydrated.answers ?? []).map((ans) => ({
      text: ans?.text?.trim() || '',
      imageUrl: ans?.imageUrl || undefined,
    }));
  }
  
  // Ensure at least 2 answers exist
  if (hydrated.answers.length === 0) {
    hydrated.answers = [{ text: '' }, { text: '' }];
  }
  
  // Set correct answer if missing or invalid
  const answerTexts = hydrated.answers.map((a) => a.text);
  const mappedCorrect = hydrated.correctAnswer ?? correctAnswers[hydrated.id];
  if (!mappedCorrect || !answerTexts.includes(mappedCorrect)) {
    hydrated.correctAnswer = hydrated.answers[0]?.text || '';
  } else {
    hydrated.correctAnswer = mappedCorrect;
  }
  
  return hydrated;
}

async function sanitizeConfig(value: TriviaConfigWithTheme): Promise<TriviaConfig> {
  const clone: TriviaConfig = JSON.parse(JSON.stringify(value));
  const questions = clone.questions ?? [];
  const incomingCorrectAnswers = clone.correctAnswers ?? {};
  const correctAnswerMap: Record<string, string> = {};
  const sanitizedQuestions = await Promise.all(
    questions.map(async (question) => {
      const existing = question.correctAnswer ?? incomingCorrectAnswers[question.id];
      const { sanitized, correctAnswer } = await sanitizeQuestion(question, existing);
      if (correctAnswer) {
        correctAnswerMap[sanitized.id] = correctAnswer;
      }
      return sanitized;
    })
  );
  clone.questions = sanitizedQuestions;
  clone.correctAnswers = correctAnswerMap;

  if (clone.mode === 'endless') {
    clone.questionBatchSize = sanitizePositiveInteger(clone.questionBatchSize) ?? 10;
    clone.lives = sanitizePositiveInteger(clone.lives) ?? 3;
    (clone as TriviaConfigWithTheme).allowRepeats = Boolean((clone as TriviaConfigWithTheme).allowRepeats);
    delete (clone as any).unlimitedLives;
  } else {
    clone.questionBatchSize = sanitizePositiveInteger(clone.questionBatchSize) ?? undefined;
    clone.lives = sanitizePositiveInteger(clone.lives) ?? undefined;
    clone.unlimitedLives = Boolean((clone as TriviaConfigWithTheme).unlimitedLives);
    delete (clone as any).allowRepeats;
  }

  if (!clone.globalTimer?.enabled) {
    clone.globalTimer = { enabled: false };
  } else {
    clone.globalTimer.durationSeconds = sanitizePositiveInteger(clone.globalTimer.durationSeconds) ?? undefined;
  }

  clone.solveThreshold = typeof clone.solveThreshold === 'number' ? clamp(clone.solveThreshold, 0, 1) : undefined;
  clone.theme = sanitizeTheme(clone.theme ?? {});
  clone.powerUps = (clone.powerUps ?? []).map(sanitizePowerUp).filter((p) => !!p.id && !!p.label);
  clone.showCorrectAnswers = Boolean(clone.showCorrectAnswers);
  clone.showCorrectAnswersOnEnd = Boolean(clone.showCorrectAnswersOnEnd);

  return clone;
}

async function sanitizeQuestion(
  question: TriviaQuestion,
  fallbackCorrectAnswer?: string
): Promise<{ sanitized: TriviaQuestion; correctAnswer: string }> {
  const sanitized = JSON.parse(JSON.stringify(question)) as TriviaQuestion;
  sanitized.text = sanitized.text?.trim() ?? '';
  sanitized.id = sanitized.id?.trim() || createQuestionId();

  // Sanitize answers
  sanitized.answers = (sanitized.answers ?? []).map((answer) => ({
    text: answer?.text?.trim() ?? '',
    imageUrl: answer?.imageUrl?.trim() || undefined,
  }));

  if (sanitized.answers.length === 0) {
    sanitized.answers = [{ text: '' }];
  }

  // Validate correct answer
  const answerTexts = sanitized.answers.map((a) => a.text);
  if (!sanitized.correctAnswer || !answerTexts.includes(sanitized.correctAnswer)) {
    const fallback = fallbackCorrectAnswer && answerTexts.includes(fallbackCorrectAnswer)
      ? fallbackCorrectAnswer
      : sanitized.answers[0]?.text || '';
    sanitized.correctAnswer = fallback;
  } else {
    sanitized.correctAnswer = sanitized.correctAnswer.trim();
  }

  // Clean up imageUrl (question image)
  sanitized.imageUrl = sanitized.imageUrl?.trim() || undefined;

  // Remove old media structure if it exists
  delete (sanitized as any).media;

  sanitized.category = sanitized.category?.trim() || undefined;
  sanitized.difficulty = sanitized.difficulty || undefined;

  const ensuredSalt = ensureSalt(sanitized.salt);
  sanitized.salt = ensuredSalt;
  sanitized.hash = await computeAnswerHash(sanitized.id, sanitized.correctAnswer, ensuredSalt);

  const { correctAnswer } = sanitized;
  delete sanitized.correctAnswer;

  return { sanitized, correctAnswer };
}

function sanitizeTheme(theme: NonNullable<TriviaConfig['theme']>): NonNullable<TriviaConfig['theme']> {
  const cleaned = { ...theme };
  Object.keys(cleaned).forEach((key) => {
    const value = (cleaned as Record<string, unknown>)[key];
    if (value === '' || value === null || value === undefined) {
      delete (cleaned as Record<string, unknown>)[key];
    }
  });
  return cleaned;
}

function sanitizePowerUp(rule: TriviaPowerUpRule): TriviaPowerUpRule {
  return {
    id: rule.id?.trim() ?? '',
    label: rule.label?.trim() ?? '',
    spawnRate: typeof rule.spawnRate === 'number' ? clamp(rule.spawnRate, 0, 1) : undefined,
    maxUses: sanitizePositiveInteger(rule.maxUses) ?? undefined,
    cooldownSeconds: sanitizePositiveInteger(rule.cooldownSeconds) ?? undefined,
    description: rule.description?.trim() || undefined,
  };
}

function sanitizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value) || value < 0) return undefined;
  return Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function addQuestion() {
  config.value.questions.push(createEmptyQuestion());
}

function duplicateQuestion(index: number) {
  const question = config.value.questions[index];
  const duplicate = hydrateQuestion(question, config.value.correctAnswers ?? {});
  duplicate.id = createQuestionId();
  config.value.questions.splice(index + 1, 0, duplicate);
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
}

function addAnswer(question: TriviaQuestion) {
  question.answers = question.answers ?? [];
  question.answers.push({ text: '' });
}

function removeAnswer(question: TriviaQuestion, index: number) {
  const removedAnswer = question.answers[index];
  question.answers.splice(index, 1);
  
  // Update correct answer if the removed one was correct
  if (removedAnswer && removedAnswer.text === question.correctAnswer) {
    question.correctAnswer = question.answers[0]?.text || '';
  }
  
  // Ensure at least one answer remains
  if (question.answers.length === 0) {
    question.answers.push({ text: '' });
  }
}

function removePowerUp(index: number) {
  config.value.powerUps.splice(index, 1);
}

function addPowerUp() {
  config.value.powerUps.push({ id: '', label: '' });
}

function createEmptyQuestion(): TriviaQuestion {
  return hydrateQuestion({
    id: createQuestionId(),
    text: '',
    answers: [{ text: '' }, { text: '' }],
    correctAnswer: '',
  } as TriviaQuestion, config.value.correctAnswers ?? {});
}

function createQuestionId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

async function requestAiQuestions() {
  if (isRequestingAi.value) return;
  aiError.value = '';
  try {
    isRequestingAi.value = true;
    const callable = httpsCallable<{
      gameId?: string;
      language?: string;
      existingIds: string[];
    }, { questions?: TriviaQuestion[] }>(functions, 'requestXaiTriviaQuestions');
    const { data } = await callable({
      gameId: props.gameId,
      language: config.value.language,
      existingIds: config.value.questions.map((question) => question.id),
    });
    const questions = data.questions ?? [];
    generatedCandidates.value = questions.map((question) => ({
      id: question.id || createQuestionId(),
      question: hydrateQuestion(question),
    }));
  } catch (error) {
    console.error('Failed to request xAI trivia questions', error);
    aiError.value = error instanceof Error ? error.message : 'Unable to request questions from xAI';
  } finally {
    isRequestingAi.value = false;
  }
}

function acceptCandidate(candidate: GeneratedCandidate) {
  config.value.questions.push(hydrateQuestion(candidate.question));
  generatedCandidates.value = generatedCandidates.value.filter((item) => item.id !== candidate.id);
}

function discardCandidate(candidate: GeneratedCandidate) {
  generatedCandidates.value = generatedCandidates.value.filter((item) => item.id !== candidate.id);
}

async function storeCandidate(candidate: GeneratedCandidate, target: 'game' | 'global') {
  if (candidate.isSaving) return;
  if (target === 'game' && !props.gameId) {
    candidate.error = 'A game must be selected to store questions under it.';
    return;
  }
  candidate.isSaving = true;
  candidate.error = '';
  candidate.lastAction = target;
  try {
    await persistCandidateToPool(candidate, target);
  } catch (error) {
    console.error('Failed to persist AI question', error);
    candidate.error = error instanceof Error ? error.message : 'Failed to save question';
  } finally {
    candidate.isSaving = false;
  }
}

async function persistCandidateToPool(
  candidate: GeneratedCandidate,
  target: 'game' | 'global',
): Promise<void> {
  const { sanitized, correctAnswer } = await sanitizeQuestion(candidate.question);
  if (!sanitized.id) {
    sanitized.id = createQuestionId();
  }
  if (target === 'game') {
    if (!props.gameId) {
      throw new Error('A gameId is required to store questions under a game.');
    }
    const questionRef = doc(collection(db, 'games', props.gameId, 'questions'), sanitized.id);
    await setDoc(questionRef, { ...sanitized, correctAnswer }, { merge: true });
  } else {
    const questionRef = doc(collection(db, 'xaiQuestions'), sanitized.id);
    await setDoc(questionRef, { ...sanitized, correctAnswer }, { merge: true });
  }
}

function configNeedsHashing(value: TriviaConfigWithTheme): boolean {
  return (value.questions ?? []).some((q) => !q?.hash || !q?.salt);
}

async function emitSanitizedConfig(): Promise<void> {
  const currentRevision = ++sanitizeRevision;
  try {
    const sanitized = await sanitizeConfig(config.value);
    if (currentRevision === sanitizeRevision) {
      emit('update:modelValue', sanitized);
    }
  } catch (error) {
    console.error('Failed to sanitize trivia config', error);
  }
}
</script>

<style scoped>
.add-trivia {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.config-section {
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-card {
  border: 1px solid rgba(10, 10, 10, 0.08);
  box-shadow: none;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.drag-handle {
  cursor: grab;
  margin-right: 0.5rem;
  user-select: none;
}

.question-actions {
  display: flex;
  gap: 0.5rem;
}

.answers {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.answer-option {
  background: #fafafa;
}

.answer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.generated-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.ai-candidate {
  border: 1px solid rgba(10, 10, 10, 0.08);
}

.candidate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.candidate-actions {
  display: flex;
  gap: 0.5rem;
}

.candidate-options {
  margin-top: 0.75rem;
  margin-left: 1rem;
}

.candidate-options li + li {
  margin-top: 0.25rem;
}

.questions-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-collapsible {
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.question-summary {
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
}

.summary-icon {
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
  font-size: 0.95rem;
  color: #6b7280;
}

.question-collapsible[open] .question-summary {
  border-bottom: 1px solid #e5e5e5;
}

.question-collapsible[open] > .question-summary .summary-arrow {
  transform: rotate(90deg);
}

.question-title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-box {
  padding: 1.25rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e5e5;
}

.question-add {
  display: flex;
  justify-content: flex-start;
  margin-top: 0.5rem;
}
</style>

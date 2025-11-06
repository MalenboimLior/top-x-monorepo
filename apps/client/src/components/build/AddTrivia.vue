<template>
  <div class="add-trivia">
    <h3 class="title is-4 has-text-white">Trivia Configuration</h3>

    <section class="config-section">
      <h4 class="subtitle is-5 has-text-white">Session Settings</h4>
      <div class="columns is-multiline">
        <div class="column is-half">
          <label class="label has-text-white">Mode</label>
          <div class="select is-fullwidth">
            <select v-model="config.mode">
              <option value="fixed">Fixed</option>
              <option value="endless">Endless</option>
            </select>
          </div>
        </div>

        <div class="column is-half">
          <label class="label has-text-white">Language</label>
          <input class="input" v-model="config.language" placeholder="en" />
        </div>

        <div v-if="config.mode === 'fixed'" class="column is-half">
          <label class="label has-text-white">Total Questions</label>
          <input class="input" type="number" v-model.number="config.totalQuestions" min="1" />
        </div>

        <div v-if="config.mode === 'fixed'" class="column is-half">
          <label class="label has-text-white">Question Source</label>
          <div class="select is-fullwidth">
            <select v-model="config.questionSource">
              <option value="pool">Question Pool (remote)</option>
              <option value="inline">Inline (use configured list)</option>
              <option value="hybrid">Hybrid (inline + pool)</option>
            </select>
          </div>
        </div>

        <div class="column is-half">
          <label class="label has-text-white">Batch Size</label>
          <input class="input" type="number" v-model.number="config.questionBatchSize" min="1" />
        </div>

        <div class="column is-half">
          <label class="label has-text-white">Lives</label>
          <input class="input" type="number" v-model.number="config.lives" min="0" />
        </div>

        <div v-if="config.mode === 'endless'" class="column is-half">
          <label class="label has-text-white">Allow Repeats</label>
          <label class="checkbox has-text-white">
            <input type="checkbox" v-model="config.allowRepeats" />
            Reuse questions when pool is exhausted
          </label>
        </div>

        <div class="column is-half">
          <label class="label has-text-white">Solve Threshold</label>
          <input class="input" type="number" step="0.01" min="0" max="1" v-model.number="config.solveThreshold" />
        </div>

        <div class="column is-half">
          <label class="label has-text-white">Show Correct Answers</label>
          <label class="checkbox has-text-white">
            <input type="checkbox" v-model="config.showCorrectAnswers" />
            Reveal answers after each question
          </label>
        </div>
      </div>
    </section>

    <section class="config-section">
      <h4 class="subtitle is-5 has-text-white">Global Timer</h4>
      <label class="checkbox has-text-white">
        <input type="checkbox" v-model="config.globalTimer.enabled" />
        Enable global timer
      </label>
      <div class="columns" v-if="config.globalTimer.enabled">
        <div class="column is-half">
          <label class="label has-text-white">Duration (seconds)</label>
          <input class="input" type="number" min="0" v-model.number="config.globalTimer.durationSeconds" />
        </div>
      </div>
    </section>

    <section class="config-section">
      <h4 class="subtitle is-5 has-text-white">Power-Ups</h4>
      <div v-if="config.powerUps.length === 0" class="has-text-grey-light">No power-ups configured.</div>
      <div v-for="(powerUp, index) in config.powerUps" :key="powerUp.id || index" class="box">
        <div class="columns is-multiline">
          <div class="column is-half">
            <label class="label has-text-white">Identifier</label>
            <input class="input" v-model="powerUp.id" placeholder="shield" />
          </div>
          <div class="column is-half">
            <label class="label has-text-white">Label</label>
            <input class="input" v-model="powerUp.label" placeholder="Shield" />
          </div>
          <div class="column is-one-third">
            <label class="label has-text-white">Spawn Rate (0-1)</label>
            <input class="input" type="number" step="0.01" min="0" max="1" v-model.number="powerUp.spawnRate" />
          </div>
          <div class="column is-one-third">
            <label class="label has-text-white">Max Uses</label>
            <input class="input" type="number" min="0" v-model.number="powerUp.maxUses" />
          </div>
          <div class="column is-one-third">
            <label class="label has-text-white">Cooldown (s)</label>
            <input class="input" type="number" min="0" v-model.number="powerUp.cooldownSeconds" />
          </div>
          <div class="column is-full">
            <label class="label has-text-white">Description</label>
            <textarea class="textarea" v-model="powerUp.description" placeholder="Explain how the power-up works"></textarea>
          </div>
        </div>
        <div class="has-text-right">
          <button class="button is-danger is-light" @click="removePowerUp(index)">Remove</button>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Power-Up" @click="addPowerUp" />
    </section>

    <section class="config-section">
      <h4 class="subtitle is-5 has-text-white">Theme</h4>
      <div class="columns is-multiline">
        <div class="column is-one-third" v-for="field in themeFields" :key="field.key">
          <label class="label has-text-white">{{ field.label }}</label>
          <input
            class="input"
            :type="field.type"
            v-model="config.theme[field.key as keyof typeof config.theme]"
            :placeholder="field.placeholder"
          />
        </div>
      </div>
    </section>

    <section class="config-section">
      <div class="section-header">
        <h4 class="subtitle is-5 has-text-white">Questions ({{ config.questions.length }})</h4>
        <div class="actions">
          <CustomButton type="is-info" label="Request xAI Questions" @click="requestAiQuestions" :disabled="isRequestingAi" />
          <CustomButton type="is-success" label="Add Question" @click="addQuestion" />
        </div>
      </div>

      <p v-if="aiError" class="help is-danger">{{ aiError }}</p>
      <p v-if="isRequestingAi" class="help has-text-info">Requesting questions from xAI…</p>

      <div v-if="generatedCandidates.length" class="generated-list">
        <h5 class="subtitle is-6 has-text-white">AI Suggestions</h5>
        <div v-for="candidate in generatedCandidates" :key="candidate.id" class="box ai-candidate">
          <div class="candidate-header">
            <div>
              <strong>{{ candidate.question.text }}</strong>
              <span v-if="candidate.question.category" class="tag is-info is-light">{{ candidate.question.category }}</span>
            </div>
            <div class="candidate-actions">
              <button class="button is-small is-primary" @click="acceptCandidate(candidate)">Add to Config</button>
              <button
                v-if="canManagePools && props.gameId"
                class="button is-small is-link"
                :class="{ 'is-loading': candidate.isSaving && candidate.lastAction === 'game' }"
                @click="storeCandidate(candidate, 'game')"
              >
                Send to Game Pool
              </button>
              <button
                v-if="canManagePools"
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
            <li v-for="(option, index) in candidate.question.options" :key="index">
              <span :class="{ 'has-text-success': option === candidate.question.correctAnswer }">
                {{ option }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <VueDraggable v-model="config.questions" item-key="id" handle=".drag-handle" class="draggable-list">
        <template #item="{ element: question, index }">
          <div class="box question-card">
            <header class="question-header">
              <span class="drag-handle" aria-label="Drag question">⠿</span>
              <h5 class="title is-6 has-text-white">Question {{ index + 1 }}</h5>
              <div class="question-actions">
                <button class="button is-small" @click="duplicateQuestion(index)">Duplicate</button>
                <button class="button is-small is-danger" @click="removeQuestion(index)">Remove</button>
              </div>
            </header>

            <div class="field">
              <label class="label has-text-white">Identifier</label>
              <input class="input" v-model="question.id" placeholder="question-id" />
            </div>

            <div class="field">
              <label class="label has-text-white">Prompt</label>
              <textarea class="textarea" v-model="question.text" placeholder="Ask your question"></textarea>
            </div>

            <div class="columns is-multiline">
              <div class="column is-half">
                <label class="label has-text-white">Category</label>
                <input class="input" v-model="question.category" placeholder="general" />
              </div>
              <div class="column is-one-quarter">
                <label class="label has-text-white">Difficulty</label>
                <div class="select is-fullwidth">
                  <select v-model="question.difficulty">
                    <option value="">Unset</option>
                    <option v-for="level in difficulties" :key="level" :value="level">{{ level }}</option>
                  </select>
                </div>
              </div>
              <div class="column is-one-quarter">
                <label class="label has-text-white">Timer (seconds)</label>
                <input class="input" type="number" min="0" v-model.number="question.timerSeconds" />
              </div>
            </div>

            <div class="field">
              <label class="label has-text-white">Question Image</label>
              <ImageUploader
                v-model="question.media.imageUrl"
                :uploadFolder="`trivia/${validatedGameId}/questions/${question.id}`"
                :cropWidth="512"
                :cropHeight="512"
              />
            </div>

            <div class="answers">
              <h6 class="subtitle is-6 has-text-white">Answers</h6>
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex" class="box answer-option">
                <div class="columns is-multiline">
                  <div class="column is-three-fifths">
                    <label class="label has-text-white">Answer {{ optionIndex + 1 }}</label>
                    <input class="input" v-model="question.options[optionIndex]" placeholder="Answer text" />
                  </div>
                  <div class="column is-two-fifths">
                    <label class="label has-text-white">Image</label>
                    <ImageUploader
                      v-model="question.media.optionImageUrls[optionIndex]"
                      :uploadFolder="`trivia/${validatedGameId}/options/${question.id}/${optionIndex}`"
                      :cropWidth="256"
                      :cropHeight="256"
                    />
                  </div>
                  <div class="column is-full">
                    <label class="radio has-text-white">
                      <input type="radio" :name="`correct-${question.id}`" :value="option" v-model="question.correctAnswer" />
                      Correct Answer
                    </label>
                    <button class="button is-text is-small" @click="removeOption(question, optionIndex)">Remove</button>
                  </div>
                </div>
              </div>
              <CustomButton type="is-success is-small" label="Add Answer" @click="addOption(question)" />
            </div>
          </div>
        </template>
      </VueDraggable>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import {
  requestXaiTriviaQuestions,
  saveQuestionToGamePool,
  saveQuestionToGlobalPool,
} from '@/services/game';
import type {
  TriviaConfig,
  TriviaQuestion,
  TriviaQuestionMedia,
  TriviaPowerUpRule,
} from '@top-x/shared/types/trivia';

interface TriviaConfigWithTheme extends TriviaConfig {
  theme: NonNullable<TriviaConfig['theme']>;
  globalTimer: NonNullable<TriviaConfig['globalTimer']>;
  powerUps: TriviaPowerUpRule[];
  allowRepeats?: boolean;
  totalQuestions?: number;
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
  allowPoolManagement?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const themeFields = [
  { key: 'primaryColor', label: 'Primary Color', type: 'color', placeholder: '#ff0066' },
  { key: 'secondaryColor', label: 'Secondary Color', type: 'color', placeholder: '#0066ff' },
  { key: 'backgroundColor', label: 'Background Color', type: 'color', placeholder: '#0b0b0b' },
  { key: 'backgroundImageUrl', label: 'Background Image URL', type: 'text', placeholder: 'https://…' },
  { key: 'backgroundVideoUrl', label: 'Background Video URL', type: 'text', placeholder: 'https://…' },
  { key: 'backgroundOverlayColor', label: 'Overlay Color', type: 'color', placeholder: '#00000088' },
] as const;

const difficulties = ['very_easy', 'easy', 'medium', 'hard', 'very_hard', 'expert'];
const QUESTION_SOURCES = ['pool', 'hybrid', 'inline'] as const;
type QuestionSource = (typeof QUESTION_SOURCES)[number];

const isSyncing = ref(false);
const generatedCandidates = ref<GeneratedCandidate[]>([]);
const isRequestingAi = ref(false);
const aiError = ref('');
const canManagePools = computed(() => props.allowPoolManagement === true);

const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\\/]/g, '');
});

const config = ref<TriviaConfigWithTheme>(hydrateConfig(props.modelValue));

watch(
  () => props.modelValue,
  (value) => {
    isSyncing.value = true;
    config.value = hydrateConfig(value);
    nextTick(() => {
      isSyncing.value = false;
    });
  },
  { deep: true },
);

watch(
  config,
  (value) => {
    if (isSyncing.value) return;
    emit('update:modelValue', sanitizeConfig(value));
  },
  { deep: true },
);

function hydrateConfig(value: TriviaConfig): TriviaConfigWithTheme {
  const base: TriviaConfig = value
    ? JSON.parse(JSON.stringify(value))
    : ({ mode: 'fixed', questions: [], language: 'en' } as TriviaConfig);

  if (!QUESTION_SOURCES.includes(base.questionSource as QuestionSource)) {
    base.questionSource = 'pool';
  }

  if (!base.globalTimer) {
    base.globalTimer = { enabled: false };
  }
  if (!base.theme) {
    base.theme = {};
  }
  if (!base.powerUps) {
    base.powerUps = [];
  }
  base.questions = base.questions?.map(hydrateQuestion) ?? [];

  if (base.mode === 'endless') {
    base.questionBatchSize = base.questionBatchSize ?? 10;
    base.lives = base.lives ?? 3;
  } else {
    base.questionBatchSize = base.questionBatchSize ?? undefined;
    base.lives = base.lives ?? undefined;
  }

  return base as TriviaConfigWithTheme;
}

function hydrateQuestion(question: TriviaQuestion): TriviaQuestion {
  const hydrated: TriviaQuestion = JSON.parse(JSON.stringify(question));
  hydrated.id = hydrated.id?.trim() || createQuestionId();
  hydrated.options = hydrated.options ?? [];
  if (!hydrated.media) {
    hydrated.media = {} as TriviaQuestionMedia;
  }
  const media = hydrated.media as TriviaQuestionMedia;
  const options = hydrated.options ?? [];
  const images = media.optionImageUrls ? [...media.optionImageUrls] : [];
  media.optionImageUrls = options.map((_, index) => images[index] ?? null);
  if (!hydrated.correctAnswer && options.length > 0) {
    hydrated.correctAnswer = options[0];
  }
  return hydrated;
}

function sanitizeConfig(value: TriviaConfigWithTheme): TriviaConfig {
  const clone: TriviaConfig = JSON.parse(JSON.stringify(value));
  clone.questions = (clone.questions ?? []).map(sanitizeQuestion);

  if (!QUESTION_SOURCES.includes(clone.questionSource as QuestionSource)) {
    clone.questionSource = 'pool';
  }
  if (clone.mode !== 'fixed' && clone.questionSource === 'inline') {
    clone.questionSource = 'pool';
  }

  if (clone.mode === 'endless') {
    clone.questionBatchSize = sanitizePositiveInteger(clone.questionBatchSize) ?? 10;
    clone.lives = sanitizePositiveInteger(clone.lives) ?? 3;
    (clone as TriviaConfigWithTheme).allowRepeats = Boolean((clone as TriviaConfigWithTheme).allowRepeats);
  } else {
    clone.totalQuestions = sanitizePositiveInteger(clone.totalQuestions);
    clone.questionBatchSize = sanitizePositiveInteger(clone.questionBatchSize) ?? undefined;
    clone.lives = sanitizePositiveInteger(clone.lives) ?? undefined;
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

  return clone;
}

function sanitizeQuestion(question: TriviaQuestion): TriviaQuestion {
  const sanitized = JSON.parse(JSON.stringify(question)) as TriviaQuestion;
  sanitized.text = sanitized.text?.trim() ?? '';
  sanitized.id = sanitized.id?.trim() || createQuestionId();
  sanitized.options = (sanitized.options ?? []).map((option: string) => option?.trim() ?? '').filter(Boolean);
  if (sanitized.options.length === 0) {
    sanitized.options = ['Answer'];
  }
  if (!sanitized.correctAnswer || !sanitized.options.includes(sanitized.correctAnswer)) {
    sanitized.correctAnswer = sanitized.options[0];
  }
  if (sanitized.media) {
    const media = sanitized.media;
    if (media.optionImageUrls) {
      media.optionImageUrls = sanitized.options.map((_, index) => media.optionImageUrls?.[index] ?? null);
    }
  }
  sanitized.timerSeconds = sanitizePositiveInteger(sanitized.timerSeconds) ?? undefined;
  sanitized.category = sanitized.category?.trim() || undefined;
  sanitized.difficulty = sanitized.difficulty || undefined;
  sanitized.language = sanitized.language?.trim() || undefined;
  return sanitized;
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
  const duplicate = hydrateQuestion(question);
  duplicate.id = createQuestionId();
  config.value.questions.splice(index + 1, 0, duplicate);
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
}

function addOption(question: TriviaQuestion) {
  question.options = question.options ?? [];
  question.options.push('');
  ensureOptionImages(question);
}

function removeOption(question: TriviaQuestion, index: number) {
  question.options.splice(index, 1);
  ensureOptionImages(question);
  if (!question.options.includes(question.correctAnswer)) {
    question.correctAnswer = question.options[0] ?? '';
  }
}

function ensureOptionImages(question: TriviaQuestion) {
  if (!question.media) {
    question.media = {};
  }
  const media = question.media;
  const options = question.options ?? [];
  const existing = media.optionImageUrls ? [...media.optionImageUrls] : [];
  media.optionImageUrls = options.map((_, index) => existing[index] ?? null);
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
    options: ['', ''],
    correctAnswer: '',
    media: { optionImageUrls: [null, null] },
  } as TriviaQuestion);
}

function createQuestionId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

async function requestAiQuestions() {
  if (isRequestingAi.value) return;
  aiError.value = '';
  try {
    isRequestingAi.value = true;
    const result = await requestXaiTriviaQuestions({
      gameId: props.gameId,
      language: config.value.language,
      existingIds: config.value.questions.map((question) => question.id),
    });
    
    if (result.error) {
      aiError.value = result.error;
      return;
    }
    
    generatedCandidates.value = result.questions.map((question) => ({
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
  const question = sanitizeQuestion(candidate.question);
  if (!question.id) {
    question.id = createQuestionId();
  }
  
  if (target === 'game') {
    if (!props.gameId) {
      throw new Error('A gameId is required to store questions under a game.');
    }
    const result = await saveQuestionToGamePool(props.gameId, question);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save question to game pool');
    }
  } else {
    const result = await saveQuestionToGlobalPool(question);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save question to global pool');
    }
  }
}

// expose helper for advanced integrations (admin variant reuses the same helpers)
defineExpose({
  persistCandidateToPool,
  storeCandidate,
});
</script>

<style scoped>
.add-trivia {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.config-section {
  background: rgba(30, 30, 30, 0.8);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  background: rgba(18, 18, 18, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  background: rgba(45, 45, 45, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.generated-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.ai-candidate {
  background: rgba(26, 26, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
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
  color: rgba(255, 255, 255, 0.8);
}

.candidate-options li + li {
  margin-top: 0.25rem;
}
</style>

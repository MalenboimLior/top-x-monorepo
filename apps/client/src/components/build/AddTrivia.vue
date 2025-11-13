<template>
  <div class="trivia-wizard">
    <section v-if="activeStep === 'session'" class="wizard-layout">
      <div class="wizard-layout__form">
        <header class="wizard-header">
          <p class="wizard-header__eyebrow">{{ t('build.trivia.session.eyebrow') }}</p>
          <h2 class="wizard-header__title">{{ t('build.trivia.session.title') }}</h2>
          <p class="wizard-header__subtitle">{{ t('build.trivia.session.subtitle') }}</p>
        </header>

        <div class="settings-grid">
          <div class="settings-card">
            <h3>{{ t('build.trivia.session.lives.title') }}</h3>
            <p class="muted">{{ t('build.trivia.session.lives.hint') }}</p>
            <label class="toggle">
              <input type="checkbox" v-model="config.unlimitedLives" />
              <span>{{ t('build.trivia.session.lives.unlimited') }}</span>
            </label>
            <div v-if="!config.unlimitedLives" class="field">
              <label :for="ids.lives">{{ t('build.trivia.session.lives.count') }}</label>
              <input :id="ids.lives" type="number" min="1" v-model.number="config.lives" />
            </div>
          </div>

          <div class="settings-card">
            <h3>{{ t('build.trivia.session.correctAnswers.title') }}</h3>
            <p class="muted">{{ t('build.trivia.session.correctAnswers.hint') }}</p>
            <label class="toggle">
              <input type="checkbox" v-model="config.showCorrectAnswers" :disabled="!config.unlimitedLives" />
              <span>{{ t('build.trivia.session.correctAnswers.perQuestion') }}</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="config.showCorrectAnswersOnEnd" :disabled="!config.unlimitedLives" />
              <span>{{ t('build.trivia.session.correctAnswers.onSummary') }}</span>
            </label>
            <p v-if="!config.unlimitedLives" class="muted">
              {{ t('build.trivia.session.correctAnswers.disabled') }}
            </p>
          </div>

          <div class="settings-card">
            <h3>{{ t('build.trivia.session.powerUps.title') }}</h3>
            <p class="muted">{{ t('build.trivia.session.powerUps.hint') }}</p>
            <label class="toggle">
              <input type="checkbox" v-model="config.powerUpsActive" />
              <span>{{ t('build.trivia.session.powerUps.enable') }}</span>
            </label>

            <div v-if="config.powerUpsActive" class="powerup-list">
              <article
                v-for="(powerUp, index) in config.powerUps"
                :key="powerUp.id || index"
                class="powerup-card"
              >
                <div class="field">
                  <label :for="`${ids.powerUpId}-${index}`">{{ t('build.trivia.session.powerUps.idLabel') }}</label>
                  <input :id="`${ids.powerUpId}-${index}`" v-model="powerUp.id" placeholder="shield" />
                </div>
                <div class="field">
                  <label :for="`${ids.powerUpLabel}-${index}`">{{ t('build.trivia.session.powerUps.labelLabel') }}</label>
                  <input :id="`${ids.powerUpLabel}-${index}`" v-model="powerUp.label" placeholder="Shield" />
                </div>
                <div class="powerup-card__row">
                  <div class="field">
                    <label :for="`${ids.powerUpSpawn}-${index}`">{{ t('build.trivia.session.powerUps.spawnRate') }}</label>
                    <input
                      :id="`${ids.powerUpSpawn}-${index}`"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      v-model.number="powerUp.spawnRate"
                    />
                  </div>
                  <div class="field">
                    <label :for="`${ids.powerUpMax}-${index}`">{{ t('build.trivia.session.powerUps.maxUses') }}</label>
                    <input
                      :id="`${ids.powerUpMax}-${index}`"
                      type="number"
                      min="0"
                      v-model.number="powerUp.maxUses"
                    />
                  </div>
                  <div class="field">
                    <label :for="`${ids.powerUpCooldown}-${index}`">{{ t('build.trivia.session.powerUps.cooldown') }}</label>
                    <input
                      :id="`${ids.powerUpCooldown}-${index}`"
                      type="number"
                      min="0"
                      v-model.number="powerUp.cooldownSeconds"
                    />
                  </div>
                </div>
                <div class="field">
                  <label :for="`${ids.powerUpDescription}-${index}`">{{ t('build.trivia.session.powerUps.description') }}</label>
                  <textarea :id="`${ids.powerUpDescription}-${index}`" rows="2" v-model="powerUp.description" />
                </div>
                <button type="button" class="ghost ghost--danger" @click="removePowerUp(index)">
                  {{ t('build.trivia.session.powerUps.remove') }}
                </button>
              </article>

              <CustomButton type="is-success is-light" :label="t('build.trivia.session.powerUps.add')" @click="addPowerUp" />
            </div>
          </div>

          <div class="settings-card">
            <h3>{{ t('build.trivia.session.access.title') }}</h3>
            <p class="muted">{{ t('build.trivia.session.access.hint') }}</p>
            <label class="toggle">
              <input type="checkbox" v-model="config.mustLogin" />
              <span>{{ t('build.trivia.session.access.mustLogin') }}</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="config.allowRepeats" />
              <span>{{ t('build.trivia.session.access.allowRepeats') }}</span>
            </label>
          </div>

          <div class="settings-card">
            <h3>{{ t('build.trivia.session.timer.title') }}</h3>
            <p class="muted">{{ t('build.trivia.session.timer.hint') }}</p>
            <label class="toggle">
              <input type="checkbox" v-model="config.globalTimer.enabled" />
              <span>{{ t('build.trivia.session.timer.enable') }}</span>
            </label>
            <div v-if="config.globalTimer.enabled" class="field field--inline">
              <label :for="ids.timerDuration">{{ t('build.trivia.session.timer.duration') }}</label>
              <input :id="ids.timerDuration" type="number" min="0" v-model.number="config.globalTimer.durationSeconds" />
              <span class="field--suffix">{{ t('build.trivia.session.timer.seconds') }}</span>
            </div>
          </div>
        </div>
      </div>

      <aside class="wizard-layout__preview">
        <div class="session-preview">
          <header>
            <p class="wizard-header__eyebrow">{{ t('build.trivia.preview.eyebrow') }}</p>
            <h3>{{ t('build.trivia.preview.sessionTitle') }}</h3>
            <p class="muted">{{ t('build.trivia.preview.sessionSubtitle') }}</p>
          </header>
          <div class="session-preview__board">
            <div class="session-preview__row">
              <span>{{ t('build.trivia.preview.lives') }}</span>
              <strong>{{ livesPreview }}</strong>
            </div>
            <div class="session-preview__row">
              <span>{{ t('build.trivia.preview.correctAnswers') }}</span>
              <strong>{{ answersPreview }}</strong>
            </div>
            <div class="session-preview__row">
              <span>{{ t('build.trivia.preview.powerUps') }}</span>
              <strong>{{ powerUpSummary }}</strong>
            </div>
            <div class="session-preview__row">
              <span>{{ t('build.trivia.preview.timer') }}</span>
              <strong>{{ timerSummary }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <section v-else-if="activeStep === 'questions'" class="wizard-layout">
      <div class="wizard-layout__form">
        <header class="wizard-header">
          <p class="wizard-header__eyebrow">{{ t('build.trivia.questions.eyebrow') }}</p>
          <h2 class="wizard-header__title">{{ t('build.trivia.questions.title', { count: config.questions.length }) }}</h2>
          <p class="wizard-header__subtitle">{{ t('build.trivia.questions.subtitle') }}</p>
          <CustomButton type="is-success" :label="t('build.trivia.questions.addQuestion')" @click="handleAddQuestion" />
        </header>

        <ul v-if="config.questions.length" class="question-list">
          <li
            v-for="(question, index) in config.questions"
            :key="question.id"
            :class="['question-list__item', { 'question-list__item--active': index === selectedQuestionIndex }]"
          >
            <button type="button" class="question-list__select" @click="selectQuestion(index)">
              <span class="question-list__index">{{ index + 1 }}</span>
              <div>
                <strong>{{ question.text || t('build.trivia.questions.untitled') }}</strong>
                <p class="muted">{{ t('build.trivia.questions.optionCount', { count: question.options.length }) }}</p>
              </div>
            </button>
            <div class="question-list__actions">
              <button type="button" class="ghost" :disabled="index === 0" @click="reorderQuestion(index, -1)">
                {{ t('build.trivia.questions.moveUp') }}
              </button>
              <button
                type="button"
                class="ghost"
                :disabled="index === config.questions.length - 1"
                @click="reorderQuestion(index, 1)"
              >
                {{ t('build.trivia.questions.moveDown') }}
              </button>
              <button type="button" class="ghost ghost--danger" @click="removeQuestion(index)">
                {{ t('build.trivia.questions.remove') }}
              </button>
            </div>
          </li>
        </ul>

        <div v-else class="empty-state">
          <p>{{ t('build.trivia.questions.empty') }}</p>
        </div>
      </div>

      <aside class="wizard-layout__preview">
        <div v-if="activeQuestion" class="question-preview">
          <header>
            <p class="wizard-header__eyebrow question-preview__label">
              {{ questionLabel }}
            </p>
            <input
              class="question-preview__title"
              v-model="activeQuestion.text"
              :placeholder="t('build.trivia.questions.promptPlaceholder')"
            />
          </header>

          <div class="field">
            <label>{{ t('build.trivia.questions.imageLabel') }}</label>
            <ImageUploader
              v-model="activeQuestion.media.imageUrl"
              :uploadFolder="`trivia/${validatedGameId}/questions/${activeQuestion.id}`"
              :cropWidth="512"
              :cropHeight="512"
            />
          </div>

          <section class="answer-list">
            <h3>{{ t('build.trivia.questions.answersTitle') }}</h3>
            <article v-for="(option, index) in activeQuestion.options" :key="`${activeQuestion.id}-${index}`">
              <div class="field">
                <label>{{ t('build.trivia.questions.answerLabel', { index: index + 1 }) }}</label>
                <input
                  v-model="activeQuestion.options[index]"
                  :placeholder="t('build.trivia.questions.answerPlaceholder')"
                />
              </div>
              <div class="field">
                <label>{{ t('build.trivia.questions.answerImage') }}</label>
                <ImageUploader
                  v-model="activeQuestion.media.optionImageUrls[index]"
                  :uploadFolder="`trivia/${validatedGameId}/options/${activeQuestion.id}/${index}`"
                  :cropWidth="256"
                  :cropHeight="256"
                />
              </div>
              <label class="radio">
                <input
                  type="radio"
                  :name="`correct-${activeQuestion.id}`"
                  :value="option"
                  v-model="activeQuestion.correctAnswer"
                />
                <span>{{ t('build.trivia.questions.markCorrect') }}</span>
              </label>
              <button
                type="button"
                class="ghost ghost--danger"
                :disabled="activeQuestion.options.length <= 2"
                @click="removeOption(activeQuestion, index)"
              >
                {{ t('build.trivia.questions.removeAnswer') }}
              </button>
            </article>
            <CustomButton
              type="is-success is-light"
              :label="t('build.trivia.questions.addAnswer')"
              @click="addOption(activeQuestion)"
            />
          </section>

          <div class="question-actions">
            <CustomButton
              type="is-primary"
              :label="t('build.trivia.questions.saveAndAdd')"
              @click="handleSaveAndAddQuestion"
            />
          </div>
        </div>

        <div v-else class="empty-state">
          <p>{{ t('build.trivia.questions.noSelection') }}</p>
        </div>
      </aside>
    </section>

    <section v-else class="wizard-layout">
      <div class="wizard-layout__form">
        <header class="wizard-header">
          <p class="wizard-header__eyebrow">{{ t('build.trivia.theme.eyebrow') }}</p>
          <h2 class="wizard-header__title">{{ t('build.trivia.theme.title') }}</h2>
          <p class="wizard-header__subtitle">{{ t('build.trivia.theme.subtitle') }}</p>
        </header>

        <div class="theme-grid">
          <div v-for="field in themeFields" :key="field.key" class="field theme-field">
            <label :for="`${ids.theme}-${field.key}`">{{ t(field.label) }}</label>
            <input
              :id="`${ids.theme}-${field.key}`"
              :type="field.type"
              v-model="config.theme[field.key as keyof typeof config.theme]"
              :placeholder="field.placeholder"
            />
            <p class="muted">{{ t(field.hint) }}</p>
          </div>
        </div>
      </div>

      <aside class="wizard-layout__preview">
        <div class="theme-preview">
          <div class="theme-preview__swatch" :style="{ background: config.theme.primaryColor || '#00e8e0' }">
            <span>{{ t('build.trivia.theme.primarySwatch') }}</span>
          </div>
          <div class="theme-preview__swatch" :style="{ background: config.theme.secondaryColor || '#ff2d92' }">
            <span>{{ t('build.trivia.theme.secondarySwatch') }}</span>
          </div>
          <div
            class="theme-preview__canvas"
            :style="{
              backgroundColor: config.theme.backgroundColor || '#050505',
              backgroundImage: config.theme.backgroundImageUrl ? `url(${config.theme.backgroundImageUrl})` : undefined,
              boxShadow: config.theme.backgroundOverlayColor ? `0 0 0 8px ${config.theme.backgroundOverlayColor}` : undefined
            }"
          >
            <span>{{ t('build.trivia.theme.canvasLabel') }}</span>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { useLocaleStore } from '@/stores/locale';
import type { TriviaAnswer, TriviaConfig, TriviaPowerUpRule, TriviaQuestion } from '@top-x/shared/types/trivia';
import { computeAnswerHash, ensureSalt, hasHashSecret } from '@top-x/shared/utils/triviaHash';

type TriviaStep = 'session' | 'questions' | 'theme';

interface TriviaConfigWithTheme extends TriviaConfig {
  theme: NonNullable<TriviaConfig['theme']>;
  globalTimer: NonNullable<TriviaConfig['globalTimer']>;
  powerUps: TriviaPowerUpRule[];
  questions: EditableTriviaQuestion[];
  allowRepeats?: boolean;
  unlimitedLives?: boolean;
  showCorrectAnswers?: boolean;
  showCorrectAnswersOnEnd?: boolean;
  mustLogin?: boolean;
  lives?: number | null;
  powerUpsActive?: boolean;
}

const props = defineProps<{
  modelValue: TriviaConfig;
  gameId?: string;
  activeStep: TriviaStep;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: TriviaConfig): void;
}>();

if (!hasHashSecret()) {
  console.warn('[Build/AddTrivia] Missing VITE_TRIVIA_HASH_SECRET. Hashing will fail.');
}

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const ids = {
  lives: 'trivia-lives',
  timerDuration: 'trivia-timer-duration',
  powerUpId: 'trivia-powerup-id',
  powerUpLabel: 'trivia-powerup-label',
  powerUpSpawn: 'trivia-powerup-spawn',
  powerUpMax: 'trivia-powerup-max',
  powerUpCooldown: 'trivia-powerup-cooldown',
  powerUpDescription: 'trivia-powerup-description',
  theme: 'trivia-theme',
} as const;

type QuestionMedia = {
  imageUrl?: string | null;
  optionImageUrls?: (string | null)[];
};

type EditableTriviaQuestion = TriviaQuestion & {
  options: string[];
  correctAnswer?: string;
  media?: QuestionMedia;
};

const themeFields = [
  {
    key: 'primaryColor',
    label: 'build.trivia.theme.primaryLabel',
    hint: 'build.trivia.theme.primaryHint',
    type: 'color',
    placeholder: '#00E8E0',
  },
  {
    key: 'secondaryColor',
    label: 'build.trivia.theme.secondaryLabel',
    hint: 'build.trivia.theme.secondaryHint',
    type: 'color',
    placeholder: '#FF2D92',
  },
  {
    key: 'backgroundColor',
    label: 'build.trivia.theme.backgroundColorLabel',
    hint: 'build.trivia.theme.backgroundColorHint',
    type: 'color',
    placeholder: '#050505',
  },
  {
    key: 'backgroundImageUrl',
    label: 'build.trivia.theme.backgroundImageLabel',
    hint: 'build.trivia.theme.backgroundImageHint',
    type: 'text',
    placeholder: 'https://…',
  },
  {
    key: 'backgroundVideoUrl',
    label: 'build.trivia.theme.backgroundVideoLabel',
    hint: 'build.trivia.theme.backgroundVideoHint',
    type: 'text',
    placeholder: 'https://…',
  },
  {
    key: 'backgroundOverlayColor',
    label: 'build.trivia.theme.overlayLabel',
    hint: 'build.trivia.theme.overlayHint',
    type: 'text',
    placeholder: '#00000088',
  },
] as const;

const DEFAULT_THEME_COLORS = {
  primaryColor: '#00E8E0',
  secondaryColor: '#FF2D92',
  backgroundColor: '#050505',
} as const;

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_COLOR_REGEX.test(value)) {
    return value.toUpperCase();
  }
  return fallback;
}

function applyThemeDefaults(theme: NonNullable<TriviaConfig['theme']>) {
  theme.primaryColor = normalizeHexColor(theme.primaryColor, DEFAULT_THEME_COLORS.primaryColor);
  theme.secondaryColor = normalizeHexColor(theme.secondaryColor, DEFAULT_THEME_COLORS.secondaryColor);
  theme.backgroundColor = normalizeHexColor(theme.backgroundColor, DEFAULT_THEME_COLORS.backgroundColor);
}

const config = ref<TriviaConfigWithTheme>(hydrateConfig(props.modelValue));
const isSyncing = ref(false);
const selectedQuestionIndex = ref(0);

const questionLabel = computed(() => {
  const index = selectedQuestionIndex.value + 1;
  const translatedWithIndex = t('build.trivia.preview.questionLabel', { index }) as unknown as string | undefined;
  if (translatedWithIndex && !translatedWithIndex.includes('{')) {
    return translatedWithIndex;
  }
  const base = t('build.trivia.preview.questionLabel') as unknown as string | undefined;
  const fallback =
    t('build.trivia.preview.questionLabelFallback') as unknown as string | undefined;
  const prefix =
    (base && !base.includes('{') && base) ||
    (fallback && !fallback.includes('{') && fallback) ||
    'Question';
  return `${prefix} ${index}`;
});

const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\\/]/g, '');
});

const activeQuestion = computed<EditableTriviaQuestion | null>(
  () => config.value.questions[selectedQuestionIndex.value] ?? null,
);

watch(
  () => props.modelValue,
  (value) => {
    if (isSyncing.value) return;
    isSyncing.value = true;
    config.value = hydrateConfig(value);
    nextTick(() => {
      ensureSelectedQuestionInRange();
      isSyncing.value = false;
    });
  },
  { deep: true },
);

watch(
  config,
  async (value) => {
    if (isSyncing.value) return;
    isSyncing.value = true;
    try {
      const sanitized = await sanitizeConfig(value);
      emit('update:modelValue', sanitized);
    } catch (error) {
      console.error('[Build/AddTrivia] Failed to sanitize config', error);
    } finally {
      nextTick(() => {
        isSyncing.value = false;
      });
    }
  },
  { deep: true },
);

watch(
  () => config.value.questions.length,
  () => ensureSelectedQuestionInRange(),
);

watch(
  () => config.value.unlimitedLives,
  (unlimited) => {
    if (!unlimited) {
      config.value.showCorrectAnswers = false;
      config.value.showCorrectAnswersOnEnd = false;
    }
  },
  { immediate: true },
);

watch(
  () => config.value.globalTimer.enabled,
  (enabled) => {
    if (!enabled) {
      config.value.globalTimer.durationSeconds = undefined;
    }
  },
  { immediate: true },
);

function ensureSelectedQuestionInRange() {
  const maxIndex = config.value.questions.length - 1;
  if (maxIndex < 0) {
    selectedQuestionIndex.value = 0;
    return;
  }
  if (selectedQuestionIndex.value > maxIndex) {
    selectedQuestionIndex.value = maxIndex;
  }
}

function hydrateConfig(value: TriviaConfig): TriviaConfigWithTheme {
  const base: TriviaConfig = value
    ? JSON.parse(JSON.stringify(value))
    : ({
        mode: 'fixed',
        questions: [],
        language: '',
        powerUpsActive: false,
        allowRepeats: false,
        unlimitedLives: true,
        showCorrectAnswers: true,
        showCorrectAnswersOnEnd: true,
        mustLogin: false,
        globalTimer: { enabled: false },
        theme: {},
        powerUps: [],
      } as TriviaConfig);

  base.mode = 'fixed';
  base.language = base.language ?? '';
  base.solveThreshold = undefined;
  base.questionBatchSize = undefined;
  base.isHybrid = false;

  if (!base.globalTimer) {
    base.globalTimer = { enabled: false };
  }
  if (!base.theme) {
    base.theme = {};
  }
  applyThemeDefaults(base.theme);
  if (!Array.isArray(base.powerUps)) {
    base.powerUps = [];
  }

  const correctAnswerMap = base.correctAnswers ?? {};
  const hydratedQuestions = (base.questions ?? []).map((question) =>
    hydrateQuestion(question, correctAnswerMap),
  ) as EditableTriviaQuestion[];
  base.questions =
    hydratedQuestions.length > 0 ? hydratedQuestions : [createEmptyQuestion(correctAnswerMap)];
  base.correctAnswers = correctAnswerMap;

  if (base.unlimitedLives === false) {
    base.lives = sanitizePositiveInteger(base.lives) ?? 3;
  } else {
    base.unlimitedLives = true;
    base.lives = base.lives ?? undefined;
  }

  return base as TriviaConfigWithTheme;
}

function hydrateQuestion(
  question: TriviaQuestion,
  correctAnswers: Record<string, string>,
): EditableTriviaQuestion {
  const hydrated = JSON.parse(JSON.stringify(question)) as EditableTriviaQuestion;
  hydrated.id = hydrated.id?.trim() || createQuestionId();
  hydrated.text = hydrated.text ?? '';

  const answerOptions =
    Array.isArray(question.answers) && question.answers.length > 0
      ? question.answers.map((answer) => (answer?.text ?? '').trim())
      : Array.isArray((question as unknown as { options?: string[] }).options)
        ? ((question as unknown as { options?: string[] }).options ?? []).map((option) => option ?? '')
        : [];

  const normalizedOptions = answerOptions.length ? [...answerOptions] : [];

  while (normalizedOptions.length < 2) {
    normalizedOptions.push('');
  }

  hydrated.options = normalizedOptions;

  hydrated.answers =
    Array.isArray(question.answers) && question.answers.length
      ? question.answers.map((answer) => ({
          text: (answer?.text ?? '').trim(),
          imageUrl: answer?.imageUrl ?? undefined,
        }))
      : [];

  if (!hydrated.media) {
    hydrated.media = {};
  }

  const media = hydrated.media as QuestionMedia;
  const baseQuestionImage =
    typeof question.imageUrl === 'string' ? question.imageUrl : media.imageUrl ?? '';
  media.imageUrl = typeof baseQuestionImage === 'string' ? baseQuestionImage : '';

  const answerImages =
    Array.isArray(question.answers) && question.answers.length
      ? question.answers.map((answer) => (answer?.imageUrl ?? '') || '')
      : Array.isArray(media.optionImageUrls)
        ? [...media.optionImageUrls]
        : [];

  media.optionImageUrls = hydrated.options.map((_, index) => {
    const value = answerImages[index];
    return typeof value === 'string' ? value : '';
  });

  const mappedCorrect =
    (typeof question.correctAnswer === 'string' && question.correctAnswer.trim()) ||
    correctAnswers[hydrated.id];

  if (mappedCorrect && hydrated.options.includes(mappedCorrect)) {
    hydrated.correctAnswer = mappedCorrect;
  } else if (!hydrated.correctAnswer || !hydrated.options.includes(hydrated.correctAnswer)) {
    hydrated.correctAnswer = hydrated.options[0];
  }

  return hydrated;
}

async function sanitizeConfig(value: TriviaConfigWithTheme): Promise<TriviaConfig> {
  const clone: TriviaConfig = JSON.parse(JSON.stringify(value));
  const questionResults = await Promise.all(
    (clone.questions ?? []).map((question) => sanitizeQuestion(question as EditableTriviaQuestion)),
  );
  const correctAnswerMap: Record<string, string> = {};
  clone.questions = questionResults.map(({ sanitized, correctAnswer }) => {
    if (sanitized.id && correctAnswer) {
      correctAnswerMap[sanitized.id] = correctAnswer;
    }
    return sanitized;
  });
  clone.mode = 'fixed';
  clone.language = (clone.language ?? '').trim() || undefined;
  clone.solveThreshold = undefined;
  clone.questionBatchSize = undefined;
  clone.isHybrid = false;

  clone.unlimitedLives = Boolean(clone.unlimitedLives);
  if (!clone.unlimitedLives) {
    clone.lives = sanitizePositiveInteger(clone.lives) ?? 3;
  } else {
    clone.lives = undefined;
  }

  clone.powerUpsActive = Boolean(clone.powerUpsActive);
  clone.allowRepeats = Boolean(clone.allowRepeats);
  clone.mustLogin = Boolean(clone.mustLogin);
  clone.showCorrectAnswers = clone.unlimitedLives ? Boolean(clone.showCorrectAnswers) : false;
  clone.showCorrectAnswersOnEnd = clone.unlimitedLives ? Boolean(clone.showCorrectAnswersOnEnd) : false;

  if (!clone.globalTimer?.enabled) {
    clone.globalTimer = { enabled: false };
  } else {
    const duration = sanitizePositiveInteger(clone.globalTimer.durationSeconds);
    if (duration !== undefined) {
      clone.globalTimer.durationSeconds = duration;
    } else {
      delete clone.globalTimer.durationSeconds;
    }
  }

  clone.theme = sanitizeTheme(clone.theme ?? {});
  clone.powerUps = (clone.powerUps ?? []).map(sanitizePowerUp).filter((powerUp) => powerUp.id && powerUp.label);
  clone.correctAnswers = correctAnswerMap;

  return JSON.parse(JSON.stringify(clone)) as TriviaConfig;
}

async function sanitizeQuestion(
  question: EditableTriviaQuestion,
): Promise<{ sanitized: TriviaQuestion; correctAnswer: string }> {
  const working = JSON.parse(JSON.stringify(question)) as EditableTriviaQuestion;
  working.id = working.id?.trim() || createQuestionId();
  working.text = working.text?.trim() ?? '';

  working.options = (working.options ?? []).map((option: string) => option?.trim() ?? '').filter(Boolean);

  if (working.options.length < 2) {
    while (working.options.length < 2) {
      working.options.push(`Answer ${working.options.length + 1}`);
    }
  }

  if (!working.correctAnswer || !working.options.includes(working.correctAnswer)) {
    working.correctAnswer = working.options[0];
  } else {
    working.correctAnswer = working.correctAnswer.trim();
  }

  let questionImage: string | undefined;
  let optionImages: (string | undefined)[] = [];

  const trimmedImageFromQuestion =
    typeof working.imageUrl === 'string' ? working.imageUrl.trim() : undefined;
  if (trimmedImageFromQuestion) {
    questionImage = trimmedImageFromQuestion;
  }

  if (working.media) {
    const media = working.media as QuestionMedia;
    const mediaImage = typeof media.imageUrl === 'string' ? media.imageUrl.trim() : '';
    if (mediaImage) {
      questionImage = mediaImage;
    }
    if (media.optionImageUrls) {
      optionImages = working.options.map((_, index) => {
        const raw = media.optionImageUrls?.[index];
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          return trimmed || undefined;
        }
        return undefined;
      });
    }
  }

  const answers: TriviaAnswer[] = working.options.map((optionText, index) => {
    const answer: TriviaAnswer = { text: optionText };
    const imageUrl = optionImages[index];
    if (imageUrl) {
      answer.imageUrl = imageUrl;
    }
    return answer;
  });

  const sanitized: TriviaQuestion = {
    id: working.id,
    text: working.text,
    answers,
    category: working.category?.trim() || undefined,
    difficulty: working.difficulty || undefined,
  };

  if (questionImage) {
    sanitized.imageUrl = questionImage;
  }

  const correctAnswer = working.correctAnswer ?? '';

  const ensuredSalt = ensureSalt(working.salt);
  sanitized.salt = ensuredSalt;

  if (correctAnswer) {
    try {
      sanitized.hash = await computeAnswerHash(working.id, correctAnswer, ensuredSalt);
    } catch (error) {
      console.error('[Build/AddTrivia] Failed to compute answer hash', {
        id: working.id,
        error,
      });
    }
  }

  if (!sanitized.hash) {
    console.warn('[Build/AddTrivia] Question missing hash after sanitization', {
      id: sanitized.id,
      hasSalt: Boolean(sanitized.salt),
      correctAnswer,
    });
  }

  delete (sanitized as { correctAnswer?: string }).correctAnswer;

  if (!sanitized.hash || !sanitized.salt) {
    console.warn('[Build/AddTrivia] Question missing hash or salt before emit', {
      id: sanitized.id,
      hasHash: Boolean(sanitized.hash),
      hasSalt: Boolean(sanitized.salt),
    });
  }

  return { sanitized, correctAnswer };
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

function sanitizeTheme(theme: NonNullable<TriviaConfig['theme']>): NonNullable<TriviaConfig['theme']> {
  const cleaned = { ...theme };
  Object.keys(cleaned).forEach((key) => {
    const value = (cleaned as Record<string, unknown>)[key];
    if (value === '' || value === null || value === undefined) {
      delete (cleaned as Record<string, unknown>)[key];
    }
  });
  applyThemeDefaults(cleaned);
  return cleaned;
}

function sanitizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value) || value < 0) return undefined;
  return Math.floor(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createQuestionId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function handleAddQuestion() {
  const question = createEmptyQuestion(config.value.correctAnswers ?? {});
  config.value.questions.push(question);
  nextTick(() => {
    selectedQuestionIndex.value = config.value.questions.length - 1;
  });
}

function handleSaveAndAddQuestion() {
  handleAddQuestion();
  nextTick(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function createEmptyQuestion(
  correctAnswers: Record<string, string> = {},
): EditableTriviaQuestion {
  return hydrateQuestion(
    {
      id: createQuestionId(),
      text: '',
      answers: [{ text: '' }, { text: '' }],
      correctAnswer: '',
      imageUrl: '',
    } as TriviaQuestion,
    correctAnswers,
  );
}

function selectQuestion(index: number) {
  selectedQuestionIndex.value = index;
}

function reorderQuestion(index: number, direction: -1 | 1) {
  const questions = config.value.questions;
  const target = index + direction;
  if (target < 0 || target >= questions.length) return;
  const [item] = questions.splice(index, 1);
  questions.splice(target, 0, item);
  if (selectedQuestionIndex.value === index) {
    selectedQuestionIndex.value = target;
  } else if (selectedQuestionIndex.value === target) {
    selectedQuestionIndex.value = index;
  }
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
  if (config.value.questions.length === 0) {
    config.value.questions.push(createEmptyQuestion(config.value.correctAnswers ?? {}));
  }
  ensureSelectedQuestionInRange();
}

function addOption(question: EditableTriviaQuestion) {
  question.options = question.options ?? [];
  question.options.push('');
  ensureOptionImages(question);
  if (!question.correctAnswer) {
    question.correctAnswer = question.options[0] ?? '';
  }
}

function removeOption(question: EditableTriviaQuestion, index: number) {
  question.options.splice(index, 1);
  if (question.options.length < 2) {
    question.options.push('');
  }
  ensureOptionImages(question);
  if (!question.options.includes(question.correctAnswer)) {
    question.correctAnswer = question.options[0] ?? '';
  }
}

function ensureOptionImages(question: EditableTriviaQuestion) {
  if (!question.media) {
    question.media = {};
  }
  const media = question.media as QuestionMedia;
  media.imageUrl = typeof media.imageUrl === 'string' ? media.imageUrl : '';
  const existing = Array.isArray(media.optionImageUrls) ? [...media.optionImageUrls] : [];
  media.optionImageUrls = (question.options ?? []).map((_, i) => {
    const value = existing[i];
    return typeof value === 'string' ? value : '';
  });
}

function addPowerUp() {
  config.value.powerUps.push({ id: '', label: '' });
}

function removePowerUp(index: number) {
  config.value.powerUps.splice(index, 1);
}

const livesPreview = computed(() =>
  config.value.unlimitedLives ? t('build.trivia.preview.unlimited') : String(config.value.lives ?? 3),
);

const answersPreview = computed(() => {
  if (!config.value.unlimitedLives) {
    return t('build.trivia.preview.hidden');
  }
  if (config.value.showCorrectAnswers && config.value.showCorrectAnswersOnEnd) {
    return t('build.trivia.preview.answersAll');
  }
  if (config.value.showCorrectAnswers) {
    return t('build.trivia.preview.answersPerQuestion');
  }
  if (config.value.showCorrectAnswersOnEnd) {
    return t('build.trivia.preview.answersSummary');
  }
  return t('build.trivia.preview.answersHidden');
});

const powerUpSummary = computed(() => {
  if (!config.value.powerUpsActive) {
    return t('build.trivia.preview.disabled');
  }
  const count = config.value.powerUps.length;
  if (count === 0) {
    return t('build.trivia.preview.powerUpsNone');
  }
  if (count === 1) {
    return config.value.powerUps[0].label || t('build.trivia.preview.powerUpsSingle');
  }
  return t('build.trivia.preview.powerUpsCount', { count });
});

const timerSummary = computed(() => {
  if (!config.value.globalTimer.enabled) {
    return t('build.trivia.preview.disabled');
  }
  return t('build.trivia.preview.timerValue', {
    seconds: config.value.globalTimer.durationSeconds || 0,
  });
});
</script>

<style scoped>
.trivia-wizard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.wizard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 2rem;
  width: 100%;
}

.wizard-layout__form,
.wizard-layout__preview {
  background: rgba(12, 12, 12, 0.8);
  border-radius: 18px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
}

.wizard-layout__preview {
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.75), rgba(8, 8, 8, 0.9));
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wizard-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.wizard-header__eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  color: rgba(0, 232, 224, 0.9);
  margin: 0;
}

.wizard-header__title {
  font-size: 1.9rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.wizard-header__subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

.settings-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.settings-card {
  background: rgba(23, 23, 23, 0.75);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-card h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #ffffff;
  font-weight: 600;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--bulma-primary, #00e8e0);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.field input,
.field textarea,
.field select {
  background: rgba(5, 5, 5, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: rgba(0, 232, 224, 0.6);
  box-shadow: 0 0 0 1px rgba(0, 232, 224, 0.3);
}

.field--inline {
  position: relative;
  padding-right: 2.5rem;
}

.field--suffix {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
}

.powerup-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.powerup-card {
  background: rgba(10, 10, 10, 0.65);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.powerup-card__row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.muted {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85rem;
  margin: 0;
}

.ghost {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 0.45rem 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.ghost:hover:not(:disabled) {
  background: rgba(0, 232, 224, 0.16);
  border-color: rgba(0, 232, 224, 0.4);
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost--danger {
  border-color: rgba(255, 92, 141, 0.3);
  color: rgba(255, 126, 153, 0.95);
}

.ghost--danger:hover:not(:disabled) {
  background: rgba(255, 92, 141, 0.15);
  border-color: rgba(255, 92, 141, 0.45);
}

.session-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.session-preview header h3 {
  margin: 0.25rem 0 0;
  color: #ffffff;
  font-size: 1.35rem;
}

.session-preview__board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.25rem;
}

.session-preview__row {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.session-preview__row strong {
  color: #ffffff;
}

.question-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-list__item {
  background: rgba(20, 20, 20, 0.7);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-list__item--active {
  border-color: rgba(0, 232, 224, 0.45);
  box-shadow: 0 16px 28px rgba(0, 232, 224, 0.18);
}

.question-list__select {
  background: none;
  border: none;
  text-align: left;
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  color: inherit;
  cursor: pointer;
}

.question-list__index {
  font-weight: 700;
  color: rgba(0, 232, 224, 0.85);
  font-size: 1.1rem;
}

.question-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.empty-state {
  background: rgba(15, 15, 15, 0.6);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.question-preview {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: rgba(12, 12, 12, 0.65);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.5rem;
}

.question-preview__label {
  margin-bottom: 0.5rem;
}

.question-preview__title {
  width: 100%;
  background: rgba(6, 6, 6, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 600;
  padding: 0.85rem 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.question-preview__title:focus {
  outline: none;
  border-color: rgba(0, 232, 224, 0.6);
  box-shadow: 0 0 0 1px rgba(0, 232, 224, 0.25);
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.answer-list article {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(6, 6, 6, 0.55);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.answer-list .radio {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.answer-list .radio input[type='radio'] {
  width: 16px;
  height: 16px;
  accent-color: rgba(0, 232, 224, 0.9);
}

.question-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.theme-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.theme-field {
  background: rgba(15, 15, 15, 0.55);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1rem;
}

.theme-preview {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  align-items: stretch;
}

.theme-preview__swatch,
.theme-preview__canvas {
  border-radius: 16px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.theme-preview__canvas {
  min-height: 160px;
  background-size: cover;
  background-position: center;
}

@media (max-width: 1180px) {
  .wizard-layout {
    grid-template-columns: 1fr;
  }
}
</style>


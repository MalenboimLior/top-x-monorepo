<template>
  <div class="trivia-builder">
    <!-- Questions Section - Primary Focus -->
    <section class="questions-section">
      <header class="questions-header">
        <div class="questions-header__content">
          <h2 class="questions-header__title">{{ t('build.trivia.questions.title', { count: config.questions.length }) }}</h2>
          <p class="questions-header__subtitle">{{ t('build.trivia.questions.subtitle') }}</p>
        </div>
        <div class="questions-header__actions">
          <CustomButton 
            type="is-primary" 
            :label="t('build.trivia.questions.addQuestion')" 
            @click="handleAddQuestion" 
          />
        </div>
      </header>

      <div v-if="config.questions.length" class="questions-list">
        <article
          v-for="(question, index) in config.questions"
          :key="question.id"
          :data-question-index="index"
          class="question-card"
        >
          <div class="question-card__main">
            <div class="question-card__number">{{ index + 1 }}</div>
            
            <div class="question-card__body">
              <div class="question-card__question">
                <input
                  v-model="question.text"
                  :placeholder="t('build.trivia.questions.promptPlaceholder')"
                  class="question-input"
                />
              </div>
              
              <div class="question-card__answers">
                <div
                  v-for="(option, optionIndex) in question.options"
                  :key="`${question.id}-${optionIndex}`"
                  class="answer-option"
                  :class="{ 'answer-option--correct': question.correctAnswer === option }"
                >
                  <label class="radio answer-option__radio">
                    <input
                      type="radio"
                      :name="`correct-${question.id}`"
                      :value="option"
                      v-model="question.correctAnswer"
                    />
                    <span class="answer-option__number">{{ optionIndex + 1 }}</span>
                  </label>
                  <input
                    v-model="question.options[optionIndex]"
                    :placeholder="t('build.trivia.questions.answerPlaceholder')"
                    class="answer-option__input"
                  />
                  <button
                    type="button"
                    class="answer-option__remove"
                    :disabled="question.options.length <= 2"
                    @click="removeOption(question, optionIndex)"
                    :title="t('build.trivia.questions.removeAnswer')"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  class="answer-add"
                  @click="addOption(question)"
                  :title="t('build.trivia.questions.addAnswer')"
                >
                  + {{ t('build.trivia.questions.addAnswer') }}
                </button>
              </div>
            </div>

            <div class="question-card__actions">
              <button
                type="button"
                class="action-btn"
                :disabled="index === 0"
                @click="reorderQuestion(index, -1)"
                :title="t('build.trivia.questions.moveUp')"
              >
                ↑
              </button>
              <button
                type="button"
                class="action-btn"
                :disabled="index === config.questions.length - 1"
                @click="reorderQuestion(index, 1)"
                :title="t('build.trivia.questions.moveDown')"
              >
                ↓
              </button>
              <button
                type="button"
                class="action-btn action-btn--secondary"
                @click="duplicateQuestion(index)"
                :title="t('build.trivia.questions.duplicate')"
              >
                📋
              </button>
              <button
                type="button"
                class="action-btn action-btn--danger"
                @click="removeQuestion(index)"
                :title="t('build.trivia.questions.remove')"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Optional Images Section - Collapsible -->
          <div class="question-card__images">
            <button
              type="button"
              class="images-toggle"
              @click="toggleQuestionImages(index)"
            >
              <span>{{ t('build.trivia.questions.imagesToggle') }}</span>
              <span class="images-toggle__icon" :class="{ 'images-toggle__icon--open': expandedImages.has(index) }">
                ▼
              </span>
            </button>
            
            <div v-if="expandedImages.has(index)" class="images-content">
              <div class="field">
                <label>{{ t('build.trivia.questions.imageLabel') }}</label>
                <ImageUploader
                  v-model="question.media.imageUrl"
                  :uploadFolder="`trivia/${validatedGameId}/questions/${question.id}`"
                  :cropWidth="512"
                  :cropHeight="512"
                />
              </div>
              
              <div class="answer-images">
                <div
                  v-for="(option, optionIndex) in question.options"
                  :key="`img-${question.id}-${optionIndex}`"
                  class="answer-image-item"
                >
                  <label>{{ t('build.trivia.questions.answerImage') }} {{ optionIndex + 1 }}</label>
                  <ImageUploader
                    v-model="question.media.optionImageUrls[optionIndex]"
                    :uploadFolder="`trivia/${validatedGameId}/options/${question.id}/${optionIndex}`"
                    :cropWidth="256"
                    :cropHeight="256"
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <p>{{ t('build.trivia.questions.empty') }}</p>
        <CustomButton
          type="is-primary"
          :label="t('build.trivia.questions.addFirstQuestion') || 'Add Your First Question'"
          @click="handleAddQuestion"
        />
      </div>
    </section>

    <!-- Advanced Settings - Collapsible -->
    <section class="settings-section">
      <button
        type="button"
        class="settings-toggle"
        @click="showAdvancedSettings = !showAdvancedSettings"
      >
        <span>{{ t('build.trivia.settings.title') || 'Advanced Settings' }}</span>
        <span class="settings-toggle__icon" :class="{ 'settings-toggle__icon--open': showAdvancedSettings }">
          ▼
        </span>
      </button>

      <div v-if="showAdvancedSettings" class="settings-content">
        <!-- Session Settings -->
        <div class="settings-group">
          <h3>{{ t('build.trivia.session.title') || 'Game Settings' }}</h3>
          
          <div class="settings-grid">
            <div class="settings-card">
              <h4>{{ t('build.trivia.session.lives.title') }}</h4>
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
              <h4>{{ t('build.trivia.session.correctAnswers.title') }}</h4>
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
              <h4>{{ t('build.trivia.session.timer.title') }}</h4>
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

            <div class="settings-card">
              <h4>{{ t('build.trivia.session.access.title') }}</h4>
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
          </div>
        </div>

        <!-- Power Ups -->
        <div class="settings-group">
          <h3>{{ t('build.trivia.session.powerUps.title') }}</h3>
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

        <!-- Theme Settings -->
        <div class="settings-group">
          <h3>{{ t('build.trivia.theme.title') }}</h3>
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
      </div>
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
  activeStep?: 'session' | 'questions' | 'theme'; // Made optional for backward compatibility
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
const expandedImages = ref<Set<number>>(new Set());
const showAdvancedSettings = ref(false);

const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\\/]/g, '');
});

watch(
  () => props.modelValue,
  (value) => {
    if (isSyncing.value) return;
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

function toggleQuestionImages(index: number) {
  if (expandedImages.value.has(index)) {
    expandedImages.value.delete(index);
  } else {
    expandedImages.value.add(index);
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
  const newIndex = config.value.questions.length - 1;
  nextTick(() => {
    // Scroll to new question
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const element = document.querySelector(`[data-question-index="${newIndex}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
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

function reorderQuestion(index: number, direction: -1 | 1) {
  const questions = config.value.questions;
  const target = index + direction;
  if (target < 0 || target >= questions.length) return;
  const [item] = questions.splice(index, 1);
  questions.splice(target, 0, item);
  
  // Update expanded images state
  const wasExpanded = expandedImages.value.has(index);
  expandedImages.value.delete(index);
  if (wasExpanded) {
    expandedImages.value.add(target);
  }
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
  expandedImages.value.delete(index);
  
  // Reindex expanded images
  const newExpanded = new Set<number>();
  expandedImages.value.forEach((i) => {
    if (i < index) {
      newExpanded.add(i);
    } else if (i > index) {
      newExpanded.add(i - 1);
    }
  });
  expandedImages.value = newExpanded;
  
  if (config.value.questions.length === 0) {
    config.value.questions.push(createEmptyQuestion(config.value.correctAnswers ?? {}));
  }
}

function duplicateQuestion(index: number) {
  const question = config.value.questions[index];
  const duplicated = JSON.parse(JSON.stringify(question)) as EditableTriviaQuestion;
  duplicated.id = createQuestionId();
  duplicated.text = `${duplicated.text} (Copy)`;
  config.value.questions.splice(index + 1, 0, duplicated);
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
</script>

<style scoped>
.trivia-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Header */
.questions-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.questions-header__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
}

.questions-header__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Question Cards - Compact Design */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-subtle);
  border-radius: 0;
  padding: 1rem 0;
  transition: all 0.2s ease;
}

.question-card:hover {
  border-bottom-color: var(--color-border-medium);
}

.question-card:last-child {
  border-bottom: none;
}

.question-card__main {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.question-card__number {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--bulma-primary);
  flex-shrink: 0;
}

.question-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card__question {
  width: 100%;
}

.question-input {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  padding: 0.5rem 0.75rem;
  transition: border-color 0.2s ease;
}

.question-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.question-card__answers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.answer-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.answer-option:hover {
  background: var(--color-bg-elevated);
}

.answer-option--correct {
  border-color: var(--color-border-primary);
  background: var(--color-primary-bg);
}

.answer-option__radio {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
}

.answer-option__number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.answer-option__radio input[type='radio'] {
  display: none;
}

.answer-option__radio input[type='radio']:checked + .answer-option__number {
  background: var(--bulma-primary);
  border-color: var(--bulma-primary);
  color: var(--color-text-on-primary);
}

.answer-option__input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.answer-option__input:focus {
  outline: none;
}

.answer-option__input::placeholder {
  color: var(--color-text-tertiary);
}

.answer-option__remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.answer-option__remove:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}

.answer-option__remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.answer-add {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.answer-add:hover {
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
  background: var(--color-primary-bg);
}

.question-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-primary-bg);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn--danger:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}

/* Images Section - Collapsible */
.question-card__images {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border-subtle);
}

.question-card:last-child .question-card__images {
  border-top: 1px solid var(--color-border-subtle);
}

.images-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.images-toggle:hover {
  color: var(--color-text-secondary);
}

.images-toggle__icon {
  transition: transform 0.2s ease;
  font-size: 0.75rem;
}

.images-toggle__icon--open {
  transform: rotate(180deg);
}

.images-content {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.answer-images {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.answer-image-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.answer-image-item label {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Empty State */
.empty-state {
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-md);
  padding: 2rem;
  text-align: center;
  color: var(--color-text-tertiary);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

/* Settings Section */
.settings-section {
  border-top: 1px solid var(--color-border-subtle);
  padding-top: 1.5rem;
  margin-top: 0.5rem;
}

.settings-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-toggle:hover {
  border-bottom-color: var(--color-border-medium);
}

.settings-toggle__icon {
  transition: transform 0.2s ease;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.settings-toggle__icon--open {
  transform: rotate(180deg);
}

.settings-content {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-group h3 {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.settings-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.settings-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-card h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--bulma-primary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.field input,
.field textarea,
.field select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field--inline {
  position: relative;
  padding-right: 3rem;
}

.field--suffix {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
}

.powerup-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.powerup-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
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
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  margin: 0;
}

.ghost {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.375rem 0.75rem;
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.ghost:hover:not(:disabled) {
  background: var(--color-primary-bg);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost--danger {
  border-color: var(--color-border-medium);
  color: var(--color-text-secondary);
}

.ghost--danger:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}

.theme-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.theme-field {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
}

@media (max-width: 768px) {
  .questions-header {
    flex-direction: column;
  }

  .question-card__main {
    flex-wrap: wrap;
  }

  .question-card__actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }

  .answer-images {
    grid-template-columns: 1fr;
  }
}
</style>


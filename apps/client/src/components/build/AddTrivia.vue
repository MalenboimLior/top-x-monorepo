<template>
  <div class="trivia-builder">
    <!-- Mode Selector -->
    <section class="mode-section">
      <h2 class="section-title">
        {{ t('build.trivia.settings.title') || 'Trivia Mode' }}
        <button type="button" class="info-btn" @click="openModeInfo('general')">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
        </button>
      </h2>
      <div class="mode-options">
        <label
          class="mode-option"
          :class="{ 'mode-option--selected': config.mode === 'classic' }"
        >
          <input
            type="radio"
            v-model="config.mode"
            value="classic"
            class="mode-radio"
          />
          <div class="mode-content">
            <span class="mode-icon">🎯</span>
            <div class="mode-label-wrapper">
              <span class="mode-label">{{ t('build.trivia.type.classic.label') || 'Classic' }}</span>
              <button type="button" class="info-btn info-btn--small" @click.stop.prevent="openModeInfo('classic')">
                <font-awesome-icon :icon="['fas', 'circle-info']" />
              </button>
            </div>
            <span class="mode-description">{{ t('build.trivia.type.classic.description') || 'Unlimited lives, show correct answers after each question' }}</span>
          </div>
        </label>
        <label
          class="mode-option"
          :class="{ 'mode-option--selected': config.mode === 'speed' }"
        >
          <input
            type="radio"
            v-model="config.mode"
            value="speed"
            class="mode-radio"
          />
          <div class="mode-content">
            <span class="mode-icon">⚡</span>
            <div class="mode-label-wrapper">
              <span class="mode-label">{{ t('build.trivia.type.speed.label') || 'Speed' }}</span>
              <button type="button" class="info-btn info-btn--small" @click.stop.prevent="openModeInfo('speed')">
                <font-awesome-icon :icon="['fas', 'circle-info']" />
              </button>
            </div>
            <span class="mode-description">{{ t('build.trivia.type.speed.description') || 'Limited lives, configurable lives count' }}</span>
          </div>
        </label>
      </div>
    </section>

    <!-- Questions Section -->
    <section ref="questionsSection" class="questions-section">
      <div class="section-header">
        <button
          type="button"
          class="section-toggle"
          @click="toggleSection('questions')"
        >
          <span class="section-toggle__title">{{ t('build.trivia.questions.title', { count: config.questions.length }) }}</span>
          <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showQuestions }">
            ▼
          </span>
        </button>
        <button type="button" class="info-btn" @click="openModeInfo('general')">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
        </button>
      </div>
      
      <div v-if="showQuestions" class="questions-section__content">
        <p class="section-hint">{{ t('build.trivia.questions.subtitle') }}</p>
        <div class="questions-header__actions">
          <CustomButton 
            type="is-primary" 
            :label="t('build.trivia.questions.addQuestion')" 
            @click="handleAddQuestion" 
          />
        </div>

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
                <div class="question-input-wrapper">
                  <input
                    v-model="question.text"
                    :placeholder="t('build.trivia.questions.promptPlaceholder')"
                    class="question-input"
                  />
                  <div class="question-image-upload-inline">
                    <ImageUploader
                      v-model="question.media.imageUrl"
                      :uploadFolder="`trivia/${validatedGameId}/questions/${question.id}`"
                      :cropWidth="512"
                      :cropHeight="512"
                    />
                  </div>
                </div>
              </div>
              
              <div class="question-card__answers">
                <div
                  v-for="(option, optionIndex) in question.options"
                  :key="`${question.id}-${optionIndex}`"
                  class="answer-option"
                  :class="{ 'answer-option--correct': getCorrectAnswerIndex(question) === optionIndex }"
                >
                  <label class="radio answer-option__radio">
                    <input
                      type="radio"
                      :name="`correct-${question.id}`"
                      :value="optionIndex"
                      @change="setCorrectAnswer(question, optionIndex)"
                      :checked="getCorrectAnswerIndex(question) === optionIndex"
                    />
                    <span 
                      class="answer-option__indicator"
                      :class="{ 'answer-option__indicator--correct': getCorrectAnswerIndex(question) === optionIndex }"
                    >
                      <span v-if="getCorrectAnswerIndex(question) === optionIndex" class="answer-option__checkmark">✓</span>
                      <span v-else class="answer-option__number">{{ optionIndex + 1 }}</span>
                    </span>
                  </label>
                  <div class="answer-option__content">
                    <div class="answer-input-wrapper">
                      <input
                        :value="question.options[optionIndex]"
                        @input="updateOptionText(question, optionIndex, ($event.target as HTMLInputElement).value)"
                        :placeholder="t('build.trivia.questions.answerPlaceholder')"
                        class="answer-option__input"
                      />
                      <div class="answer-image-upload-inline">
                        <ImageUploader
                          v-model="question.media.optionImageUrls[optionIndex]"
                          :uploadFolder="`trivia/${validatedGameId}/options/${question.id}/${optionIndex}`"
                          :cropWidth="256"
                          :cropHeight="256"
                        />
                      </div>
                    </div>
                  </div>
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
        
        <div v-if="config.questions.length" class="questions-footer">
          <CustomButton 
            type="is-primary" 
            :label="t('build.trivia.questions.addQuestion')" 
            @click="handleAddQuestion" 
          />
        </div>
      </div>
    </section>

    <!-- Advanced Settings -->
    <section ref="advancedSection" class="settings-section">
      <div class="section-header">
        <button
          type="button"
          class="settings-toggle"
          @click="toggleSection('advanced')"
        >
          <span>{{ t('build.trivia.settings.title') || 'Advanced Settings' }}</span>
          <span class="settings-toggle__icon" :class="{ 'settings-toggle__icon--open': showAdvancedSettings }">
            ▼
          </span>
        </button>
        <button type="button" class="info-btn" @click="openModeInfo('general')">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
        </button>
      </div>

      <div v-if="showAdvancedSettings" class="settings-content">
        <div class="settings-grid">
          <label class="toggle">
            <input type="checkbox" v-model="config.showProgress" />
            <span>{{ t('build.trivia.settings.showProgress') || 'Show progress bar' }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.settings.showProgress.hint')">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.shuffleQuestions" />
            <span>{{ t('build.trivia.settings.shuffleQuestions') || 'Shuffle questions' }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.settings.shuffleQuestions.hint')">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.shuffleAnswers" />
            <span>{{ t('build.trivia.settings.shuffleAnswers') || 'Shuffle answers' }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.settings.shuffleAnswers.hint')">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.mustLogin" />
            <span>{{ t('build.trivia.session.access.mustLogin') }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.settings.mustLogin.hint')">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.allowRepeats" :disabled="!config.mustLogin" />
            <span>{{ t('build.trivia.session.access.allowRepeats') }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.settings.allowRepeats.hint')">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label v-if="config.mode === 'classic'" class="toggle">
            <input type="checkbox" v-model="config.showCorrectAnswers" />
            <span>{{ t('build.trivia.session.correctAnswers.perQuestion') }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.settings.showCorrectAnswers.hint') || 'Show correct answers after each question'">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label v-if="config.mode === 'classic'" class="toggle">
            <input type="checkbox" v-model="config.showCorrectAnswersOnEnd" />
            <span>{{ t('build.trivia.session.correctAnswers.onSummary') }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.settings.showCorrectAnswersOnEnd.hint') || 'Show correct answers on final summary'">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label v-if="config.mode === 'speed'" class="toggle">
            <span>{{ t('build.trivia.session.lives.count') }}</span>
            <input :id="ids.lives" type="number" min="1" v-model.number="config.lives" />
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.session.lives.hint') || 'Number of lives players have in speed mode'">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label v-if="config.mode === 'speed'" class="toggle">
            <input type="checkbox" v-model="config.globalTimer.enabled" />
            <span>{{ t('build.trivia.session.globalTimer.enabled') || 'Enable time limit' }}</span>
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.session.globalTimer.enabled.hint') || 'Enable a time limit for the entire game'">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
          <label v-if="config.mode === 'speed' && config.globalTimer.enabled" class="toggle">
            <span>{{ t('build.trivia.session.globalTimer.duration') || 'Time limit (seconds)' }}</span>
            <input :id="ids.timerDuration" type="number" min="1" v-model.number="config.globalTimer.durationSeconds" />
            <span class="info-tooltip-trigger" :data-tooltip="t('build.trivia.session.globalTimer.duration.hint') || 'Total time limit for the entire game in seconds'">
              <font-awesome-icon :icon="['fas', 'circle-info']" />
            </span>
          </label>
        </div>

        <!-- Theme Settings -->
        <div class="theme-settings">
          <div class="theme-settings__header">
            <h3>{{ t('build.quiz.theme.title') || t('build.trivia.theme.title') }}</h3>
            <div class="header-actions">
              <button type="button" class="random-all-btn" @click="randomizeAllTheme">
                 <font-awesome-icon :icon="['fas', 'palette']" />
                 {{ t('build.quiz.theme.random') || 'Shuffle All' }}
              </button>
            </div>
          </div>

          <div class="theme-grid">
            <div class="field">
              <label>
                {{ t('build.quiz.theme.primaryLabel') || 'Question Card Background' }}
                <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.theme.primaryLabel.hint')">
                  <font-awesome-icon :icon="['fas', 'circle-info']" />
                </span>
                <button type="button" class="random-field-btn" @click="shufflePrimaryColor()">
                  <font-awesome-icon :icon="['fas', 'shuffle']" />
                </button>
              </label>
              <input type="color" v-model="config.theme.primaryColor" />
            </div>
            <div class="field">
              <label>
                {{ t('build.quiz.theme.secondaryLabel') || 'Answer Card Background' }}
                <span class="info-tooltip-trigger" :data-tooltip="t('build.quiz.theme.secondaryLabel.hint')">
                  <font-awesome-icon :icon="['fas', 'circle-info']" />
                </span>
                <button type="button" class="random-field-btn" @click="shuffleSecondaryColor()">
                  <font-awesome-icon :icon="['fas', 'shuffle']" />
                </button>
              </label>
              <input type="color" v-model="config.theme.secondaryColor" />
            </div>
          </div>

          <div class="theme-advanced">
            <div class="field">
              <label>{{ t('build.quiz.theme.backgroundType') || 'Background Style' }}</label>
              <div class="select is-fullwidth">
                <select v-model="config.theme.backgroundType">
                  <option value="color">Solid Color</option>
                  <option value="gradient">Gradient</option>
                  <option value="image">Background Image</option>
                </select>
              </div>
            </div>

            <div v-if="config.theme.backgroundType === 'color'" class="field">
              <label>
                {{ t('build.quiz.theme.backgroundColorLabel') || 'Background Color' }}
                <button type="button" class="random-field-btn" @click="shuffleBackgroundColor()">
                  <font-awesome-icon :icon="['fas', 'shuffle']" />
                </button>
              </label>
              <input type="color" v-model="config.theme.backgroundColor" />
            </div>

            <div v-if="config.theme.backgroundType === 'gradient'" class="theme-grid">
              <div class="field">
                <label>
                  {{ t('build.quiz.theme.backgroundColorStart') || 'Start Color' }}
                  <button type="button" class="random-field-btn" @click="shuffleGradientStart()">
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                  </button>
                </label>
                <input type="color" :value="gradientStart" @input="updateGradient($event, 'start')" />
              </div>
              <div class="field">
                <label>
                  {{ t('build.quiz.theme.backgroundColorEnd') || 'End Color' }}
                  <button type="button" class="random-field-btn" @click="shuffleGradientEnd()">
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                  </button>
                </label>
                <input type="color" :value="gradientEnd" @input="updateGradient($event, 'end')" />
              </div>
            </div>

            <div v-if="config.theme.backgroundType === 'image'" class="field">
              <label>{{ t('build.quiz.theme.backgroundImageLabel') || 'Background Image' }}</label>
              <ImageUploader
                :modelValue="config.theme.backgroundImageUrl || null"
                @update:modelValue="config.theme.backgroundImageUrl = $event || ''"
                :uploadFolder="`images/trivia/${validatedGameId}/theme`"
                :cropWidth="1920"
                :cropHeight="1080"
              />
            </div>

            <div class="field">
              <label>{{ t('build.quiz.theme.emojiLabel') || 'Background Emoji (optional)' }}</label>
              <input v-model="config.theme.backgroundEmoji" placeholder="✨" class="input" maxlength="2" />
              <small class="help-text">Add emoji pattern overlay to any background type</small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mode Info Modal -->
    <div v-if="showModeInfo" class="info-modal">
      <div class="info-modal__backdrop" @click="closeModeInfo"></div>
      <div class="info-modal__content">
        <button type="button" class="info-modal__close" @click="closeModeInfo">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
        <div class="info-modal__body">
          <h2 class="info-modal__title">
            {{
              showModeInfo === 'general' ? t('build.trivia.intro.title') :
              showModeInfo === 'classic' ? t('build.trivia.type.classic.label') :
              t('build.trivia.type.speed.label')
            }}
          </h2>
          <div class="info-modal__description">
             <template v-if="showModeInfo === 'general'">
               <p>{{ t('build.trivia.intro.description') || 'Choose the game mode that best fits your trivia experience.' }}</p>
               <div class="info-modal__modes">
                 <div class="info-modal__mode-item">
                   <h4>{{ t('build.trivia.type.classic.label') || 'Classic' }}</h4>
                   <p>{{ t('build.trivia.type.classic.info') || 'Perfect for learning and casual play with unlimited lives and immediate feedback.' }}</p>
                 </div>
                 <div class="info-modal__mode-item">
                   <h4>{{ t('build.trivia.type.speed.label') || 'Speed' }}</h4>
                   <p>{{ t('build.trivia.type.speed.info') || 'Fast-paced gameplay with limited lives and optional time limits for competitive play.' }}</p>
                 </div>
               </div>
             </template>
             <template v-else-if="showModeInfo === 'classic'">
               <p>{{ t('build.trivia.type.classic.info') || 'Classic trivia mode is perfect for educational content and relaxed gameplay.' }}</p>
               <ul>
                 <li><strong>{{ t('build.trivia.session.lives.title') || 'Lives' }}:</strong> {{ t('build.trivia.session.lives.classic') || 'Unlimited lives - players can answer all questions' }}</li>
                 <li><strong>{{ t('build.trivia.session.correctAnswers.title') || 'Correct Answers' }}:</strong> {{ t('build.trivia.session.correctAnswers.classic') || 'Shown after each question for learning' }}</li>
                 <li><strong>{{ t('build.trivia.session.pace.title') || 'Pace' }}:</strong> {{ t('build.trivia.session.pace.classic') || 'Relaxed pace, no time pressure' }}</li>
               </ul>
             </template>
             <template v-else-if="showModeInfo === 'speed'">
               <p>{{ t('build.trivia.type.speed.info') || 'Speed trivia mode creates excitement with limited lives and optional time limits.' }}</p>
               <ul>
                 <li><strong>{{ t('build.trivia.session.lives.title') || 'Lives' }}:</strong> {{ t('build.trivia.session.lives.speed') || 'Limited lives (configurable) - game ends when lives are depleted' }}</li>
                 <li><strong>{{ t('build.trivia.session.correctAnswers.title') || 'Correct Answers' }}:</strong> {{ t('build.trivia.session.correctAnswers.speed') || 'Hidden during gameplay, revealed at end' }}</li>
                 <li><strong>{{ t('build.trivia.session.timer.title') || 'Timer' }}:</strong> {{ t('build.trivia.session.timer.speed') || 'Optional global time limit for entire game' }}</li>
               </ul>
             </template>
          </div>
          <button type="button" class="info-modal__ok" @click="closeModeInfo">{{ t('common.close') || 'Got it!' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { useLocaleStore } from '@/stores/locale';
import { getRandomGradientPreset } from '@top-x/shared';
import type { TriviaAnswer, TriviaConfig, TriviaPowerUpRule, TriviaQuestion } from '@top-x/shared/types/trivia';
import { computeAnswerHash, ensureSalt, hasHashSecret } from '@top-x/shared/utils/triviaHash';

interface TriviaConfigWithTheme extends TriviaConfig {
  theme: NonNullable<TriviaConfig['theme']> & {
    backgroundType?: 'color' | 'gradient' | 'image';
    backgroundGradient?: string;
    backgroundImageUrl?: string;
    backgroundEmoji?: string;
  };
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
const activeSection = ref<string | null>(null);

// Mode Info Modal
const showModeInfo = ref<'classic' | 'speed' | 'general' | null>(null);

// Section refs for scrolling
const questionsSection = ref<HTMLElement | null>(null);
const advancedSection = ref<HTMLElement | null>(null);

// Computed properties for each section
const showAdvancedSettings = computed(() => activeSection.value === 'advanced');
const showQuestions = computed(() => activeSection.value === 'questions');

// Theme computed properties
const gradientStart = computed(() => {
  const grad = config.value.theme.backgroundGradient;
  if (grad && grad.includes('linear-gradient')) {
    const match = grad.match(/#([0-9a-fA-F]{6})/gi);
    if (match && match.length >= 2) return match[0];
  }
  return '#6366f1';
});

const gradientEnd = computed(() => {
  const grad = config.value.theme.backgroundGradient;
  if (grad && grad.includes('linear-gradient')) {
    const match = grad.match(/#([0-9a-fA-F]{6})/gi);
    if (match && match.length >= 2) return match[1];
  }
  return '#ec4899';
});

// Toggle functions that close other sections and scroll to top
function toggleSection(section: string) {
  const wasOpen = activeSection.value === section;
  activeSection.value = wasOpen ? null : section;
  
  // Scroll to section header when opening
  if (!wasOpen) {
    nextTick(() => {
      // Add a small delay to ensure DOM is fully updated
      setTimeout(() => {
        // Get navbar height to account for sticky header
        const navbar = document.querySelector('.navbar') as HTMLElement;
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        
        let sectionElement: HTMLElement | null = null;
        switch (section) {
          case 'questions':
            sectionElement = questionsSection.value;
            break;
          case 'advanced':
            sectionElement = advancedSection.value;
            break;
        }
        
        if (sectionElement) {
          // Find the toggle button (header) within the section
          const toggleButton = sectionElement.querySelector('.section-toggle, .settings-toggle') as HTMLElement;
          const targetElement = toggleButton || sectionElement;
          
          if (targetElement) {
            // Get the exact position of the header
            const rect = targetElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            // Subtract navbar height so header appears below the navbar
            const targetY = rect.top + scrollTop - navbarHeight;
            
            // Scroll to the top of the header (below navbar)
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        }
      }, 50);
    });
  }
}

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
  () => config.value.mode,
  (mode) => {
    // showCorrectAnswers only works in classic mode
    if (mode === 'speed') {
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

watch(
  () => config.value.mode,
  (mode) => {
    // Auto-set unlimitedLives based on mode
    if (mode === 'classic') {
      config.value.unlimitedLives = true;
      config.value.lives = undefined;
    } else if (mode === 'speed') {
      config.value.unlimitedLives = false; // Speed mode has limited lives
      if (!config.value.lives) {
        config.value.lives = 3;
      }
    }
  },
  { immediate: true },
);

watch(
  () => config.value.mustLogin,
  (mustLogin) => {
    if (!mustLogin) {
      config.value.allowRepeats = true;
    }
  },
  { immediate: true },
);

function hydrateConfig(value: TriviaConfig): TriviaConfigWithTheme {
  const base: TriviaConfig = value
    ? JSON.parse(JSON.stringify(value))
    : ({
        mode: 'classic',
        questions: [],
        powerUpsActive: false,
        allowRepeats: true,
        unlimitedLives: true,
        showCorrectAnswers: true,
        showCorrectAnswersOnEnd: true,
        mustLogin: false,
        showProgress: true,
        shuffleQuestions: false,
        shuffleAnswers: false,
        globalTimer: { enabled: false },
        theme: {},
        powerUps: [],
      } as TriviaConfig);

  // Migrate old modes to new mode system
  if (base.mode === 'fixed' || base.mode === 'endless' || !base.mode) {
    // Migrate from old 'fixed'/'endless' to new 'classic'/'speed'
    if (base.mode === 'endless') {
      base.mode = 'speed';
      base.isEndless = true;
    } else {
      // Default to classic for 'fixed' or undefined
      base.mode = 'classic';
      base.isEndless = false;
    }
  }
  
  // Ensure mode is valid
  if (base.mode !== 'classic' && base.mode !== 'speed') {
    base.mode = 'classic';
  }

  base.solveThreshold = undefined;
  base.questionBatchSize = undefined;
  base.isHybrid = false;

  if (!base.globalTimer) {
    base.globalTimer = { enabled: false };
  }
  if (!base.theme) {
    base.theme = {};
  }
  // Initialize new theme properties
  if (!base.theme.backgroundType) {
    base.theme.backgroundType = 'color';
  }
  if (!base.theme.backgroundGradient) {
    base.theme.backgroundGradient = '';
  }
  if (!base.theme.backgroundImageUrl) {
    base.theme.backgroundImageUrl = '';
  }
  if (!base.theme.backgroundEmoji) {
    base.theme.backgroundEmoji = '✨';
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

  // Auto-set unlimitedLives based on mode
  if (base.mode === 'classic') {
    base.unlimitedLives = true;
    base.lives = undefined;
  } else if (base.mode === 'speed') {
    base.unlimitedLives = false; // Speed mode has limited lives
    base.lives = sanitizePositiveInteger(base.lives) ?? 3;
  }

  // Enforce: if mustLogin is false, allowRepeats must be true
  if (base.mustLogin === false) {
    base.allowRepeats = true;
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

  let mappedCorrect =
    (typeof question.correctAnswer === 'string' && question.correctAnswer.trim()) ||
    correctAnswers[hydrated.id];

  // Check if mappedCorrect is a numeric index (for image-only answers that were hashed by index)
  // This handles cases where correctAnswer was stored as an index string
  if (mappedCorrect && /^\d+$/.test(mappedCorrect)) {
    const index = parseInt(mappedCorrect, 10);
    if (index >= 0 && index < hydrated.options.length) {
      // If the option at that index has text, use it; otherwise use index identifier
      const optionText = hydrated.options[index];
      if (optionText && optionText.trim().length > 0) {
        hydrated.correctAnswer = optionText;
      } else {
        // Use index identifier for image-only answers
        hydrated.correctAnswer = `__INDEX_${index}__`;
      }
      return hydrated;
    }
  }

  if (mappedCorrect && hydrated.options.includes(mappedCorrect)) {
    hydrated.correctAnswer = mappedCorrect;
  } else if (!hydrated.correctAnswer || !hydrated.options.includes(hydrated.correctAnswer)) {
    // Check if all options are empty (image-only answers)
    const allEmpty = hydrated.options.every(opt => !opt || opt.trim() === '');
    if (allEmpty) {
      // For image-only answers, default to index identifier
      hydrated.correctAnswer = '__INDEX_0__';
    } else {
      hydrated.correctAnswer = hydrated.options[0] || '__INDEX_0__';
    }
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
  // Ensure mode is valid
  if (clone.mode !== 'classic' && clone.mode !== 'speed') {
    clone.mode = 'classic';
  }
  clone.solveThreshold = undefined;
  clone.questionBatchSize = undefined;
  clone.isHybrid = false;

  // Auto-set unlimitedLives based on mode
  if (clone.mode === 'classic') {
    clone.unlimitedLives = true;
    clone.lives = undefined;
  } else if (clone.mode === 'speed') {
    clone.unlimitedLives = false; // Speed mode has limited lives
    clone.lives = sanitizePositiveInteger(clone.lives) ?? 3;
  }

  clone.powerUpsActive = Boolean(clone.powerUpsActive);
  clone.mustLogin = Boolean(clone.mustLogin);
  // Enforce: if mustLogin is false, allowRepeats must be true
  clone.allowRepeats = clone.mustLogin === false ? true : Boolean(clone.allowRepeats);
  clone.showProgress = Boolean(clone.showProgress);
  clone.shuffleQuestions = Boolean(clone.shuffleQuestions);
  clone.shuffleAnswers = Boolean(clone.shuffleAnswers);
  clone.showCorrectAnswers = clone.mode === 'classic' ? Boolean(clone.showCorrectAnswers) : false;
  clone.showCorrectAnswersOnEnd = clone.mode === 'classic' ? Boolean(clone.showCorrectAnswersOnEnd) : false;

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

  // Get option images first, before filtering options
  let optionImages: (string | undefined)[] = [];
  if (working.media?.optionImageUrls) {
    optionImages = (working.media.optionImageUrls ?? []).map((raw) => {
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        return trimmed || undefined;
      }
      return undefined;
    });
  }

  // Ensure optionImages array matches options array length
  const originalOptions = working.options ?? [];
  while (optionImages.length < originalOptions.length) {
    optionImages.push(undefined);
  }

  // Trim options and create pairs of (text, image) to preserve options with images
  const optionPairs = originalOptions.map((option: string, index: number) => {
    return {
      text: (option?.trim() ?? '') || '',
      imageUrl: optionImages[index],
    };
  });

  // Filter out options that have neither text nor image
  const validOptionPairs = optionPairs.filter((pair) => {
    return pair.text.trim().length > 0 || Boolean(pair.imageUrl);
  });

  // Ensure we have at least 2 options
  if (validOptionPairs.length < 2) {
    while (validOptionPairs.length < 2) {
      validOptionPairs.push({ text: '', imageUrl: undefined });
    }
  }

  // Rebuild options array and optionImages array
  working.options = validOptionPairs.map(pair => pair.text);
  optionImages = validOptionPairs.map(pair => pair.imageUrl);

  // Update correctAnswer to match the new options array
  const originalCorrectAnswer = working.correctAnswer?.trim() || '';
  
  // Check if correctAnswer is an index identifier (for image-only answers)
  const indexMatch = originalCorrectAnswer.match(/^__INDEX_(\d+)__$/);
  if (indexMatch) {
    const index = parseInt(indexMatch[1], 10);
    if (index >= 0 && index < validOptionPairs.length) {
      // Use the option text at that index, or use index identifier if no text
      const pair = validOptionPairs[index];
      working.correctAnswer = pair.text.trim() || `__INDEX_${index}__`;
    } else {
      working.correctAnswer = validOptionPairs[0]?.text || '';
    }
  } else if (originalCorrectAnswer && working.options.includes(originalCorrectAnswer)) {
    working.correctAnswer = originalCorrectAnswer;
  } else {
    // Find the matching option by comparing text or use first option
    const matchingIndex = validOptionPairs.findIndex(pair => pair.text === originalCorrectAnswer);
    if (matchingIndex >= 0) {
      working.correctAnswer = working.options[matchingIndex] || '';
    } else {
      working.correctAnswer = working.options[0] || '';
    }
  }

  let questionImage: string | undefined;
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
  }

  const answers: TriviaAnswer[] = validOptionPairs.map((pair) => {
    const hasText = pair.text.trim().length > 0;
    const hasImage = Boolean(pair.imageUrl);
    
    // Build answer object conditionally
    const answer: TriviaAnswer = {
      ...(hasText && { text: pair.text }),
      ...(!hasText && !hasImage && { text: '' }), // Fallback: empty string if no text and no image
      ...(hasImage && { imageUrl: pair.imageUrl }),
    };
    
    return answer;
  });

  const sanitized: TriviaQuestion = {
    id: working.id,
    // If question has no text but has image, text should be undefined (optional)
    text: working.text.trim() || (questionImage ? undefined : ''),
    answers,
    category: working.category?.trim() || undefined,
    difficulty: working.difficulty || undefined,
  };

  if (questionImage) {
    sanitized.imageUrl = questionImage;
  }

  // Determine final correctAnswer for hashing
  // working.correctAnswer has already been updated above to handle index identifiers
  let correctAnswer = working.correctAnswer ?? '';
  let correctAnswerIndex = -1;
  
  // Check if correctAnswer is still an index identifier (for image-only answers)
  const finalIndexMatch = correctAnswer.match(/^__INDEX_(\d+)__$/);
  
  if (finalIndexMatch) {
    const index = parseInt(finalIndexMatch[1], 10);
    if (index >= 0 && index < answers.length) {
      correctAnswerIndex = index;
      // Check if the answer at this index has text now
      const answerAtIndex = answers[index];
      if (answerAtIndex?.text && answerAtIndex.text.trim().length > 0) {
        // Answer has text now - use the text instead of index
        correctAnswer = answerAtIndex.text;
      } else {
        // Still image-only - use the index as the answer identifier for hashing
        correctAnswer = index.toString();
      }
    } else {
      correctAnswer = '0'; // Default to first answer
      correctAnswerIndex = 0;
    }
  } else {
    // Find the index of the correct answer by text
    const index = answers.findIndex(a => a.text === correctAnswer);
    if (index >= 0) {
      correctAnswerIndex = index;
    }
  }

  const ensuredSalt = ensureSalt(working.salt);
  sanitized.salt = ensuredSalt;

  // Always compute hash if we have a correctAnswer (text or index)
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
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
  
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

function getCorrectAnswerIndex(question: EditableTriviaQuestion): number {
  if (!question.correctAnswer) return 0;
  
  // Check if correctAnswer is an index identifier (for image-only answers)
  const indexMatch = question.correctAnswer.match(/^__INDEX_(\d+)__$/);
  if (indexMatch) {
    const index = parseInt(indexMatch[1], 10);
    return index >= 0 && index < question.options.length ? index : 0;
  }
  
  // For text-based answers, find the index
  const index = question.options.findIndex(opt => opt === question.correctAnswer);
  if (index >= 0) {
    return index;
  }
  
  // If not found but we have matching empty strings, check if all are empty
  const allEmpty = question.options.every(opt => !opt || opt.trim() === '');
  if (allEmpty && question.correctAnswer === '') {
    // All empty - return 0 as default
    return 0;
  }
  
  return 0;
}

function setCorrectAnswer(question: EditableTriviaQuestion, index: number) {
  if (index >= 0 && index < question.options.length) {
    const optionText = question.options[index];
    const hasText = optionText && optionText.trim().length > 0;
    const hasImage = question.media?.optionImageUrls?.[index];
    
    // If answer has text, use the text as identifier
    if (hasText) {
      question.correctAnswer = optionText;
    } else {
      // For image-only or empty answers, use index-based identifier
      question.correctAnswer = `__INDEX_${index}__`;
    }
  }
}

function updateOptionText(question: EditableTriviaQuestion, index: number, newText: string) {
  question.options[index] = newText;
  
  // If this option is currently selected and was using index identifier,
  // update to use text if text is now available
  const currentIndex = getCorrectAnswerIndex(question);
  if (currentIndex === index) {
    const hasText = newText && newText.trim().length > 0;
    if (hasText) {
      // Update to use text instead of index identifier
      question.correctAnswer = newText;
    } else if (question.correctAnswer?.match(/^__INDEX_\d+__$/)) {
      // Still using index identifier, which is correct
      // No need to change
    }
  }
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
  const wasCorrect = getCorrectAnswerIndex(question) === index;
  question.options.splice(index, 1);
  if (question.options.length < 2) {
    question.options.push('');
  }
  ensureOptionImages(question);
  if (wasCorrect || !question.options.includes(question.correctAnswer || '')) {
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

// Mode Info Modal methods
function openModeInfo(mode: 'classic' | 'speed' | 'general') {
  showModeInfo.value = mode;
}

function closeModeInfo() {
  showModeInfo.value = null;
}

// Theme methods
function randomColor(): string {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

function randomizeAllTheme() {
  const preset = getRandomGradientPreset();
  config.value.theme.primaryColor = preset.start;
  config.value.theme.secondaryColor = preset.end;
  if (config.value.theme.backgroundType === 'color') {
    config.value.theme.backgroundColor = preset.start;
  } else if (config.value.theme.backgroundType === 'gradient') {
    setRandomGradientPreset();
  }
}

function updateGradient(e: Event, part: 'start' | 'end') {
  const val = (e.target as HTMLInputElement).value;
  const start = part === 'start' ? val : gradientStart.value;
  const end = part === 'end' ? val : gradientEnd.value;
  config.value.theme.backgroundGradient = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
}

function setRandomGradient() {
  const start = randomColor();
  const end = randomColor();
  config.value.theme.backgroundGradient = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
}

function setRandomGradientPreset() {
  const preset = getRandomGradientPreset();
  config.value.theme.backgroundGradient = `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`;
}

function shufflePrimaryColor() {
  const preset = getRandomGradientPreset();
  config.value.theme.primaryColor = preset.start;
}

function shuffleSecondaryColor() {
  const preset = getRandomGradientPreset();
  config.value.theme.secondaryColor = preset.end;
}

function shuffleGradientStart() {
  const preset = getRandomGradientPreset();
  updateGradient({ target: { value: preset.start } } as any, 'start');
}

function shuffleGradientEnd() {
  const preset = getRandomGradientPreset();
  updateGradient({ target: { value: preset.end } } as any, 'end');
}

function shuffleBackgroundColor() {
  const preset = getRandomGradientPreset();
  config.value.theme.backgroundColor = preset.start;
}
</script>

<style scoped>
.trivia-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Mode Section */
.mode-section {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.mode-option {
  display: block;
  cursor: pointer;
  padding: 1.25rem;
  border: 2px solid var(--color-border-base);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  transition: all 0.2s ease;
}

.mode-option:hover {
  border-color: var(--color-border-medium);
}

.mode-option--selected {
  border-color: var(--bulma-primary);
  background: var(--color-primary-bg);
}

.mode-radio {
  display: none;
}

.mode-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mode-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.mode-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.mode-description {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

/* Section Toggle (Collapsible) */
.section-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.75rem;
  background: var(--color-bg-secondary);
  border: none;
  border-bottom: 2px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.section-toggle:hover {
  background: var(--color-primary-bg);
  border-bottom-color: var(--bulma-primary);
  color: var(--bulma-primary);
}

.section-toggle:hover .section-toggle__icon {
  color: var(--bulma-primary);
}

.section-toggle__title {
  color: inherit;
}

.section-toggle__icon {
  transition: transform 0.2s ease, color 0.2s ease;
  font-size: 1rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle__icon--open {
  transform: rotate(180deg);
}

.section-hint {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  margin: 0 0 1rem;
}

/* Questions Section */
.questions-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.questions-section__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.questions-header__actions {
  display: flex;
  gap: 0.5rem;
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

.question-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.question-input {
  flex: 1;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
}

.question-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.question-image-upload-inline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.question-image-upload-inline :deep(.image-uploader) {
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.question-image-upload-inline :deep(.uploader-button) {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
  position: relative;
  overflow: hidden;
}

.question-image-upload-inline :deep(.uploader-button-primary) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: transparent;
  font-size: 0;
}

.question-image-upload-inline :deep(.uploader-button-primary)::after {
  content: '🖼️';
  font-size: 1.2rem;
  line-height: 1;
  position: absolute;
  color: var(--color-text-secondary);
}


.question-image-upload-inline :deep(.uploader-current-image) {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
  display: block;
  margin: 0;
  flex-shrink: 0;
}

.question-card__answers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.answer-option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
}

.answer-option--correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.answer-option__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.answer-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.answer-option__radio {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
}

.answer-option__indicator {
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
  transition: all 0.2s ease;
}

.answer-option__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.answer-option__checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.875rem;
  font-weight: 700;
}

.answer-option__radio input[type='radio'] {
  display: none;
}

.answer-option__indicator--correct {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.answer-option__input {
  flex: 1;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.answer-option__input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.answer-option__input::placeholder {
  color: var(--color-text-tertiary);
}

.answer-image-upload-inline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.answer-image-upload-inline :deep(.image-uploader) {
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.answer-image-upload-inline :deep(.uploader-button) {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
  position: relative;
  overflow: hidden;
}

.answer-image-upload-inline :deep(.uploader-button-primary) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: transparent;
  font-size: 0;
}

.answer-image-upload-inline :deep(.uploader-button-primary)::after {
  content: '🖼️';
  font-size: 1rem;
  line-height: 1;
  position: absolute;
  color: var(--color-text-secondary);
}


.answer-image-upload-inline :deep(.uploader-current-image) {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
  display: block;
  margin: 0;
  flex-shrink: 0;
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

.questions-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
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
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border-subtle);
}

.settings-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.75rem;
  background: var(--color-bg-secondary);
  border: none;
  border-bottom: 2px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-toggle:hover {
  background: var(--color-primary-bg);
  border-bottom-color: var(--bulma-primary);
  color: var(--bulma-primary);
}

.settings-toggle:hover .settings-toggle__icon {
  color: var(--bulma-primary);
}

.settings-toggle__icon {
  transition: transform 0.2s ease, color 0.2s ease;
  font-size: 1rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 0.5rem;
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
  margin: 0 0 1rem;
  font-size: 1rem;
  color: var(--color-text-primary);
  font-weight: 600;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
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

.toggle input[type='number'] {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  width: 80px;
}

.toggle input[type='number']:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
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

.theme-settings {
  margin-top: 1rem;
}

.theme-settings h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.theme-grid input[type='color'] {
  width: 100%;
  height: 40px;
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
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
}
</style>


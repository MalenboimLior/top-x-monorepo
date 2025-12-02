<template>
  <div class="quiz-builder">
    <!-- Mode Selector -->
    <section class="mode-section">
      <h2 class="section-title">Quiz Type</h2>
      <div class="mode-options">
        <label
          class="mode-option"
          :class="{ 'mode-option--selected': config.mode === 'personality' }"
        >
          <input
            type="radio"
            v-model="config.mode"
            value="personality"
            class="mode-radio"
          />
          <div class="mode-content">
            <span class="mode-icon">🦁</span>
            <span class="mode-label">Personality Quiz</span>
            <span class="mode-description">What type are you? Single result based on bucket scores</span>
          </div>
        </label>
        <label
          class="mode-option"
          :class="{ 'mode-option--selected': config.mode === 'archetype' }"
        >
          <input
            type="radio"
            v-model="config.mode"
            value="archetype"
            class="mode-radio"
          />
          <div class="mode-content">
            <span class="mode-icon">🧭</span>
            <span class="mode-label">Archetype Quiz</span>
            <span class="mode-description">Multi-axis analysis with radar chart (like MBTI)</span>
          </div>
        </label>
      </div>
    </section>

    <!-- Personality Mode: Buckets with Embedded Results -->
    <section v-if="config.mode === 'personality'" ref="personalityBucketsSection" class="config-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('personalityBuckets')"
      >
        <span class="section-toggle__title">Personality Buckets</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showPersonalityBuckets }">
          ▼
        </span>
      </button>
      <p v-if="showPersonalityBuckets" class="section-hint">
        <template v-if="personalityQuizType === 'scoreRange'">
          Single bucket with score ranges: Users get different results based on their score range.
        </template>
        <template v-else-if="personalityQuizType === 'multiBucket'">
          Multiple buckets: Users get the result from the bucket with the highest score.
        </template>
        <template v-else>
          Define the possible personality types and their results. Add multiple buckets for type-based quizzes, or one bucket with score ranges for score-based quizzes.
        </template>
      </p>
      
      <div v-if="showPersonalityBuckets">
        <div v-if="(config.personalityBuckets?.length ?? 0) > 0" class="buckets-list">
          <div
            v-for="(bucket, bIndex) in config.personalityBuckets"
            :key="`bucket-${bIndex}`"
            class="bucket-card"
          >
          <div class="bucket-card__header">
            <div class="bucket-fields">
              <div class="field">
                <label>Label</label>
                <input v-model="bucket.label" placeholder="e.g., The Lion" class="field-input" />
              </div>
            </div>
            <button
              type="button"
              class="bucket-remove"
              @click="removeBucket(bIndex)"
              title="Remove bucket"
            >
              ×
            </button>
          </div>

          <!-- Results within this bucket -->
          <div class="bucket-results">
            <h4 class="bucket-results__title">
              Results
              <span class="bucket-results__hint">
                {{ bucket.results?.length > 1 ? '(score ranges)' : '(default)' }}
              </span>
            </h4>
            
            <!-- Score range table view (only show if multiple results) -->
            <template v-if="bucket.results.length > 1">
              <table class="score-range-table">
                <thead>
                  <tr>
                    <th>Min Score</th>
                    <th>Max Score</th>
                    <th>Result Title</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(result, rIndex) in bucket.results"
                    :key="`table-${rIndex}`"
                    :class="{ 'score-range-error-row': getBucketRangeErrors(bIndex, rIndex).length > 0 }"
                  >
                    <td>
                      <input
                        type="number"
                        v-model.number="result.minScore"
                        placeholder="0"
                        class="field-input field-input--small"
                        @input="validateBucketRanges(bIndex)"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        v-model.number="result.maxScore"
                        placeholder="∞"
                        class="field-input field-input--small"
                        @input="validateBucketRanges(bIndex)"
                      />
                    </td>
                    <td>
                      <div class="result-title-wrapper">
                        <input
                          v-model="result.title"
                          placeholder="You are a Lion!"
                          class="field-input"
                        />
                        <div class="result-image-upload-inline">
                          <ImageUploader
                            v-model="result.imageUrl"
                            :uploadFolder="`images/quiz/${gameId}/results`"
                            :cropWidth="200"
                            :cropHeight="200"
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <input
                        v-model="result.description"
                        placeholder="Description..."
                        class="field-input field-input--compact"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        class="result-variant__remove"
                        @click="removeResultVariant(bIndex, rIndex)"
                        :disabled="bucket.results.length <= 1"
                        title="Remove result"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="getBucketRangeErrors(bIndex).length > 0" class="score-range-errors">
                <div
                  v-for="(error, errIdx) in getBucketRangeErrors(bIndex)"
                  :key="errIdx"
                  class="score-range-error"
                >
                  {{ error }}
                </div>
              </div>
            </template>

            <!-- Single result view (default) -->
            <template v-else>
              <div
                v-for="(result, rIndex) in bucket.results"
                :key="rIndex"
                class="result-variant"
              >
                <div class="result-variant__fields">
                  <div class="field">
                    <label>Result Title</label>
                    <div class="result-title-wrapper">
                      <input v-model="result.title" placeholder="You are a Lion!" class="field-input" />
                      <div class="result-image-upload-inline">
                        <ImageUploader
                          v-model="result.imageUrl"
                          :uploadFolder="`images/quiz/${gameId}/results`"
                          :cropWidth="200"
                          :cropHeight="200"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="field field--full">
                    <label>Description</label>
                    <textarea v-model="result.description" rows="2" class="field-textarea"></textarea>
                  </div>
                </div>
              </div>
            </template>
            
            <button
              type="button"
              class="add-result-variant"
              @click="addResultVariant(bIndex)"
            >
              + Add Score Range Result
            </button>
          </div>
        </div>
        
          <CustomButton
            type="is-light"
            label="+ Add Bucket"
            @click="addBucket"
          />
        </div>
        <div v-else class="empty-state">
          <p>No buckets defined yet. Add at least one bucket to define personality types.</p>
          <CustomButton
            type="is-primary"
            label="+ Add First Bucket"
            @click="addBucket"
          />
        </div>
      </div>
    </section>

    <!-- Archetype Mode: Axes & Results -->
    <section v-if="config.mode === 'archetype'" ref="archetypeAxesSection" class="config-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('archetypeAxes')"
      >
        <span class="section-toggle__title">Archetype Axes</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showArchetypeAxes }">
          ▼
        </span>
      </button>
      <p v-if="showArchetypeAxes" class="section-hint">Define the spectrums/dimensions (e.g., Introvert ↔ Extrovert)</p>
      
      <div v-if="showArchetypeAxes">
        <div v-if="(config.archetypeAxes?.length ?? 0) > 0" class="axes-list">
          <div
            v-for="(axis, index) in config.archetypeAxes"
            :key="`axis-${index}`"
            class="axis-card"
          >
          <div class="axis-fields">
            <div class="field">
              <label>Low Label (negative)</label>
              <input v-model="axis.lowLabel" placeholder="e.g., Introvert" class="field-input" />
            </div>
            <div class="field">
              <label>High Label (positive)</label>
              <input v-model="axis.highLabel" placeholder="e.g., Extrovert" class="field-input" />
            </div>
          </div>
          <button
            type="button"
            class="axis-remove"
            @click="removeAxis(index)"
          >
            ×
          </button>
        </div>
          <CustomButton
            type="is-light"
            label="+ Add Axis"
            @click="addAxis"
          />
        </div>
        <div v-else class="empty-state">
          <p>No axes defined yet. Add at least one axis to define the spectrums (e.g., Introvert ↔ Extrovert).</p>
          <CustomButton
            type="is-primary"
            label="+ Add First Axis"
            @click="addAxis"
          />
        </div>
      </div>

      <button
        v-if="showArchetypeAxes"
        type="button"
        class="section-toggle section-toggle--sub"
        @click="toggleSection('archetypeResults')"
      >
        <span class="section-toggle__title">Archetype Results</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showArchetypeResults }">
          ▼
        </span>
      </button>
      <p v-if="showArchetypeAxes && showArchetypeResults" class="section-hint">Define results for specific axis patterns (e.g., ENFP = E+N+F+P)</p>
      
      <div v-if="showArchetypeAxes && showArchetypeResults">
        <div v-if="(config.archetypeResults?.length ?? 0) > 0" class="results-list">
          <div
            v-for="(result, index) in config.archetypeResults"
            :key="index"
            class="result-card result-card--archetype"
          >
          <div class="result-card__header">
            <span class="result-card__number">{{ index + 1 }}</span>
            <span class="result-card__title-preview">{{ result.id || result.title || `Result ${index + 1}` }}</span>
          </div>
          <div class="result-fields">
            <div class="field">
              <label>Result Title</label>
              <div class="result-title-wrapper">
                <input v-model="result.title" placeholder="The Campaigner" class="field-input" />
                <div class="result-image-upload-inline">
                  <ImageUploader
                    v-model="result.imageUrl"
                    :uploadFolder="`images/quiz/${gameId}/results`"
                    :cropWidth="200"
                    :cropHeight="200"
                  />
                </div>
              </div>
            </div>
            <div class="field field--full">
              <label>Pattern (which axes are high/low)</label>
              <div class="pattern-inputs">
                <div
                  v-for="(axis, aIdx) in config.archetypeAxes"
                  :key="`pattern-${index}-${aIdx}`"
                  class="pattern-item"
                >
                    <span class="pattern-label">{{ getAxisId(axis) }}</span>
                  <div class="pattern-buttons">
                    <button
                      type="button"
                      class="pattern-button"
                      :class="{ 'pattern-button--active': (result.pattern?.[getAxisId(axis)] ?? 'high') === 'low' }"
                      @click="updatePattern(index, getAxisId(axis), 'low')"
                    >
                      {{ axis.lowLabel }}
                    </button>
                    <button
                      type="button"
                      class="pattern-button"
                      :class="{ 'pattern-button--active': (result.pattern?.[getAxisId(axis)] ?? 'high') === 'high' }"
                      @click="updatePattern(index, getAxisId(axis), 'high')"
                    >
                      {{ axis.highLabel }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--full">
              <label>Description</label>
              <textarea v-model="result.description" rows="3" class="field-textarea"></textarea>
            </div>
            <div class="field">
              <label>Share Text (optional)</label>
              <input v-model="result.shareText" placeholder="I'm ENFP! What's your type?" class="field-input" />
            </div>
          </div>
          <button
            type="button"
            class="result-remove"
            @click="removeArchetypeResult(index)"
          >
            ×
          </button>
          </div>
          <CustomButton
            type="is-light"
            label="+ Add Result"
            @click="addArchetypeResult"
          />
        </div>
        <div v-else class="empty-state">
          <p>No archetype results defined yet. Add results for specific axis patterns (e.g., ENFP = E+N+F+P).</p>
          <CustomButton
            type="is-primary"
            label="+ Add First Result"
            @click="addArchetypeResult"
          />
        </div>
      </div>
    </section>

    <!-- Questions Section -->
    <section ref="questionsSection" class="questions-section">
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
      
      <div v-if="showQuestions" class="questions-section__content">
        <p class="section-hint">{{ t('build.trivia.questions.subtitle') }}</p>
        <div class="questions-header__actions">
          <CustomButton 
            type="is-primary" 
            :label="t('build.trivia.questions.addQuestion')" 
            @click="addQuestion" 
          />
        </div>

        <div v-if="config.questions.length" class="questions-list">
          <article
            v-for="(question, qIndex) in config.questions"
            :key="question.id"
            :data-question-index="qIndex"
            :data-question-id="question.id"
            class="question-card"
          >
            <div class="question-card__main">
              <div class="question-card__number">{{ qIndex + 1 }}</div>
              
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
                      v-model="question.imageUrl"
                      :uploadFolder="`images/quiz/${gameId}/questions`"
                      :cropWidth="800"
                      :cropHeight="450"
                    />
                  </div>
                </div>
              </div>
              
              <div class="question-card__answers">
                <div
                  v-for="(answer, aIndex) in question.answers"
                  :key="`${question.id}-${aIndex}`"
                  class="answer-option"
                >
                  <span class="answer-option__letter">{{ getLetterForIndex(aIndex) }}</span>
                  <div class="answer-option__content">
                    <div class="answer-input-wrapper">
                      <input
                        v-model="answer.text"
                        :placeholder="t('build.trivia.questions.answerPlaceholder')"
                        class="answer-option__input"
                      />
                      <div class="answer-image-upload-inline">
                        <ImageUploader
                          v-model="answer.imageUrl"
                          :uploadFolder="`images/quiz/${gameId}/answers`"
                          :cropWidth="200"
                          :cropHeight="200"
                        />
                      </div>
                    </div>
                    
                    <!-- Personality: Bucket Points -->
                    <div v-if="config.mode === 'personality'" class="answer-weights">
                      <div
                        v-for="(bucket, bIdx) in config.personalityBuckets"
                        :key="`weight-${qIndex}-${aIndex}-${bIdx}`"
                        class="weight-input"
                      >
                        <label :for="`weight-${question.id}-${aIndex}-${bIdx}`">
                          {{ bucket.label || bucket.id || `Bucket ${bIdx + 1}` }}
                        </label>
                        <input
                          :id="`weight-${question.id}-${aIndex}-${bIdx}`"
                          type="number"
                          :value="answer.bucketPoints?.[bucket.id] ?? 0"
                          @input="updateBucketPoints(qIndex, aIndex, bucket.id, $event)"
                          min="0"
                          class="weight-number"
                        />
                      </div>
                    </div>
                    
                    <!-- Archetype: Axis Points -->
                    <div v-if="config.mode === 'archetype'" class="answer-weights">
                      <div
                        v-for="(axis, axIdx) in config.archetypeAxes"
                        :key="`axis-${qIndex}-${aIndex}-${axIdx}`"
                        class="weight-input"
                      >
                        <label :for="`axis-${question.id}-${aIndex}-${axIdx}`">
                          {{ axis.lowLabel || '?' }} ↔ {{ axis.highLabel || '?' }}
                        </label>
                        <input
                          :id="`axis-${question.id}-${aIndex}-${axIdx}`"
                          type="number"
                          :value="answer.axisPoints?.[axis.id] ?? 0"
                          @input="updateAxisPoints(qIndex, aIndex, axis.id, $event)"
                          class="weight-number"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    class="answer-option__remove"
                    :disabled="question.answers.length <= 2"
                    @click="removeAnswer(qIndex, aIndex)"
                    :title="t('build.trivia.questions.removeAnswer')"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  class="answer-add"
                  @click="addAnswer(qIndex)"
                >
                  + {{ t('build.trivia.questions.addAnswer') }}
                </button>
              </div>
            </div>

            <div class="question-card__actions">
              <button
                type="button"
                class="action-btn"
                :disabled="qIndex === 0"
                @click="reorderQuestion(qIndex, -1)"
                :title="t('build.trivia.questions.moveUp')"
              >
                ↑
              </button>
              <button
                type="button"
                class="action-btn"
                :disabled="qIndex === config.questions.length - 1"
                @click="reorderQuestion(qIndex, 1)"
                :title="t('build.trivia.questions.moveDown')"
              >
                ↓
              </button>
              <button
                type="button"
                class="action-btn"
                @click="duplicateQuestion(qIndex)"
                :title="t('build.trivia.questions.duplicate')"
              >
                📋
              </button>
              <button
                type="button"
                class="action-btn action-btn--danger"
                @click="removeQuestion(qIndex)"
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
            :label="t('build.trivia.questions.addFirstQuestion')"
            @click="addQuestion"
          />
        </div>
        
        <div class="questions-footer">
          <CustomButton 
            type="is-primary" 
            :label="t('build.trivia.questions.addQuestion')" 
            @click="addQuestion" 
          />
        </div>
      </div>
    </section>

    <!-- Advanced Settings -->
    <section ref="advancedSection" class="settings-section">
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

      <div v-if="showAdvancedSettings" class="settings-content">
        <div class="settings-grid">
          <label class="toggle">
            <input type="checkbox" v-model="config.showProgress" />
            <span>{{ t('build.trivia.settings.showProgress') || 'Show progress bar' }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.shuffleQuestions" />
            <span>{{ t('build.trivia.settings.shuffleQuestions') || 'Shuffle questions' }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.shuffleAnswers" />
            <span>{{ t('build.trivia.settings.shuffleAnswers') || 'Shuffle answers' }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.mustLogin" />
            <span>{{ t('build.trivia.session.access.mustLogin') }}</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="config.allowRepeats" :disabled="!config.mustLogin" />
            <span>{{ t('build.trivia.session.access.allowRepeats') }}</span>
          </label>
        </div>

        <!-- Theme Settings -->
        <div class="theme-settings">
          <h3>{{ t('build.trivia.theme.title') }}</h3>
          <div class="theme-grid">
            <div class="field">
              <label>{{ t('build.trivia.theme.primaryLabel') }}</label>
              <input type="color" v-model="config.theme.primaryColor" />
            </div>
            <div class="field">
              <label>{{ t('build.trivia.theme.secondaryLabel') }}</label>
              <input type="color" v-model="config.theme.secondaryColor" />
            </div>
            <div class="field">
              <label>{{ t('build.trivia.theme.backgroundColorLabel') }}</label>
              <input type="color" v-model="config.theme.backgroundColor" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { useLocaleStore } from '@/stores/locale';
import type {
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  PersonalityBucket,
  PersonalityResultVariant,
  ArchetypeAxis,
  ArchetypeResult,
  QuizThemeConfig,
} from '@top-x/shared/types/quiz';

interface EditableQuizConfig extends Omit<QuizConfig, 'theme'> {
  theme: NonNullable<QuizThemeConfig>;
}

const props = defineProps<{
  modelValue: QuizConfig | undefined;
  gameId?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: QuizConfig): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const activeSection = ref<string | null>(null);
const isSyncing = ref(false);

// Section refs for scrolling
const personalityBucketsSection = ref<HTMLElement | null>(null);
const archetypeAxesSection = ref<HTMLElement | null>(null);
const questionsSection = ref<HTMLElement | null>(null);
const advancedSection = ref<HTMLElement | null>(null);

// Computed properties for each section
const showAdvancedSettings = computed(() => activeSection.value === 'advanced');
const showPersonalityBuckets = computed(() => activeSection.value === 'personalityBuckets');
// Archetype axes should show if either axes or results is open (results is a sub-section)
const showArchetypeAxes = computed(() => activeSection.value === 'archetypeAxes' || activeSection.value === 'archetypeResults');
const showArchetypeResults = computed(() => activeSection.value === 'archetypeResults');
const showQuestions = computed(() => activeSection.value === 'questions');

// Computed: Detect personality quiz type
const personalityQuizType = computed(() => {
  const buckets = config.value.personalityBuckets || [];
  if (buckets.length === 0) return null;
  
  // Check if single bucket with multiple results (score range quiz)
  if (buckets.length === 1) {
    const bucket = buckets[0];
    if (bucket.results && bucket.results.length > 1) {
      return 'scoreRange';
    }
  }
  
  // Multiple buckets (personality type quiz)
  if (buckets.length > 1) {
    return 'multiBucket';
  }
  
  return null;
});

// Store range validation errors per bucket
const bucketRangeErrors = ref<Record<number, string[]>>({});

// Toggle functions that close other sections and scroll to top
function toggleSection(section: string) {
  const wasOpen = activeSection.value === section;
  activeSection.value = wasOpen ? null : section;
  
  // Special handling: archetypeResults is a sub-section of archetypeAxes
  // When opening results, we should ensure axes section is also accessible
  // (handled via showArchetypeAxes computed property)
  
  // Scroll to section header when opening
  if (!wasOpen) {
    nextTick(() => {
      let sectionElement: HTMLElement | null = null;
      switch (section) {
        case 'personalityBuckets':
          sectionElement = personalityBucketsSection.value;
          break;
        case 'archetypeAxes':
          sectionElement = archetypeAxesSection.value;
          break;
        case 'archetypeResults':
          // For results, scroll to the axes section since that's where the results button is
          sectionElement = archetypeAxesSection.value;
          break;
        case 'questions':
          sectionElement = questionsSection.value;
          break;
        case 'advanced':
          sectionElement = advancedSection.value;
          break;
      }
      
      if (sectionElement) {
        // For archetypeResults, find the results toggle button
        if (section === 'archetypeResults') {
          const resultsToggle = sectionElement.querySelector('.section-toggle--sub') as HTMLElement;
          if (resultsToggle) {
            const elementPosition = resultsToggle.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 20;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            return;
          }
        }
        
        // Find the toggle button (header) within the section
        const toggleButton = sectionElement.querySelector('.section-toggle, .settings-toggle') as HTMLElement;
        const targetElement = toggleButton || sectionElement;
        
        // Scroll with a small offset to account for any fixed headers
        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - 20; // 20px offset from top
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  }
}

const config = ref<EditableQuizConfig>(hydrateConfig(props.modelValue));

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
  { deep: true }
);

watch(
  config,
  (value) => {
    if (isSyncing.value) return;
    isSyncing.value = true;
    emit('update:modelValue', sanitizeConfig(value));
    nextTick(() => {
      isSyncing.value = false;
    });
  },
  { deep: true }
);

watch(
  () => config.value.mustLogin,
  (mustLogin) => {
    if (!mustLogin) {
      config.value.allowRepeats = true;
    }
  },
  { immediate: true }
);

function hydrateConfig(value: QuizConfig): EditableQuizConfig {
  const base = value ? JSON.parse(JSON.stringify(value)) : {};
  
  // Hydrate personality buckets with results array
  const personalityBuckets = (base.personalityBuckets ?? []).map(hydrateBucket);
  
  // Ensure mode is valid - default to 'personality' if invalid or missing
  const validMode = (base.mode === 'personality' || base.mode === 'archetype') 
    ? base.mode 
    : 'personality';
  
  return {
    mode: validMode,
    questions: (base.questions ?? []).map(hydrateQuestion),
    theme: {
      primaryColor: base.theme?.primaryColor ?? '#6366f1',
      secondaryColor: base.theme?.secondaryColor ?? '#ec4899',
      backgroundColor: base.theme?.backgroundColor ?? '#0f0f23',
    },
    personalityBuckets,
    archetypeAxes: (base.archetypeAxes ?? []).map(hydrateArchetypeAxis),
    archetypeResults: (base.archetypeResults ?? []).map(hydrateArchetypeResult),
    showProgress: base.showProgress ?? true,
    shuffleQuestions: base.shuffleQuestions ?? false,
    shuffleAnswers: base.shuffleAnswers ?? false,
    mustLogin: base.mustLogin ?? false,
    allowRepeats: base.mustLogin === false ? true : (base.allowRepeats ?? true),
  };
}

function hydrateBucket(b: Partial<PersonalityBucket>): PersonalityBucket {
  // Ensure bucket always has a valid ID - never empty
  const id = b.id && b.id.trim() !== '' 
    ? b.id 
    : (b.label ? generateSlug(b.label) : '') || `bucket_${Math.random().toString(36).slice(2, 8)}`;
  
  return {
    id,
    label: b.label ?? '',
    results: (b.results ?? [{ title: '', description: '' }]).map(hydrateResultVariant),
  };
}

function hydrateResultVariant(r: Partial<PersonalityResultVariant>): PersonalityResultVariant {
  return {
    minScore: r.minScore,
    maxScore: r.maxScore,
    title: r.title ?? '',
    description: r.description ?? '',
    imageUrl: r.imageUrl ?? '',
    shareText: r.shareText ?? '',
  };
}

function createAxisId(): string {
  return `axis_${Math.random().toString(36).slice(2, 8)}`;
}

function hydrateArchetypeAxis(a: Partial<ArchetypeAxis>): ArchetypeAxis {
  // Ensure axis always has a valid ID - never empty
  const id = a.id && a.id.trim() !== '' 
    ? a.id 
    : createAxisId();
  
  return {
    id,
    lowLabel: a.lowLabel ?? '',
    highLabel: a.highLabel ?? '',
  };
}

function createResultId(): string {
  return `result_${Math.random().toString(36).slice(2, 8)}`;
}

function hydrateArchetypeResult(r: Partial<ArchetypeResult>): ArchetypeResult {
  // Ensure result always has a valid ID - never empty
  const id = r.id && r.id.trim() !== '' 
    ? r.id 
    : createResultId();
  
  return {
    id,
    pattern: r.pattern ?? {},
    title: r.title ?? '',
    description: r.description ?? '',
    imageUrl: r.imageUrl ?? '',
    shareText: r.shareText ?? '',
  };
}

function hydrateQuestion(q: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: q.id ?? createQuestionId(),
    text: q.text ?? '',
    imageUrl: q.imageUrl ?? '',
    answers: (q.answers ?? [{ text: '' }, { text: '' }]).map(hydrateAnswer),
    category: q.category ?? '',
  };
}

function hydrateAnswer(a: Partial<QuizAnswer>): QuizAnswer {
  return {
    text: a.text ?? '',
    imageUrl: a.imageUrl ?? '',
    bucketPoints: a.bucketPoints ?? {},
    axisPoints: a.axisPoints ?? {},
  };
}

/**
 * Normalizes imageUrl fields to ensure they're always strings (not undefined)
 */
function normalizeImageUrls(config: QuizConfig): QuizConfig {
  const normalized = JSON.parse(JSON.stringify(config)) as QuizConfig;
  
  // Normalize question imageUrls
  normalized.questions = normalized.questions.map(q => ({
    ...q,
    imageUrl: q.imageUrl ?? '',
    answers: q.answers.map(a => ({
      ...a,
      imageUrl: a.imageUrl ?? '',
    })),
  }));
  
  // Normalize personality bucket result imageUrls
  if (normalized.personalityBuckets) {
    normalized.personalityBuckets = normalized.personalityBuckets.map(b => ({
      ...b,
      results: b.results.map(r => ({
        ...r,
        imageUrl: r.imageUrl ?? '',
      })),
    }));
  }
  
  // Normalize archetype result imageUrls
  if (normalized.archetypeResults) {
    normalized.archetypeResults = normalized.archetypeResults.map(r => ({
      ...r,
      imageUrl: r.imageUrl ?? '',
    }));
  }
  
  return normalized;
}

function sanitizeConfig(value: EditableQuizConfig): QuizConfig {
  // Note: Don't filter incomplete items during editing - that causes input issues.
  // Filtering of incomplete items should happen only at save time in the parent component.
  const result: QuizConfig = {
    mode: value.mode,
    questions: value.questions, // Keep all questions, even incomplete ones
    theme: value.theme,
    showProgress: value.showProgress,
    shuffleQuestions: value.shuffleQuestions,
    shuffleAnswers: value.shuffleAnswers,
    mustLogin: value.mustLogin,
    // Enforce: if mustLogin is false, allowRepeats must be true
    allowRepeats: value.mustLogin === false ? true : value.allowRepeats,
  };

  if (value.mode === 'personality') {
    // Keep all buckets during editing
    result.personalityBuckets = value.personalityBuckets?.map(b => ({
      ...b,
      results: b.results ?? [],
    }));
  } else if (value.mode === 'archetype') {
    // Ensure archetype data is included, even if empty
    result.archetypeAxes = value.archetypeAxes ?? [];
    result.archetypeResults = value.archetypeResults ?? [];
  }

  // Normalize all imageUrl fields to be strings
  return normalizeImageUrls(result);
}

function createQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function getLetterForIndex(index: number): string {
  return String.fromCharCode(65 + index);
}

// Utility: Generate slug from text
function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

// Utility: Generate axis ID from labels (first letter/number of each label, uppercase)
function generateAxisId(lowLabel: string, highLabel: string): string {
  if (!lowLabel && !highLabel) return '';
  
  // Get first character/number from each label
  const getFirstChar = (label: string): string => {
    const trimmed = label?.trim() || '';
    if (!trimmed) return '';
    // Get first character, handling Unicode/emoji
    const firstChar = trimmed.charAt(0);
    // Convert to uppercase if it's a Latin letter
    if (/[a-zA-Z]/.test(firstChar)) {
      return firstChar.toUpperCase();
    }
    // For non-Latin characters (like Hebrew, Arabic, etc.), use the character as-is
    return firstChar;
  };
  
  const lowFirst = getFirstChar(lowLabel);
  const highFirst = getFirstChar(highLabel);
  
  // If both are empty, return empty string
  if (!lowFirst && !highFirst) return '';
  
  // If one is empty, use the other twice or add a suffix
  if (!lowFirst) return highFirst + '_' + highFirst;
  if (!highFirst) return lowFirst + '_' + lowFirst;
  
  // Return combination of both with underscore separator
  const combined = lowFirst + '_' + highFirst;
  return combined || '';
}

// Utility: Validate score ranges for non-overlapping
function validateScoreRanges(results: PersonalityResultVariant[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Filter out results without score ranges (default results)
  const rangesWithScores = results
    .map((r, idx) => ({
      min: r.minScore ?? 0,
      max: r.maxScore ?? Number.MAX_SAFE_INTEGER,
      index: idx,
      title: r.title || `Result ${idx + 1}`
    }))
    .filter(r => r.min !== undefined || r.max !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.min - b.min);
  
  if (rangesWithScores.length <= 1) {
    return { valid: true, errors: [] };
  }
  
  // Check for overlaps
  for (let i = 0; i < rangesWithScores.length; i++) {
    const current = rangesWithScores[i];
    
    // Validate min < max
    if (current.min >= current.max) {
      errors.push(`${current.title}: Min score must be less than max score`);
    }
    
    // Check overlap with next range
    if (i < rangesWithScores.length - 1) {
      const next = rangesWithScores[i + 1];
      if (current.max > next.min) {
        errors.push(`Overlap: ${current.title} (${current.min}-${current.max}) overlaps with ${next.title} (${next.min}-${next.max})`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Question management
function addQuestion() {
  const newQuestion = {
    id: createQuestionId(),
    text: '',
    imageUrl: '',
    answers: [
      { text: '', imageUrl: '', bucketPoints: {}, axisPoints: {} }, 
      { text: '', imageUrl: '', bucketPoints: {}, axisPoints: {} }
    ],
  };
  config.value.questions.push(newQuestion);
  
  // Scroll to the new question
  nextTick(() => {
    const questionElement = document.querySelector(`[data-question-id="${newQuestion.id}"]`) as HTMLElement;
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function removeQuestion(index: number) {
  config.value.questions.splice(index, 1);
}

function duplicateQuestion(index: number) {
  const questionToDuplicate = config.value.questions[index];
  const duplicatedQuestion = {
    id: createQuestionId(),
    text: questionToDuplicate.text,
    imageUrl: questionToDuplicate.imageUrl ?? '',
    answers: questionToDuplicate.answers.map((answer) => ({
      text: answer.text,
      imageUrl: answer.imageUrl ?? '',
      bucketPoints: { ...answer.bucketPoints },
      axisPoints: { ...answer.axisPoints },
    })),
    category: questionToDuplicate.category ?? '',
  };
  
  config.value.questions.splice(index + 1, 0, duplicatedQuestion);
  
  // Scroll to the duplicated question
  nextTick(() => {
    const questionElement = document.querySelector(`[data-question-id="${duplicatedQuestion.id}"]`) as HTMLElement;
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function reorderQuestion(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= config.value.questions.length) return;
  const [item] = config.value.questions.splice(index, 1);
  config.value.questions.splice(target, 0, item);
}

// Answer management
function addAnswer(qIndex: number) {
  config.value.questions[qIndex].answers.push({ text: '', imageUrl: '', bucketPoints: {}, axisPoints: {} });
}

function removeAnswer(qIndex: number, aIndex: number) {
  config.value.questions[qIndex].answers.splice(aIndex, 1);
}

function updateBucketPoints(qIndex: number, aIndex: number, bucketId: string, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value) || 0;
  const answer = config.value.questions[qIndex].answers[aIndex];
  if (!answer.bucketPoints) answer.bucketPoints = {};
  answer.bucketPoints[bucketId] = value;
}

function updateAxisPoints(qIndex: number, aIndex: number, axisId: string, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value) || 0;
  const answer = config.value.questions[qIndex].answers[aIndex];
  if (!answer.axisPoints) answer.axisPoints = {};
  answer.axisPoints[axisId] = value;
}

// Personality bucket management
function createBucketId(): string {
  return `bucket_${Math.random().toString(36).slice(2, 8)}`;
}

function addBucket() {
  if (!config.value.personalityBuckets) config.value.personalityBuckets = [];
  config.value.personalityBuckets.push({
    id: createBucketId(), // Always start with a valid ID
    label: '',
    results: [{ title: '', description: '', imageUrl: '', shareText: '' }],
  });
}

// Auto-generate bucket ID from label
watch(
  () => config.value.personalityBuckets,
  (buckets) => {
    if (!buckets || isSyncing.value) return;
    
    buckets.forEach((bucket, index) => {
      // ALWAYS ensure bucket has a valid ID - this is critical for Firestore
      if (!bucket.id) {
        // If label exists, try to generate from it
        if (bucket.label) {
          const newId = generateSlug(bucket.label);
          bucket.id = newId || createBucketId();
        } else {
          // No label and no ID - generate a unique one
          bucket.id = createBucketId();
        }
      } else if (bucket.label) {
        // If label exists and ID matches a previous auto-generated slug, update it
        const newSlug = generateSlug(bucket.label);
        if (newSlug && bucket.id.startsWith('bucket_')) {
          // Replace temporary ID with label-based slug
          bucket.id = newSlug;
        }
      }
      
      // Validate ranges when buckets change
      if (bucket.results && bucket.results.length > 1) {
        validateBucketRanges(index);
      }
    });
  },
  { deep: true }
);

// Auto-generate axis ID from labels
watch(
  () => config.value.archetypeAxes,
  (axes) => {
    if (!axes || isSyncing.value) return;
    
    axes.forEach((axis) => {
      // ALWAYS ensure axis has a valid ID
      if (!axis.id) {
        if (axis.lowLabel || axis.highLabel) {
          const newId = generateAxisId(axis.lowLabel || '', axis.highLabel || '');
          axis.id = newId || createAxisId();
        } else {
          axis.id = createAxisId();
        }
      } else if (axis.lowLabel || axis.highLabel) {
        // If labels exist and ID is temporary (starts with axis_), update to label-based
        const newId = generateAxisId(axis.lowLabel || '', axis.highLabel || '');
        if (newId && axis.id.startsWith('axis_')) {
          axis.id = newId;
        }
      }
    });
  },
  { deep: true, immediate: true }
);

// Auto-generate result ID from title
watch(
  () => config.value.archetypeResults,
  (results) => {
    if (!results || isSyncing.value) return;
    
    results.forEach((result) => {
      // ALWAYS ensure result has a valid ID
      if (!result.id) {
        if (result.title) {
          const newId = generateSlug(result.title);
          result.id = newId || createResultId();
        } else {
          result.id = createResultId();
        }
      } else if (result.title) {
        // If title exists and ID is temporary (starts with result_), update to title-based
        const newId = generateSlug(result.title);
        if (newId && result.id.startsWith('result_')) {
          result.id = newId;
        }
      }
    });
  },
  { deep: true }
);

function removeBucket(index: number) {
  config.value.personalityBuckets?.splice(index, 1);
}

// Result variant management (within bucket)
function addResultVariant(bucketIndex: number) {
  const bucket = config.value.personalityBuckets?.[bucketIndex];
  if (bucket) {
    if (!bucket.results) bucket.results = [];
    bucket.results.push({ title: '', description: '', imageUrl: '', shareText: '' });
  }
}

function removeResultVariant(bucketIndex: number, resultIndex: number) {
  const bucket = config.value.personalityBuckets?.[bucketIndex];
  if (bucket?.results && bucket.results.length > 1) {
    bucket.results.splice(resultIndex, 1);
  }
}

// Archetype axis management
function addAxis() {
  if (!config.value.archetypeAxes) config.value.archetypeAxes = [];
  config.value.archetypeAxes.push({
    id: createAxisId(), // Always start with a valid ID
    lowLabel: '',
    highLabel: '',
  });
}

function removeAxis(index: number) {
  config.value.archetypeAxes?.splice(index, 1);
}

function addArchetypeResult() {
  if (!config.value.archetypeResults) config.value.archetypeResults = [];
  const pattern: Record<string, 'low' | 'high'> = {};
  config.value.archetypeAxes?.forEach(axis => {
    pattern[getAxisId(axis)] = 'high';
  });
  config.value.archetypeResults.push({
    id: createResultId(), // Always start with a valid ID
    pattern,
    title: '',
    description: '',
    imageUrl: '',
    shareText: '',
  });
}

function removeArchetypeResult(index: number) {
  config.value.archetypeResults?.splice(index, 1);
}

function updatePattern(resultIndex: number, axisId: string, value: string) {
  const result = config.value.archetypeResults?.[resultIndex];
  if (result) {
    if (!result.pattern) result.pattern = {};
    result.pattern[axisId] = value as 'low' | 'high';
  }
}


// Validate bucket ranges
function validateBucketRanges(bucketIndex: number) {
  const bucket = config.value.personalityBuckets?.[bucketIndex];
  if (!bucket || !bucket.results || bucket.results.length <= 1) {
    bucketRangeErrors.value[bucketIndex] = [];
    return;
  }
  
  const validation = validateScoreRanges(bucket.results);
  bucketRangeErrors.value[bucketIndex] = validation.errors;
}

// Get bucket range errors
function getBucketRangeErrors(bucketIndex: number, resultIndex?: number): string[] {
  const errors = bucketRangeErrors.value[bucketIndex] || [];
  if (resultIndex !== undefined) {
    // Filter errors for specific result (simplified - could be improved)
    return errors.filter(err => err.includes(`Result ${resultIndex + 1}`));
  }
  return errors;
}

// Get axis ID (compute on demand to ensure it's always up to date)
function getAxisId(axis: ArchetypeAxis): string {
  // Always compute fresh ID from labels first to ensure it's current
  const computedId = generateAxisId(axis.lowLabel || '', axis.highLabel || '');
  
  // If we have a computed ID, use it (and optionally sync it to axis.id)
  if (computedId) {
    // Sync the computed ID to axis.id if it's different
    if (axis.id !== computedId) {
      axis.id = computedId;
    }
    return computedId;
  }
  
  // If no computed ID but axis.id exists, use it
  if (axis.id) return axis.id;
  
  // Otherwise show placeholder
  return '?';
}
</script>

<style scoped>
.quiz-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 1.5rem 0 0.5rem;
}

.section-hint {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  margin: 0 0 1rem;
}

/* Section Toggle (Collapsible) */
.section-toggle {
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
  margin-bottom: 0.5rem;
}

.section-toggle:hover {
  border-bottom-color: var(--color-border-medium);
}

.section-toggle--sub {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.section-toggle__title {
  color: var(--color-text-primary);
}

.section-toggle__icon {
  transition: transform 0.2s ease;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.section-toggle__icon--open {
  transform: rotate(180deg);
}

/* Mode Section */
.mode-section {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
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

.questions-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.questions-header__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: 0.75rem;
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
  font-size: 0.85rem;
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

.answer-option__letter {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bulma-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
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

.answer-weights {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  width: 100%;
  margin-top: 0.3rem;
  padding-top: 0.4rem;
  border-top: 1px dashed var(--color-border-subtle);
}

.weight-input {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.weight-input label {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.weight-number {
  width: 50px;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.2rem 0.4rem;
  text-align: center;
  font-size: 0.85rem;
}

.answer-option__remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}

.answer-option__remove:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.answer-option__remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.answer-add {
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.answer-add:hover {
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
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
  cursor: pointer;
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
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}

.empty-state p {
  margin-bottom: 1rem;
}

/* Config Section (Buckets/Axes) */
.config-section {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

.buckets-list,
.axes-list,
.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bucket-card,
.axis-card,
.result-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  min-height: 60px;
}

.bucket-card {
  flex-direction: column;
  gap: 0.75rem;
}

.bucket-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.result-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-title-wrapper .field-input {
  flex: 1;
}

.bucket-results {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.bucket-results__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bucket-results__hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-tertiary);
}

.result-variant {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.result-variant__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px dashed var(--color-border-subtle);
}

.result-variant__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.result-variant__remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.result-variant__remove:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.result-variant__remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.result-variant__scores {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.result-variant__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.field-input--small {
  width: 100px;
}

.field-input--compact {
  width: 100%;
  min-width: 150px;
  max-width: 250px;
  font-size: 0.85rem;
  padding: 0.35rem 0.5rem;
}

/* Score range table */
.score-range-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.score-range-table thead {
  background: var(--color-bg-secondary);
}

.score-range-table th {
  padding: 0.5rem;
  text-align: start;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border-base);
}

.score-range-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
}

.score-range-table td .result-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-direction: row;
}

.score-range-table td .result-title-wrapper .field-input {
  flex: 1;
  min-width: 0;
}

/* RTL support for score range table */
:global([dir='rtl']) .score-range-table {
  direction: rtl;
}

:global([dir='rtl']) .score-range-table th {
  text-align: right;
}

:global([dir='rtl']) .score-range-table td {
  text-align: right;
}

:global([dir='rtl']) .score-range-table td .result-title-wrapper {
  flex-direction: row-reverse;
}

:global([dir='rtl']) .score-range-table td input[type="number"] {
  text-align: right;
  direction: ltr; /* Keep numbers LTR for readability */
}

:global([dir='rtl']) .score-range-table td .field-input:not([type="number"]) {
  text-align: right;
  direction: rtl;
}

:global([dir='rtl']) .score-range-table td .result-image-upload-inline {
  order: -1;
}

:global([dir='rtl']) .score-range-table td .field-input--compact {
  text-align: right;
  direction: rtl;
}

.score-range-table tbody tr:hover {
  background: var(--color-bg-secondary);
}

.score-range-error-row {
  background: rgba(239, 68, 68, 0.05);
}

.score-range-error-row td {
  border-color: rgba(239, 68, 68, 0.3);
}

.score-range-errors {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.score-range-error {
  color: #ef4444;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.score-range-error:last-child {
  margin-bottom: 0;
}

/* Result image upload inline */
.result-image-upload-inline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.result-image-upload-inline :deep(.image-uploader) {
  margin: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.result-image-upload-inline :deep(.uploader-button) {
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

.result-image-upload-inline :deep(.uploader-button-primary) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: transparent;
  font-size: 0;
}

.result-image-upload-inline :deep(.uploader-button-primary)::after {
  content: '🖼️';
  font-size: 1rem;
  line-height: 1;
  position: absolute;
  color: var(--color-text-secondary);
}

.result-image-upload-inline :deep(.uploader-current-image) {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
  display: block;
  margin: 0;
  flex-shrink: 0;
}

.add-result-variant {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
}

.add-result-variant:hover {
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.bucket-fields,
.axis-fields,
.result-fields {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.field--full {
  grid-column: 1 / -1;
}

.field label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.field-input,
.field-textarea,
.field-select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.field-input:focus,
.field-textarea:focus,
.field-select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.bucket-remove,
.axis-remove,
.result-remove {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}

.bucket-remove:hover,
.axis-remove:hover,
.result-remove:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

/* Pattern inputs for archetype */
.pattern-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.pattern-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
}

.pattern-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.pattern-buttons {
  display: flex;
  gap: 0.5rem;
}

.pattern-button {
  flex: 1;
  padding: 0.4rem 0.6rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.pattern-button:hover {
  border-color: var(--color-border-primary);
  background: var(--color-bg-elevated);
}

.pattern-button--active {
  background: var(--color-primary-bg);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
  font-weight: 600;
}

.pattern-select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.25rem 0.5rem;
}

/* Archetype result card improvements */
.result-card--archetype {
  flex-direction: column;
  gap: 1rem;
}

.result-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.result-card__number {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--bulma-primary);
  flex-shrink: 0;
}

.result-card__title-preview {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.result-variant--details {
  margin-top: 0.75rem;
  border-top: 1px dashed var(--color-border-subtle);
  padding-top: 0.75rem;
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
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.settings-toggle__icon {
  transition: transform 0.2s ease;
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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-primary);
  cursor: pointer;
}

.toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--bulma-primary);
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

@media (max-width: 768px) {
  .question-card__main {
    flex-wrap: wrap;
  }

  .question-card__actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }

  .bucket-fields,
  .axis-fields,
  .result-fields {
    grid-template-columns: 1fr;
  }
}
</style>


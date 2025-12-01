<template>
  <div class="game-builder">
    <!-- Section 1: Game Name -->
    <section class="builder-section">
      <div class="builder-section__header">
        <h2 class="builder-section__title">{{ t('build.game.fields.name.label') }}</h2>
        <p class="builder-section__hint">{{ t('build.game.fields.name.hint') }}</p>
      </div>
      <div class="builder-section__content">
        <div class="game-name-wrapper">
          <input
            :id="ids.name"
            type="text"
            v-model="game.name"
            :placeholder="t('build.game.fields.name.placeholder')"
            class="game-name-input"
          />
          <span v-if="persistedGameId" class="game-status-badge" :class="gameStatusClass">
            {{ gameStatusText }}
          </span>
        </div>
        <!-- Image Preview with Gradient -->
        <div class="image-preview-section">
          <label class="image-preview-label">{{ t('build.game.fields.cover.label') || 'Game Cover' }}</label>
          <div class="image-preview-wrapper">
            <img 
              v-if="game.image"
              :src="game.image" 
              :alt="`${game.name} image`" 
              class="image-preview"
            />
            <div
              v-else
              class="image-preview-placeholder"
              :style="placeholderStyle"
            >
              <span>{{ game.name || 'Game Name' }}</span>
            </div>
            <div class="image-preview-controls">
              <button
                type="button"
                class="image-upload-button"
                @click="showImageUploader = true"
                :title="t('build.game.fields.cover.upload') || 'Upload Image'"
              >
                <font-awesome-icon :icon="['fas', 'upload']" />
              </button>
              <button
                v-if="game.image"
                type="button"
                class="image-remove-button"
                @click="removeImage"
                :title="t('build.game.fields.cover.remove') || 'Remove Image'"
              >
                <font-awesome-icon :icon="['fas', 'trash']" />
              </button>
            </div>
          </div>
          <!-- Gradient Color Pickers -->
          <div v-if="!game.image" class="gradient-controls">
            <div class="gradient-control-item">
              <label :for="ids.gradientStart">Start Color</label>
              <input
                :id="ids.gradientStart"
                type="color"
                :value="gradientStartColor"
                @input="updateGradientStart"
              />
            </div>
            <div class="gradient-control-item">
              <label :for="ids.gradientEnd">End Color</label>
              <input
                :id="ids.gradientEnd"
                type="color"
                :value="gradientEndColor"
                @input="updateGradientEnd"
              />
            </div>
            <div class="gradient-control-item">
              <label :for="ids.gradientText">Text Color</label>
              <input
                :id="ids.gradientText"
                type="color"
                :value="gradientTextColor"
                @input="updateGradientText"
              />
            </div>
          </div>
          <p v-if="!game.image" class="field-hint">{{ t('build.game.fields.cover.hint') }}</p>
        </div>
        <!-- Image Uploader (Hidden Modal) -->
        <div v-if="showImageUploader" class="image-uploader-modal">
          <div class="image-uploader-modal-backdrop" @click="showImageUploader = false"></div>
          <div class="image-uploader-modal-content">
            <ImageUploader
              v-model="game.image"
              :uploadFolder="`images/games/${validatedGameId}`"
              :cropWidth="512"
              :cropHeight="320"
            />
            <button
              type="button"
              class="image-uploader-close"
              @click="showImageUploader = false"
            >
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Custom Config (Trivia/Pyramid/Zone) -->
    <section class="builder-section builder-section--no-frame">
      <AddTrivia
        v-if="props.gameType.custom === 'TriviaConfig'"
        v-model="(game.custom as TriviaConfig)"
        :gameId="validatedGameId"
      />
      <AddPyramid
        v-else-if="props.gameType.custom === 'PyramidConfig'"
        v-model="(game.custom as PyramidConfig)"
        :gameId="validatedGameId"
      />
      <AddZoneReveal
        v-else-if="props.gameType.custom === 'ZoneRevealConfig'"
        v-model="(game.custom as ZoneRevealConfig)"
      />
      <AddQuiz
        v-else-if="props.gameType.custom === 'QuizConfig'"
        v-model="(game.custom as QuizConfig)"
        :gameId="validatedGameId"
      />
    </section>

    <!-- Section 3: Other Game Settings (Collapsible) -->
    <section class="builder-section">
      <button
        type="button"
        class="builder-section__toggle"
        @click="showGameSettings = !showGameSettings"
      >
        <span class="builder-section__toggle-title">{{ t('build.game.settings.title') || 'Game Settings' }}</span>
        <span class="builder-section__toggle-icon" :class="{ 'builder-section__toggle-icon--open': showGameSettings }">
          ▼
        </span>
      </button>

      <div v-if="showGameSettings" class="builder-section__content">
        <div class="settings-grid">
          <div class="field-block field-block--wide">
            <label :for="ids.description">{{ t('build.game.fields.description.label') }}</label>
            <textarea
              :id="ids.description"
              rows="3"
              v-model="game.description"
              :placeholder="t('build.game.fields.description.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.description.hint') }}</p>
          </div>

          <div class="field-block field-block--wide">
            <label :for="ids.instructions">{{ t('build.game.fields.instructions.label') }}</label>
            <textarea
              :id="ids.instructions"
              rows="3"
              v-model="game.gameInstruction"
              :placeholder="t('build.game.fields.instructions.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.instructions.hint') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer Actions -->
    <footer class="builder-footer">
      <div class="builder-footer__spacer"></div>
      <div class="builder-footer__actions">
        <CustomButton
          type="is-primary is-light"
          :label="t('build.wizard.save')"
          :icon="['fas', 'save']"
          :loading="isSaving"
          :disabled="isSaving"
          @click="handleSave"
        />
        <CustomButton
          type="is-primary"
          :label="t('build.wizard.saveAndPreview')"
          :icon="['fas', 'eye']"
          :loading="isSaving"
          :disabled="isSaving"
          @click="handleSaveAndPreview"
        />
        <div v-if="persistedGameId" class="builder-footer__action-wrapper">
          <CustomButton
            type="is-light"
            :label="t('build.wizard.share')"
            :icon="['fas', 'share']"
            @click="handleShare"
          />
          <div v-if="showShareSuccess" class="share-success-toast">
            {{ t('build.wizard.shareSuccess') }}
          </div>
        </div>
        <CustomButton
          v-if="persistedGameId"
          :type="isPublished ? 'is-warning' : 'is-success'"
          :label="isPublished ? t('build.wizard.unpublish') : t('build.wizard.publish')"
          :icon="isPublished ? ['fas', 'eye-slash'] : ['fas', 'globe']"
          :loading="isSaving"
          :disabled="isSaving"
          @click="handleTogglePublish"
        />
        <CustomButton
          v-if="persistedGameId"
          type="is-danger"
          :label="t('build.wizard.delete')"
          :icon="['fas', 'trash']"
          :loading="isDeleting"
          :disabled="isDeleting"
          @click="showDeleteModal = true"
        />
      </div>
    </footer>

    <!-- Delete Confirmation Modal -->
    <div class="modal" :class="{ 'is-active': showDeleteModal }">
      <div class="modal-background" @click="showDeleteModal = false"></div>
      <div class="modal-content box">
        <h3 class="title is-4">{{ t('build.games.deleteConfirmTitle') || 'Delete game' }}</h3>
        <p>{{ t('build.wizard.deleteConfirm', { name: game.name }) }}</p>
        <div class="buttons mt-4">
          <CustomButton
            type="is-danger"
            :label="t('build.games.deleteConfirmButton') || 'Delete'"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="performDelete"
          />
          <CustomButton
            type="is-light"
            :label="t('build.games.deleteCancel') || 'Cancel'"
            :disabled="isDeleting"
            @click="showDeleteModal = false"
          />
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="showDeleteModal = false"></button>
    </div>

    <!-- Unsaved Changes Confirmation Modal -->
    <div class="modal" :class="{ 'is-active': showUnsavedChangesModal }">
      <div class="modal-background" @click="handleCancelUnsaved"></div>
      <div class="modal-content box">
        <h3 class="title is-4">{{ t('build.wizard.unsavedChangesTitle') || 'Unsaved Changes' }}</h3>
        <p>{{ t('build.wizard.unsavedChangesMessage') || 'You have unsaved changes. Do you want to save them before leaving?' }}</p>
        <div class="buttons mt-4">
          <CustomButton
            type="is-primary"
            :label="t('build.wizard.saveChanges') || 'Save Changes'"
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleSaveChanges"
          />
          <CustomButton
            type="is-danger"
            :label="t('build.wizard.discardChanges') || 'Discard Changes'"
            :disabled="isSaving"
            @click="handleDiscardChanges"
          />
          <CustomButton
            type="is-light"
            :label="t('build.wizard.cancel') || 'Cancel'"
            :disabled="isSaving"
            @click="handleCancelUnsaved"
          />
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="handleCancelUnsaved"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import GameCard from '@/components/GameCard.vue';
import AddPyramid from '@/components/build/AddPyramid.vue';
import AddZoneReveal from '@/components/build/AddZoneReveal.vue';
import AddTrivia from '@/components/build/AddTrivia.vue';
import AddQuiz from '@/components/build/AddQuiz.vue';
import { createGame, updateGame, getGames, deleteGame } from '@/services/game';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import type { Game, GameType, GameCustomConfig } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type { QuizConfig } from '@top-x/shared/types/quiz';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300e8e0"/><stop offset="100%" stop-color="%23ff2d92"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="%23ffffff">TOP-X</text></svg>';

const props = defineProps<{
  gameType: GameType;
  existingGame?: Game | null;
  selectedDefaultConfig?: GameCustomConfig | null;
}>();

const emit = defineEmits(['save', 'cancel']);

const router = useRouter();
const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);


const ids = {
  name: 'builder-game-name',
  description: 'builder-game-description',
  language: 'builder-game-language',
  header: 'builder-game-header',
  shareText: 'builder-game-share-text',
  instructions: 'builder-game-instructions',
  shareLink: 'builder-game-share-link',
  gradientStart: 'builder-gradient-start',
  gradientEnd: 'builder-gradient-end',
  gradientText: 'builder-gradient-text',
} as const;

const isSaving = ref(false);
const isDeleting = ref(false);
const showGameSettings = ref(false);
const showDeleteModal = ref(false);
const showShareSuccess = ref(false);
const showUnsavedChangesModal = ref(false);
const showImageUploader = ref(false);
const lastSavedState = ref<Game | null>(null);
let pendingNavigation: (() => void) | null = null;


// Helper to get CSS variable value and convert to hex
function getCSSVariableValue(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (!value) {
      return fallback;
    }
    if (value.startsWith('#')) {
      return value;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// Default gradient colors from CSS variables
const DEFAULT_GRADIENT_START = '#00e8e0'; // Fallback, will be overridden by CSS variable
const DEFAULT_GRADIENT_END = '#c4ff00'; // Fallback, will be overridden by CSS variable
const DEFAULT_GRADIENT_TEXT = '#00e8e0'; // Fallback, will be overridden by CSS variable

// Get default gradient colors from CSS variables
function getDefaultGradientColors(): { start: string; end: string; text: string } {
  if (typeof window !== 'undefined') {
    return {
      start: getCSSVariableValue('--color-game-gradient-start', DEFAULT_GRADIENT_START),
      end: getCSSVariableValue('--color-game-gradient-end', DEFAULT_GRADIENT_END),
      text: getCSSVariableValue('--color-game-gradient-text', DEFAULT_GRADIENT_TEXT),
    };
  }
  return {
    start: DEFAULT_GRADIENT_START,
    end: DEFAULT_GRADIENT_END,
    text: DEFAULT_GRADIENT_TEXT,
  };
}

// Get default language from locale store
function getDefaultLanguage(): 'en' | 'il' {
  if (typeof window === 'undefined') {
    return 'en';
  }
  // Try to get from locale store first
  if (localeStore.language) {
    return localeStore.language === 'il' ? 'il' : 'en';
  }
  // Fallback to localStorage
  try {
    const cached = localStorage.getItem('topx.locale.preferredLanguage');
    if (cached === 'il') {
      return 'il';
    }
  } catch {
    // Ignore errors
  }
  return 'en';
}

function generateRandomGameName(): string {
  const adjectives = ['Epic', 'Awesome', 'Cool', 'Amazing', 'Fantastic', 'Incredible', 'Super', 'Ultimate'];
  const nouns = ['Challenge', 'Game', 'Quiz', 'Trivia', 'Battle', 'Showdown', 'Contest', 'Match'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${randomAdjective} ${randomNoun} ${randomNum}`;
}

const validatedGameId = computed(() => {
  const source = props.existingGame?.id || `temp-${Date.now()}`;
  return source.replace(/[\\/]/g, '');
});

const initialGame = props.existingGame
  ? JSON.parse(JSON.stringify(props.existingGame))
  : {
      id: '',
      name: generateRandomGameName(),
      description: '',
      gameTypeId: props.gameType.id,
      active: true, // Games are active by default
      language: getDefaultLanguage(),
      image: '',
      imageGradient: undefined, // Will use CSS defaults if not set
      vip: [],
      custom: props.selectedDefaultConfig
        ? JSON.parse(JSON.stringify(props.selectedDefaultConfig))
        : getDefaultCustom(props.gameType.custom),
      community: true,
      creator: {
        userid: userStore.user?.uid || '',
        username: userStore.profile?.username || '',
        image: userStore.user?.photoURL || userStore.profile?.photoURL || '',
      },
      gameHeader: '',
      shareText: '',
      gameInstruction: '',
      shareLink: '',
      unlisted: true, // New games start as drafts (unlisted=true means not visible on home but still playable)
    } as Game;

const game = ref<Game>(initialGame);
const persistedGameId = ref(props.existingGame?.id ?? '');

// Initialize lastSavedState if we have an existing game
if (props.existingGame) {
  lastSavedState.value = JSON.parse(JSON.stringify(props.existingGame)) as Game;
}

// Computed properties for game status
const isPublished = computed(() => {
  return !game.value.unlisted;
});

const gameStatusText = computed(() => {
  return isPublished.value ? t('build.wizard.status.live') : t('build.wizard.status.draft');
});

const gameStatusClass = computed(() => {
  return isPublished.value ? 'game-status-badge--live' : 'game-status-badge--draft';
});

// Gradient color handling
const defaultColors = getDefaultGradientColors();

const gradientStartColor = computed({
  get: () => {
    if (game.value.imageGradient && game.value.imageGradient[0]) {
      return game.value.imageGradient[0];
    }
    return defaultColors.start;
  },
  set: (value: string) => {
    if (!game.value.imageGradient) {
      const endColor = gradientEndColor.value;
      game.value.imageGradient = [value, endColor];
    } else {
      game.value.imageGradient = [value, game.value.imageGradient[1] || defaultColors.end];
    }
  },
});

const gradientEndColor = computed({
  get: () => {
    if (game.value.imageGradient && game.value.imageGradient[1]) {
      return game.value.imageGradient[1];
    }
    return defaultColors.end;
  },
  set: (value: string) => {
    if (!game.value.imageGradient) {
      const startColor = gradientStartColor.value;
      game.value.imageGradient = [startColor, value];
    } else {
      game.value.imageGradient = [game.value.imageGradient[0] || defaultColors.start, value];
    }
  },
});

const gradientTextColor = computed({
  get: () => {
    if (game.value.imageGradientTextColor) {
      return game.value.imageGradientTextColor;
    }
    return defaultColors.text;
  },
  set: (value: string) => {
    game.value.imageGradientTextColor = value;
  },
});

const placeholderStyle = computed(() => {
  const style: Record<string, string> = {};
  const start = gradientStartColor.value;
  const end = gradientEndColor.value;
  const textColor = gradientTextColor.value;
  
  style.background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  style.color = textColor;
  
  return style;
});

function updateGradientStart(e: Event) {
  const target = e.target as HTMLInputElement;
  const newColor = target.value;
  if (!game.value.imageGradient) {
    const endColor = gradientEndColor.value;
    game.value.imageGradient = [newColor, endColor];
  } else {
    game.value.imageGradient = [newColor, game.value.imageGradient[1] || gradientEndColor.value];
  }
}

function updateGradientEnd(e: Event) {
  const target = e.target as HTMLInputElement;
  const newColor = target.value;
  if (!game.value.imageGradient) {
    const startColor = gradientStartColor.value;
    game.value.imageGradient = [startColor, newColor];
  } else {
    game.value.imageGradient = [game.value.imageGradient[0] || gradientStartColor.value, newColor];
  }
}

function updateGradientText(e: Event) {
  const target = e.target as HTMLInputElement;
  game.value.imageGradientTextColor = target.value;
}

function removeImage() {
  game.value.image = '';
  showImageUploader.value = false;
}

const storageKey = computed(() => {
  if (typeof window === 'undefined') {
    return null;
  }
  const baseId = props.existingGame?.id || persistedGameId.value || 'new';
  return `build-draft-${props.gameType.id}-${baseId}`;
});

let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

function loadDraftFromCache(key = storageKey.value) {
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as { game?: Game; gameTypeId?: string };
    if (!parsed?.game || (parsed.gameTypeId && parsed.gameTypeId !== props.gameType.id)) {
      return;
    }
    const restored = JSON.parse(JSON.stringify(parsed.game)) as Game;
    game.value = {
      ...initialGame,
      ...restored,
      creator: restored.creator ?? initialGame.creator,
      custom: restored.custom ?? initialGame.custom,
    } as Game;
  } catch (error) {
    console.warn('Failed to restore builder draft', error);
  }
}

function saveDraftToCache(snapshot: Game) {
  const key = storageKey.value;
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    const payload = {
      gameTypeId: props.gameType.id,
      timestamp: Date.now(),
      game: snapshot,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist builder draft', error);
  }
}

function clearDraftFromCache(key = storageKey.value) {
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear builder draft', error);
  }
}

if (props.existingGame?.custom && 'levelsConfig' in props.existingGame.custom) {
  game.value.custom = withDefaultZoneRevealAnswer(
    JSON.parse(JSON.stringify(props.existingGame.custom)) as ZoneRevealConfig,
  );
} else if (props.existingGame?.custom && 'questions' in props.existingGame.custom) {
  game.value.custom = withDefaultTriviaConfig(
    JSON.parse(JSON.stringify(props.existingGame.custom)) as TriviaConfig,
  );
}
// Default config is already applied in initialGame

const gameTypeConfigTitle = computed(() => {
  if (props.gameType.custom === 'TriviaConfig') {
    return t('build.trivia.questions.stepTitle') || t('build.trivia.questions.title', { count: 0 });
  } else if (props.gameType.custom === 'PyramidConfig') {
    return t('build.pyramid.stepTitle') || 'Pyramid Configuration';
  } else if (props.gameType.custom === 'ZoneRevealConfig') {
    return t('build.zone.stepTitle') || 'Zone Reveal Configuration';
  }
  return 'Game Configuration';
});

const gameTypeConfigHint = computed(() => {
  if (props.gameType.custom === 'TriviaConfig') {
    return t('build.trivia.questions.subtitle') || 'Configure your trivia questions and settings';
  } else if (props.gameType.custom === 'PyramidConfig') {
    return 'Configure your pyramid game';
  } else if (props.gameType.custom === 'ZoneRevealConfig') {
    return 'Configure your zone reveal game';
  }
  return 'Configure your game';
});

async function saveGame(options: { stayOnWizard?: boolean } = {}) {
  const { stayOnWizard = false } = options;
  if (isSaving.value) {
    return;
  }

  try {
    isSaving.value = true;
    
    // Initialize gradient colors for existing games that don't have them
    // This ensures old games get the gradient feature when saved
    // Initialize even if game has an image, so gradient is ready if image is removed later
    if (!game.value.imageGradient || !game.value.imageGradient.length) {
      const defaults = getDefaultGradientColors();
      game.value.imageGradient = [defaults.start, defaults.end];
      if (!game.value.imageGradientTextColor) {
        game.value.imageGradientTextColor = defaults.text;
      }
    }
    
    const payload = JSON.parse(JSON.stringify(game.value));
    const { id: _discardId, ...payloadWithoutId } = payload;
    const targetId = props.existingGame?.id || persistedGameId.value || undefined;

    if (targetId) {
      const result = await updateGame(targetId, payloadWithoutId);
      if (!result.success) {
        console.error('Error updating game:', result.error);
        alert(result.error || 'Failed to update game');
        return;
      }
    } else {
      // Check game limit before creating
      const userId = userStore.user?.uid;
      if (userId) {
        const gamesResult = await getGames({ creatorUserId: userId });
        if (gamesResult.games.length >= 10) {
          alert(t('build.games.limitReached') || 'You\'ve reached the limit of 10 games. Please delete a game before creating a new one.');
          return;
        }
      }
      
      const result = await createGame(payloadWithoutId);
      if (!result.gameId) {
        console.error('Error creating game:', result.error);
        alert(result.error || 'Failed to create game');
        return;
      }
      game.value.id = result.gameId;
      persistedGameId.value = result.gameId;
    }

    // Update lastSavedState after successful save
    lastSavedState.value = JSON.parse(JSON.stringify(game.value)) as Game;

    if (!stayOnWizard) {
      clearDraftFromCache();
      // Navigate back to build dashboard
      router.push('/build');
    }
  } catch (error) {
    console.error('Error saving game:', error);
  } finally {
    isSaving.value = false;
  }
}

// Handler functions for footer buttons
async function handleSave() {
  await saveGame({ stayOnWizard: true });
}

async function handleSaveAndPreview() {
  await saveGame({ stayOnWizard: true });
  if (persistedGameId.value) {
    const gameUrl = `/games/info?game=${persistedGameId.value}`;
    window.open(gameUrl, '_blank', 'noopener');
  }
}

async function handleShare() {
  if (!persistedGameId.value) {
    alert('Please save the game first before sharing.');
    return;
  }
  
  const gameUrl = `${window.location.origin}/games/info?game=${persistedGameId.value}`;
  try {
    await navigator.clipboard.writeText(gameUrl);
    showShareSuccess.value = true;
    setTimeout(() => {
      showShareSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Failed to copy link:', error);
    // Fallback: show the URL in a prompt
    prompt('Copy this link:', gameUrl);
  }
}

async function handleTogglePublish() {
  if (isSaving.value) {
    return;
  }

  try {
    isSaving.value = true;
    const newUnlistedValue = !game.value.unlisted;
    game.value.unlisted = newUnlistedValue;
    
    const payload = JSON.parse(JSON.stringify(game.value));
    const { id: _discardId, ...payloadWithoutId } = payload;
    
    const result = await updateGame(persistedGameId.value, payloadWithoutId);
    if (!result.success) {
      console.error('Error updating game:', result.error);
      alert(result.error || 'Failed to update game');
      // Revert the change
      game.value.unlisted = !newUnlistedValue;
      return;
    }
    
    // Update lastSavedState after successful save
    lastSavedState.value = JSON.parse(JSON.stringify(game.value)) as Game;
  } catch (error) {
    console.error('Error toggling publish status:', error);
    alert('Failed to update publish status');
  } finally {
    isSaving.value = false;
  }
}

async function performDelete() {
  if (!persistedGameId.value) {
    return;
  }

  try {
    isDeleting.value = true;
    const result = await deleteGame(persistedGameId.value);
    if (!result.success) {
      console.error('Error deleting game:', result.error);
      alert(result.error || 'Failed to delete game');
      return;
    }
    
    showDeleteModal.value = false;
    clearDraftFromCache();
    router.push('/build'); // Navigate away after deletion
  } catch (error) {
    console.error('Error deleting game:', error);
    alert('Failed to delete game');
  } finally {
    isDeleting.value = false;
  }
}

const createDefaultAnswer = () => ({ solution: '', accepted: [] as string[], image: '' });

function withDefaultZoneRevealAnswer(config: ZoneRevealConfig): ZoneRevealConfig {
  const clone = JSON.parse(JSON.stringify(config)) as ZoneRevealConfig;
  if (!clone.answer) {
    clone.answer = createDefaultAnswer();
  } else {
    clone.answer.accepted = clone.answer.accepted ?? [];
  }
  return clone;
}

function getDefaultCustom(customType: string): PyramidConfig | ZoneRevealConfig | TriviaConfig | QuizConfig {
  if (customType === 'PyramidConfig') {
    return {
      items: [],
      rows: [],
      sortItems: { orderBy: 'id', order: 'asc' },
      HideRowLabel: false,
      shareImageTitle: '',
      poolHeader: '',
      worstHeader: '',
      worstPoints: 0,
      worstShow: false,
      communityItems: [],
      communityHeader: '',
    };
  }
  if (customType === 'ZoneRevealConfig') {
    return withDefaultZoneRevealAnswer({
      levelsConfig: [],
      backgroundImage: '',
      spritesheets: {},
      playerSpeed: 0,
      enemiesSpeedArray: {},
      finishPercent: 0,
      heartIcon: '',
    });
  }
  if (customType === 'TriviaConfig') {
    return withDefaultTriviaConfig({
      mode: 'fixed',
      questions: [],
      language: '',
      globalTimer: { enabled: false },
      powerUps: [],
      theme: {},
      showCorrectAnswers: true,
      showCorrectAnswersOnEnd: true,
      powerUpsActive: false,
      allowRepeats: false,
      unlimitedLives: true,
      mustLogin: false,
    } as TriviaConfig);
  }
  if (customType === 'QuizConfig') {
    return {
      mode: 'personality',
      questions: [],
      language: 'en',
      theme: {
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        backgroundColor: '#0f0f23',
      },
      personalityBuckets: [],
      archetypeAxes: [],
      archetypeResults: [],
      showProgress: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      mustLogin: false,
      allowRepeats: true,
    } as QuizConfig;
  }
  throw new Error('Unknown custom type');
}

function withDefaultTriviaConfig(config: TriviaConfig): TriviaConfig {
  const clone = JSON.parse(JSON.stringify(config)) as TriviaConfig;
  clone.mode = 'fixed';
  clone.questions = clone.questions ?? [];
  clone.language = clone.language ?? '';
  clone.globalTimer = clone.globalTimer ?? { enabled: false };
  clone.theme = clone.theme ?? {};
  clone.powerUps = clone.powerUps ?? [];
  clone.powerUpsActive = clone.powerUpsActive ?? false;
  clone.allowRepeats = clone.allowRepeats ?? false;
  clone.unlimitedLives = clone.unlimitedLives ?? true;
  clone.showCorrectAnswers = clone.unlimitedLives ? clone.showCorrectAnswers ?? true : false;
  clone.showCorrectAnswersOnEnd = clone.unlimitedLives ? clone.showCorrectAnswersOnEnd ?? true : false;
  clone.mustLogin = clone.mustLogin ?? false;
  clone.lives = clone.unlimitedLives ? undefined : clone.lives ?? 3;
  return clone;
}

// Detect if there are unsaved changes
function hasUnsavedChanges(): boolean {
  if (!lastSavedState.value) {
    // If we've never saved to backend, check if there's anything in localStorage
    const key = storageKey.value;
    if (key && typeof window !== 'undefined') {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.game) {
            // We have a draft but no backend save, so there are unsaved changes
            return true;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    return false;
  }
  
  // Compare current state with last saved state
  const current = JSON.stringify(game.value);
  const saved = JSON.stringify(lastSavedState.value);
  return current !== saved;
}

// Handle unsaved changes modal actions
async function handleSaveChanges() {
  showUnsavedChangesModal.value = false;
  await saveGame({ stayOnWizard: true });
  if (pendingNavigation) {
    pendingNavigation();
    pendingNavigation = null;
  }
}

function handleDiscardChanges() {
  showUnsavedChangesModal.value = false;
  clearDraftFromCache();
  lastSavedState.value = null;
  if (pendingNavigation) {
    pendingNavigation();
    pendingNavigation = null;
  }
}

function handleCancelUnsaved() {
  showUnsavedChangesModal.value = false;
  pendingNavigation = null;
}

onMounted(() => {
  console.log('BuildAddNewGame mounted for', props.gameType.custom);
  loadDraftFromCache();
  window.addEventListener('beforeunload', handleBeforeUnload);
});

watch(
  () => props.gameType.id,
  () => {
    loadDraftFromCache();
  },
);

watch(
  () => game.value.id,
  (id, previous) => {
    if (id && id !== previous) {
      persistedGameId.value = id;
      clearDraftFromCache(`build-draft-${props.gameType.id}-new`);
    }
  },
  { immediate: true },
);

watch(
  storageKey,
  (newKey, oldKey) => {
    if (newKey) {
      loadDraftFromCache(newKey);
    }
  },
);

watch(
  game,
  (value) => {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }
    draftSaveTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(value)) as Game;
      saveDraftToCache(snapshot);
    }, 400);
  },
  { deep: true },
);

// Watch for image upload completion to close uploader
watch(
  () => game.value.image,
  (newImage) => {
    if (newImage) {
      showImageUploader.value = false;
    }
  },
);

// Route guard to prevent navigation with unsaved changes
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges()) {
    showUnsavedChangesModal.value = true;
    pendingNavigation = () => next();
  } else {
    next();
  }
});

// Browser close protection
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = ''; // Required for Chrome
    return ''; // Required for some browsers
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }
});
</script>

<style scoped>
.game-builder {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.builder-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-section--no-frame {
  gap: 0;
}

.builder-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.builder-section__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.builder-section__hint {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  margin: 0;
}

.builder-section__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-section__toggle {
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

.builder-section__toggle:hover {
  border-bottom-color: var(--color-border-medium);
}

.builder-section__toggle-title {
  color: var(--color-text-primary);
}

.builder-section__toggle-icon {
  transition: transform 0.2s ease;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.builder-section__toggle-icon--open {
  transform: rotate(180deg);
}

.game-name-input {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  transition: border-color 0.2s ease;
}

.game-name-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.game-name-input::placeholder {
  color: var(--color-text-tertiary);
}

.game-name-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.game-status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.game-status-badge--live {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.game-status-badge--draft {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.3);
}

.image-preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.image-preview-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  max-width: 512px;
  aspect-ratio: 512 / 320;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border-base);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bulma-primary);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  padding: 1.5rem;
  text-align: center;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.image-preview-controls {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

.image-upload-button,
.image-remove-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.image-upload-button:hover,
.image-remove-button:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.image-remove-button {
  background: rgba(220, 38, 38, 0.8);
  border-color: rgba(220, 38, 38, 1);
}

.image-remove-button:hover {
  background: rgba(220, 38, 38, 1);
}

.gradient-controls {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.gradient-control-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  max-width: 200px;
}

.gradient-control-item label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.gradient-control-item input[type="color"] {
  width: 100%;
  height: 40px;
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
  background: transparent;
}

.image-uploader-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-uploader-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.image-uploader-modal-content {
  position: relative;
  z-index: 1001;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.image-uploader-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(220, 38, 38, 0.9);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #ffffff;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  transition: background 0.2s ease;
}

.image-uploader-close:hover {
  background: rgba(220, 38, 38, 1);
}

.settings-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-block--wide {
  grid-column: 1 / -1;
}

.field-block label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.field-block input,
.field-block textarea,
.field-block select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.875rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.field-block input:focus,
.field-block textarea:focus,
.field-block select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field-block textarea {
  resize: vertical;
}

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.builder-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1.5rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

.builder-footer__spacer {
  flex: 1;
}

.builder-footer__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.builder-footer__action-wrapper {
  position: relative;
}

/* Share Success Toast */
.share-success-toast {
  position: absolute;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 100;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  border: 1px solid var(--color-border-base);
  font-size: 0.875rem;
  white-space: nowrap;
  animation: slideInDown 0.3s ease-out;
}

.share-success-toast::after {
  content: "";
  position: absolute;
  bottom: -8px;
  right: 20px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid var(--color-bg-elevated);
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .game-builder {
    padding: 1.25rem;
  }

  .builder-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .builder-footer__spacer {
    display: none;
  }

  .builder-footer__actions {
    flex-direction: column;
    width: 100%;
  }

  .builder-footer__actions > * {
    width: 100%;
  }

  .share-success-toast {
    width: 100%;
    right: 0;
    left: 0;
  }

  .share-success-toast::after {
    right: 50%;
    transform: translateX(50%);
  }

  .game-name-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>


<template>
  <div class="zone-reveal-builder">
    <!-- Levels Section -->
    <section ref="levelsSection" class="levels-section">
      <button
        type="button"
        class="section-toggle"
        @click="toggleSection('levels')"
      >
        <span class="section-toggle__title">Levels ({{ config.levelsConfig.length }})</span>
        <span class="section-toggle__icon" :class="{ 'section-toggle__icon--open': showLevels }">
          ▼
        </span>
      </button>
      
      <div v-if="showLevels" class="levels-section__content">
        <!-- Background Image -->
        <div class="field">
          <label class="label">Background Image</label>
          <p class="help">Default: Anonymous background - upload to customize</p>
          <ImageUploader
            :model-value="config.backgroundImage || 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fdefault%2Fanonymous.png?alt=media'"
            @update:model-value="config.backgroundImage = $event || ''"
            uploadFolder="zonereveal/"
            :cropWidth="800"
            :cropHeight="600"
          />
        </div>

        <!-- Levels Grid -->
        <div v-if="config.levelsConfig.length" class="levels-grid">
          <div
            v-for="(level, levelIndex) in config.levelsConfig"
            :key="levelIndex"
            :data-level-index="levelIndex"
            class="level-card"
          >
            <div class="level-card__number">{{ levelIndex + 1 }}</div>
            <button
              type="button"
              class="level-card__remove"
              @click="removeLevel(levelIndex)"
              :title="'Remove level'"
            >
              ×
            </button>
            
            <div class="level-card__image-wrapper">
              <ImageUploader
                :model-value="level.hiddenImage || 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media'"
                @update:model-value="level.hiddenImage = $event || ''"
                uploadFolder="zonereveal"
                :cropWidth="200"
                :cropHeight="240"
              />
            </div>
            
            <div class="level-card__fields">
              <input
                v-model="level.levelHeader"
                placeholder="Level Header"
                class="field-input field-input--compact"
              />
              <input
                type="number"
                v-model.number="level.timeLimit"
                placeholder="Time Limit"
                class="field-input field-input--compact"
              />
            </div>

            <!-- Enemies -->
            <div class="level-config-group">
              <label class="level-config-label">Enemies</label>
              <div class="config-items">
                <div
                  v-for="(enemy, enemyIndex) in level.enemyConfig"
                  :key="enemyIndex"
                  class="config-item"
                >
                  <select v-model="enemy.type" class="config-item__select">
                    <option value="">Type</option>
                    <option v-for="t in enemyTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <input
                    type="number"
                    v-model.number="enemy.count"
                    placeholder="Count"
                    class="config-item__input"
                  />
                  <button
                    type="button"
                    class="config-item__remove"
                    @click="removeEnemy(levelIndex, enemyIndex)"
                    title="Remove enemy"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  class="config-item__add"
                  @click="addEnemy(levelIndex)"
                >
                  + Enemy
                </button>
              </div>
            </div>

            <!-- Powerups -->
            <div class="level-config-group">
              <label class="level-config-label">Powerups</label>
              <div class="config-items">
                <div
                  v-for="(powerup, powerupIndex) in level.powerupConfig"
                  :key="powerupIndex"
                  class="config-item"
                >
                  <select v-model="powerup.type" class="config-item__select">
                    <option value="">Type</option>
                    <option v-for="t in powerupTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <input
                    type="number"
                    v-model.number="powerup.count"
                    placeholder="Count"
                    class="config-item__input"
                  />
                  <button
                    type="button"
                    class="config-item__remove"
                    @click="removePowerup(levelIndex, powerupIndex)"
                    title="Remove powerup"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  class="config-item__add"
                  @click="addPowerup(levelIndex)"
                >
                  + Powerup
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="level-card__actions">
              <button
                type="button"
                class="action-btn action-btn--small"
                :disabled="levelIndex === 0"
                @click="reorderLevel(levelIndex, -1)"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                class="action-btn action-btn--small"
                :disabled="levelIndex === config.levelsConfig.length - 1"
                @click="reorderLevel(levelIndex, 1)"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                class="action-btn action-btn--small action-btn--secondary"
                @click="duplicateLevel(levelIndex)"
                title="Duplicate level"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No levels configured</p>
          <CustomButton
            type="is-primary"
            label="Add Your First Level"
            @click="addLevel"
          />
        </div>
        
        <div v-if="config.levelsConfig.length" class="levels-footer">
          <CustomButton 
            type="is-primary" 
            label="Add Level" 
            @click="addLevel" 
          />
        </div>
      </div>
    </section>

    <!-- Advanced Settings Section -->
    <section ref="advancedSection" class="settings-section">
      <button
        type="button"
        class="settings-toggle"
        @click="toggleSection('advanced')"
      >
        <span>Advanced Settings</span>
        <span class="settings-toggle__icon" :class="{ 'settings-toggle__icon--open': showAdvancedSettings }">
          ▼
        </span>
      </button>

      <div v-if="showAdvancedSettings" class="settings-content">
        <!-- Spritesheets Table with Speeds -->
        <div class="spritesheets-section">
          <h3 class="settings-subtitle">Spritesheets & Speeds</h3>
          <p class="help">Default spritesheets are provided - upload custom ones to replace them.</p>
          <div class="spritesheets-table">
            <!-- Spritesheet Rows -->
            <div
              v-for="(value, key) in normalizedSpritesheets"
              :key="key"
              class="spritesheet-row"
            >
              <div class="spritesheet-row__key">
                <input
                  class="key-input"
                  :value="key"
                  disabled
                />
              </div>
              <div class="spritesheet-row__sprite">
                <ImageUploaderCircleSprite
                  :model-value="getSpriteUrl(value, key)"
                  @update:model-value="(url: string) => updateSpriteUrl(key, url)"
                  uploadFolder="zonereveal/"
                  :cropSize="512"
                />
              </div>
              <div class="spritesheet-row__speed">
                <input
                  v-if="isEnemyType(key) || key === 'player'"
                  type="number"
                  :value="getSpriteSpeed(value, key)"
                  @input="(e) => updateSpriteSpeed(key, Number((e.target as HTMLInputElement).value))"
                  placeholder="Speed"
                  class="speed-input"
                />
                <span v-else class="speed-placeholder">N/A</span>
              </div>
              <div class="spritesheet-row__actions">
                <button
                  type="button"
                  class="action-btn action-btn--danger action-btn--small"
                  @click="removeSpritesheet(key)"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- Add New Sprite Row -->
            <div class="spritesheet-row spritesheet-row--add">
              <div class="spritesheet-row__key">
                <select v-model="newSpriteKey" class="key-select">
                  <option value="">Select Sprite Key</option>
                  <option v-for="k in spriteKeys" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
              <div class="spritesheet-row__sprite">
                <ImageUploaderCircleSprite
                  v-model="newSpriteValue"
                  uploadFolder="zonereveal/"
                  :cropSize="512"
                />
              </div>
              <div class="spritesheet-row__speed">
                <input
                  v-if="isEnemyType(newSpriteKey) || newSpriteKey === 'player'"
                  type="number"
                  v-model.number="newSpriteSpeed"
                  placeholder="Speed"
                  class="speed-input"
                />
                <span v-else class="speed-placeholder">N/A</span>
              </div>
              <div class="spritesheet-row__actions">
                <CustomButton
                  type="is-success is-small"
                  label="Add Sprite"
                  @click="addSpritesheet"
                  :disabled="!newSpriteKey || !newSpriteValue || ((isEnemyType(newSpriteKey) || newSpriteKey === 'player') && !newSpriteSpeed)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- isAnswer Toggle -->
        <label class="toggle">
          <input type="checkbox" v-model="isAnswer" />
          <span>Enable Answer Section</span>
        </label>

        <!-- Answer Section (conditional) -->
        <div v-if="isAnswer" class="answer-section">
          <h3 class="settings-subtitle">Answer Configuration</h3>
          
          <div class="answer-section__content">
            <div class="answer-section__image">
              <label class="label">Reveal Image</label>
              <p class="help">Default: Level 1 image - upload to customize the answer reveal image.</p>
              <ImageUploader
                :model-value="config.answer.image || 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media'"
                @update:model-value="config.answer.image = $event || ''"
                uploadFolder="zonereveal/"
                :cropWidth="200"
                :cropHeight="240"
              />
            </div>
            
            <div class="answer-section__fields">
              <div class="field">
                <label class="label">Answer</label>
                <p class="help">Enter the canonical spelling that will be revealed to players.</p>
                <input
                  class="input"
                  v-model="config.answer.solution"
                  placeholder="Canonical answer (e.g., Mount Everest)"
                />
              </div>

              <div class="field">
                <label class="label">Accepted Variants</label>
                <p class="help">Optional alternate spellings, nicknames, or abbreviations that should also be accepted.</p>
                <div class="field has-addons">
                  <div class="control is-expanded">
                    <input
                      class="input"
                      v-model="newAcceptedVariant"
                      placeholder="Add an alternate answer and press enter"
                      @keyup.enter.prevent="addAcceptedVariant"
                    />
                  </div>
                  <div class="control">
                    <button class="button is-link" @click.prevent="addAcceptedVariant">Add</button>
                  </div>
                </div>
                <div class="tags">
                  <span
                    v-for="(variant, variantIndex) in config.answer.accepted"
                    :key="variant"
                    class="tag is-info is-light"
                  >
                    {{ variant }}
                    <button
                      class="delete is-small"
                      @click="removeAcceptedVariant(variantIndex)"
                      aria-label="Remove variant"
                    ></button>
                  </span>
                </div>
              </div>
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
import ImageUploaderCircleSprite from '@top-x/shared/components/ImageUploaderCircleSprite.vue';
import type { ZoneRevealConfig, LevelConfig, EnemyConfig, PowerupConfig, SpriteSheetConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{ modelValue: ZoneRevealConfig }>();
const emit = defineEmits(['update:modelValue']);

const createDefaultAnswer = () => ({
  solution: '',
  accepted: [] as string[],
  image: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media'
});

// Default spritesheets from Firebase Storage
const defaultSpritesheets = {
  player: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fdefault%2FMonocle_spritesheet.png?alt=media&token=61581744-60e8-417a-bf5c-eb65b5c2b4b1',
  enemy: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fmonster_spritesheet.png?alt=media',
  robot: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fdefault%2FAlien_spritesheet.png?alt=media&token=19c85bae-5f19-49d7-96e4-708cdf7ac0ad',
  microbe: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fmicrobe_spritesheet.png?alt=media',
  heart: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fheart_spritesheet.png?alt=media',
  clock: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Ftime_spritesheet.png?alt=media',
  speed: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fspeed_spritesheet.png?alt=media',
  freeze: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Ffreeze_spritesheet.png?alt=media',
  smoke: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fsmoke.png?alt=media'
} as const;

const config = ref<ZoneRevealConfig>({
  levelsConfig: [
    {
      enemyConfig: [],
      powerupConfig: [],
      timeLimit: 60,
      hiddenImage: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media',
      levelHeader: 'Level 1'
    }
  ],
  backgroundImage: '',
  spritesheets: {
    player: { url: defaultSpritesheets.player, speed: 200 },
    enemy: { url: defaultSpritesheets.enemy },
    robot: { url: defaultSpritesheets.robot, speed: 120 },
    microbe: { url: defaultSpritesheets.microbe, speed: 90 },
    straightUp: { url: defaultSpritesheets.enemy, speed: 150 },
    straightLeft: { url: defaultSpritesheets.enemy, speed: 150 },
    heart: { url: defaultSpritesheets.heart },
    clock: { url: defaultSpritesheets.clock },
    speed: { url: defaultSpritesheets.speed },
    freeze: { url: defaultSpritesheets.freeze },
    smoke: { url: defaultSpritesheets.smoke }
  },
  playerSpeed: 200,
  enemiesSpeedArray: { bouncing: 100, robot: 80, microbe: 90, straightUp: 150, straightLeft: 150 },
  finishPercent: 80,
  heartIcon: '/assets/zonereveal/heart_icon.png',
  answer: createDefaultAnswer(),
});

const enemyTypes = ['bouncing', 'robot', 'microbe', 'straightUp', 'straightLeft'];
const powerupTypes = ['extralive', 'extratime', 'extraspeed', 'extrafreeze'];
const spriteKeys = ['player', 'enemy', 'robot', 'microbe', 'straightUp', 'straightLeft', 'heart', 'clock', 'speed', 'freeze', 'smoke'];

const newSpriteKey = ref('');
const newSpriteValue = ref('');
const newSpriteSpeed = ref<number | undefined>(undefined);
const newAcceptedVariant = ref('');
const isAnswer = ref(false);

// Section state management
const activeSection = ref<string | null>(null);
const levelsSection = ref<HTMLElement | null>(null);
const advancedSection = ref<HTMLElement | null>(null);

const showLevels = computed(() => activeSection.value === 'levels');
const showAdvancedSettings = computed(() => activeSection.value === 'advanced');

function toggleSection(section: string) {
  const wasOpen = activeSection.value === section;
  activeSection.value = wasOpen ? null : section;
  
  if (!wasOpen) {
    nextTick(() => {
      setTimeout(() => {
        const navbar = document.querySelector('.navbar') as HTMLElement;
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        
        let sectionElement: HTMLElement | null = null;
        switch (section) {
          case 'levels':
            sectionElement = levelsSection.value;
            break;
          case 'advanced':
            sectionElement = advancedSection.value;
            break;
        }
        
        if (sectionElement) {
          const toggleButton = sectionElement.querySelector('.section-toggle, .settings-toggle') as HTMLElement;
          const targetElement = toggleButton || sectionElement;
          
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - navbarHeight;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        }
      }, 50);
    });
  }
}

// Normalize spritesheets to new format (object with url and speed)
// Order: player first, then heart, clock, then the rest
const normalizedSpritesheets = computed(() => {
  const spritesheets = config.value.spritesheets ?? {};
  const normalized: Record<string, SpriteSheetConfig> = {};
  
  Object.entries(spritesheets).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Old format: migrate to new format
      const speed = key === 'player' 
        ? config.value.playerSpeed 
        : config.value.enemiesSpeedArray?.[key];
      normalized[key] = { url: value, speed };
    } else {
      // New format: use as is
      normalized[key] = value;
    }
  });
  
  // Sort: player first, then heart, clock, then the rest
  const orderedEntries = Object.entries(normalized).sort(([keyA], [keyB]) => {
    const order = ['player', 'heart', 'clock'];
    const indexA = order.indexOf(keyA);
    const indexB = order.indexOf(keyB);
    
    // If both are in the order array, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only A is in the order array, it comes first
    if (indexA !== -1) return -1;
    // If only B is in the order array, it comes first
    if (indexB !== -1) return 1;
    // If neither is in the order array, maintain original order (alphabetical)
    return keyA.localeCompare(keyB);
  });
  
  return Object.fromEntries(orderedEntries);
});

// Helper functions for spritesheet handling
function isEnemyType(key: string): boolean {
  return enemyTypes.includes(key) || key === 'enemy';
}

function getSpriteUrl(value: string | SpriteSheetConfig, key: string): string {
  const url = typeof value === 'string' ? value : value.url;
  // Return default if no custom URL is set
  return url || defaultSpritesheets[key as keyof typeof defaultSpritesheets] || '';
}

function getSpriteSpeed(value: string | SpriteSheetConfig, key: string): number | undefined {
  if (typeof value === 'string') {
    // For backward compatibility, check playerSpeed for 'player' key
    if (key === 'player') {
      return config.value.playerSpeed;
    }
    return undefined;
  }
  // For 'player' key, also check playerSpeed as fallback
  if (key === 'player' && value.speed === undefined) {
    return config.value.playerSpeed;
  }
  return value.speed;
}

function updateSpriteUrl(key: string, url: string) {
  if (!config.value.spritesheets) {
    config.value.spritesheets = {};
  }
  const current = config.value.spritesheets[key];
  if (typeof current === 'string') {
    // For backward compatibility, get speed from appropriate source
    const speed = key === 'player' 
      ? config.value.playerSpeed 
      : config.value.enemiesSpeedArray?.[key];
    config.value.spritesheets[key] = { url, speed };
  } else if (current) {
    config.value.spritesheets[key] = { ...current, url };
  } else {
    // For new entries, set default speed for player
    const speed = key === 'player' ? config.value.playerSpeed : undefined;
    config.value.spritesheets[key] = { url, speed };
  }
}

function updateSpriteSpeed(key: string, speed: number | undefined) {
  if (!config.value.spritesheets) {
    config.value.spritesheets = {};
  }
  const current = config.value.spritesheets[key];
  if (typeof current === 'string') {
    config.value.spritesheets[key] = { url: current, speed };
  } else if (current) {
    config.value.spritesheets[key] = { ...current, speed };
  } else {
    config.value.spritesheets[key] = { url: '', speed };
  }
  
  // Sync playerSpeed with spritesheets['player'].speed
  if (key === 'player') {
    config.value.playerSpeed = speed ?? 200; // Default to 200 if undefined
  }
}

watch(
  () => props.modelValue,
  (val) => {
    config.value = val;
    if (!config.value.answer) {
      config.value.answer = createDefaultAnswer();
    } else {
      config.value.answer.accepted = config.value.answer.accepted ?? [];
    }
    // Set defaults for heartIcon and finishPercent if not set
    if (!config.value.heartIcon) {
      config.value.heartIcon = '/assets/zonereveal/heart_icon.png';
    }
    if (config.value.finishPercent === undefined || config.value.finishPercent === 0) {
      config.value.finishPercent = 80;
    }
    // Initialize isAnswer based on whether answer has content
    if (val.answer) {
      isAnswer.value = Boolean(val.answer.solution || val.answer.image || (val.answer.accepted && val.answer.accepted.length > 0));
    }
    // Migrate old format to new format
    migrateSpritesheetsToNewFormat();
  },
  { deep: true, immediate: true }
);

function migrateSpritesheetsToNewFormat() {
  if (!config.value.spritesheets) return;
  
  const spritesheets = config.value.spritesheets;
  const migrated: Record<string, SpriteSheetConfig> = {};
  let needsMigration = false;
  
  Object.entries(spritesheets).forEach(([key, value]) => {
    if (typeof value === 'string') {
      needsMigration = true;
      // For player, use playerSpeed; for enemies, use enemiesSpeedArray
      const speed = key === 'player' 
        ? config.value.playerSpeed 
        : config.value.enemiesSpeedArray?.[key];
      migrated[key] = { url: value, speed };
    } else {
      migrated[key] = value;
    }
  });
  
  // If player spritesheet exists but doesn't have speed, sync from playerSpeed
  if (migrated['player'] && migrated['player'].speed === undefined && config.value.playerSpeed) {
    migrated['player'].speed = config.value.playerSpeed;
    needsMigration = true;
  }
  
  if (needsMigration) {
    config.value.spritesheets = migrated as any;
  }
}

watch(
  config,
  (val) => {
    emit('update:modelValue', val);
  },
  { deep: true }
);

function addLevel() {
  config.value.levelsConfig.push({
    enemyConfig: [],
    powerupConfig: [],
    timeLimit: 0,
    hiddenImage: '',
    levelHeader: '',
  });
}

function removeLevel(index: number) {
  config.value.levelsConfig.splice(index, 1);
}

function reorderLevel(index: number, direction: -1 | 1) {
  const levels = config.value.levelsConfig;
  const target = index + direction;
  if (target < 0 || target >= levels.length) return;
  const [item] = levels.splice(index, 1);
  levels.splice(target, 0, item);
}

function duplicateLevel(index: number) {
  const level = config.value.levelsConfig[index];
  const dup = JSON.parse(JSON.stringify(level));
  config.value.levelsConfig.splice(index + 1, 0, dup);
}

function addEnemy(levelIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.push({ type: '', count: 0 });
}

function removeEnemy(levelIndex: number, enemyIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.splice(enemyIndex, 1);
}

function addPowerup(levelIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.push({ type: '', count: 0 });
}

function removePowerup(levelIndex: number, powerupIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.splice(powerupIndex, 1);
}

function addSpritesheet() {
  if (newSpriteKey.value && newSpriteValue.value) {
    if (!config.value.spritesheets) {
      config.value.spritesheets = {};
    }
    
    const spriteConfig: SpriteSheetConfig = {
      url: newSpriteValue.value,
      speed: (isEnemyType(newSpriteKey.value) || newSpriteKey.value === 'player') ? newSpriteSpeed.value : undefined,
    };
    
    config.value.spritesheets[newSpriteKey.value] = spriteConfig as any;
    
    // Sync playerSpeed if adding player spritesheet
    if (newSpriteKey.value === 'player' && newSpriteSpeed.value) {
      config.value.playerSpeed = newSpriteSpeed.value;
    }
    
    newSpriteKey.value = '';
    newSpriteValue.value = '';
    newSpriteSpeed.value = undefined;
  }
}

function removeSpritesheet(key: string) {
  const spritesheets = config.value.spritesheets ?? {};
  const { [key]: _, ...rest } = spritesheets;
  config.value.spritesheets = rest;
}

function addEnemySpeed() {
  if (newEnemyKey.value && newEnemyValue.value) {
    config.value.enemiesSpeedArray = { ...(config.value.enemiesSpeedArray ?? {}), [newEnemyKey.value]: newEnemyValue.value };
    newEnemyKey.value = '';
    newEnemyValue.value = 0;
  }
}

function removeEnemySpeed(key: string) {
  const enemiesSpeedArray = config.value.enemiesSpeedArray ?? {};
  const { [key]: _, ...rest } = enemiesSpeedArray;
  config.value.enemiesSpeedArray = rest;
}

function addAcceptedVariant() {
  const variant = newAcceptedVariant.value.trim();
  if (!variant) return;
  if (!config.value.answer.accepted.includes(variant)) {
    config.value.answer.accepted = [...config.value.answer.accepted, variant];
  }
  newAcceptedVariant.value = '';
}

function removeAcceptedVariant(index: number) {
  const next = [...config.value.answer.accepted];
  next.splice(index, 1);
  config.value.answer.accepted = next;
}
</script>

<style scoped>
.zone-reveal-builder {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Section Toggle */
.section-toggle,
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
  margin-bottom: 0.5rem;
}

.section-toggle:hover,
.settings-toggle:hover {
  background: var(--color-primary-bg);
  border-bottom-color: var(--bulma-primary);
  color: var(--bulma-primary);
}

.section-toggle:hover .section-toggle__icon,
.settings-toggle:hover .settings-toggle__icon {
  color: var(--bulma-primary);
}

.section-toggle__title {
  color: inherit;
}

.section-toggle__icon,
.settings-toggle__icon {
  transition: transform 0.2s ease, color 0.2s ease;
  font-size: 1rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle__icon--open,
.settings-toggle__icon--open {
  transform: rotate(180deg);
}

/* Levels Section */
.levels-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.levels-section__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

@media (min-width: 64rem) {
  .levels-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 37.5rem) {
  .levels-grid {
    grid-template-columns: 1fr;
  }
}

.level-card {
  position: relative;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.level-card__number {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--bulma-primary);
  z-index: 1;
}

.level-card__remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
  z-index: 1;
}

.level-card__remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.level-card__image-wrapper {
  width: 100%;
  margin-top: 0.5rem;
}

.level-card__image-wrapper :deep(.image-uploader) {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.level-card__image-wrapper :deep(.uploader-current-image) {
  width: 100%;
  aspect-ratio: 200 / 240;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-base);
}

.level-card__image-wrapper :deep(.uploader-button) {
  width: 100%;
  min-width: auto;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}

.level-card__fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-config-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.level-config-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
}

.config-item__select {
  flex: 1;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}

.config-item__select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.config-item__input {
  width: 60px;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}

.config-item__input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.config-item__remove {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-border-base);
  color: var(--color-text-secondary);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-item__remove:hover {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}

.config-item__add {
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: 1px dashed var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.config-item__add:hover {
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
  background: var(--color-primary-bg);
}

.level-card__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border-subtle);
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

.action-btn--secondary:hover:not(:disabled) {
  background: var(--color-primary-bg);
  border-color: var(--color-border-primary);
  color: var(--bulma-primary);
}

.action-btn--danger:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}

.action-btn--small {
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
}

.levels-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

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

.settings-content {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
}

/* Spritesheets Table */
.spritesheets-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.spritesheets-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spritesheet-row {
  display: grid;
  grid-template-columns: 150px 1fr 200px 40px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
}

.spritesheet-row--add {
  background: var(--color-bg-card);
  border-style: dashed;
}

.spritesheet-row__key {
  display: flex;
  align-items: center;
}

.spritesheet-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.key-input {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  opacity: 0.7;
}

.key-select {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.key-select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.spritesheet-row__sprite {
  display: flex;
  align-items: center;
}

.spritesheet-row__sprite :deep(.image-uploader) {
  margin: 0;
}

.spritesheet-row__sprite :deep(.image-uploader img) {
  max-width: 60px;
  height: auto;
}

.spritesheet-row__speed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speed-input {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}

.speed-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.speed-placeholder {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.speed-placeholder {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.spritesheet-row__actions {
  display: flex;
  justify-content: center;
}

/* Field Styles */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.input,
.field-input {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
}

.input:focus,
.field-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field-input--compact {
  font-size: 0.85rem;
  padding: 0.35rem 0.5rem;
}

.help {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  margin: 0;
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

.answer-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-md);
}

.answer-section__content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.answer-section__image {
  flex-shrink: 0;
  min-width: 200px;
}

.answer-section__fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 768px) {
  .answer-section__content {
    flex-direction: column;
  }
  
  .answer-section__image {
    width: 100%;
    min-width: auto;
  }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-sm);
  color: var(--bulma-primary);
  font-size: 0.875rem;
}

.delete {
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.delete:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .spritesheet-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>
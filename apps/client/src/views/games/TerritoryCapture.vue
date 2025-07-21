```vue
<template>
  <div class="territory-capture">
    <div id="phaser-container" ref="phaserContainer"></div>
    <div v-if="showEdit" class="game-instructions">{{ gameInstruction }}</div>
    <div v-if="!showEdit" class="game-results">
      <h2>Game Over</h2>
      <p>Time: {{ score }} seconds</p>
      <button @click="restartGame">Restart</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Phaser from 'phaser';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { TerritoryCaptureConfig } from '@top-x/shared/types/territoryCapture';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

useHead({
  title: "TOP-X: Viral Challenges, Rankings & Games on X | Territory Capture",
  meta: [
    { name: 'description', content: "Join TOP-X for exciting territory capture games, challenges, and competitions on X. Capture territory, avoid enemies, and rise to the top! 99% Grok-powered." },
  ],
});

const gameId = ref((route.query.game as string).toLowerCase());
const gameTitle = ref('');
const gameDescription = ref('');
const gameHeader = ref('Territory Capture');
const gameInstruction = ref('');
const shareText = ref('');
const baseShareText = ref('');
const shareLink = ref('');
const config = ref<TerritoryCaptureConfig | null>(null);

const hasSubmitted = ref(false);
const score = ref(0); // Time in seconds
const phaserGame = ref<Phaser.Game | null>(null);
const phaserContainer = ref<HTMLDivElement | null>(null);

// Computed property to determine if game is in edit/play mode
const showEdit = computed(() => route.query.edit === 'true' || !hasSubmitted.value);

onMounted(async () => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: showEdit.value ? 'play' : 'results' });
  }
  console.log('TerritoryCapture: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('TerritoryCapture: No gameId provided');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      gameTitle.value = gameData.name || '';
      gameDescription.value = gameData.description || '';
      gameHeader.value = gameData.gameHeader || 'Territory Capture';
      gameInstruction.value = gameData.gameInstruction || 'Move to capture territory and reveal the image!';
      baseShareText.value = gameData.shareText || '';
      shareText.value = baseShareText.value.replace('*score*', '0'); // Initial
      shareLink.value = gameData.shareLink || '';
      config.value = gameData.custom as TerritoryCaptureConfig;

      console.log('TerritoryCapture: Game data fetched:', {
        gameTitle: gameTitle.value,
        gameDescription: gameDescription.value,
        gameHeader: gameHeader.value,
        gameInstruction: gameInstruction.value,
        shareText: shareText.value,
        shareLink: shareLink.value,
        config: config.value,
      });
    } else {
      console.error('TerritoryCapture: Game document not found for ID:', gameId.value);
    }

    // Load saved state if any
    if (userStore.user) {
      const userDocRef = doc(db, 'users', userStore.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const gameData = userData.games?.TerritoryCapture?.[gameId.value];
        if (gameData) {
          score.value = gameData.score || 0;
          hasSubmitted.value = true;
        }
      }
    } else {
      const savedScore = localStorage.getItem(`territory_score_${gameId.value}`);
      if (savedScore) {
        score.value = parseFloat(savedScore);
        hasSubmitted.value = true;
      }
    }

    if (showEdit.value && config.value) {
      initPhaserGame();
    }
  } catch (error: any) {
    console.error('TerritoryCapture: Error fetching game data:', error.message, error);
  }
});

onUnmounted(() => {
  if (phaserGame.value) {
    phaserGame.value.destroy(true);
  }
});

function initPhaserGame() {
  if (!config.value || !phaserContainer.value) return;

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: config.value.screenWidth,
    height: config.value.screenHeight,
    parent: phaserContainer.value,
    scene: {
      preload: preload,
      create: create,
      update: update,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  phaserGame.value = new Phaser.Game(phaserConfig);
}

let player: Phaser.Physics.Arcade.Sprite;
let enemies: Phaser.Physics.Arcade.Group;
let powerUps: Phaser.Physics.Arcade.Group;
let maskGraphics: Phaser.GameObjects.Graphics;
let revealTexture: Phaser.GameObjects.RenderTexture;
let background: Phaser.GameObjects.Image;
let timerText: Phaser.GameObjects.Text;
let livesText: Phaser.GameObjects.Text;
let currentLives: number;
let gameTimer: Phaser.Time.TimerEvent;
let capturePercentage = 0;
let isInvincible = false;
let timeElapsed = 0;

function preload(this: Phaser.Scene) {
  if (!config.value) return;
  this.load.image('background', config.value.backgroundImage);
  this.load.image('player', config.value.playerAsset);
  config.value.enemyAssets.forEach((asset: string, index: number) => {
    this.load.image(`enemy${index}`, asset);
  });
  if (config.value.powerUps) {
    config.value.powerUps.forEach((pu: { type: 'speed' | 'invincible'; asset: string }, index: number) => {
      this.load.image(`powerup${index}`, pu.asset);
    });
  }
}

function create(this: Phaser.Scene) {
  if (!config.value) return;

  // Background image
  background = this.add.image(config.value.screenWidth / 2, config.value.screenHeight / 2, 'background').setVisible(false);

  // Mask layer (black overlay)
  maskGraphics = this.add.graphics({ fillStyle: { color: 0x000000 } });
  maskGraphics.fillRect(0, 0, config.value.screenWidth, config.value.screenHeight);

  // Render texture for revealing
  revealTexture = this.make.renderTexture({ width: config.value.screenWidth, height: config.value.screenHeight });
  revealTexture.draw(background, config.value.screenWidth / 2, config.value.screenHeight / 2);

  // Player
  player = this.physics.add.sprite(config.value.screenWidth / 2, config.value.screenHeight / 2, 'player');
  player.setCollideWorldBounds(true);
  player.setVelocity(0, 0);
  player.setScale(config.value.playerScale || 1);

  // Enemies
  enemies = this.physics.add.group();
  for (let i = 0; i < config.value.enemyCount; i++) {
    const enemy = enemies.create(
      Phaser.Math.Between(0, config.value.screenWidth),
      Phaser.Math.Between(0, config.value.screenHeight),
      `enemy${i % config.value.enemyAssets.length}`
    );
    enemy.setVelocity(
      Phaser.Math.Between(-config.value.enemySpeed, config.value.enemySpeed),
      Phaser.Math.Between(-config.value.enemySpeed, config.value.enemySpeed)
    );
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1);
    if (config.value.enemyMovements && config.value.enemyMovements[i % config.value.enemyMovements.length] === 'horizontal') {
      enemy.setVelocityY(0);
    } else if (config.value.enemyMovements && config.value.enemyMovements[i % config.value.enemyMovements.length] === 'vertical') {
      enemy.setVelocityX(0);
    } // else random
  }

  // Power-ups
  if (config.value.powerUps) {
    powerUps = this.physics.add.group();
    for (let i = 0; i < (config.value.powerUpCount ?? 0); i++) {
      const pu = powerUps.create(
        Phaser.Math.Between(0, config.value.screenWidth),
        Phaser.Math.Between(0, config.value.screenHeight),
        `powerup${i % config.value.powerUps.length}`
      );
      pu.setVelocity(0, 0); // Static for now
    }
  }

  // Collisions
  this.physics.add.collider(player, enemies, hitEnemy, undefined, this);
  if (powerUps) {
    this.physics.add.overlap(player, powerUps, collectPowerUp, undefined, this);
  }

  // Input
  const cursors = this.input.keyboard!.createCursorKeys();
  const pointer = this.input.activePointer;

  // UI
  timerText = this.add.text(10, 10, 'Time: 0', { fontSize: '24px', color: '#fff' });
  livesText = this.add.text(config.value.screenWidth - 100, 10, `Lives: ${config.value.lives}`, { fontSize: '24px', color: '#fff' });

  currentLives = config.value.lives;
  timeElapsed = 0;
  gameTimer = this.time.addEvent({
    delay: 1000,
    callback: () => {
      timeElapsed++;
      timerText.setText(`Time: ${timeElapsed}`);
    },
    loop: true,
  });

  // Mobile touch
  this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (pointer.isDown && config.value) {
      this.physics.moveToObject(player, pointer, config.value.playerSpeed);
    }
  });
}

function update(this: Phaser.Scene) {
  // Keyboard controls
  const cursors = this.input.keyboard!.createCursorKeys();
  player.setVelocity(0);
  if (cursors.left.isDown) player.setVelocityX(-config.value!.playerSpeed);
  if (cursors.right.isDown) player.setVelocityX(config.value!.playerSpeed);
  if (cursors.up.isDown) player.setVelocityY(-config.value!.playerSpeed);
  if (cursors.down.isDown) player.setVelocityY(config.value!.playerSpeed);

  // Reveal territory
  maskGraphics.fillStyle(0xffffff, 1);
  maskGraphics.fillCircle(player.x, player.y, config.value!.brushSize || 20);
  revealTexture.mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);
  revealTexture.setMask(revealTexture.mask);

  // Calculate capture percentage (approximate by sampling or count cleared pixels, but for perf, estimate)
  // Placeholder: assume each brush adds fixed %, adjust to avoid over 100
  capturePercentage += 0.01; // Tune this
  if (capturePercentage >= config.value!.winPercentage) {
    winGame();
  }

  // Animate player (if spritesheet, add animations here)
  // Assuming single image, no anim for now
}

function hitEnemy(object1: any, object2: any) {
  if (isInvincible) return;
  currentLives--;
  livesText.setText(`Lives: ${currentLives}`);
  (object1 as Phaser.Physics.Arcade.Sprite).setPosition(config.value!.screenWidth / 2, config.value!.screenHeight / 2); // Reset position
  if (currentLives <= 0) {
    loseGame();
  }
}

function collectPowerUp(object1: any, object2: any) {
  object2.destroy();
  const type = config.value!.powerUps?.find((pu: { type: 'speed' | 'invincible'; asset: string }) => pu.asset === (object2 as Phaser.GameObjects.Sprite).texture.key)?.type;
  if (type === 'speed') {
    config.value!.playerSpeed *= 1.5;
    setTimeout(() => config.value!.playerSpeed /= 1.5, 5000);
  } else if (type === 'invincible') {
    isInvincible = true;
    (object1 as Phaser.GameObjects.Sprite).setTint(0x00ff00);
    setTimeout(() => {
      isInvincible = false;
      (object1 as Phaser.GameObjects.Sprite).clearTint();
    }, 5000);
  }
}

function winGame() {
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(timeElapsed);
}

function loseGame() {
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(Infinity); // High score means loss, or handle differently
}

function restartGame() {
  hasSubmitted.value = false;
  router.go(0); // Reload
}

async function handleSubmit(finalScore: number) {
  console.log('TerritoryCapture: handleSubmit called with score:', finalScore);
  score.value = finalScore;

  if (!gameId.value) {
    console.error('TerritoryCapture: No gameId provided');
    return;
  }

  if (!userStore.user) {
    console.log('TerritoryCapture: User not logged in, storing in localStorage');
    localStorage.setItem(`territory_score_${gameId.value}`, finalScore.toString());
    hasSubmitted.value = true;
    return;
  }

  const gameTypeId = 'TerritoryCapture';
  const custom = {}; // Add any custom data if needed

  try {
    await userStore.updateGameProgress(gameTypeId, gameId.value, { score: finalScore, streak: 0, lastPlayed: new Date().toISOString(), custom });
    console.log('TerritoryCapture: User progress updated successfully');
    hasSubmitted.value = true;
  } catch (err: any) {
    console.error('TerritoryCapture: Error in handleSubmit:', err.message, err);
  }
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'complete_game', game_id: gameId.value, score: finalScore });
  }
}

watch(score, () => {
  shareText.value = baseShareText.value.replace('*score*', score.value.toString());
});
</script>

<style scoped>
.territory-capture {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
#phaser-container {
  margin: 0 auto;
}
.game-instructions {
  margin-bottom: 20px;
  text-align: center;
}
.game-results {
  text-align: center;
}
</style>
```
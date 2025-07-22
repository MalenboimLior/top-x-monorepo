<template>
  <div class="zone-breaker">
    <div id="phaser-container" ref="phaserContainer"></div>
    <div v-if="showEdit" class="game-instructions">{{ gameInstruction }}</div>
    <div v-if="!showEdit" class="game-results">
      <h2>Game Over</h2>
      <p v-if="score === Infinity">You lost! Try again.</p>
      <p v-else>Time: {{ score }} seconds</p>
      <button @click="restartGame">Restart</button>
    </div>
    <div class="progress-bar" v-if="showEdit">Captured: {{ Math.floor(capturedPercent) }}%</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Phaser from 'phaser';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { ZoneBreakerConfig } from '@top-x/shared/types/zoneBreaker';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

useHead({
  title: "TOP-X: ZoneBreaker - Draw Borders, Trap Enemies, Dominate!",
  meta: [
    { name: 'description', content: "Play ZoneBreaker on TOP-X: Carve territory, dodge enemies, and claim victory in this Qix-inspired arcade challenge! 99% Grok-powered." },
  ],
});

const gameId = ref((route.query.game as string).toLowerCase());
const gameTitle = ref('');
const gameDescription = ref('');
const gameHeader = ref('ZoneBreaker');
const gameInstruction = ref('');
const shareText = ref('');
const baseShareText = ref('');
const shareLink = ref('');
const config = ref<ZoneBreakerConfig | null>(null);

const hasSubmitted = ref(false);
const score = ref(0); // Time in seconds
const phaserGame = ref<Phaser.Game | null>(null);
const phaserContainer = ref<HTMLDivElement | null>(null);
const currentLevel = ref(0);
const capturedPercent = ref(0); // UI progress

// Computed property to determine if game is in play mode
const showEdit = computed(() => route.query.edit === 'true' || !hasSubmitted.value);

onMounted(async () => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: showEdit.value ? 'play' : 'results' });
  }
  console.log('ZoneBreaker: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('ZoneBreaker: No gameId provided');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      gameTitle.value = gameData.name || '';
      gameDescription.value = gameData.description || '';
      gameHeader.value = gameData.gameHeader || 'ZoneBreaker';
      gameInstruction.value = gameData.gameInstruction || 'Draw paths to capture territory, avoid enemies, claim 75% to win!';
      baseShareText.value = gameData.shareText || '';
      shareText.value = baseShareText.value.replace('*score*', '0');
      shareLink.value = gameData.shareLink || '';
      config.value = gameData.custom as ZoneBreakerConfig;

      console.log('ZoneBreaker: Game data fetched:', {
        gameTitle: gameTitle.value,
        gameDescription: gameDescription.value,
        gameHeader: gameHeader.value,
        gameInstruction: gameInstruction.value,
        shareText: shareText.value,
        shareLink: shareLink.value,
        config: config.value,
      });
    } else {
      console.error('ZoneBreaker: Game document not found for ID:', gameId.value);
    }

    // Load saved state if any
    if (userStore.user) {
      const userDocRef = doc(db, 'users', userStore.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const gameData = userData.games?.ZoneBreaker?.[gameId.value];
        if (gameData) {
          score.value = gameData.score || 0;
          hasSubmitted.value = true;
        }
      }
    } else {
      const savedScore = localStorage.getItem(`zonebreaker_score_${gameId.value}`);
      if (savedScore) {
        score.value = parseFloat(savedScore);
        hasSubmitted.value = true;
      }
    }

    if (showEdit.value && config.value) {
      initPhaserGame();
    }
  } catch (error: any) {
    console.error('ZoneBreaker: Error fetching game data:', error.message, error);
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
let trailGraphics: Phaser.GameObjects.Graphics;
let trailPoints: { x: number; y: number }[] = [];
let isDrawing = false;
let safeArea: Phaser.Geom.Polygon; // Initial border
let comboCount = 0;

function preload(this: Phaser.Scene) {
  if (!config.value) return;
  const level = config.value.levels[currentLevel.value];
  this.load.image('background', level.backgroundImage);
  this.load.image('player', config.value.playerAsset);
  level.enemyTypes.forEach((enemy, index) => {
    this.load.image(`enemy${index}`, enemy.asset);
  });
  if (config.value.powerUps) {
    config.value.powerUps.forEach((pu, index) => {
      this.load.image(`powerup${index}`, pu.asset);
    });
  }
  // Load line textures if needed for lineStyle
}

function create(this: Phaser.Scene) {
  if (!config.value) return;
  const level = config.value.levels[currentLevel.value];

  // Background
  background = this.add.image(config.value.screenWidth / 2, config.value.screenHeight / 2, 'background').setVisible(false);

  // Mask for unsafe area
  maskGraphics = this.add.graphics({ fillStyle: { color: 0x000000 } });
  maskGraphics.fillRect(0, 0, config.value.screenWidth, config.value.screenHeight);

  // Reveal texture (safe areas)
  revealTexture = this.make.renderTexture({ width: config.value.screenWidth, height: config.value.screenHeight });
  revealTexture.draw(background, config.value.screenWidth / 2, config.value.screenHeight / 2);

  // Initial safe area (borders)
  safeArea = new Phaser.Geom.Polygon([0, 0, config.value.screenWidth, 0, config.value.screenWidth, config.value.screenHeight, 0, config.value.screenHeight]);

  // Player starts on border
  player = this.physics.add.sprite(0, config.value.screenHeight / 2, 'player');
  player.setCollideWorldBounds(true);
  player.setScale(config.value.playerScale || 1);

  // Trail graphics for drawing
  trailGraphics = this.add.graphics({ lineStyle: { width: config.value.brushSize || 2, color: 0xffffff } });

  // Enemies
  enemies = this.physics.add.group();
  for (let i = 0; i < level.enemyCount; i++) {
    const enemyType = level.enemyTypes[i % level.enemyTypes.length];
    const enemy = enemies.create(
      Phaser.Math.Between(50, config.value.screenWidth - 50),
      Phaser.Math.Between(50, config.value.screenHeight - 50),
      `enemy${i}`
    );
    // Set behavior based on type
    switch (enemyType.behavior) {
      case 'roam':
        enemy.setVelocity(Phaser.Math.Between(-enemyType.speed, enemyType.speed), Phaser.Math.Between(-enemyType.speed, enemyType.speed));
        enemy.setBounce(1);
        break;
      case 'borderChase':
        // Logic to chase on borders
        break;
      // Add cases for zigzag, bounce, shoot, explode
    }
  }

  // Power-ups
  if (config.value.powerUps) {
    powerUps = this.physics.add.group();
    for (let i = 0; i < level.powerUpCount || 0; i++) {
      powerUps.create(Phaser.Math.Between(50, config.value.screenWidth - 50), Phaser.Math.Between(50, config.value.screenHeight - 50), `powerup${i % config.value.powerUps.length}`);
    }
  }

  // Collisions
  this.physics.add.collider(player, enemies, hitEnemy);
  if (powerUps) this.physics.add.overlap(player, powerUps, collectPowerUp);

  // UI
  timerText = this.add.text(10, 10, 'Time: 0', { fontSize: '24px', color: '#fff' });
  livesText = this.add.text(config.value.screenWidth - 100, 10, `Lives: ${config.value.lives}`, { fontSize: '24px', color: '#fff' });

  currentLives = config.value.lives;
  timeElapsed = 0;
  gameTimer = this.time.addEvent({
    delay: 1000,
    callback: () => timeElapsed++,
    loop: true,
  });

  // Input for movement and drawing
  this.input.keyboard.on('keydown', handleKeyDown, this);
}

function update(this: Phaser.Scene) {
  // Update timer text
  timerText.setText(`Time: ${timeElapsed}`);

  // Enemy movement in unsafe areas
  enemies.children.entries.forEach((enemy: any) => {
    // Ensure enemies stay in unsafe (use Geom.contains for safeArea)
    if (Phaser.Geom.Polygon.Contains(safeArea, enemy.x, enemy.y)) {
      // Bounce or redirect
    }
  });

  // Update captured %
  capturedPercent.value = calculateCapturedPercent();
  if (capturedPercent.value >= config.value!.winPercentage) {
    winLevel();
  }

  // Trail decay if configured
  if (config.value!.trailDecay && isDrawing && timeElapsed % config.value!.trailDecay === 0) {
    trailPoints = [];
    trailGraphics.clear();
    isDrawing = false;
  }

  // Danger warning (flash if enemy near trail)
  if (isDrawing && enemyNearTrail()) {
    // Flash effect on trailGraphics
    trailGraphics.setTint(0xff0000);
    setTimeout(() => trailGraphics.clearTint(), 200);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const speed = config.value!.playerSpeed;
  if (event.key === 'ArrowLeft') player.setVelocityX(-speed);
  else if (event.key === 'ArrowRight') player.setVelocityX(speed);
  else if (event.key === 'ArrowUp') player.setVelocityY(-speed);
  else if (event.key === 'ArrowDown') player.setVelocityY(speed);

  // Drawing logic
  if (!isDrawing && !Phaser.Geom.Polygon.Contains(safeArea, player.x, player.y)) {
    isDrawing = true;
    trailPoints.push({ x: player.x, y: player.y });
  } else if (isDrawing) {
    trailPoints.push({ x: player.x, y: player.y });
    trailGraphics.clear();
    trailGraphics.strokePoints(trailPoints);
    if (closesLoop(trailPoints)) {
      captureLoop(trailPoints);
    }
  }
}

function closesLoop(points: { x: number; y: number }[]) {
  // Check if last point connects back to start or border
  return Phaser.Geom.Line.GetDistance(points[0], points[points.length - 1]) < 5; // Simple check, improve with intersection
}

function captureLoop(points: { x: number; y: number }[]) {
  const polygon = new Phaser.Geom.Polygon(points);
  if (validCapture(polygon)) {
    // Fill area
    maskGraphics.fillPoints(polygon.points, true);
    // Update safeArea by union with polygon
    safeArea = Phaser.Geom.Polygon.Union(safeArea, polygon);
    comboCount++;
    // Bonus scoring if combo
    trailPoints = [];
    isDrawing = false;
  } else {
    // Collapse loop
    trailPoints = [];
    isDrawing = false;
  }
}

function validCapture(polygon: Phaser.Geom.Polygon) {
  // Check no core enemy inside
  let hasCoreEnemy = false;
  enemies.children.entries.forEach((enemy: any) => {
    if (enemy.data.get('type') === 'core' && Phaser.Geom.Polygon.Contains(polygon, enemy.x, enemy.y)) {
      hasCoreEnemy = true;
    }
  });
  return !hasCoreEnemy;
}

function calculateCapturedPercent() {
  // Approximate: Use mask pixel count or area calculation
  return (Phaser.Geom.Polygon.GetArea(safeArea) / (config.value!.screenWidth * config.value!.screenHeight)) * 100;
}

function enemyNearTrail() {
  // Check distance from enemies to trail points
  return false; // Implement logic
}

function winLevel() {
  if (currentLevel.value < config.value!.levels.length - 1) {
    currentLevel.value++;
    restartLevel(); // Reload scene with next level
  } else {
    winGame();
  }
}

function restartLevel() {
  // Reset trail, enemies, etc.
  trailPoints = [];
  trailGraphics.clear();
  enemies.clear(true, true);
  powerUps?.clear(true, true);
  // Reload create with new level
  this.scene.restart();
}

function hitEnemy() {
  currentLives--;
  livesText.setText(`Lives: ${currentLives}`);
  if (currentLives <= 0) loseGame();
  // Reset to border
  player.setPosition(0, config.value!.screenHeight / 2);
}

function collectPowerUp(player, powerUp) {
  powerUp.destroy();
  const type = powerUp.data.get('type');
  if (type === 'speed') config.value!.playerSpeed *= 1.5; // Etc.
  // Implement others: shield (isInvincible), freeze (pause enemies), bomb (clear enemies)
}

function winGame() {
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(timeElapsed);
}

function loseGame() {
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(Infinity);
}

async function restartGame() {
  if (userStore.user) {
    const userDocRef = doc(db, 'users', userStore.user.uid);
    await updateDoc(userDocRef, {
      [`games.ZoneBreaker.${gameId.value}`]: deleteField()
    });
  } else {
    localStorage.removeItem(`zonebreaker_score_${gameId.value}`);
  }
  hasSubmitted.value = false;
  router.go(0);
}

async function handleSubmit(finalScore: number) {
  score.value = finalScore;
  if (!gameId.value) return;

  if (!userStore.user) {
    localStorage.setItem(`zonebreaker_score_${gameId.value}`, finalScore.toString());
    hasSubmitted.value = true;
    return;
  }

  const gameTypeId = 'ZoneBreaker';
  const custom = { levelsCompleted: currentLevel.value };

  await userStore.updateGameProgress(gameTypeId, gameId.value, { score: finalScore, streak: comboCount, lastPlayed: new Date().toISOString(), custom });
  hasSubmitted.value = true;
  if (analytics) logEvent(analytics, 'user_action', { action: 'complete_game', game_id: gameId.value, score: finalScore });
}

watch(score, () => {
  shareText.value = baseShareText.value.replace('*score*', score.value.toString());
});
</script>

<style scoped>
.zone-breaker {
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
.progress-bar {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 18px;
}
</style>
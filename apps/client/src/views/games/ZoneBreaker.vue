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
    width: config.value?.screenWidth || 800,
    height: config.value?.screenHeight || 600,
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
  console.log('ZoneBreaker: Phaser game initialized');
}

let player: Phaser.GameObjects.Rectangle;
let enemies: Phaser.GameObjects.Group;
let powerUps: Phaser.GameObjects.Group | null = null;
let maskGraphics: Phaser.GameObjects.Graphics;
let revealTexture: Phaser.GameObjects.RenderTexture;
let background: Phaser.GameObjects.Rectangle;
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
let safeAreas: Phaser.Geom.Polygon[] = []; // Array for captured areas
let borderGraphics: Phaser.GameObjects.Graphics;
let comboCount = 0;

function preload(this: Phaser.Scene) {
  console.log('ZoneBreaker: preload started');
  // No image loading, using shapes
  console.log('ZoneBreaker: preload completed with shapes only');
}

function create(this: Phaser.Scene) {
  console.log('ZoneBreaker: create started');
  const width = this.sys.game.config.width as number;
  const height = this.sys.game.config.height as number;

  // Background as a colored rectangle
  background = this.add.rectangle(width / 2, height / 2, width, height, 0x333333); // Dark gray background
  background.setVisible(false);
  console.log('ZoneBreaker: Background created');

  // Mask for unsafe area
  maskGraphics = this.add.graphics({ fillStyle: { color: 0x000000 } });
  maskGraphics.fillRect(0, 0, width, height);
  console.log('ZoneBreaker: Mask graphics created');

  // Reveal texture (safe areas)
  revealTexture = this.make.renderTexture({ width, height });
  revealTexture.draw(background, width / 2, height / 2);
  console.log('ZoneBreaker: Reveal texture created');

  // Initial captured areas empty
  safeAreas = [];

  // Draw borders as visible lines
  borderGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0x00ff00 } });
  borderGraphics.strokeRect(0, 0, width, height);
  console.log('ZoneBreaker: Border graphics drawn');

  // Player as a colored rectangle
  player = this.add.rectangle(0, height / 2, 20, 20, 0x00ff00); // Green player
  this.physics.add.existing(player);
  (player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
  console.log('ZoneBreaker: Player created at', player.x, player.y);

  // Trail graphics for drawing
  trailGraphics = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff } });
  console.log('ZoneBreaker: Trail graphics created');

  // Enemies as colored circles
  enemies = this.add.group();
  for (let i = 0; i < 3; i++) {
    const enemy = this.add.circle(Phaser.Math.Between(50, width - 50), Phaser.Math.Between(50, height - 50), 10, 0xff0000); // Red enemies
    this.physics.add.existing(enemy);
    (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
    (enemy.body as Phaser.Physics.Arcade.Body).setBounce(1);
    enemies.add(enemy);
    console.log('ZoneBreaker: Enemy', i, 'created at', enemy.x, enemy.y);
  }

  // Collisions
  this.physics.add.collider(player, enemies, hitEnemy, undefined, this);
  console.log('ZoneBreaker: Collisions set up');

  // UI
  timerText = this.add.text(10, 10, 'Time: 0', { fontSize: '24px', color: '#fff' });
  livesText = this.add.text(width - 100, 10, `Lives: 3`, { fontSize: '24px', color: '#fff' });
  console.log('ZoneBreaker: UI text added');

  currentLives = 3;
  timeElapsed = 0;
  gameTimer = this.time.addEvent({
    delay: 1000,
    callback: () => timeElapsed++,
    loop: true,
  });
  console.log('ZoneBreaker: Game timer started');

  // Input for movement and drawing
  if (this.input && this.input.keyboard) {
    this.input.keyboard.on('keydown', handleKeyDown, this);
  }
  console.log('ZoneBreaker: Keyboard input set up');
  console.log('ZoneBreaker: create completed');
}

function update(this: Phaser.Scene) {
  console.log('ZoneBreaker: update started, timeElapsed:', timeElapsed, 'capturedPercent:', capturedPercent.value, 'isDrawing:', isDrawing);
  timerText.setText(`Time: ${timeElapsed}`);

  // Update enemy positions
  enemies.children.entries.forEach((enemy: Phaser.GameObjects.GameObject) => {
    if (isCaptured((enemy as Phaser.GameObjects.Shape).x, (enemy as Phaser.GameObjects.Shape).y)) {
      (enemy.body as Phaser.Physics.Arcade.Body).velocity.x *= -1;
      (enemy.body as Phaser.Physics.Arcade.Body).velocity.y *= -1;
      console.log('ZoneBreaker: Enemy bounced from safe area at', (enemy as Phaser.GameObjects.Shape).x, (enemy as Phaser.GameObjects.Shape).y);
    }
  });

  // Update captured %
  capturedPercent.value = calculateCapturedPercent.call(this);
  console.log('ZoneBreaker: Captured percent updated to', capturedPercent.value);
  if (capturedPercent.value >= 75) {
    console.log('ZoneBreaker: Win condition met');
    winGame();
  }

  // Trail decay
  if (isDrawing && timeElapsed % 10 === 0) {
    trailPoints = [];
    trailGraphics.clear();
    isDrawing = false;
    console.log('ZoneBreaker: Trail decayed');
  }

  // Danger warning (flash if enemy near trail)
  if (isDrawing && enemyNearTrail()) {
    trailGraphics.lineStyle(2, 0xff0000);
    this.time.delayedCall(200, () => trailGraphics.lineStyle(2, 0xffffff), [], this);
    console.log('ZoneBreaker: Danger warning flashed');
  }

  console.log('ZoneBreaker: update completed');
}

function handleKeyDown(this: Phaser.Scene, event: KeyboardEvent) {
  console.log('ZoneBreaker: handleKeyDown triggered with key:', event.key);
  const speed = 200;
  if (event.key === 'ArrowLeft') (player.body as Phaser.Physics.Arcade.Body).setVelocityX(-speed);
  else if (event.key === 'ArrowRight') (player.body as Phaser.Physics.Arcade.Body).setVelocityX(speed);
  else if (event.key === 'ArrowUp') (player.body as Phaser.Physics.Arcade.Body).setVelocityY(-speed);
  else if (event.key === 'ArrowDown') (player.body as Phaser.Physics.Arcade.Body).setVelocityY(speed);

  if (!isDrawing && !isSafePosition.call(this, (player as Phaser.GameObjects.Shape).x, (player as Phaser.GameObjects.Shape).y)) {
    isDrawing = true;
    trailPoints.push({ x: (player as Phaser.GameObjects.Shape).x, y: (player as Phaser.GameObjects.Shape).y });
    console.log('ZoneBreaker: Started drawing at', trailPoints[0]);
  } else if (isDrawing) {
    trailPoints.push({ x: (player as Phaser.GameObjects.Shape).x, y: (player as Phaser.GameObjects.Shape).y });
    trailGraphics.clear();
    trailGraphics.strokePoints(trailPoints);
    console.log('ZoneBreaker: Added trail point, total points:', trailPoints.length);
    if (closesLoop(trailPoints)) {
      captureLoop(trailPoints);
    }
  }
}

function closesLoop(points: { x: number; y: number }[]) {
  const line = new Phaser.Geom.Line(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  const isClosed = Phaser.Geom.Line.Length(line) < 5;
  console.log('ZoneBreaker: Checking loop closure, length:', Phaser.Geom.Line.Length(line), 'closed:', isClosed);
  return isClosed;
}

function captureLoop(points: { x: number; y: number }[]) {
  const polygon = new Phaser.Geom.Polygon(points);
  console.log('ZoneBreaker: Attempting to capture loop with points:', points);
  if (validCapture(polygon)) {
    maskGraphics.fillPoints(polygon.points, true);
    safeAreas.push(polygon);
    comboCount++;
    trailPoints = [];
    isDrawing = false;
    console.log('ZoneBreaker: Loop captured, safeAreas count:', safeAreas.length);
  } else {
    trailPoints = [];
    isDrawing = false;
    console.log('ZoneBreaker: Invalid capture, loop collapsed');
  }
}

function validCapture(polygon: Phaser.Geom.Polygon) {
  let hasCoreEnemy = false;
  enemies.children.entries.forEach((enemy: Phaser.GameObjects.GameObject) => {
    if (Phaser.Geom.Polygon.Contains(polygon, (enemy as Phaser.GameObjects.Shape).x, (enemy as Phaser.GameObjects.Shape).y)) {
      hasCoreEnemy = true;
    }
  });
  console.log('ZoneBreaker: Capture validation, hasCoreEnemy:', hasCoreEnemy);
  return !hasCoreEnemy;
}

function calculateCapturedPercent(this: Phaser.Scene) {
  let totalArea = 0;
  safeAreas.forEach((poly) => {
    let area = 0;
    const points = poly.points;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    totalArea += Math.abs(area) / 2;
  });
  const percent = (totalArea / ((this.sys.game.config.width as number) * (this.sys.game.config.height as number))) * 100;
  console.log('ZoneBreaker: Calculated captured percent:', percent, 'totalArea:', totalArea);
  return percent;
}

function enemyNearTrail() {
  return false; // Implement logic
}

function isSafePosition(this: Phaser.Scene, x: number, y: number) {
  // Check if on borders (simple: close to edges)
  const borderThickness = 10;
  const width = this.sys.game.config.width as number;
  const height = this.sys.game.config.height as number;
  const onBorder = x < borderThickness || x > width - borderThickness || y < borderThickness || y > height - borderThickness;
  const inCaptured = safeAreas.some(poly => Phaser.Geom.Polygon.Contains(poly, x, y));
  console.log('ZoneBreaker: Position check', x, y, 'onBorder:', onBorder, 'inCaptured:', inCaptured);
  return onBorder || inCaptured;
}

function isCaptured(x: number, y: number) {
  return safeAreas.some(poly => Phaser.Geom.Polygon.Contains(poly, x, y));
}

function hitEnemy(this: Phaser.Scene, object1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody, object2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody) {
  console.log('ZoneBreaker: hitEnemy triggered with objects:', object1, object2);
  currentLives--;
  livesText.setText(`Lives: ${currentLives}`);
  if (currentLives <= 0) loseGame();
  if (object1 instanceof Phaser.GameObjects.Shape) {
    object1.setPosition(0, (this.sys.game.config.height as number) / 2);
    console.log('ZoneBreaker: Player reset to', object1.x, object1.y);
  }
}

function winGame() {
  console.log('ZoneBreaker: winGame called');
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(timeElapsed);
}

function loseGame() {
  console.log('ZoneBreaker: loseGame called');
  if (phaserGame.value) phaserGame.value.destroy(true);
  handleSubmit(Infinity);
}

async function restartGame() {
  console.log('ZoneBreaker: restartGame called');
  if (userStore.user) {
    const userDocRef = doc(db, 'users', userStore.user.uid);
    await updateDoc(userDocRef, {
      [`games.ZoneBreaker.${gameId.value}`]: deleteField()
    });
    console.log('ZoneBreaker: Cleared Firestore game progress');
  } else {
    localStorage.removeItem(`zonebreaker_score_${gameId.value}`);
    console.log('ZoneBreaker: Cleared localStorage score');
  }
  hasSubmitted.value = false;
  router.go(0);
}

async function handleSubmit(finalScore: number) {
  console.log('ZoneBreaker: handleSubmit called with score:', finalScore);
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
  console.log('ZoneBreaker: Share text updated with new score:', shareText.value);
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
  border: 2px solid #00ff00; /* Visible border for debugging */
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
  background-color: rgba(0, 0, 0, 0.7); /* Visible background */
  padding: 5px;
}
</style>
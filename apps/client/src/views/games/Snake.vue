<template>
  <div class="snake-game container is-max-desktop">
    <h1 class="title has-text-white">Snake Game (Phaser Edition)</h1>
    <div class="columns is-centered">
      <div class="column is-8">
        <div ref="gameContainer" class="game-container"></div>
      </div>
    </div>
    <div class="columns is-centered">
      <div class="column is-8">
        <p class="subtitle has-text-white">Score: {{ score }}</p>
        <button class="button is-primary" @click="startGame" v-if="!isPlaying">Start</button>
        <button class="button is-warning" @click="togglePause" v-if="isPlaying">{{ isPaused ? 'Resume' : 'Pause' }}</button>
        <button class="button is-danger" @click="restartGame" v-if="gameOver">Restart</button>
        <p v-if="gameOver" class="notification is-danger">Game Over! Final Score: {{ score }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';

const gameContainer = ref<HTMLDivElement | null>(null);
const score = ref(0);
const isPlaying = ref(false);
const isPaused = ref(false);
const gameOver = ref(false);
let game: Phaser.Game | null = null;
let snakeScene: SnakeScene | null = null;

const gridSize = 20;
const tileSize = 20;
const gameWidth = gridSize * tileSize;
const gameHeight = gridSize * tileSize;
const gameSpeed = 150; // ms per move

class SnakeScene extends Phaser.Scene {
  snake: Phaser.GameObjects.Rectangle[] = [];
  food!: Phaser.GameObjects.Rectangle;
  direction = new Phaser.Math.Vector2(0, -1);
  nextDirection = new Phaser.Math.Vector2(0, -1);
  lastMoveTime = 0;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  swipeStart: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'SnakeScene' });
  }

  create() {
    this.add.rectangle(0, 0, gameWidth, gameHeight, 0x1a1a1a).setOrigin(0); // Dark background

    // Initialize snake
    const head = this.add.rectangle(10 * tileSize, 10 * tileSize, tileSize, tileSize, 0x00ff00);
    this.snake = [head];

    // Food
    this.spawnFood();

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Touch input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.swipeStart = { x: pointer.x, y: pointer.y };
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = pointer.x - this.swipeStart.x;
      const dy = pointer.y - this.swipeStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && this.direction.x !== -1) this.nextDirection.set(1, 0); // Right
        else if (dx < 0 && this.direction.x !== 1) this.nextDirection.set(-1, 0); // Left
      } else {
        if (dy > 0 && this.direction.y !== -1) this.nextDirection.set(0, 1); // Down
        else if (dy < 0 && this.direction.y !== 1) this.nextDirection.set(0, -1); // Up
      }
      this.swipeStart = null;
    });
  }

  update(time: number) {
    if (isPaused.value || gameOver.value) return;

    // Handle keyboard input
    if (this.cursors.up.isDown && this.direction.y !== 1) this.nextDirection.set(0, -1);
    else if (this.cursors.down.isDown && this.direction.y !== -1) this.nextDirection.set(0, 1);
    else if (this.cursors.left.isDown && this.direction.x !== 1) this.nextDirection.set(-1, 0);
    else if (this.cursors.right.isDown && this.direction.x !== -1) this.nextDirection.set(1, 0);

    if (time - this.lastMoveTime < gameSpeed) return;

    this.direction.copy(this.nextDirection);
    const headX = this.snake[0].x + this.direction.x * tileSize;
    const headY = this.snake[0].y + this.direction.y * tileSize;

    // Check collisions
    if (headX < 0 || headX >= gameWidth || headY < 0 || headY >= gameHeight || this.snake.some(s => s.x === headX && s.y === headY)) {
      this.endGame();
      return;
    }

    // Move snake
    const newHead = this.add.rectangle(headX, headY, tileSize, tileSize, 0x00ff00);
    this.snake.unshift(newHead);

    // Eat food
    if (headX === this.food.x && headY === this.food.y) {
      score.value++;
      this.spawnFood();
    } else {
      const tail = this.snake.pop();
      tail?.destroy();
    }

    this.lastMoveTime = time;
  }

  spawnFood() {
    const x = Phaser.Math.Between(0, gridSize - 1) * tileSize;
    const y = Phaser.Math.Between(0, gridSize - 1) * tileSize;
    this.food = this.add.rectangle(x, y, tileSize, tileSize, 0xff0000);
  }

  reset() {
    this.snake.forEach(s => s.destroy());
    this.food?.destroy();
    const head = this.add.rectangle(10 * tileSize, 10 * tileSize, tileSize, tileSize, 0x00ff00);
    this.snake = [head];
    this.spawnFood();
    this.direction.set(0, -1);
    this.nextDirection.set(0, -1);
    this.lastMoveTime = 0;
    score.value = 0;
  }

  endGame() {
    gameOver.value = true;
    isPlaying.value = false;
    this.scene.pause();
  }
}

const initGame = () => {
  if (!gameContainer.value) return;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    parent: gameContainer.value,
    scene: SnakeScene,
    backgroundColor: '#1a1a1a',
  };

  game = new Phaser.Game(config);
  snakeScene = game.scene.getScene('SnakeScene') as SnakeScene;
};

const startGame = () => {
  isPlaying.value = true;
  gameOver.value = false;
  isPaused.value = false;
  if (snakeScene) {
    snakeScene.reset();
    snakeScene.scene.resume();
  }
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
  if (snakeScene) {
    if (isPaused.value) snakeScene.scene.pause();
    else snakeScene.scene.resume();
  }
};

const restartGame = () => {
  startGame();
};

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  if (game) game.destroy(true);
});
</script>

<style scoped>
.snake-game {
  text-align: center;
  padding: 1rem;
}
.game-container {
  border: 2px solid #fff;
  margin: 0 auto;
  display: inline-block;
}
</style>
// src/components/games/QixScene.ts
import Phaser from 'phaser';

//import type { GameType } from '@top-x/shared/types'; // Shared type for game data

// Configurable game rules (adjust for levels)
const CONFIG = {
  targetCapturePercent: 75, // % to win
  playfieldWidth: 800,
  playfieldHeight: 600,
  playerSpeed: 200, // Pixels per second
  coreEnemySpeed: 150,
  sparkSpeed: 100,
  numSparks: 2, // Initial sparks
  // Custom enemies (extendable)
  customEnemies: [], // e.g., [{ type: 'zigzag', speed: 180 }]
};
function calculatePolygonArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  console.log('area: ',area);

  return Math.abs(area / 2);
}
export class QixScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle; // Simple rect for player (can replace with sprite)
  private pathGraphics!: Phaser.GameObjects.Graphics; // For drawing player path
  private borderGraphics!: Phaser.GameObjects.Graphics; // For borders
  private fillGraphics!: Phaser.GameObjects.Graphics; // For captured areas
  private coreEnemy!: Phaser.GameObjects.Sprite;
  private sparks: Phaser.GameObjects.Sprite[] = [];
  private isDrawing: boolean = false; // State: on border vs drawing path
  private pathPoints: Phaser.Math.Vector2[] = []; // Points in current path
  private capturedArea: number = 0; // Total captured pixels
  private totalArea: number = CONFIG.playfieldWidth * CONFIG.playfieldHeight;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private touchInput!: Phaser.Input.Pointer; // For mobile touch
  private score: number = 0; // Score based on captured area
  //private gameData: Partial<GameType> = {}; // For Firebase sync (e.g., { score: 0 })

  constructor() {
    super('QixScene');
  }

  preload() {
    // Load assets (paths from assets list)
    this.load.image('player', 'assets/games/qix/player.png');
    this.load.image('core_enemy', 'assets/games/qix/core_enemy.png');
    this.load.image('spark_enemy', 'assets/games/qix/spark_enemy.png');
    this.load.image('border_texture', 'assets/games/qix/border_texture.png');
    this.load.image('fill_texture', 'assets/games/qix/fill_texture.png');
    this.load.audio('bg_music', 'assets/games/qix/bg_music.mp3');
    this.load.audio('claim_sfx', 'assets/games/qix/claim_sfx.mp3');
    this.load.audio('death_sfx', 'assets/games/qix/death_sfx.mp3');
    this.load.audio('move_sfx', 'assets/games/qix/move_sfx.mp3');
    this.load.atlas('core_enemy_atlas', 'assets/games/qix/core_enemy_atlas.png', 'assets/games/qix/core_enemy_atlas.json');
    this.load.atlas('spark_enemy_atlas', 'assets/games/qix/spark_enemy_atlas.png', 'assets/games/qix/spark_enemy_atlas.json');
  }

  create() {
    // Scale for mobile
    this.scale.resize(window.innerWidth, window.innerHeight);
    this.scale.setGameSize(CONFIG.playfieldWidth, CONFIG.playfieldHeight);
    this.scale.scaleMode = Phaser.Scale.FIT;

    // Dark theme background
    this.cameras.main.setBackgroundColor('#0d1117');

    // Setup graphics
    this.borderGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff }, fillStyle: { color: 0x1f6feb } });
    this.pathGraphics = this.add.graphics({ lineStyle: { width: 2, color: 0xff0000 } });
    this.fillGraphics = this.add.graphics({ fillStyle: { color: 0x1f6feb, alpha: 0.5 } });

    // Draw initial borders
    this.drawBorders();

    // Player (simple rect for now, can be sprite)
    this.player = this.add.rectangle(0, 0, 16, 16, 0xffffff).setOrigin(0.5);
    this.player.setPosition(400, 0); // Start on top border

    // Core enemy
    this.coreEnemy = this.add.sprite(400, 300, 'core_enemy_atlas');
    this.anims.create({
      key: 'core_pulse',
      frames: this.anims.generateFrameNames('core_enemy_atlas'),
      frameRate: 10,
      repeat: -1
    });
    this.coreEnemy.play('core_pulse');
    this.physics.add.existing(this.coreEnemy);
    (this.coreEnemy.body as Phaser.Physics.Arcade.Body).setVelocity(Phaser.Math.Between(-CONFIG.coreEnemySpeed, CONFIG.coreEnemySpeed), Phaser.Math.Between(-CONFIG.coreEnemySpeed, CONFIG.coreEnemySpeed));

    // Sparks (border chasers)
    for (let i = 0; i < CONFIG.numSparks; i++) {
      const spark = this.add.sprite(0, 0, 'spark_enemy_atlas');
      this.anims.create({
        key: 'spark_anim',
        frames: this.anims.generateFrameNames('spark_enemy_atlas'),
        frameRate: 15,
        repeat: -1
      });
      spark.play('spark_anim');
      spark.setPosition(Phaser.Math.Between(0, CONFIG.playfieldWidth), 0); // Start on top
      this.sparks.push(spark);
    }

    // Input: Keyboard + Touch (mobile-first)
    this.keys = this.input.keyboard!.createCursorKeys();
    this.touchInput = this.input.pointer1;
    this.input.on('pointerdown', this.startDrawing, this);
    this.input.on('pointerup', this.stopDrawing, this);

    // Audio
    this.sound.play('bg_music', { loop: true, volume: 0.5 });

    // Physics setup (simple arcade for collisions)
    this.physics.add.collider(this.player, this.coreEnemy, this.handleDeath, undefined, this);
    this.sparks.forEach(spark => this.physics.add.collider(this.player, spark, this.handleDeath, undefined, this));

    // UI: Score text (Bulma-inspired dark theme)
    const scoreText = this.add.text(10, 10, 'Captured: 0%', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#0d1117',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    });

    // Update captured % display
    this.events.on('updateScore', () => {
      const percent = Math.floor((this.capturedArea / this.totalArea) * 100);
      scoreText.setText(`Captured: ${percent}%`);
      this.score = percent * 10; // Simple score calc
      if (percent >= CONFIG.targetCapturePercent) this.winGame();
    });
  }

  update(time: number, delta: number) {
    // Player movement (4-directional, border-safe or drawing)
    const velocity = new Phaser.Math.Vector2(0, 0);
    if (this.keys.left.isDown) velocity.x = -CONFIG.playerSpeed;
    if (this.keys.right.isDown) velocity.x = CONFIG.playerSpeed;
    if (this.keys.up.isDown) velocity.y = -CONFIG.playerSpeed;
    if (this.keys.down.isDown) velocity.y = CONFIG.playerSpeed;

    // Normalize for diagonal
    if (velocity.length() > 0) velocity.normalize().scale(CONFIG.playerSpeed);

    this.player.x += velocity.x * (delta / 1000);
    this.player.y += velocity.y * (delta / 1000);

    // Touch movement (mobile)
    if (this.touchInput.isDown && this.isDrawing) {
      // Move towards touch position, but snap to grid/borders for simplicity
      this.physics.moveToObject(this.player, this.touchInput, CONFIG.playerSpeed);
    }

    // Clamp to playfield
    this.player.x = Phaser.Math.Clamp(this.player.x, 0, CONFIG.playfieldWidth);
    this.player.y = Phaser.Math.Clamp(this.player.y, 0, CONFIG.playfieldHeight);

    // Drawing logic
    if (this.isDrawing) {
      this.pathPoints.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      this.pathGraphics.clear();
      this.pathGraphics.strokePoints(this.pathPoints);

      // Check for loop completion (back to border)
      if (this.onBorder(this.player.x, this.player.y) && this.pathPoints.length > 10) { // Min points for loop
        this.completeLoop();
      }

      // Check self-intersect or enemy hit (simplified)
      // TODO: Add line intersection check for self-trail
    }

    // Enemy updates
    this.updateCoreEnemy();
    this.updateSparks();

    // Custom enemies (extendable)
    // TODO: Implement custom like zigzag: use tweens or paths
  }

  private drawBorders() {
    // Initial borders (outer rect)
    this.borderGraphics.strokeRect(0, 0, CONFIG.playfieldWidth, CONFIG.playfieldHeight);
  }

  private onBorder(x: number, y: number): boolean {
    // Simple check: on edge or future captured borders
    return x <= 0 || x >= CONFIG.playfieldWidth || y <= 0 || y >= CONFIG.playfieldHeight; // Extend for new borders
  }

  private startDrawing() {
    if (this.onBorder(this.player.x, this.player.y)) {
      this.isDrawing = true;
      this.pathPoints = [new Phaser.Math.Vector2(this.player.x, this.player.y)];
      this.sound.play('move_sfx');
    }
  }

  private stopDrawing() {
    this.isDrawing = false;
    // If not completed, reset path (failure)
    this.pathPoints = [];
    this.pathGraphics.clear();
  }


  private completeLoop() {
    // Calculate enclosed area (use Phaser geom for polygon area)
    const polygon = new Phaser.Geom.Polygon(this.pathPoints);
    const area = calculatePolygonArea(polygon.points);

    // Check if core enemy inside (optional rule)
    if (Phaser.Geom.Polygon.ContainsPoint(polygon, new Phaser.Geom.Point(this.coreEnemy.x, this.coreEnemy.y))) {
      // Collapse loop (failure)  
      this.pathPoints = [];
      this.pathGraphics.clear();
      return;
    }

    // Capture success
    this.fillGraphics.fillPoints(this.pathPoints, true);
    this.capturedArea += area;
    this.events.emit('updateScore');
    this.sound.play('claim_sfx');

    // Add new border along path
    this.borderGraphics.strokePoints(this.pathPoints);

    this.pathPoints = [];
    this.pathGraphics.clear();
    this.isDrawing = false;
  }

  private updateCoreEnemy() {
    // Random roam in open space (bounce on borders)
    const body = this.coreEnemy.body as Phaser.Physics.Arcade.Body;
    if (this.coreEnemy.x <= 0 || this.coreEnemy.x >= CONFIG.playfieldWidth) body.setVelocityX(-body.velocity.x);
    if (this.coreEnemy.y <= 0 || this.coreEnemy.y >= CONFIG.playfieldHeight) body.setVelocityY(-body.velocity.y);
    // TODO: Avoid captured areas (advanced)
  }

  private updateSparks() {
    this.sparks.forEach(spark => {
      // Move along borders (simple top-bottom loop for demo)
      spark.y += CONFIG.sparkSpeed * (1 / 60); // Delta approx
      if (spark.y > CONFIG.playfieldHeight) spark.y = 0;
      // TODO: Proper path following on borders/paths
    });
  }

  private handleDeath() {
    this.sound.play('death_sfx');
    this.scene.pause();
    // TODO: Emit event to Vue for game over, sync score
    //this.gameData.score = this.score;
    // Firebase sync would be in Vue
  }

  private winGame() {
    this.scene.pause();
    // TODO: Emit win event
  }
}

// Extension points:
// - Add level progression: Increase enemies/speed
// - Custom enemies: Add classes for zigzag, etc.
// - Particles: Use Phaser particles for claim effects
// - Optimize: Use low-poly for mobile
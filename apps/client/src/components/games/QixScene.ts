// src/components/games/QixScene.ts
import Phaser from 'phaser';

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
  console.log('Calculated area:', Math.abs(area / 2)); // Debug log
  return Math.abs(area / 2);
}

export class QixScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle; // Simple rect for player (can replace with sprite)
  private pathGraphics!: Phaser.GameObjects.Graphics; // For drawing player path
  private borderGraphics!: Phaser.GameObjects.Graphics; // For borders
  private fillGraphics!: Phaser.GameObjects.Graphics; // For captured areas
  private coreEnemy!: Phaser.GameObjects.Rectangle; // Temp rect placeholder (replace with sprite once assets ready)
  private sparks: Phaser.GameObjects.Rectangle[] = []; // Temp rect placeholders
  private isDrawing: boolean = false; // State: on border vs drawing path
  private pathPoints: Phaser.Math.Vector2[] = []; // Points in current path
  private capturedArea: number = 0; // Total captured pixels
  private totalArea: number = CONFIG.playfieldWidth * CONFIG.playfieldHeight;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private touchInput!: Phaser.Input.Pointer; // For mobile touch
  private score: number = 0; // Score based on captured area
  private borders: Phaser.Geom.Line[] = []; // Track all border lines for better onBorder check

  constructor() {
    super('QixScene');
  }

  preload() {
    // Comment out failing loads until assets created; use placeholders in create()
    // this.load.image('player', 'assets/games/qix/player.png');
    // this.load.image('core_enemy', 'assets/games/qix/core_enemy.png');
    // this.load.image('spark_enemy', 'assets/games/qix/spark_enemy.png');
    // this.load.image('border_texture', 'assets/games/qix/border_texture.png');
    // this.load.image('fill_texture', 'assets/games/qix/fill_texture.png');
    // this.load.audio('bg_music', 'assets/games/qix/bg_music.mp3');
    // this.load.audio('claim_sfx', 'assets/games/qix/claim_sfx.mp3');
    // this.load.audio('death_sfx', 'assets/games/qix/death_sfx.mp3');
    // this.load.audio('move_sfx', 'assets/games/qix/move_sfx.mp3');
    // this.load.atlas('core_enemy_atlas', 'assets/games/qix/core_enemy_atlas.png', 'assets/games/qix/core_enemy_atlas.json');
    // this.load.atlas('spark_enemy_atlas', 'assets/games/qix/spark_enemy_atlas.png', 'assets/games/qix/spark_enemy_atlas.json');
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

    // Draw initial borders and track lines
    this.drawBorders();

    // Player (simple rect for now, can be sprite)
    this.player = this.add.rectangle(0, 0, 16, 16, 0xffffff).setOrigin(0.5);
    this.player.setPosition(400, 0); // Start on top border

    // Core enemy (placeholder rect; replace with sprite/anim once assets ready)
    this.coreEnemy = this.add.rectangle(400, 300, 32, 32, 0xff0000).setOrigin(0.5);
    this.physics.add.existing(this.coreEnemy);
    (this.coreEnemy.body as Phaser.Physics.Arcade.Body).setVelocity(Phaser.Math.Between(-CONFIG.coreEnemySpeed, CONFIG.coreEnemySpeed), Phaser.Math.Between(-CONFIG.coreEnemySpeed, CONFIG.coreEnemySpeed));

    // Sparks (placeholder rects; replace with sprites/anims)
    for (let i = 0; i < CONFIG.numSparks; i++) {
      const spark = this.add.rectangle(Phaser.Math.Between(0, CONFIG.playfieldWidth), 0, 16, 16, 0xffff00).setOrigin(0.5);
      this.sparks.push(spark);
      this.physics.add.existing(spark);
    }

    // Input: Keyboard + Touch (mobile-first)
    this.keys = this.input.keyboard!.createCursorKeys();
    this.touchInput = this.input.pointer1;
    this.input.on('pointerdown', this.startDrawing, this);
    this.input.on('pointerup', this.stopDrawing, this);

    // Audio (commented until assets; AudioContext needs user gesture anyway—Phaser resumes on interaction)
    // this.sound.play('bg_music', { loop: true, volume: 0.5 });

    // Physics setup (simple arcade for collisions)
    this.physics.add.collider(this.player, this.coreEnemy, this.handleDeath, undefined, this);
    this.sparks.forEach(spark =>
      this.physics.add.collider(this.player, spark, this.handleDeath, undefined, this)
    );

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
    this.updateCoreEnemy(delta); // Pass delta to enemy updates
    this.updateSparks(delta);

    // Custom enemies (extendable)
    // TODO: Implement custom like zigzag: use tweens or paths
  }

  private drawBorders() {
    // Initial borders (outer rect)
    this.borderGraphics.strokeRect(0, 0, CONFIG.playfieldWidth, CONFIG.playfieldHeight);
    // Track initial border lines
    this.borders.push(new Phaser.Geom.Line(0, 0, CONFIG.playfieldWidth, 0)); // Top
    this.borders.push(new Phaser.Geom.Line(CONFIG.playfieldWidth, 0, CONFIG.playfieldWidth, CONFIG.playfieldHeight)); // Right
    this.borders.push(new Phaser.Geom.Line(CONFIG.playfieldWidth, CONFIG.playfieldHeight, 0, CONFIG.playfieldHeight)); // Bottom
    this.borders.push(new Phaser.Geom.Line(0, CONFIG.playfieldHeight, 0, 0)); // Left
  }

  private onBorder(x: number, y: number): boolean {
    // Improved check: near any border line (including new ones)
    const point = new Phaser.Geom.Point(x, y);
    for (const border of this.borders) {
      const nearest = new Phaser.Geom.Point();
      Phaser.Geom.Line.GetNearestPoint(border, point, nearest);
      if (Phaser.Math.Distance.BetweenPoints(nearest, point) < 5) {
        return true;
      }
    }
    return false;
  }

  private startDrawing() {
    if (this.onBorder(this.player.x, this.player.y)) {
      this.isDrawing = true;
      this.pathPoints = [new Phaser.Math.Vector2(this.player.x, this.player.y)];
      // this.sound.play('move_sfx'); // Uncomment when audio ready
    }
  }

  private stopDrawing() {
    this.isDrawing = false;
    // If not completed, reset path (failure)
    this.pathPoints = [];
    this.pathGraphics.clear();
  }

  private completeLoop() {
    // Calculate enclosed area
    const polygon = new Phaser.Geom.Polygon(this.pathPoints);
    const area = calculatePolygonArea(polygon.points);
    console.log('Loop completed with area:', area); // Debug

    // Check if core enemy inside (optional rule)
    if (Phaser.Geom.Polygon.ContainsPoint(polygon, new Phaser.Geom.Point(this.coreEnemy.x, this.coreEnemy.y))) {
      console.log('Core enemy inside - loop failed'); // Debug
      this.pathPoints = [];
      this.pathGraphics.clear();
      return;
    }

    // Capture success
    this.fillGraphics.fillPoints(this.pathPoints, true);
    this.capturedArea += area;
    this.events.emit('updateScore');
    // this.sound.play('claim_sfx'); // Uncomment when audio ready

    // Add new border along path (track lines for onBorder)
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      this.borders.push(new Phaser.Geom.Line(this.pathPoints[i].x, this.pathPoints[i].y, this.pathPoints[i + 1].x, this.pathPoints[i + 1].y));
    }
    this.borderGraphics.strokePoints(this.pathPoints);

    this.pathPoints = [];
    this.pathGraphics.clear();
    this.isDrawing = false;
  }

  private updateCoreEnemy(delta: number) {
    // Random roam in open space (bounce on borders)
    const body = this.coreEnemy.body as Phaser.Physics.Arcade.Body;
    this.coreEnemy.x += body.velocity.x * (delta / 1000);
    this.coreEnemy.y += body.velocity.y * (delta / 1000);
    if (this.coreEnemy.x <= 0 || this.coreEnemy.x >= CONFIG.playfieldWidth) body.setVelocityX(-body.velocity.x);
    if (this.coreEnemy.y <= 0 || this.coreEnemy.y >= CONFIG.playfieldHeight) body.setVelocityY(-body.velocity.y);
    // TODO: Avoid captured areas (advanced)
  }

  private updateSparks(delta: number) {
    this.sparks.forEach(spark => {
      // Move along borders (simple top-bottom loop for demo)
      spark.y += CONFIG.sparkSpeed * (delta / 1000); // Use delta passed from update
      if (spark.y > CONFIG.playfieldHeight) spark.y = 0;
      // TODO: Proper path following on borders/paths
    });
  }

  private handleDeath(
    object1: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    object2: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ) {
    console.log('Death: hit by', object2); // Debug
    // this.sound.play('death_sfx'); // Uncomment when audio ready
    this.scene.pause();
    // Add visible feedback
    this.add.text(CONFIG.playfieldWidth / 2, CONFIG.playfieldHeight / 2, 'Game Over!', {
      fontSize: '48px',
      color: '#ff0000'
    }).setOrigin(0.5);
    // TODO: Emit event to Vue for restart/sync
  }

  private winGame() {
    this.scene.pause();
    this.add.text(CONFIG.playfieldWidth / 2, CONFIG.playfieldHeight / 2, 'You Win!', {
      fontSize: '48px',
      color: '#00ff00'
    }).setOrigin(0.5);
    // TODO: Emit win event
  }
}

// Extension points:
// - Re-enable asset loads once files created (fix 404/JSON errors)
// - Add animations back when atlases ready (fix undefined frames)
// - For AudioContext: Ensure first interaction (e.g., start button) resumes it
// - Iterate: Add particle effects for captures, improve enemy paths
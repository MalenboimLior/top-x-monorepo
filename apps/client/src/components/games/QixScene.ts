// src/components/games/QixScene.ts
import Phaser from 'phaser';

// Configurable game rules (adjust for levels)
const CONFIG = {
  targetCapturePercent: 75, // % to win
  playfieldWidth: 800,
  playfieldHeight: 600,
  playerSpeed: 200, // Pixels per second
};

function calculatePolygonArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

export class QixScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle; // Simple rect for player (can replace with sprite)
  private pathGraphics!: Phaser.GameObjects.Graphics; // For drawing player path
  private borderGraphics!: Phaser.GameObjects.Graphics; // For borders
  private fillGraphics!: Phaser.GameObjects.Graphics; // For captured areas
  private isDrawing: boolean = false; // State: on border vs drawing path
  private pathPoints: Phaser.Math.Vector2[] = []; // Points in current path
  private capturedArea: number = 0; // Total captured pixels
  private totalArea: number = CONFIG.playfieldWidth * CONFIG.playfieldHeight;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0; // Score based on captured area
  private borders: Phaser.Geom.Line[] = []; // Track all border lines for better onBorder check

  constructor() {
    super('QixScene');
  }

  preload() {
    // Comment out failing loads until assets created; use placeholders in create()
    // this.load.image('player', 'assets/games/qix/player.png');
    // this.load.image('border_texture', 'assets/games/qix/border_texture.png');
    // this.load.image('fill_texture', 'assets/games/qix/fill_texture.png');
    // this.load.audio('claim_sfx', 'assets/games/qix/claim_sfx.mp3');
    // this.load.audio('move_sfx', 'assets/games/qix/move_sfx.mp3');
  }

  create() {
    // Scale for mobile
    this.scale.resize(window.innerWidth, window.innerHeight);
    this.scale.setGameSize(CONFIG.playfieldWidth, CONFIG.playfieldHeight);
    this.scale.scaleMode = Phaser.Scale.FIT;

    // Dark theme background
    this.cameras.main.setBackgroundColor('#0d1117');

    // Setup graphics (ensure pathGraphics is on top)
    this.borderGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff }, fillStyle: { color: 0x1f6feb } });
    this.fillGraphics = this.add.graphics({ fillStyle: { color: 0x1f6feb, alpha: 0.7 } });
    this.pathGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0x00ff00 } }); // Thicker, green for visibility
    this.pathGraphics.setDepth(10); // Ensure path is drawn above other graphics

    // Draw initial borders and track lines
    this.drawBorders();

    // Player (simple rect for now, can be sprite)
    this.player = this.add.rectangle(0, 0, 16, 16, 0xffffff).setOrigin(0.5);
    this.player.setPosition(400, 0); // Start on top border

    // Input: Keyboard only
    this.keys = this.input.keyboard!.createCursorKeys();

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

    const oldX = this.player.x;
    const oldY = this.player.y;
    this.player.x += velocity.x * (delta / 1000);
    this.player.y += velocity.y * (delta / 1000);

    // Clamp to playfield
    this.player.x = Phaser.Math.Clamp(this.player.x, 0, CONFIG.playfieldWidth);
    this.player.y = Phaser.Math.Clamp(this.player.y, 0, CONFIG.playfieldHeight);

    const isMoving = oldX !== this.player.x || oldY !== this.player.y;
    const isOnBorder = this.onBorder(this.player.x, this.player.y);
    const wasOnBorder = this.onBorder(oldX, oldY);

    // Automatic drawing logic: start when leaving border, add points while off, complete when back on border
    if (isMoving && !this.isDrawing && wasOnBorder && !isOnBorder) {
      this.startDrawing();
    }

    if (this.isDrawing && isMoving) {
      const newPoint = new Phaser.Math.Vector2(this.player.x, this.player.y);
      this.pathPoints.push(newPoint);
      this.pathGraphics.clear();
      this.pathGraphics.lineStyle(4, 0x00ff00, 1); // Reapply style to ensure visibility
      this.pathGraphics.strokePoints(this.pathPoints, false, true); // Connect points with lines, no auto-close

      // Check for loop completion (back to border)
      if (isOnBorder && this.pathPoints.length > 5) {
        this.completeLoop();
      }
    }

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
      const dist = Phaser.Math.Distance.BetweenPoints(nearest, point);
      if (dist < 10) { // Increased tolerance for easier detection
        return true;
      }
    }
    return false;
  }

  private startDrawing() {
    this.isDrawing = true;
    this.pathPoints = [new Phaser.Math.Vector2(this.player.x, this.player.y)];
    // this.sound.play('move_sfx'); // Uncomment when audio ready
  }

  private completeLoop() {
    // Calculate enclosed area
    const polygon = new Phaser.Geom.Polygon(this.pathPoints);
    const area = calculatePolygonArea(polygon.points);

    // Capture success
    this.fillGraphics.fillPoints(this.pathPoints, true, true); // Close path explicitly
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

  private handleDeath(
    object1: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    object2: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ) {
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
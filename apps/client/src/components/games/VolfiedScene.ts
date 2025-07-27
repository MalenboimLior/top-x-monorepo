import Phaser from 'phaser';
import { BlendModes } from 'phaser';

export const TILE_SIZE = 10;
export const WIDTH = 400;
export const HEIGHT = 480;
const GRID_W = WIDTH / TILE_SIZE;
const GRID_H = HEIGHT / TILE_SIZE;
const PLAYER_VISUAL_SIZE = 30;

export default class VolfiedScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private direction: 'up' | 'down' | 'left' | 'right' | null = null;
  private trail: { x: number; y: number }[] = [];
  private fillMask: number[][] = [];
  private filledTiles = 0;
  private filledText!: Phaser.GameObjects.Text;
  private revealMask!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private smokeEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private enemyGroup!: Phaser.Physics.Arcade.Group;

  // Config for enemies - can be passed as parameter in future from server
  private enemyConfig = [
    { type: 'bouncing', count: 1 }
  ];

  constructor(config?: any) {
    super('GameScene');
    if (config?.enemyConfig) {
      this.enemyConfig = config.enemyConfig;
    }
  }

  preload() {
    this.load.image('bg', '/assets/bg.png');
    this.load.image('hidden', '/assets/reveal.png');
    this.load.spritesheet('player', '/assets/player.png', {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet('enemy', '/assets/player.png', {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.image('smoke', '/assets/smoke.png');
  }

  create() {
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg').setDisplaySize(WIDTH, HEIGHT).setDepth(-2);
    const hiddenImage = this.add.image(WIDTH / 2, HEIGHT / 2, 'hidden').setDisplaySize(WIDTH, HEIGHT).setDepth(-1);

    this.revealMask = this.add.graphics().setDepth(2);
    this.revealMask.setVisible(false);
    const mask = this.revealMask.createGeometryMask();
    hiddenImage.setMask(mask);

    this.trailGraphics = this.add.graphics();

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.anims.create({
      key: 'move',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    // יצירת השחקן
    this.player = this.add.sprite(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2, 'player')
      .setScale(PLAYER_VISUAL_SIZE / 256)
      .setOrigin(0.5, 0.5)
      .setDepth(50);
    this.player.play('move');

    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    // יצירת אפקט עשן לשחקן, מתחיל במיקום התחלתי של השחקן
    this.smokeEmitter = this.add.particles(0, 0, 'smoke', {
      lifespan: 600,
      speed: { min: 10, max: 30 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      follow: this.player,
      blendMode: BlendModes.ADD,
      frequency: 50,
      quantity: 1
    });

    // יצירת מסכה עם שוליים בעובי של גודל השחקן
    const margin = Math.floor(PLAYER_VISUAL_SIZE / TILE_SIZE);
    this.fillMask = Array(GRID_H).fill(0).map(() => Array(GRID_W).fill(0));

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (
          x < margin || x >= GRID_W - margin ||
          y < margin || y >= GRID_H - margin
        ) {
          this.fillMask[y][x] = 1;
        }
      }
    }

    this.filledText = this.add.text(10, 10, 'Filled: 0%', {
      font: '14px Arial',
      color: '#ffffff'
    });

    // יצירת קבוצת אויבים
    this.anims.create({
      key: 'enemy_move',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.enemyGroup = this.physics.add.group();

    for (const conf of this.enemyConfig) {
      for (let i = 0; i < conf.count; i++) {
        const enemy = this.physics.add.sprite(0, 0, 'enemy')
          .setScale(PLAYER_VISUAL_SIZE / 256)
          .setOrigin(0.5, 0.5)
          .setDepth(40);
        enemy.play('enemy_move');
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8); // Smaller hitbox to reduce clipping
        (enemy.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);
        (enemy.body as Phaser.Physics.Arcade.Body).setBounce(1, 1);
        this.setRandomUnfilledPosition(enemy);
        this.enemyGroup.add(enemy);
        this.setDiagonalEnemyVelocity(enemy);
      }
    }

    // התנגשות עם אויבים
    this.physics.add.collider(this.player, this.enemyGroup, this.loseGame, undefined, this);

    // תנועת מובייל
    window.addEventListener('setDirection', (e: Event) => {
      const custom = e as CustomEvent<'up' | 'down' | 'left' | 'right'>;
      this.setDirection(custom.detail);
    });

    window.addEventListener('togglePause', () => {
      if (this.scene.isPaused()) this.scene.resume();
      else this.scene.pause();
    });

    window.addEventListener('restartGame', () => {
      this.scene.restart();
    });

    let swipeStart: Phaser.Math.Vector2 | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      swipeStart = new Phaser.Math.Vector2(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!swipeStart) return;
      const diff = new Phaser.Math.Vector2(p.x, p.y).subtract(swipeStart);
      if (Math.abs(diff.x) > Math.abs(diff.y)) {
        if (diff.x > 20) this.setDirection('right');
        else if (diff.x < -20) this.setDirection('left');
      } else {
        if (diff.y > 20) this.setDirection('down');
        else if (diff.y < -20) this.setDirection('up');
      }
      swipeStart = null;
    });
  }

  private setDirection(dir: 'up' | 'down' | 'left' | 'right') {
    this.direction = dir;
  }

  update(time: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 100;
    body.setVelocity(0);

    // תנועה לפי מקשים
    if (this.cursors.left?.isDown) { body.setVelocityX(-speed); this.direction = 'left'; }
    else if (this.cursors.right?.isDown) { body.setVelocityX(speed); this.direction = 'right'; }
    else if (this.cursors.up?.isDown) { body.setVelocityY(-speed); this.direction = 'up'; }
    else if (this.cursors.down?.isDown) { body.setVelocityY(speed); this.direction = 'down'; }

    // תנועה לפי כיוון אחרון שנשמר
    if (!this.cursors.left?.isDown && !this.cursors.right?.isDown &&
        !this.cursors.up?.isDown && !this.cursors.down?.isDown && this.direction) {
      switch (this.direction) {
        case 'left': body.setVelocityX(-speed); this.player.setAngle(0); break;
        case 'right': body.setVelocityX(speed); this.player.setAngle(180); break;
        case 'up': body.setVelocityY(-speed); this.player.setAngle(90); break;
        case 'down': body.setVelocityY(speed); this.player.setAngle(270); break;
      }
    }

    // עדכון מיקום וגריד
    const gx = Math.floor(this.player.x / TILE_SIZE);
    const gy = Math.floor(this.player.y / TILE_SIZE);

    if (this.fillMask[gy]?.[gx] === 0) {
      this.fillMask[gy][gx] = 2;
      this.trail.push({ x: gx, y: gy });
    }

    if (this.trail.length > 0 && this.fillMask[gy]?.[gx] === 1) {
      this.floodFillAndUpdate();
      this.trail = [];
    }

    this.renderRevealMask();
    this.renderTrail();

    // עדכון אויבים
    this.enemyGroup.children.entries.forEach((enemyObj: Phaser.GameObjects.GameObject) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      if (enemy.active) {
        this.updateEnemy(enemy, delta);
      }
    });
  }

  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite, delta: number) {
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;

    // חישוב מיקום עתידי
    const deltaSeconds = delta / 1000;
    const nextX = enemy.x + enemyBody.velocity.x * deltaSeconds;
    const nextY = enemy.y + enemyBody.velocity.y * deltaSeconds;
    const nextGX = Math.floor(nextX / TILE_SIZE);
    const nextGY = Math.floor(nextY / TILE_SIZE);

    // בדיקת נגיעה בשובל
    if (this.fillMask[nextGY]?.[nextGX] === 2) {
      this.loseGame();
      return;
    }

    // בדיקת נגיעה באזור מלא (גבול) - שימוש במספר נקודות לבדיקה כדי למנוע חדירה
    const checkPoints = [
      { x: nextX, y: nextY }, // מרכז
      { x: nextX - TILE_SIZE / 4, y: nextY }, // שמאל
      { x: nextX + TILE_SIZE / 4, y: nextY }, // ימין
      { x: nextX, y: nextY - TILE_SIZE / 4 }, // למעלה
      { x: nextX, y: nextY + TILE_SIZE / 4 }  // למטה
    ];

    let hitVertical = false;
    let hitHorizontal = false;

    for (const point of checkPoints) {
      const pgx = Math.floor(point.x / TILE_SIZE);
      const pgy = Math.floor(point.y / TILE_SIZE);
      if (this.fillMask[pgy]?.[pgx] === 1) {
        // חישוב כיוון פגיעה
        const currentGX = Math.floor(enemy.x / TILE_SIZE);
        const currentGY = Math.floor(enemy.y / TILE_SIZE);

        if (pgx !== currentGX && ((enemyBody.velocity.x > 0 && pgx > currentGX) || (enemyBody.velocity.x < 0 && pgx < currentGX))) hitVertical = true;
        if (pgy !== currentGY && ((enemyBody.velocity.y > 0 && pgy > currentGY) || (enemyBody.velocity.y < 0 && pgy < currentGY))) hitHorizontal = true;
      }
    }

    if (hitVertical) {
      enemyBody.velocity.x = -enemyBody.velocity.x;
      // Small push away
      enemy.x += enemyBody.velocity.x > 0 ? -1 : 1;
    }

    if (hitHorizontal) {
      enemyBody.velocity.y = -enemyBody.velocity.y;
      // Small push away
      enemy.y += enemyBody.velocity.y > 0 ? -1 : 1;
    }

    // Set angle based on velocity
    let angle = 0;
    if (Math.abs(enemyBody.velocity.x) > Math.abs(enemyBody.velocity.y)) {
      angle = enemyBody.velocity.x > 0 ? 180 : 0;
    } else {
      angle = enemyBody.velocity.y > 0 ? 270 : 90;
    }
    enemy.setAngle(angle);
  }

  private setDiagonalEnemyVelocity(enemy: Phaser.Physics.Arcade.Sprite) {
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const speed = 100 / Math.sqrt(2); // כדי שהמהירות הכוללת תהיה 100
    const directions = [
      { vx: speed, vy: speed },   // down-right
      { vx: speed, vy: -speed },  // up-right
      { vx: -speed, vy: speed },  // down-left
      { vx: -speed, vy: -speed }  // up-left
    ];
    const dir = Phaser.Math.RND.pick(directions);
    enemyBody.setVelocity(dir.vx, dir.vy);
  }

  private setRandomUnfilledPosition(object: Phaser.Physics.Arcade.Sprite) {
    const unfilled = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.fillMask[y][x] === 0) {
          unfilled.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });
        }
      }
    }
    if (unfilled.length > 0) {
      const pos = Phaser.Math.RND.pick(unfilled);
      object.setPosition(pos.x, pos.y);
    }
  }

  private loseGame() {
    this.scene.pause();
    this.add.text(WIDTH / 2 - 60, HEIGHT / 2, 'GAME OVER', {
      font: '14px Arial',
      color: '#ff0000'
    }).setDepth(3);
    this.time.delayedCall(2500, () => this.scene.restart());
  }

  private floodFillAndUpdate() {
    const temp = this.fillMask.map(row => [...row]);
    const regions: { size: number; points: { x: number; y: number }[] }[] = [];

    const floodFill = (x: number, y: number, mark: number) => {
      const queue = [{ x, y }];
      const points: { x: number; y: number }[] = [];
      let touchesTrail = false;
      let touchesBorder = false;

      while (queue.length) {
        const { x, y } = queue.shift()!;
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) {
          touchesBorder = true;
          continue;
        }
        if (temp[y][x] !== 0) {
          if (temp[y][x] === 2) touchesTrail = true;
          continue;
        }

        temp[y][x] = mark;
        points.push({ x, y });

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
      }

      return { points, touchesTrail, touchesBorder };
    };

    let regionId = 10;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (temp[y][x] === 0) {
          const region = floodFill(x, y, regionId);
          if (region.touchesTrail && !region.touchesBorder) {
            regions.push({ size: region.points.length, points: region.points });
          }
          regionId++;
        }
      }
    }

    if (regions.length > 0) {
      const largest = regions.reduce((a, b) => (a.size > b.size ? a : b));
      for (const region of regions) {
        if (region.size < largest.size) {
          // בדוק אם אויבים בתוך האזור שמתמלא
          this.enemyGroup.children.entries.forEach((enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const egx = Math.floor(enemy.x / TILE_SIZE);
            const egy = Math.floor(enemy.y / TILE_SIZE);
            if (region.points.some(p => p.x === egx && p.y === egy)) {
              enemy.setActive(false).setVisible(false);
              (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
              enemy.setPosition(-100, -100); // Off-screen
            }
          });

          for (const { x, y } of region.points) {
            this.fillMask[y][x] = 1;
            const px = x * TILE_SIZE + TILE_SIZE / 2;
            const py = y * TILE_SIZE + TILE_SIZE / 2;
            const fillEmitter = this.add.particles(px, py, 'smoke', {
              lifespan: 600,
              speed: { min: 10, max: 30 },
              scale: { start: 0.4, end: 0 },
              alpha: { start: 0.6, end: 0 },
              blendMode: BlendModes.ADD,
              frequency: -1  // burst mode
            });
            fillEmitter.explode(2);  // פרץ של 2 חלקיקים
          }
        }
      }
    }

    for (let y = 0; y < GRID_H; y++)
      for (let x = 0; x < GRID_W; x++)
        if (this.fillMask[y][x] === 2) this.fillMask[y][x] = 1;

    this.filledTiles = this.fillMask.flat().filter(v => v === 1).length;
    const percent = Math.floor((this.filledTiles / (GRID_W * GRID_H)) * 100);
    this.filledText.setText(`Filled: ${percent}%`);

    if (percent >= 75) {
      // Fully reveal the image
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          this.fillMask[y][x] = 1;
        }
      }
      this.renderRevealMask();

      this.add.text(WIDTH / 2 - 60, HEIGHT / 2, 'YOU WIN!', {
        font: '24px Arial',
        color: '#00ff00'
      }).setDepth(3);
      this.scene.pause();
      this.time.delayedCall(2500, () => this.scene.restart());
    }
  }

  private renderRevealMask() {
    this.revealMask.clear();
    this.revealMask.fillStyle(0xffffff, 1);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.fillMask[y][x] === 1) {
          this.revealMask.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private renderTrail() {
    this.trailGraphics.clear();
    this.trailGraphics.fillStyle(0xff0000, 1);
    for (const { x, y } of this.trail) {
      this.trailGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}
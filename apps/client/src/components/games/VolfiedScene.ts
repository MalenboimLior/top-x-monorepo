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
  private lives = 3;
  private score = 0;
  private timeLimit = 60;
  private remainingTime = 60;
  private totalTime = 0;
  private isLosingLife = false;
  private filledText!: Phaser.GameObjects.Text;
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private remainingTimeText!: Phaser.GameObjects.Text;
  private totalTimeText!: Phaser.GameObjects.Text;
  private revealMask!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private smokeEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private powerupGroup!: Phaser.Physics.Arcade.Group;

  // Config for enemies - can be passed as parameter in future from server
  private enemyConfig = [
    { type: 'bouncing', count: 2 },
    { type: 'robot', count: 1 }
  ];

  // Config for powerups
  private powerupConfig = [
    { type: 'extralive', count: 1 },
    { type: 'extratime', count: 1 }
  ];

  constructor(config?: any) {
    super('GameScene');
    if (config?.enemyConfig) {
      this.enemyConfig = config.enemyConfig;
    }
    if (config?.powerupConfig) {
      this.powerupConfig = config.powerupConfig;
    }
    if (config?.timeLimit) {
      this.timeLimit = config.timeLimit;
    }
    this.remainingTime = this.timeLimit;
  }

  preload() {
    this.load.image('bg', '/assets/anonymous.png');
    this.load.image('hidden', '/assets/magal.png');
    this.load.spritesheet('player', '/assets/Monocle_spritesheet.png', {
      frameWidth: 512,
      frameHeight: 512
    });
    this.load.spritesheet('enemy', '/assets/monster_spritesheet.png', {
      frameWidth: 512,
      frameHeight: 512
    });
    this.load.spritesheet('robot', '/assets/robot_spritesheet.png', {
      frameWidth: 512,
      frameHeight: 512
    });
    this.load.spritesheet('heart', '/assets/heart_spritesheet.png', {
      frameWidth: 512,
      frameHeight: 512
    });
    this.load.spritesheet('clock', '/assets/time_spritesheet.png', {
      frameWidth: 512,
      frameHeight: 512
    });
    this.load.image('smoke', '/assets/smoke.png');
    this.load.image('heart_icon', '/assets/heart_icon.png');
  }

  create() {
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg').setDisplaySize(WIDTH, HEIGHT).setDepth(-2);
    const hiddenImage = this.add.image(WIDTH / 2, HEIGHT / 2, 'hidden').setDisplaySize(WIDTH, HEIGHT).setDepth(-1);

    this.revealMask = this.add.graphics().setDepth(2);
    this.revealMask.setVisible(false);
    const mask = this.revealMask.createGeometryMask();
    hiddenImage.setMask(mask);

    this.trailGraphics = this.add.graphics();
    this.borderGraphics = this.add.graphics().setDepth(0);

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.anims.create({
      key: 'move',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1
    });

    // Create player
    this.player = this.add.sprite(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2, 'player')
      .setScale(PLAYER_VISUAL_SIZE / 512)
      .setOrigin(0.5, 0.5)
      .setDepth(50);
    this.player.play('move');

    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    // Create smoke effect for player
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

    // Create mask with margins
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

    this.renderBorder();

    this.filledText = this.add.text(10, 10, 'Filled: 0%', {
      font: '14px Arial',
      color: '#ffffff'
    });

    // Hearts for lives
    for (let i = 0; i < 5; i++) {
      const heart = this.add.image(100 + i * 20, 15, 'heart_icon')
        .setScale(0.05) // Adjust scale as needed
        .setVisible(i < this.lives);
      this.livesIcons.push(heart);
    }

    this.scoreText = this.add.text(180, 10, 'Score: 0', {
      font: '14px Arial',
      color: '#ffffff'
    });

    this.totalTimeText = this.add.text(260, 10, 'Time: 0', {
      font: '14px Arial',
      color: '#ffffff'
    });

    this.remainingTimeText = this.add.text(330, 10, `Left: ${this.timeLimit}`, {
      font: '14px Arial',
      color: '#ffffff'
    });

    // Create enemy group
    this.anims.create({
      key: 'enemy_move',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'robot_move',
      frames: this.anims.generateFrameNumbers('robot', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1
    });

    this.enemyGroup = this.physics.add.group();

    for (const conf of this.enemyConfig) {
      for (let i = 0; i < conf.count; i++) {
        const texture = conf.type === 'robot' ? 'robot' : 'enemy';
        const animKey = conf.type === 'robot' ? 'robot_move' : 'enemy_move';
        const visualSize = conf.type === 'robot' ? 40 : PLAYER_VISUAL_SIZE;
        const enemy = this.physics.add.sprite(0, 0, texture)
          .setScale(visualSize / 512)
          .setOrigin(0.5, 0.5)
          .setDepth(40);
        enemy.play(animKey);
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        (enemy.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);
        (enemy.body as Phaser.Physics.Arcade.Body).setBounce(1, 1);
        this.setRandomUnfilledPosition(enemy);
        this.enemyGroup.add(enemy);
        enemy.setData('type', conf.type);
        if (conf.type === 'robot') {
          this.setDiagonalEnemyVelocity(enemy, true);
          this.time.addEvent({
            delay: Phaser.Math.Between(3000, 6000),
            callback: () => this.setDiagonalEnemyVelocity(enemy, true),
            loop: true
          });
        } else {
          this.setDiagonalEnemyVelocity(enemy);
        }
      }
    }

    // Enemy collision
    this.physics.add.collider(this.player, this.enemyGroup, this.loseLife, undefined, this);

    // Create powerup group
    this.anims.create({
      key: 'heart_anim',
      frames: this.anims.generateFrameNumbers('heart', { start: 0, end: 4 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'clock_anim',
      frames: this.anims.generateFrameNumbers('clock', { start: 0, end: 4 }),
      frameRate: 6,
      repeat: -1
    });

    this.powerupGroup = this.physics.add.group();

    for (const conf of this.powerupConfig) {
      for (let i = 0; i < conf.count; i++) {
        const texture = conf.type === 'extratime' ? 'clock' : 'heart';
        const animKey = conf.type === 'extratime' ? 'clock_anim' : 'heart_anim';
        const powerup = this.physics.add.sprite(0, 0, texture)
          .setScale(PLAYER_VISUAL_SIZE / 512)
          .setOrigin(0.5, 0.5)
          .setDepth(30);
        powerup.setData('type', conf.type);
        powerup.setData('destroyed', false);
        powerup.setActive(false).setVisible(false);
        this.powerupGroup.add(powerup);
        // Start timer for powerup spawn
        this.time.delayedCall(Phaser.Math.Between(2000, 5000), this.spawnPowerup, [powerup, animKey], this);
      }
    }

    // Powerup collision
    this.physics.add.collider(
      this.player,
      this.powerupGroup,
      (playerObj, powerupObj) => {
        // Type guard to ensure both are GameObjects with body
        if (
          'body' in playerObj &&
          'body' in powerupObj &&
          typeof this.collectPowerup === 'function'
        ) {
          this.collectPowerup(
            playerObj as Phaser.Types.Physics.Arcade.GameObjectWithBody,
            powerupObj as Phaser.Types.Physics.Arcade.GameObjectWithBody
          );
        }
      },
      undefined,
      this
    );

    // Mobile controls
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

if (!this.isLosingLife) {
  // Keyboard movement
  if (this.cursors.left?.isDown) { body.setVelocityX(-speed); this.direction = 'left'; }
  else if (this.cursors.right?.isDown) { body.setVelocityX(speed); this.direction = 'right'; }
  else if (this.cursors.up?.isDown) { body.setVelocityY(-speed); this.direction = 'up'; }
  else if (this.cursors.down?.isDown) { body.setVelocityY(speed); this.direction = 'down'; }

  // Continue movement based on last direction
  if (!this.cursors.left?.isDown && !this.cursors.right?.isDown &&
      !this.cursors.up?.isDown && !this.cursors.down?.isDown && this.direction) {
    switch (this.direction) {
      case 'left': body.setVelocityX(-speed); this.player.setAngle(0); break;
      case 'right': body.setVelocityX(speed); this.player.setAngle(180); break;
      case 'up': body.setVelocityY(-speed); this.player.setAngle(90); break;
      case 'down': body.setVelocityY(speed); this.player.setAngle(270); break;
    }
  }

  // Update position and grid
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
}

    this.renderRevealMask();
    this.renderTrail();

    // Update enemies
    this.enemyGroup.children.entries.forEach((enemyObj: Phaser.GameObjects.GameObject) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      if (enemy.active) {
        this.updateEnemy(enemy, delta);
      }
    });
  }

 private spawnPowerup(powerup: Phaser.Physics.Arcade.Sprite, animKey: string) {
  if (powerup.getData('destroyed')) return;
  this.setRandomUnfilledPosition(powerup);
  powerup.setActive(true).setVisible(true);
  (powerup.body as Phaser.Physics.Arcade.Body).enable = true; // Ensure physics is enabled
  powerup.play(animKey);
  const visibleTime = Phaser.Math.Between(6000, 9000);
  const blinkTimer = this.time.delayedCall(visibleTime - 2000, () => {
    this.tweens.add({
      targets: powerup,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }, [], this);
  powerup.setData('blinkTimer', blinkTimer);
  const despawnTimer = this.time.delayedCall(visibleTime, () => {
    powerup.setActive(false).setVisible(false);
    powerup.alpha = 1;
    this.tweens.killTweensOf(powerup);
    this.time.delayedCall(Phaser.Math.Between(2000, 5000), this.spawnPowerup, [powerup, animKey], this);
  }, [], this);
  powerup.setData('despawnTimer', despawnTimer);
}

private collectPowerup(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, powerup: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
  const powerupSprite = powerup as Phaser.Physics.Arcade.Sprite;
  if (!powerupSprite.getData('destroyed')) {
    (powerupSprite.body as Phaser.Physics.Arcade.Body).enable = false; // Disable physics immediately
    this.destroyPowerup(powerupSprite, true);
  }
}

  private destroyPowerup(powerup: Phaser.Physics.Arcade.Sprite, collect: boolean) {
  powerup.setActive(false).setVisible(false);
  powerup.alpha = 1;
  this.tweens.killTweensOf(powerup);
  if (powerup.getData('despawnTimer')) powerup.getData('despawnTimer').remove();
  if (powerup.getData('blinkTimer')) powerup.getData('blinkTimer').remove();
  if (powerup.getData('spawnTimer')) powerup.getData('spawnTimer').remove();
  powerup.setData('destroyed', true);

  let tint = 0xff0000; // red for destroy
  const type = powerup.getData('type');
  if (collect) {
    this.score += 100;
    if (type === 'extralive' && this.lives < 5) {
      this.lives++;
      this.updateLivesIcons();
    } else if (type === 'extratime') {
      this.remainingTime += 30;
    }
    tint = 0xff0000; // Red for collect
  } else {
    this.score += 250;
  }
  this.showPointsAnimation(powerup.x, powerup.y, collect ? 100 : 250);
  this.updateScore();

  const emitter = this.add.particles(powerup.x, powerup.y, 'smoke', {
    lifespan: 600,
    speed: 0, // Static particles
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.6, end: 0 },
    blendMode: BlendModes.ADD,
    frequency: -1,
    tint: tint // Red for both collect and destroy
  });
  emitter.explode(10);
}

  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite, delta: number) {
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;

    // Calculate future position
    const deltaSeconds = delta / 1000;
    const nextX = enemy.x + enemyBody.velocity.x * deltaSeconds;
    const nextY = enemy.y + enemyBody.velocity.y * deltaSeconds;
    const nextGX = Math.floor(nextX / TILE_SIZE);
    const nextGY = Math.floor(nextY / TILE_SIZE);

    // Check collision with trail
    if (this.fillMask[nextGY]?.[nextGX] === 2) {
  this.loseLife();
  return;
}

    // Check collision with filled area (border)
    const checkPoints = [
      { x: nextX, y: nextY }, // center
      { x: nextX - TILE_SIZE / 4, y: nextY }, // left
      { x: nextX + TILE_SIZE / 4, y: nextY }, // right
      { x: nextX, y: nextY - TILE_SIZE / 4 }, // top
      { x: nextX, y: nextY + TILE_SIZE / 4 }  // bottom
    ];

    let hitVertical = false;
    let hitHorizontal = false;

    for (const point of checkPoints) {
      const pgx = Math.floor(point.x / TILE_SIZE);
      const pgy = Math.floor(point.y / TILE_SIZE);
      if (this.fillMask[pgy]?.[pgx] === 1) {
        // Determine collision direction
        const currentGX = Math.floor(enemy.x / TILE_SIZE);
        const currentGY = Math.floor(enemy.y / TILE_SIZE);

        if (pgx !== currentGX && ((enemyBody.velocity.x > 0 && pgx > currentGX) || (enemyBody.velocity.x < 0 && pgx < currentGX))) hitVertical = true;
        if (pgy !== currentGY && ((enemyBody.velocity.y > 0 && pgy > currentGY) || (enemyBody.velocity.y < 0 && pgy < currentGY))) hitHorizontal = true;
      }
    }

    if (hitVertical) {
      enemyBody.velocity.x = -enemyBody.velocity.x;
      enemy.x += enemyBody.velocity.x > 0 ? -1 : 1;
    }

    if (hitHorizontal) {
      enemyBody.velocity.y = -enemyBody.velocity.y;
      enemy.y += enemyBody.velocity.y > 0 ? -1 : 1;
    }

    // Set angle based on velocity
    let angle = 0;
    if (Math.abs(enemyBody.velocity.x) > Math.abs(enemyBody.velocity.y)) {
  angle = enemyBody.velocity.x > 0 ? 90 : -90; // ימין/שמאל
} else {
  angle = enemyBody.velocity.y > 0 ? 180 : 0;  // למטה/למעלה
}
    enemy.setAngle(angle);
  }

  private setDiagonalEnemyVelocity(enemy: Phaser.Physics.Arcade.Sprite, isRobot = false) {
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const baseSpeed = isRobot ? 200 : 100;
    const speed = baseSpeed / Math.sqrt(2);
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

  private loseLife() {
  this.isLosingLife = true;
  this.lives--;
  this.updateLivesIcons();
  this.trail = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (this.fillMask[y][x] === 2) this.fillMask[y][x] = 0; // Reset trail tiles
    }
  }
  this.renderTrail();
  const body = this.player.body as Phaser.Physics.Arcade.Body;
  body.setVelocity(0); // Stop player movement
  // Lose life animation
  const loseEmitter = this.add.particles(this.player.x, this.player.y, 'smoke', {
    lifespan: 600,
    speed: { min: 20, max: 40 },
    scale: { start: 0.3, end: 0 },
    alpha: { start: 0.6, end: 0 },
    blendMode: BlendModes.ADD,
    frequency: -1,
    tint: 0xff0000
  });
  loseEmitter.explode(10);
  this.tweens.add({
    targets: this.player,
    alpha: 0,
    duration: 200,
    yoyo: true,
    repeat: 2
  });
  this.time.delayedCall(1000, () => {
    this.player.setPosition(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2);
    this.direction = null;
    this.remainingTime = this.timeLimit; // Reset time limit
    this.isLosingLife = false; // Re-enable movement and trail
  }, [], this);
  if (this.lives <= 0) {
    this.scene.pause();
    this.add.text(WIDTH / 2 - 60, HEIGHT / 2, 'GAME OVER', {
      font: '24px Arial',
      color: '#ff0000'
    }).setDepth(3);
    this.time.delayedCall(2500, () => this.scene.restart());
  }
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
          // Check enemies in filled area
          this.enemyGroup.children.entries.forEach((enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const egx = Math.floor(enemy.x / TILE_SIZE);
            const egy = Math.floor(enemy.y / TILE_SIZE);
            if (region.points.some(p => p.x === egx && p.y === egy)) {
              this.score += 250;
              this.showPointsAnimation(enemy.x, enemy.y, 250);
              enemy.setActive(false).setVisible(false);
              (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
              enemy.setPosition(-100, -100); // Off-screen
            }
          });

          // Check powerups in filled area
          this.powerupGroup.children.entries.forEach((puObj) => {
            const pu = puObj as Phaser.Physics.Arcade.Sprite;
            if (pu.active) {
              const pugx = Math.floor(pu.x / TILE_SIZE);
              const pugy = Math.floor(pu.y / TILE_SIZE);
              if (region.points.some(p => p.x === pugx && p.y === pugy)) {
                this.score += 250;
                this.showPointsAnimation(pu.x, pu.y, 250);
                this.destroyPowerup(pu, false);
              }
            }
          });

          this.score += region.points.length * 10;
          const centerX = region.points.reduce((sum, p) => sum + p.x, 0) / region.points.length * TILE_SIZE + TILE_SIZE / 2;
          const centerY = region.points.reduce((sum, p) => sum + p.y, 0) / region.points.length * TILE_SIZE + TILE_SIZE / 2;
          this.showPointsAnimation(centerX, centerY, region.points.length * 10);
          this.updateScore();

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
            fillEmitter.explode(2);  // Burst of 2 particles
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
      this.score += 50;
      this.showPointsAnimation(WIDTH / 2, HEIGHT / 2, 50);
      this.updateScore();
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

  private renderBorder() {
    this.borderGraphics.clear();
    const margin = Math.floor(PLAYER_VISUAL_SIZE / TILE_SIZE) * TILE_SIZE;
    const borderWidth = 2; // 2px border
    const borderRadius = 12;
    const cyanColor = 0x00e8e0;
    const glowAlpha = 0.3;

    // Draw outer black frame
    this.borderGraphics.fillStyle(0x000000, 1);
    this.borderGraphics.fillRect(0, 0, WIDTH, margin); // Top
    this.borderGraphics.fillRect(0, HEIGHT - margin, WIDTH, margin); // Bottom
    this.borderGraphics.fillRect(0, 0, margin, HEIGHT); // Left
    this.borderGraphics.fillRect(WIDTH - margin, 0, margin, HEIGHT); // Right

    // Draw inner cyan border with rounded corners
    const innerX = margin + borderWidth;
    const innerY = margin + borderWidth;
    const innerWidth = WIDTH - 2 * (margin + borderWidth);
    const innerHeight = HEIGHT - 2 * (margin + borderWidth);

    // Simulate glow with multiple semi-transparent strokes
    this.borderGraphics.lineStyle(borderWidth * 3, cyanColor, glowAlpha);
    this.borderGraphics.strokeRoundedRect(innerX - 1, innerY - 1, innerWidth + 2, innerHeight + 2, borderRadius + 2);
    this.borderGraphics.lineStyle(borderWidth * 2, cyanColor, glowAlpha * 0.6);
    this.borderGraphics.strokeRoundedRect(innerX - 0.5, innerY - 0.5, innerWidth + 1, innerHeight + 1, borderRadius + 1);

    // Solid cyan border
    this.borderGraphics.lineStyle(borderWidth, cyanColor, 1);
    this.borderGraphics.strokeRoundedRect(innerX, innerY, innerWidth, innerHeight, borderRadius);
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private showPointsAnimation(x: number, y: number, points: number) {
    const text = this.add.text(x, y, `+${points}`, {
      font: '20px Arial',
      color: '#ffff00'
    }).setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  private updateLivesIcons() {
    this.livesIcons.forEach((heart, index) => {
      heart.setVisible(index < this.lives);
    });
  }
}
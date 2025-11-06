import type { ZoneRevealConfig, LevelConfig } from '@top-x/shared/types/zoneReveal';

type PhaserNamespace = typeof import('phaser');


export const TILE_SIZE = 10;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 480;
const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH;
const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : DEFAULT_HEIGHT;
export const WIDTH = Math.floor(Math.min(viewportWidth, DEFAULT_WIDTH) / TILE_SIZE) * TILE_SIZE;
export const HEIGHT = Math.floor(Math.min(viewportHeight, DEFAULT_HEIGHT) / TILE_SIZE) * TILE_SIZE;
const GRID_W = WIDTH / TILE_SIZE;
const GRID_H = HEIGHT / TILE_SIZE;
const PLAYER_VISUAL_SIZE = 30;

const DEFAULT_ZONE_REVEAL_CONFIG: ZoneRevealConfig = {
  backgroundImage: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2F1753992798351_level2.jpeg?alt=media&token=cc65eb9e-13de-486b-b4b4-bfe2eec2a73b',
  spritesheets: {
    player: '/assets/zonereveal/Monocle_spritesheet.png',
    enemy: '/assets/zonereveal/monster_spritesheet.png',
    robot: '/assets/zonereveal/robot_spritesheet.png',
    microbe: '/assets/zonereveal/microbe_spritesheet.png',
    heart: '/assets/zonereveal/heart_spritesheet.png',
    clock: '/assets/zonereveal/time_spritesheet.png',
    speed: '/assets/zonereveal/speed_spritesheet.png',
    freeze: '/assets/zonereveal/freeze_spritesheet.png'
  },
  playerSpeed: 200,
  enemiesSpeedArray: { bouncing: 100, robot: 80, microbe: 90, straightUp: 150, straightleft: 150 },
  finishPercent: 50,
  heartIcon: '/assets/zonereveal/heart_icon.png',
  answer: {
    solution: 'Top X',
    accepted: ['TopX', 'Top-X'],
    image: '/assets/zonereveal/level1.jpg',
  },
  levelsConfig: [
    {
      enemyConfig: [
        { type: 'bouncing', count: 0 },
        { type: 'robot', count: 0 },
        { type: 'microbe', count: 0 },
        { type: 'straightUp', count: 0 },
        { type: 'straightleft', count: 0 }
      ],
      powerupConfig: [
        { type: 'extralive', count: 3 },
        { type: 'extratime', count: 3 },
        { type: 'extraspeed', count: 0 },
        { type: 'extrafreeze', count: 0 }
      ],
      timeLimit: 60,
      hiddenImage: '/assets/zonereveal/level1.jpg',
      levelHeader: 'Level 1'
    }
  ]
};

export default function createZoneRevealScene(
  Phaser: PhaserNamespace,
  config?: ZoneRevealConfig
) {
  const { BlendModes } = Phaser;

  class VolfiedScene extends Phaser.Scene {
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
  private currentLevel = 0;
  private levels: LevelConfig[] = [];
  private levelText!: Phaser.GameObjects.Text;
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
  private hiddenImage!: Phaser.GameObjects.Image;
  private playerSpeed: number;

  // Config for levels
  readonly zoneRevealConfig: ZoneRevealConfig;

  constructor() {
    super('GameScene');
    this.zoneRevealConfig = config || DEFAULT_ZONE_REVEAL_CONFIG;
    this.levels = this.zoneRevealConfig.levelsConfig;
    this.remainingTime = this.levels.length > 0 ? this.levels[0].timeLimit : 60;
    this.playerSpeed = this.zoneRevealConfig.playerSpeed ?? 200;
  }

  preload() {
    const loadingText = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 25, 'Loading...', {
        font: '20px Arial',
        color: '#ffffff'
      })
      .setOrigin(0.5);
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(WIDTH / 2 - 160, HEIGHT / 2 - 10, 320, 20);
    const progressBar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(WIDTH / 2 - 150, HEIGHT / 2 - 8, 300 * value, 16);
    });
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    this.load.image('bg', this.zoneRevealConfig.backgroundImage ?? '/assets/zonereveal/anonymous.png');
    this.zoneRevealConfig.levelsConfig.forEach((level, index) => {
      this.load.image(`hidden${index}`, level.hiddenImage);
    });

    const defaults = {
      player: '/assets/zonereveal/Monocle_spritesheet.png',
      enemy: '/assets/zonereveal/monster_spritesheet.png',
      robot: '/assets/zonereveal/Alien_spritesheet.png',
      microbe: '/assets/zonereveal/microbe_spritesheet.png',
      heart: '/assets/zonereveal/heart_spritesheet.png',
      clock: '/assets/zonereveal/time_spritesheet.png',
      speed: '/assets/zonereveal/speed_spritesheet.png',
      freeze: '/assets/zonereveal/freeze_spritesheet.png'
    };
    const sheets = { ...defaults, ...(this.zoneRevealConfig.spritesheets || {}) };
    Object.entries(sheets).forEach(([key, path]) => {
      this.load.spritesheet(key, path, {
        frameWidth: 512,
        frameHeight: 512
      });
    });

    this.load.image('smoke', '/assets/zonereveal/smoke.png');
    this.load.image('heart_icon', this.zoneRevealConfig.heartIcon ?? '/assets/zonereveal/heart_icon.png');
  }

  create() {
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg').setDisplaySize(WIDTH, HEIGHT).setDepth(-2);
const margin = Math.floor(PLAYER_VISUAL_SIZE / TILE_SIZE) * TILE_SIZE;
const innerX = margin + (WIDTH - 2 * margin) / 2;
const innerY = margin + (HEIGHT - 2 * margin) / 2;
const innerWidth = WIDTH - 2 * margin;
const innerHeight = HEIGHT - 2 * margin;

this.hiddenImage = this.add.image(innerX, innerY, `hidden0`)
  .setDisplaySize(innerWidth, innerHeight)
  .setDepth(-1);
  
    this.revealMask = this.add.graphics().setDepth(2);
    this.revealMask.setVisible(false);
    const mask = this.revealMask.createGeometryMask();
    this.hiddenImage.setMask(mask);

    this.trailGraphics = this.add.graphics();
    this.borderGraphics = this.add.graphics().setDepth(0);

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    ]);

    if (!this.anims.exists('move')) {
      this.anims.create({
        key: 'move',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        frameRate: 6,
        repeat: -1
      });
    }

    // Create player
    this.player = this.add.sprite(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2, 'player')
      .setScale(PLAYER_VISUAL_SIZE / 512)
      .setOrigin(0.5, 0.5)
      .setDepth(50)
      .setDisplaySize(PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE);
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

    this.renderBorder();

    this.levelText = this.add.text(10, 30, this.levels[0].levelHeader, {
      font: '14px Arial',
      color: '#ffffff'
    });

    this.filledText = this.add.text(10, 10, 'Filled: 0%', {
      font: '14px Arial',
      color: '#ffffff'
    });

    // Hearts for lives
    this.livesIcons.forEach(icon => icon.destroy());
this.livesIcons = [];
for (let i = 0; i < 5; i++) {
  const heart = this.add.image(100 + i * 20, 15, 'heart_icon')
    .setScale(0.05)
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
    const enemyTypes = new Set<string>();
    this.zoneRevealConfig.levelsConfig.forEach(level => {
      level.enemyConfig.forEach(e => {
        const key = this.zoneRevealConfig.spritesheets?.[e.type] ? e.type : 'enemy';
        enemyTypes.add(key);
      });
    });
    enemyTypes.forEach(type => {
      const endFrame = type === 'robot' ? 3 : 5;
      const key = `${type}_move`;
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(type, { start: 0, end: endFrame }),
          frameRate: 6,
          repeat: -1
        });
      }
    });

    this.enemyGroup = this.physics.add.group();

    // Create powerup group
    if (!this.anims.exists('heart_anim')) {
      this.anims.create({
        key: 'heart_anim',
        frames: this.anims.generateFrameNumbers('heart', { start: 0, end: 4 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('clock_anim')) {
      this.anims.create({
        key: 'clock_anim',
        frames: this.anims.generateFrameNumbers('clock', { start: 0, end: 4 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('speed_anim')) {
      this.anims.create({
        key: 'speed_anim',
        frames: this.anims.generateFrameNumbers('speed', { start: 0, end: 4 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('freeze_anim')) {
      this.anims.create({
        key: 'freeze_anim',
        frames: this.anims.generateFrameNumbers('freeze', { start: 0, end: 4 }),
        frameRate: 6,
        repeat: -1
      });
    }

    this.powerupGroup = this.physics.add.group();

    this.loadLevel(this.currentLevel);

    // Enemy collision
    this.physics.add.collider(this.player, this.enemyGroup, this.loseLife, undefined, this);

    // Powerup collision
    this.physics.add.collider(
      this.player,
      this.powerupGroup,
      (playerObj, powerupObj) => {
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
    const handleSetDirection = (e: Event) => {
      const custom = e as CustomEvent<'up' | 'down' | 'left' | 'right'>;
      this.setDirection(custom.detail);
    };
    const handleTogglePause = () => {
      if (this.scene.isPaused()) this.scene.resume();
      else this.scene.pause();
    };
    const handleRestart = () => {
      if (this.scene.isPaused()) this.scene.resume();
      this.currentLevel = 0;
      this.lives = 3;
      this.score = 0;
      this.totalTime = 0;
      this.isLosingLife = false;
      this.remainingTime = this.levels[0].timeLimit;
      this.updateLivesIcons();
      this.updateScore();
      this.totalTimeText.setText('Time: 0');
      this.scene.restart();
    };

    window.addEventListener('setDirection', handleSetDirection);
    window.addEventListener('togglePause', handleTogglePause);
    window.addEventListener('restartGame', handleRestart);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('setDirection', handleSetDirection);
      window.removeEventListener('togglePause', handleTogglePause);
      window.removeEventListener('restartGame', handleRestart);
    });

    let swipeStart: Phaser.Math.Vector2 | null = null;
    let started = false;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      swipeStart = new Phaser.Math.Vector2(p.x, p.y);
      if (!started) {
        window.dispatchEvent(new Event('gameStart'));
        started = true;
      }
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
        this.events.emit('ready');

  }

  private loadLevel(levelIndex: number) {
    console.log(`Loading level ${levelIndex + 1}: ${this.levels[levelIndex].levelHeader}`);
    const level = this.levels[levelIndex];
    this.timeLimit = level.timeLimit;
    this.remainingTime = this.timeLimit;
    this.levelText.setText(level.levelHeader);
    this.hiddenImage.setTexture(`hidden${levelIndex}`);
    
    // Reset fill mask for every level
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
    this.filledTiles = 0;
    this.filledText.setText('Filled: 0%');
    
    this.trail = [];
    this.renderRevealMask();
    this.renderTrail();
    this.player.setPosition(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2);
    this.direction = null;

    // Clear existing enemy and powerup timers
    this.enemyGroup.children.entries.forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      if (enemy.getData('timer')) {
        enemy.getData('timer').remove();
      }
    });
    this.powerupGroup.children.entries.forEach((puObj) => {
      const pu = puObj as Phaser.Physics.Arcade.Sprite;
      if (pu.getData('blinkTimer')) pu.getData('blinkTimer').remove();
      if (pu.getData('despawnTimer')) pu.getData('despawnTimer').remove();
      if (pu.getData('spawnTimer')) pu.getData('spawnTimer').remove();
    });

    // Reset enemies
    this.enemyGroup.clear(true, true);
    for (const conf of level.enemyConfig) {
      for (let i = 0; i < conf.count; i++) {
        const texture = this.zoneRevealConfig.spritesheets?.[conf.type] ? conf.type : 'enemy';
        const animKey = `${texture}_move`;
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
        this.setEnemyVelocity(enemy, conf.type);
        if (conf.type === 'robot') {
          const timer = this.time.addEvent({
            delay: Phaser.Math.Between(3000, 6000),
            callback: () => this.setEnemyVelocity(enemy, conf.type),
            loop: true
          });
          enemy.setData('timer', timer);
        }
        
      }
    }

    // Reset powerups
    this.powerupGroup.clear(true, true);
    for (const conf of level.powerupConfig) {
      for (let i = 0; i < conf.count; i++) {
        let texture: string;
        let animKey: string;
        if (conf.type === 'extralive') {
          texture = 'heart';
          animKey = 'heart_anim';
        } else if (conf.type === 'extratime') {
          texture = 'clock';
          animKey = 'clock_anim';
        } else if (conf.type === 'extraspeed') {
          texture = 'speed';
          animKey = 'speed_anim';
        } else {
          texture = 'freeze';
          animKey = 'freeze_anim';
        }
        const powerup = this.physics.add.sprite(0, 0, texture)
          .setScale(PLAYER_VISUAL_SIZE / 512)
          .setOrigin(0.5, 0.5)
          .setDepth(30);
        powerup.setData('type', conf.type);
        powerup.setData('destroyed', false);
        powerup.setActive(false).setVisible(false);
        this.powerupGroup.add(powerup);
        this.time.delayedCall(Phaser.Math.Between(2000, 5000), this.spawnPowerup, [powerup, animKey], this);
      }
    }
  }

  private setDirection(dir: 'up' | 'down' | 'left' | 'right') {
    this.direction = dir;
  }

  update(time: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    if (!this.isLosingLife) {
      // Keyboard movement
      if (this.cursors.left?.isDown) { body.setVelocityX(-this.playerSpeed); this.direction = 'left'; }
      else if (this.cursors.right?.isDown) { body.setVelocityX(this.playerSpeed); this.direction = 'right'; }
      else if (this.cursors.up?.isDown) { body.setVelocityY(-this.playerSpeed); this.direction = 'up'; }
      else if (this.cursors.down?.isDown) { body.setVelocityY(this.playerSpeed); this.direction = 'down'; }

      // Continue movement based on last direction
      if (!this.cursors.left?.isDown && !this.cursors.right?.isDown &&
          !this.cursors.up?.isDown && !this.cursors.down?.isDown && this.direction) {
        switch (this.direction) {
          case 'left': body.setVelocityX(-this.playerSpeed); this.player.setAngle(0); break;
          case 'right': body.setVelocityX(this.playerSpeed); this.player.setAngle(180); break;
          case 'up': body.setVelocityY(-this.playerSpeed); this.player.setAngle(90); break;
          case 'down': body.setVelocityY(this.playerSpeed); this.player.setAngle(270); break;
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

    // Update timers
    this.totalTime += delta / 1000;
    this.remainingTime -= delta / 1000;
    this.totalTimeText.setText(`Time: ${Math.floor(this.totalTime)}`);
    this.remainingTimeText.setText(`Left: ${Math.ceil(this.remainingTime)}`);

    if (this.remainingTime <= 0) {
      this.loseLife();
      this.remainingTime = this.timeLimit;
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
  if (!powerup || !powerup.scene || powerup.getData('destroyed')) return;
  if (!this.anims.exists(animKey)) return;

  this.setRandomUnfilledPosition(powerup);
  powerup.setActive(true).setVisible(true);

  try {
    powerup.play(animKey);
  } catch (err) {
    console.warn(`Failed to play animation '${animKey}'`, err);
    return;
  }

  if (powerup.body) {
    (powerup.body as Phaser.Physics.Arcade.Body).enable = true;
  }

  const visibleTime = Phaser.Math.Between(6000, 9000);
  const blinkTimer = this.time.delayedCall(visibleTime - 2000, () => {
    if (!powerup.active || !powerup.visible) return;
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

    // Schedule next spawn
    const delay = Phaser.Math.Between(2000, 5000);
    const spawnTimer = this.time.delayedCall(delay, this.spawnPowerup, [powerup, animKey], this);
    powerup.setData('spawnTimer', spawnTimer);
  }, [], this);

  powerup.setData('despawnTimer', despawnTimer);
}


  private collectPowerup(player: Phaser.Types.Physics.Arcade.GameObjectWithBody, powerup: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    const powerupSprite = powerup as Phaser.Physics.Arcade.Sprite;
    if (!powerupSprite.getData('destroyed')) {
      (powerupSprite.body as Phaser.Physics.Arcade.Body).enable = false;
      this.destroyPowerup(powerupSprite, true);
    }
  }

  private destroyPowerup(powerup: Phaser.Physics.Arcade.Sprite, collect: boolean) {
    powerup.setActive(false).setVisible(false);
    powerup.alpha = 1;
    this.tweens.killTweensOf(powerup);
   ['despawnTimer', 'blinkTimer', 'spawnTimer'].forEach(timerKey => {
  const timer: Phaser.Time.TimerEvent | null = powerup.getData(timerKey);
  if (timer && !timer.hasDispatched) {
    timer.remove();
  }
  powerup.setData(timerKey, null);
});

    powerup.setData('destroyed', true);

    let tint = 0xff0000;
    const type = powerup.getData('type');
    if (collect) {
      this.score += 100;
      if (type === 'extralive' && this.lives < 5) {
        this.lives++;
        this.updateLivesIcons();
      } else if (type === 'extratime') {
        this.remainingTime += 30;
      } else if (type === 'extraspeed') {
        const originalSpeed = this.playerSpeed;
        this.playerSpeed = originalSpeed * 1.3;
        this.time.delayedCall(5000, () => {
          this.playerSpeed = originalSpeed;
        });
      } else if (type === 'extrafreeze') {
        const savedVelocities = new Map<Phaser.Physics.Arcade.Sprite, { x: number; y: number }>();
        this.enemyGroup.children.entries.forEach((enemyObj) => {
          const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
          if (enemy.body) {
            savedVelocities.set(enemy, { x: enemy.body.velocity.x, y: enemy.body.velocity.y });
            (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
          const timer = enemy.getData('timer') as Phaser.Time.TimerEvent | undefined;
          if (timer) timer.paused = true;
        });
        this.time.delayedCall(3000, () => {
          this.enemyGroup.children.entries.forEach((enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const sv = savedVelocities.get(enemy);
            if (sv) {
              (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(sv.x, sv.y);
            }
            const timer = enemy.getData('timer') as Phaser.Time.TimerEvent | undefined;
            if (timer) timer.paused = false;
          });
        });
      }
      tint = 0xff0000;
    } else {
      this.score += 250;
    }
    this.showPointsAnimation(powerup.x, powerup.y, collect ? 100 : 250);
    this.updateScore();

    const emitter = this.add.particles(powerup.x, powerup.y, 'smoke', {
      lifespan: 600,
      speed: 0,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: BlendModes.ADD,
      frequency: -1,
      tint: tint
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
      { x: nextX, y: nextY },
      { x: nextX - TILE_SIZE / 4, y: nextY },
      { x: nextX + TILE_SIZE / 4, y: nextY },
      { x: nextX, y: nextY - TILE_SIZE / 4 },
      { x: nextX, y: nextY + TILE_SIZE / 4 }
    ];

    let hitVertical = false;
    let hitHorizontal = false;

    for (const point of checkPoints) {
      const pgx = Math.floor(point.x / TILE_SIZE);
      const pgy = Math.floor(point.y / TILE_SIZE);
      if (this.fillMask[pgy]?.[pgx] === 1) {
        const currentGX = Math.floor(enemy.x / TILE_SIZE);
        const currentGY = Math.floor(enemy.y / TILE_SIZE);

        if (pgx !== currentGX && ((enemyBody.velocity.x > 0 && pgx > currentGX) || (enemyBody.velocity.x < 0 && pgx < currentGX))) hitVertical = true;
        if (pgy !== currentGY && ((enemyBody.velocity.y > 0 && pgy > currentGY) || (enemyBody.velocity.y < 0 && pgy < currentGY))) hitHorizontal = true;
      }
    }

    if (hitVertical) {
      enemyBody.velocity.x = -enemyBody.velocity.x;
      enemy.x += enemyBody.velocity.x > 0 ? 1 : -1;
    }

    if (hitHorizontal) {
      enemyBody.velocity.y = -enemyBody.velocity.y;
      enemy.y += enemyBody.velocity.y > 0 ? 1 : -1;
    }

    let angle = 0;
    if (Math.abs(enemyBody.velocity.x) > Math.abs(enemyBody.velocity.y)) {
      angle = enemyBody.velocity.x > 0 ? 90 : -90;
    } else {
      angle = enemyBody.velocity.y > 0 ? 180 : 0;
    }
    enemy.setAngle(angle);
  }

  private setEnemyVelocity(enemy: Phaser.Physics.Arcade.Sprite, type: string) {
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const baseSpeed = this.zoneRevealConfig.enemiesSpeedArray?.[type] ?? 100;
    let vx = 0;
    let vy = 0;

    if (type === 'straightUp') {
      vy = Phaser.Math.RND.sign() * baseSpeed;
    } else if (type === 'straightleft') {
      vx = Phaser.Math.RND.sign() * baseSpeed;
    } else {
      const speed = baseSpeed / Math.sqrt(2);
      const directions = [
        { vx: speed, vy: speed },
        { vx: speed, vy: -speed },
        { vx: -speed, vy: speed },
        { vx: -speed, vy: -speed }
      ];
      const dir = Phaser.Math.RND.pick(directions);
      vx = dir.vx;
      vy = dir.vy;
    }
    enemyBody.setVelocity(vx, vy);
  }

 private setRandomUnfilledPosition(object: Phaser.Physics.Arcade.Sprite) {
  const unfilled: { x: number; y: number }[] = [];
  const margin = Math.floor(PLAYER_VISUAL_SIZE / TILE_SIZE);

  for (let y = margin; y < GRID_H - margin; y++) {
    for (let x = margin; x < GRID_W - margin; x++) {
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
    if (this.isLosingLife) return;
    this.isLosingLife = true;
    this.lives--;
    this.updateLivesIcons();

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

    // Clear trail and reset trail tiles to unfilled
    this.trail = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.fillMask[y][x] === 2) {
          this.fillMask[y][x] = 0;
        }
      }
    }
    this.renderTrail();
    this.player.setPosition(WIDTH / 2, HEIGHT - PLAYER_VISUAL_SIZE / 2);
    this.direction = null;

    // Reset enemies and powerups
    this.enemyGroup.children.entries.forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      if (enemy.getData('timer')) {
        enemy.getData('timer').remove();
      }
      this.setRandomUnfilledPosition(enemy);
      const type = enemy.getData('type');
      this.setEnemyVelocity(enemy, type);
      if (type === 'robot') {
        const timer = this.time.addEvent({
          delay: Phaser.Math.Between(3000, 6000),
          callback: () => this.setEnemyVelocity(enemy, type),
          loop: true
        });
        enemy.setData('timer', timer);
      }
    });

    this.powerupGroup.children.entries.forEach((puObj) => {
      const pu = puObj as Phaser.Physics.Arcade.Sprite;
      if (pu.getData('blinkTimer')) pu.getData('blinkTimer').remove();
      if (pu.getData('despawnTimer')) pu.getData('despawnTimer').remove();
      if (pu.getData('spawnTimer')) pu.getData('spawnTimer').remove();
      if (!pu.getData('destroyed')) {
        this.setRandomUnfilledPosition(pu);
      }
    });

    this.time.delayedCall(1000, () => {
      this.isLosingLife = false;
    }, [], this);

    if (this.lives <= 0) {
      this.scene.pause();
      // this.add.text(WIDTH / 2 - 60, HEIGHT / 2, 'GAME OVER', {
      //   font: '24px Arial',
      //   color: '#ff0000'
      // }).setDepth(3);
      // this.time.delayedCall(2500, () => {
      //   console.log('Game Over: Resetting to Level 1');
      //   this.currentLevel = 0;
      //   this.lives = 3;
      //   this.score = 0;
      //   this.totalTime = 0;
      //   this.updateLivesIcons();
      //   this.updateScore();
      //   this.totalTimeText.setText('Time: 0');
      //   this.loadLevel(this.currentLevel);
      //   this.scene.resume();
      // });
      window.dispatchEvent(new CustomEvent('gameOver', { detail: { score: this.score, totalTime: this.totalTime } }))
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
          this.enemyGroup.children.entries.forEach((enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const egx = Math.floor(enemy.x / TILE_SIZE);
            const egy = Math.floor(enemy.y / TILE_SIZE);
            if (region.points.some(p => p.x === egx && p.y === egy)) {
              this.score += 250;
              this.showPointsAnimation(enemy.x, enemy.y, 250);
              enemy.setActive(false).setVisible(false);
              (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
              enemy.setPosition(-100, -100);
            }
          });

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
              frequency: -1
            });
            fillEmitter.explode(2);
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

    if (percent >= (this.zoneRevealConfig.finishPercent ?? 10)) {
      console.log(`Level ${this.currentLevel + 1} completed! Score: ${this.score}, Remaining Time: ${this.remainingTime}`);
      this.score += 50 + Math.ceil(this.remainingTime) * 10;
      this.showPointsAnimation(WIDTH / 2, HEIGHT / 2, 50 + Math.ceil(this.remainingTime) * 10);
      this.updateScore();
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          this.fillMask[y][x] = 1;
        }
      }
      this.renderRevealMask();
      // Remove timers for robot enemies to prevent updates on destroyed objects
this.enemyGroup.children.entries.forEach((enemyObj) => {
  const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
  if (enemy.getData('timer')) {
    enemy.getData('timer').remove();
  }
});
this.enemyGroup.clear(true, true);

       const winText = this.add
        .text(WIDTH / 2, HEIGHT / 2, 'Clue Unlocked! 🎉🔍', {
          font: '24px Arial',
          color: '#00ff00',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 10, y: 5 },
          align: 'center'
        })
        .setOrigin(0.5)
        .setDepth(3);
      let countdown = 5;
      const countdownText = this.add
        .text(WIDTH / 2, HEIGHT / 2 + 40, `${countdown}`, {
          font: '24px Arial',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(3);
      console.log('Starting countdown timer for level transition');
      this.time.addEvent({
        delay: 1000,
        repeat: 4,
        callback: () => {
          countdown--;
          console.log(`Countdown: ${countdown}`);
          if (countdown > 0) {
            countdownText.setText(`${countdown}`);
          } else {
            countdownText.destroy();
            winText.destroy();
            this.scene.resume();
            if (this.currentLevel + 1 < this.zoneRevealConfig.levelsConfig.length) {
              this.currentLevel++;
              console.log(`Transitioning to level ${this.currentLevel + 1}`);
              this.loadLevel(this.currentLevel);
            } else {
              console.log('All levels completed, restarting game');
              this.scene.restart();
            }
          }
        }
      });
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
    const borderWidth = 2;
    const borderRadius = 12;
    const cyanColor = 0x00e8e0;
    const glowAlpha = 0.3;

    this.borderGraphics.fillStyle(0x000000, 1);
    this.borderGraphics.fillRect(0, 0, WIDTH, margin);
    this.borderGraphics.fillRect(0, HEIGHT - margin, WIDTH, margin);
    this.borderGraphics.fillRect(0, 0, margin, HEIGHT);
    this.borderGraphics.fillRect(WIDTH - margin, 0, margin, HEIGHT);

    const innerX = margin + borderWidth;
    const innerY = margin + borderWidth;
    const innerWidth = WIDTH - 2 * (margin + borderWidth);
    const innerHeight = HEIGHT - 2 * (margin + borderWidth);

    this.borderGraphics.lineStyle(borderWidth * 3, cyanColor, glowAlpha);
    this.borderGraphics.strokeRoundedRect(innerX - 1, innerY - 1, innerWidth + 2, innerHeight + 2, borderRadius + 2);
    this.borderGraphics.lineStyle(borderWidth * 2, cyanColor, glowAlpha * 0.6);
    this.borderGraphics.strokeRoundedRect(innerX - 0.5, innerY - 0.5, innerWidth + 1, innerHeight + 1, borderRadius + 1);

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

  return new VolfiedScene();
}

import Phaser from 'phaser';

export const TILE_SIZE = 10;
export const WIDTH = 400;
export const HEIGHT = 480;
const GRID_W = WIDTH / TILE_SIZE;
const GRID_H = HEIGHT / TILE_SIZE;

export default class VolfiedScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
private direction: 'up' | 'down' | 'left' | 'right' | null = null;
  private trail: { x: number; y: number }[] = [];
  private fillMask: number[][] = [];
  private fillGraphics!: Phaser.GameObjects.Graphics;
  private filledTiles = 0;
  private filledText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload() {
  this.load.image('bg', '/assets/bg.png'); // ⬅️ טען את הרקע
  this.load.image('hidden', '/assets/reveal.png');

}
  create() {

     // 🖼️ הוסף את תמונת הרקע לפני הכול
  this.add.image(WIDTH / 2, HEIGHT / 2, 'bg').setDisplaySize(WIDTH, HEIGHT).setDepth(-1);

  this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
  
  this.cursors = this.input.keyboard!.createCursorKeys();
  this.input.keyboard?.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN']);

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard?.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN']);




    this.player = this.add.rectangle(WIDTH / 2, HEIGHT - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x00ff00);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.player.setDepth(1);

    this.fillMask = Array(GRID_H).fill(0).map(() => Array(GRID_W).fill(0));
window.addEventListener('setDirection', (e: Event) => {
  const custom = e as CustomEvent<'up' | 'down' | 'left' | 'right'>;
  this.setDirection(custom.detail);
});
window.addEventListener('togglePause', () => {
  if (this.scene.isPaused()) {
    this.scene.resume();
  } else {
    this.scene.pause();
  }
});

window.addEventListener('restartGame', () => {
  this.scene.restart();
});
    for (let x = 0; x < GRID_W; x++) {
      this.fillMask[0][x] = 1;
      this.fillMask[GRID_H - 1][x] = 1;
    }
    for (let y = 0; y < GRID_H; y++) {
      this.fillMask[y][0] = 1;
      this.fillMask[y][GRID_W - 1] = 1;
    }

    this.fillGraphics = this.add.graphics().setDepth(0);

    this.filledText = this.add.text(10, 10, 'Filled: 0%', {
      font: '14px Arial',
      color: '#ffffff'
    });

    // 💡 תמיכה בהחלקת אצבע לטלפון
    let swipeStart: Phaser.Math.Vector2 | null = null;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      swipeStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!swipeStart) return;
      const end = new Phaser.Math.Vector2(pointer.x, pointer.y);
      const diff = end.subtract(swipeStart);
      const absX = Math.abs(diff.x);
      const absY = Math.abs(diff.y);

      if (absX > absY) {
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

  update() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 100;

    body.setVelocity(0);

    if (this.cursors.left?.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown) body.setVelocityY(speed);

    // אם אין מקש לחוץ – נשתמש בכיוון מהסוויפ
    if (
      !this.cursors.left?.isDown &&
      !this.cursors.right?.isDown &&
      !this.cursors.up?.isDown &&
      !this.cursors.down?.isDown
    ) {
      switch (this.direction) {
        case 'left': body.setVelocityX(-speed); break;
        case 'right': body.setVelocityX(speed); break;
        case 'up': body.setVelocityY(-speed); break;
        case 'down': body.setVelocityY(speed); break;
      }
    }

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

    this.renderFillMask();
  }

  private floodFillAndUpdate() {
    const temp = this.fillMask.map(row => [...row]);
    const regions: { size: number; points: { x: number; y: number }[]; id: number }[] = [];

    const floodFill = (x: number, y: number, mark: number) => {
      const queue = [{ x, y }];
      const points: { x: number; y: number }[] = [];
      let touchesTrail = false;

      while (queue.length) {
        const { x, y } = queue.pop()!;
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
        if (temp[y][x] !== 0) continue;

        if (this.fillMask[y][x] === 2) touchesTrail = true;

        temp[y][x] = mark;
        points.push({ x, y });

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
      }

      return { points, touchesTrail };
    };

    let regionId = 10;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (temp[y][x] === 0) {
          const region = floodFill(x, y, regionId);
          if (!region.touchesTrail) {
            regions.push({ size: region.points.length, points: region.points, id: regionId });
          }
          regionId++;
        }
      }
    }

    if (regions.length === 0) return;

    const smallest = regions.reduce((a, b) => (a.size < b.size ? a : b));

    for (const { x, y } of smallest.points) {
      this.fillMask[y][x] = 1;
    }

    // גם השובל הופך לשטח מלא!
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.fillMask[y][x] === 2) {
          this.fillMask[y][x] = 1;
        }
      }
    }

    this.filledTiles = this.fillMask.flat().filter((v) => v === 1).length;
    const percent = Math.floor((this.filledTiles / (GRID_W * GRID_H)) * 100);
    this.filledText.setText(`Filled: ${percent}%`);

   
    if (percent >= 75) {
  this.add.text(WIDTH / 2 - 60, HEIGHT / 2, 'YOU WIN!', {
    font: '24px Arial',
    color: '#00ff00'
  }).setDepth(2);

  this.scene.pause();

  // 🔄 התחלה מחדש אחרי 2.5 שניות
  this.time.delayedCall(2500, () => {
    this.scene.restart();
  });
}

  }

  private renderFillMask() {
    this.fillGraphics.clear();
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const value = this.fillMask[y][x];
        if (value === 1) {
          this.fillGraphics.fillStyle(0x4444ff, 1);
          this.fillGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (value === 2) {
          this.fillGraphics.fillStyle(0xff4444, 1);
          this.fillGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
}

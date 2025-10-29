import type { PacmanConfig, PacmanLevelConfig } from '@top-x/shared/types/pacman'

type PhaserNamespace = typeof import('phaser')
type PhaserSceneType = import('phaser').Types.Scenes.SceneType
type PhaserVector2 = import('phaser').Math.Vector2

export const TILE_SIZE = 16
export const GRID_WIDTH = 15
export const GRID_HEIGHT = 15
export const WIDTH = GRID_WIDTH * TILE_SIZE
export const HEIGHT = GRID_HEIGHT * TILE_SIZE

interface LayoutDefinition {
  id: string
  tiles: string[]
}

interface PacmanStatePayload {
  score: number
  lives: number
  level: number
  pelletsRemaining: number
}

const DEFAULT_LAYOUTS: LayoutDefinition[] = [
  {
    id: 'demo-1',
    tiles: [
      '###############',
      '#P..........G.#',
      '#.###.###.###.#',
      '#o#.......#o#.#',
      '#.###.#.#.###.#',
      '#.....#.#.....#',
      '###.###.###.###',
      '#.............#',
      '###.###.###.###',
      '#o#.#.....#.#o#',
      '#.###.###.###.#',
      '#.....#.#.....#',
      '###.###.###.###',
      '#.............#',
      '###############'
    ]
  },
  {
    id: 'demo-2',
    tiles: [
      '###############',
      '#....###....#.#',
      '#.##.#.#.##.#.#',
      '#o#..#.#..#o#.#',
      '#.##.#.#.##.#.#',
      '#....#.#....#.#',
      '####.#.#.####.#',
      '#.............#',
      '#.####.####.#.#',
      '#.#o.....o#.#.#',
      '#.#.#####.#.#.#',
      '#G#...P...#.#.#',
      '#.#.#####.#.#.#',
      '#.............#',
      '###############'
    ]
  }
]

const DEFAULT_PACMAN_CONFIG: PacmanConfig = {
  version: 1,
  startingLives: 3,
  bonusLifeThresholds: [10000],
  allowWraparound: true,
  defaultScoring: {
    dotValue: 10,
    energizerValue: 50,
    ghostComboBase: 200,
    ghostComboIncrement: 200,
    fruitValues: [100, 300, 500],
    frightenedDurationMs: 6000
  },
  enemies: [
    {
      id: 'blinky',
      name: 'Blinky',
      behavior: 'chaser',
      color: '#ff4b4b',
      speedMultiplier: 1
    },
    {
      id: 'pinky',
      name: 'Pinky',
      behavior: 'ambusher',
      color: '#ff99ff',
      speedMultiplier: 0.95
    }
  ],
  powerUps: [
    { id: 'energizer', type: 'energizer', durationMs: 6000, pointsAwarded: 50 }
  ],
  levels: [
    {
      metadata: {
        id: 'demo-1',
        name: 'Neon Beginner Maze',
        layoutId: 'demo-1',
        difficulty: 'easy',
        description: 'Collect pellets while the training ghosts patrol simple loops.'
      },
      dotCount: 160,
      energizerCount: 4,
      scatterChaseIntervals: [
        { scatterMs: 7000, chaseMs: 20000 },
        { scatterMs: 7000, chaseMs: 20000 }
      ]
    },
    {
      metadata: {
        id: 'demo-2',
        name: 'Cobalt Crossroads',
        layoutId: 'demo-2',
        difficulty: 'medium',
        description: 'Tighter tunnels introduce wraparound strategy moments.'
      },
      dotCount: 170,
      energizerCount: 4,
      scatterChaseIntervals: [
        { scatterMs: 5000, chaseMs: 25000 },
        { scatterMs: 5000, chaseMs: 25000 }
      ]
    }
  ],
  speedSettings: {
    pacmanSpeed: 120,
    ghostSpeed: 110,
    frightenedSpeed: 80
  },
  theme: 'retro'
}

export default function createPacmanScene(
  Phaser: PhaserNamespace,
  config?: PacmanConfig
): PhaserSceneType {
  const clamp = Phaser.Math.Clamp

  class PacmanScene extends Phaser.Scene {
    private pacmanConfig: PacmanConfig
    private levelIndex = 0
    private score = 0
    private lives = 0
    private pelletsRemaining = 0
    private ghosts!: Phaser.Physics.Arcade.Group
    private pellets!: Phaser.Physics.Arcade.Group
    private energizers!: Phaser.Physics.Arcade.Group
    private walls!: Phaser.Physics.Arcade.StaticGroup
    private player!: Phaser.Physics.Arcade.Sprite
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private direction: 'up' | 'down' | 'left' | 'right' | null = null
    private queuedDirection: 'up' | 'down' | 'left' | 'right' | null = null
    private playerSpawnPoint: PhaserVector2 = new Phaser.Math.Vector2(WIDTH / 2, HEIGHT - TILE_SIZE)
    private scatterTimer = 0
    private chaseTimer = 0
    private isScatter = true
    private scatterIntervals: { scatterMs: number; chaseMs: number }[] = []
    private scatterIndex = 0
    private totalTime = 0
    private scoreText!: Phaser.GameObjects.Text
    private livesText!: Phaser.GameObjects.Text
    private levelText!: Phaser.GameObjects.Text
    private stateEventDispatchCooldown = 0
    private isPaused = false

    private handleSetDirection = (event: Event) => {
      const detail = (event as CustomEvent<'up' | 'down' | 'left' | 'right'>).detail
      if (detail) {
        this.setDirection(detail)
      }
    }

    private handleTogglePause = () => {
      this.isPaused = !this.isPaused
      this.physics.world.isPaused = this.isPaused
    }

    private handleRestart = () => {
      this.scene.restart()
    }

    constructor() {
      super('PacmanScene')
      this.pacmanConfig = config || DEFAULT_PACMAN_CONFIG
    }

    private unregisterInputEvents() {
      window.removeEventListener('setDirection', this.handleSetDirection)
      window.removeEventListener('togglePause', this.handleTogglePause)
      window.removeEventListener('restartGame', this.handleRestart)
    }

    preload() {
      const graphics = this.add.graphics({ x: 0, y: 0 })
      graphics.setVisible(false)

      const generateCircle = (key: string, radius: number, color: number) => {
        graphics.clear()
        graphics.fillStyle(color, 1)
        graphics.fillCircle(radius, radius, radius)
        graphics.generateTexture(key, radius * 2, radius * 2)
      }

      graphics.clear()
      graphics.fillStyle(0x1f1f1f, 1)
      graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
      graphics.generateTexture('wall-tile', TILE_SIZE, TILE_SIZE)

      generateCircle('pacman', TILE_SIZE / 2, 0xffd84c)
      generateCircle('pellet', 4, 0xfff2b3)
      generateCircle('energizer', 6, 0xff9d76)

      for (const enemy of this.pacmanConfig.enemies) {
        const hex = Phaser.Display.Color.HexStringToColor(enemy.color ?? '#5ee0ff').color
        generateCircle(`ghost-${enemy.id}`, TILE_SIZE / 2, hex)
      }

      graphics.destroy()
    }

    create() {
      window.dispatchEvent(new Event('gameStart'))

      this.cursors = this.input.keyboard!.createCursorKeys()
      this.input.keyboard!.addCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT
      ])

      window.addEventListener('setDirection', this.handleSetDirection)
      window.addEventListener('togglePause', this.handleTogglePause)
      window.addEventListener('restartGame', this.handleRestart)

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unregisterInputEvents())
      this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unregisterInputEvents())

      this.walls = this.physics.add.staticGroup()
      this.pellets = this.physics.add.group({ allowGravity: false, immovable: true })
      this.energizers = this.physics.add.group({ allowGravity: false, immovable: true })
      this.ghosts = this.physics.add.group({ allowGravity: false })

      this.player = this.physics.add.sprite(0, 0, 'pacman')
      this.player.setCollideWorldBounds(true)
      ;(this.player.body as Phaser.Physics.Arcade.Body).setCircle(TILE_SIZE / 2)

      this.scoreText = this.add.text(8, 4, 'SCORE: 0', {
        font: '16px monospace',
        color: '#ffffff'
      })
      this.livesText = this.add.text(WIDTH - 8, 4, 'LIVES: 0', {
        font: '16px monospace',
        color: '#ffffff'
      }).setOrigin(1, 0)
      this.levelText = this.add.text(WIDTH / 2, 4, 'LEVEL 1', {
        font: '16px monospace',
        color: '#7fd1ff'
      }).setOrigin(0.5, 0)

      this.physics.world.setBounds(0, 0, WIDTH, HEIGHT)

      this.loadLevel(0)
    }

    update(_: number, delta: number) {
      if (this.isPaused) return

      const deltaSeconds = delta / 1000
      this.totalTime += deltaSeconds
      this.stateEventDispatchCooldown -= deltaSeconds

      this.handleKeyboardInput()
      this.updatePlayerMovement()
      this.updateGhosts(deltaSeconds)

      if (this.stateEventDispatchCooldown <= 0) {
        this.dispatchState()
        this.stateEventDispatchCooldown = 0.25
      }
    }

    private resolveLevel(index: number): PacmanLevelConfig {
      const fallbackLevel =
        this.pacmanConfig.levels[0] ?? DEFAULT_PACMAN_CONFIG.levels[0]

      if (!fallbackLevel) {
        throw new Error('Pacman configuration is missing level definitions')
      }

      const level = this.pacmanConfig.levels[index]
      if (!level || !level.metadata || !level.metadata.layoutId) {
        return fallbackLevel
      }

      return level
    }

    private loadLevel(index: number) {
      this.levelIndex = index
      this.direction = null
      this.queuedDirection = null
      this.isPaused = false
      this.physics.world.isPaused = false

      this.clearGroups()

      if (index === 0) {
        this.score = 0
        this.lives = this.pacmanConfig.startingLives
        this.totalTime = 0
      }

      const levelConfig = this.resolveLevel(index)
      const layoutId = levelConfig?.metadata?.layoutId ?? DEFAULT_LAYOUTS[0].id
      const layout = this.getLayout(layoutId)

      this.levelText.setText(`LEVEL ${index + 1}`)

      this.createLevelGeometry(layout)

      this.scoreText.setText(`SCORE: ${this.score}`)
      this.livesText.setText(`LIVES: ${this.lives}`)

      this.scatterTimer = 0
      this.chaseTimer = 0
      this.scatterIndex = 0
      this.isScatter = true
      this.scatterIntervals = levelConfig.scatterChaseIntervals ?? []

      this.dispatchState()
    }

    private clearGroups() {
      this.walls.clear(true, true)
      this.pellets.clear(true, true)
      this.energizers.clear(true, true)
      this.ghosts.clear(true, true)
    }

    private getLayout(id: string) {
      const layout = DEFAULT_LAYOUTS.find((entry) => entry.id === id)
      return layout?.tiles ?? DEFAULT_LAYOUTS[0].tiles
    }

    private createLevelGeometry(layout: string[]) {
      let playerSpawn: PhaserVector2 | null = null
      const ghostSpawns: PhaserVector2[] = []
      let pelletCount = 0
      let energizerCount = 0

      layout.forEach((row, rowIndex) => {
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          const tile = row[colIndex]
          const x = colIndex * TILE_SIZE + TILE_SIZE / 2
          const y = rowIndex * TILE_SIZE + TILE_SIZE / 2

          if (tile === '#') {
            const wall = this.walls.create(x, y, 'wall-tile') as Phaser.Physics.Arcade.Sprite
            wall.setOrigin(0.5)
            wall.refreshBody()
          } else if (tile === 'o') {
            this.spawnEnergizer(x, y)
            energizerCount += 1
          } else {
            pelletCount += 1
            this.spawnPellet(x, y)

            if (tile === 'P') {
              playerSpawn = new Phaser.Math.Vector2(x, y)
            } else if (tile === 'G') {
              ghostSpawns.push(new Phaser.Math.Vector2(x, y))
            }
          }
        }
      })

      this.pelletsRemaining = pelletCount + energizerCount

      if (playerSpawn) {
        this.playerSpawnPoint = playerSpawn.clone()
        this.player.setPosition(playerSpawn.x, playerSpawn.y)
        this.player.setVelocity(0, 0)
      }

      const enemyEntries = this.pacmanConfig.enemies
      ghostSpawns.forEach((spawn, idx) => {
        const enemy = enemyEntries[idx % enemyEntries.length]
        const ghost = this.physics.add.sprite(spawn.x, spawn.y, `ghost-${enemy.id}`)
        ghost.setData('speedMultiplier', enemy.speedMultiplier ?? 1)
        ghost.setData('state', 'scatter')
        ghost.setData('direction', 'left')
        ghost.setCollideWorldBounds(true)
        this.ghosts.add(ghost)
      })

      this.physics.add.collider(this.player, this.walls)
      this.physics.add.collider(this.ghosts, this.walls)

      this.physics.add.overlap(this.player, this.pellets, (_player, pellet) => {
        pellet.destroy()
        this.handlePelletConsumed(false)
      })

      this.physics.add.overlap(this.player, this.energizers, (_player, pellet) => {
        pellet.destroy()
        this.handlePelletConsumed(true)
      })

      this.physics.add.overlap(this.player, this.ghosts, (_player, ghost) => {
        this.handleGhostCollision(ghost as Phaser.Physics.Arcade.Sprite)
      })
    }

    private spawnPellet(x: number, y: number) {
      const pellet = this.physics.add.sprite(x, y, 'pellet')
      pellet.setOrigin(0.5)
      ;(pellet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
      pellet.setImmovable(true)
      this.pellets.add(pellet)
    }

    private spawnEnergizer(x: number, y: number) {
      const pellet = this.physics.add.sprite(x, y, 'energizer')
      pellet.setOrigin(0.5)
      ;(pellet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
      pellet.setImmovable(true)
      this.energizers.add(pellet)
    }

    private handlePelletConsumed(isEnergizer: boolean) {
      const scoring = this.pacmanConfig.defaultScoring
      this.score += isEnergizer ? scoring.energizerValue : scoring.dotValue
      this.scoreText.setText(`SCORE: ${this.score}`)
      this.pelletsRemaining -= 1
      this.dispatchState()

      if (this.pelletsRemaining <= 0) {
        this.advanceLevel()
      }
    }

    private advanceLevel() {
      const nextLevel = this.levelIndex + 1
      if (nextLevel >= this.pacmanConfig.levels.length) {
        this.triggerGameOver(true)
      } else {
        this.loadLevel(nextLevel)
      }
    }

    private handleGhostCollision(ghost: Phaser.Physics.Arcade.Sprite) {
      // Placeholder frightened mode detection
      const frightened = ghost.getData('state') === 'frightened'

      if (frightened) {
        ghost.setPosition(WIDTH / 2, HEIGHT / 2)
        ghost.setData('state', 'returning')
        this.score += this.pacmanConfig.defaultScoring.ghostComboBase
        this.scoreText.setText(`SCORE: ${this.score}`)
      } else {
        this.loseLife()
      }
    }

    private loseLife() {
      this.lives -= 1
      this.livesText.setText(`LIVES: ${clamp(this.lives, 0, 99)}`)
      this.dispatchState()

      if (this.lives <= 0) {
        this.triggerGameOver(false)
        return
      }

      this.player.setPosition(this.playerSpawnPoint.x, this.playerSpawnPoint.y)
      this.player.setVelocity(0, 0)
      this.direction = null
      this.queuedDirection = null
    }

    private triggerGameOver(victory: boolean) {
      this.unregisterInputEvents()
      this.isPaused = true
      this.physics.world.isPaused = true
      this.player.setVelocity(0, 0)

      this.time.delayedCall(100, () => {
        window.dispatchEvent(
          new CustomEvent('gameOver', {
            detail: {
              score: this.score + (victory ? 500 : 0),
              totalTime: this.totalTime,
              meta: {
                victory,
                levelReached: this.levelIndex + 1
              }
            }
          })
        )
      })
    }

    private updatePlayerMovement() {
      if (!this.player.active) return

      const speed = this.pacmanConfig.speedSettings?.pacmanSpeed ?? 110

      if (this.queuedDirection && this.canMove(this.queuedDirection)) {
        this.direction = this.queuedDirection
        this.queuedDirection = null
      }

      if (this.direction && !this.canMove(this.direction)) {
        this.direction = null
        this.player.setVelocity(0)
        return
      }

      switch (this.direction) {
        case 'up':
          this.player.setVelocity(0, -speed)
          break
        case 'down':
          this.player.setVelocity(0, speed)
          break
        case 'left':
          this.player.setVelocity(-speed, 0)
          break
        case 'right':
          this.player.setVelocity(speed, 0)
          break
        default:
          this.player.setVelocity(0, 0)
          break
      }

      if (this.pacmanConfig.allowWraparound) {
        if (this.player.x < -TILE_SIZE / 2) {
          this.player.x = WIDTH + TILE_SIZE / 2
        } else if (this.player.x > WIDTH + TILE_SIZE / 2) {
          this.player.x = -TILE_SIZE / 2
        }
      }
    }

    private updateGhosts(deltaSeconds: number) {
      const speedBase = this.pacmanConfig.speedSettings?.ghostSpeed ?? 100

      const interval = this.scatterIntervals[this.scatterIndex]
      if (interval) {
        if (this.isScatter) {
          this.scatterTimer += deltaSeconds * 1000
          if (this.scatterTimer >= interval.scatterMs) {
            this.scatterTimer = 0
            this.isScatter = false
            this.ghosts.children.each((ghostObj) => {
              const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
              ghost.setData('state', 'chase')
              return true
            })
          }
        } else {
          this.chaseTimer += deltaSeconds * 1000
          if (this.chaseTimer >= interval.chaseMs) {
            this.chaseTimer = 0
            this.isScatter = true
            this.scatterIndex = Math.min(this.scatterIndex + 1, this.scatterIntervals.length - 1)
            this.ghosts.children.each((ghostObj) => {
              const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
              ghost.setData('state', 'scatter')
              return true
            })
          }
        }
      }

      this.ghosts.children.iterate((ghostObj) => {
        const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
        const multiplier = ghost.getData('speedMultiplier') ?? 1
        const direction = ghost.getData('direction') as 'up' | 'down' | 'left' | 'right'

        if (!direction || !this.canMoveForSprite(ghost, direction)) {
          const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right']
          ghost.setData('direction', Phaser.Utils.Array.GetRandom(dirs))
          return true
        }

        const state = ghost.getData('state') as string
        const actualSpeed = state === 'frightened'
          ? this.pacmanConfig.speedSettings?.frightenedSpeed ?? 80
          : speedBase * multiplier

        switch (direction) {
          case 'up':
            ghost.setVelocity(0, -actualSpeed)
            break
          case 'down':
            ghost.setVelocity(0, actualSpeed)
            break
          case 'left':
            ghost.setVelocity(-actualSpeed, 0)
            break
          case 'right':
            ghost.setVelocity(actualSpeed, 0)
            break
        }

        return true
      })
    }

    private canMove(direction: 'up' | 'down' | 'left' | 'right') {
      const x = this.player.x
      const y = this.player.y
      return this.canMoveFromPosition(x, y, direction)
    }

    private canMoveForSprite(sprite: Phaser.Physics.Arcade.Sprite, direction: 'up' | 'down' | 'left' | 'right') {
      return this.canMoveFromPosition(sprite.x, sprite.y, direction)
    }

    private canMoveFromPosition(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right') {
      const offset = TILE_SIZE / 2
      let targetX = x
      let targetY = y

      switch (direction) {
        case 'up':
          targetY -= offset
          break
        case 'down':
          targetY += offset
          break
        case 'left':
          targetX -= offset
          break
        case 'right':
          targetX += offset
          break
      }

      const bodies = this.walls.getChildren() as Phaser.Physics.Arcade.Sprite[]
      return !bodies.some((wall) => {
        const dx = Math.abs(wall.x - targetX)
        const dy = Math.abs(wall.y - targetY)
        return dx < TILE_SIZE / 1.5 && dy < TILE_SIZE / 1.5
      })
    }

    private handleKeyboardInput() {
      if (this.cursors.left?.isDown) this.setDirection('left')
      else if (this.cursors.right?.isDown) this.setDirection('right')
      else if (this.cursors.up?.isDown) this.setDirection('up')
      else if (this.cursors.down?.isDown) this.setDirection('down')
    }

    private setDirection(dir: 'up' | 'down' | 'left' | 'right') {
      if (this.canMove(dir)) {
        this.direction = dir
        this.queuedDirection = null
      } else {
        this.queuedDirection = dir
      }
    }

    private dispatchState() {
      const payload: PacmanStatePayload = {
        score: this.score,
        lives: Math.max(this.lives, 0),
        level: this.levelIndex + 1,
        pelletsRemaining: Math.max(this.pelletsRemaining, 0)
      }

      window.dispatchEvent(new CustomEvent<PacmanStatePayload>('pacmanState', { detail: payload }))
    }

  }

  return PacmanScene as PhaserSceneType
}

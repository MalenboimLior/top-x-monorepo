import type { PacmanConfig, PacmanLevelConfig, PacmanEnemyEntry } from '@top-x/shared/types/pacman'

type PhaserNamespace = typeof import('phaser')
type PhaserSceneType = import('phaser').Types.Scenes.SceneType
type PhaserVector2 = import('phaser').Math.Vector2

export const TILE_SIZE = 16
export const GRID_WIDTH = 15
export const GRID_HEIGHT = 15
export const WIDTH = GRID_WIDTH * TILE_SIZE
export const HEIGHT = GRID_HEIGHT * TILE_SIZE

type Direction = 'up' | 'down' | 'left' | 'right'

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

const DEFAULT_SCATTER_TARGETS = [
  { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 },
  { x: WIDTH - TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 },
  { x: TILE_SIZE * 1.5, y: HEIGHT - TILE_SIZE * 1.5 },
  { x: WIDTH - TILE_SIZE * 1.5, y: HEIGHT - TILE_SIZE * 1.5 }
]

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
    private frightenedTimer = 0
    private frightenedDurationMs = DEFAULT_PACMAN_CONFIG.defaultScoring.frightenedDurationMs
    private navigableTiles: PhaserVector2[] = []
    private layoutGrid: string[][] = []

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

      const generateGhostTexture = (key: string, color: number) => {
        const radius = TILE_SIZE / 2
        graphics.clear()
        graphics.fillStyle(color, 1)
        graphics.fillCircle(radius, radius, radius)
        graphics.fillRect(0, radius, TILE_SIZE, TILE_SIZE - radius)

        const eyeRadius = TILE_SIZE * 0.14
        const pupilRadius = eyeRadius * 0.6
        const eyeOffsetX = TILE_SIZE * 0.18
        const eyeOffsetY = TILE_SIZE * 0.12

        graphics.fillStyle(0xffffff, 1)
        graphics.fillCircle(radius - eyeOffsetX, radius - eyeOffsetY, eyeRadius)
        graphics.fillCircle(radius + eyeOffsetX, radius - eyeOffsetY, eyeRadius)

        graphics.fillStyle(0x1e4dd8, 1)
        graphics.fillCircle(radius - eyeOffsetX, radius - eyeOffsetY, pupilRadius)
        graphics.fillCircle(radius + eyeOffsetX, radius - eyeOffsetY, pupilRadius)

        graphics.generateTexture(key, TILE_SIZE, TILE_SIZE)
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
        generateGhostTexture(`ghost-${enemy.id}`, hex)
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

      this.createLevelGeometry(layout, levelConfig)

      this.scoreText.setText(`SCORE: ${this.score}`)
      this.livesText.setText(`LIVES: ${this.lives}`)

      this.scatterTimer = 0
      this.chaseTimer = 0
      this.scatterIndex = 0
      this.isScatter = true
      this.scatterIntervals = levelConfig.scatterChaseIntervals ?? []
      this.frightenedDurationMs =
        levelConfig.frightenedModeDurationMs ?? this.pacmanConfig.defaultScoring.frightenedDurationMs
      this.frightenedTimer = 0

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

    private createLevelGeometry(layout: string[], levelConfig: PacmanLevelConfig) {
      let playerSpawn: PhaserVector2 | null = null
      const ghostSpawns: PhaserVector2[] = []
      let pelletCount = 0
      let energizerCount = 0
      this.navigableTiles = []

      this.layoutGrid = layout.map((row) => row.split(''))

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
            this.navigableTiles.push(new Phaser.Math.Vector2(x, y))
          } else {
            pelletCount += 1
            this.spawnPellet(x, y)
            this.navigableTiles.push(new Phaser.Math.Vector2(x, y))

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
        this.playerSpawnPoint = new Phaser.Math.Vector2(playerSpawn.x, playerSpawn.y)
        this.player.setPosition(playerSpawn.x, playerSpawn.y)
        this.player.setVelocity(0, 0)
      }

      const enemyEntries = (levelConfig.enemyOverrides?.length
        ? levelConfig.enemyOverrides
        : this.pacmanConfig.enemies) ?? []
      const fallbackEnemies = DEFAULT_PACMAN_CONFIG.enemies
      const activeEnemies = enemyEntries.length > 0 ? enemyEntries : fallbackEnemies

      if (activeEnemies.length === 0) {
        console.warn('PacmanScene: no enemies configured; skipping ghost spawn')
      }

      ghostSpawns.forEach((spawn, idx) => {
        if (activeEnemies.length === 0) {
          return
        }

        const enemy = activeEnemies[idx % activeEnemies.length]
        const ghost = this.physics.add.sprite(spawn.x, spawn.y, `ghost-${enemy.id}`)
        ghost.setData('config', enemy)
        ghost.setData('speedMultiplier', enemy.speedMultiplier ?? 1)
        ghost.setData('state', this.isScatter ? 'scatter' : 'chase')
        ghost.setData('direction', 'left')
        ghost.setData('spawnPoint', spawn.clone())
        ghost.setData('scatterTarget', this.getScatterTarget(idx, enemy))
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

    private getScatterTarget(index: number, enemy: PacmanEnemyEntry) {
      if (enemy.scatterTargetTile) {
        return new Phaser.Math.Vector2(
          (enemy.scatterTargetTile.x + 0.5) * TILE_SIZE,
          (enemy.scatterTargetTile.y + 0.5) * TILE_SIZE
        )
      }

      const fallback = DEFAULT_SCATTER_TARGETS[index % DEFAULT_SCATTER_TARGETS.length]
      return new Phaser.Math.Vector2(fallback.x, fallback.y)
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
      if (isEnergizer) {
        this.enterFrightenedMode()
      }
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
      const state = ghost.getData('state') as string
      if (state === 'returning') {
        return
      }

      const frightened = state === 'frightened'

      if (frightened) {
        const spawnPoint = (ghost.getData('spawnPoint') as PhaserVector2 | undefined) ?? this.playerSpawnPoint
        ghost.setPosition(spawnPoint.x, spawnPoint.y)
        ghost.setVelocity(0, 0)
        ghost.clearTint()
        ghost.setAlpha(1)
        const postFrightenedState = this.isScatter ? 'scatter' : 'chase'
        ghost.setData('state', postFrightenedState)
        this.score += this.pacmanConfig.defaultScoring.ghostComboBase
        this.scoreText.setText(`SCORE: ${this.score}`)
        return
      }

      this.loseLife()
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
      const previousDirection = this.direction

      if (this.queuedDirection && this.canMove(this.queuedDirection)) {
        this.direction = this.queuedDirection
        this.queuedDirection = null
        if (this.direction && this.direction !== previousDirection) {
          this.snapPlayerToGrid(this.direction)
        }
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

      this.updateScatterChaseTimers(deltaSeconds)
      this.updateFrightenedState(deltaSeconds)

      this.ghosts.children.iterate((ghostObj) => {
        const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
        if (!ghost.active) return true

        const state = ghost.getData('state') as string
        const ghostConfig = ghost.getData('config') as PacmanEnemyEntry | undefined
        const multiplier = ghost.getData('speedMultiplier') ?? 1

        if (state === 'returning') {
          const spawnPoint = ghost.getData('spawnPoint') as PhaserVector2 | undefined
          if (spawnPoint) {
            const distance = Phaser.Math.Distance.Between(ghost.x, ghost.y, spawnPoint.x, spawnPoint.y)
            if (distance < TILE_SIZE / 3) {
              ghost.setData('state', this.isScatter ? 'scatter' : 'chase')
              ghost.clearTint()
            }
          }
        }

        const currentDirection = ghost.getData('direction') as Direction | null
        if (!currentDirection || !this.canMoveForSprite(ghost, currentDirection)) {
          ghost.setData('direction', null)
        }

        if (this.isAtTileCenter(ghost) || !ghost.getData('direction')) {
          this.chooseGhostDirection(ghost)
        }

        const direction = ghost.getData('direction') as Direction | null
        if (!direction) {
          ghost.setVelocity(0, 0)
          return true
        }

        if (!this.canMoveForSprite(ghost, direction)) {
          ghost.setVelocity(0, 0)
          return true
        }

        let actualSpeed = speedBase * multiplier
        if (state === 'frightened') {
          const frightenedBase = this.pacmanConfig.speedSettings?.frightenedSpeed ?? 80
          const frightenedMultiplier = ghostConfig?.frightenedSpeedMultiplier ?? 1
          actualSpeed = frightenedBase * frightenedMultiplier
        } else if (state === 'returning') {
          actualSpeed = speedBase * 1.25
        }

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

        if (this.pacmanConfig.allowWraparound) {
          if (ghost.x < -TILE_SIZE / 2) {
            ghost.x = WIDTH + TILE_SIZE / 2
          } else if (ghost.x > WIDTH + TILE_SIZE / 2) {
            ghost.x = -TILE_SIZE / 2
          }
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
      if (this.layoutGrid.length === 0) {
        return true
      }

      const width = this.layoutGrid[0]?.length ?? GRID_WIDTH
      const height = this.layoutGrid.length

      const currentCol = Phaser.Math.Wrap(Math.round((x - TILE_SIZE / 2) / TILE_SIZE), 0, width)
      const currentRow = clamp(Math.round((y - TILE_SIZE / 2) / TILE_SIZE), 0, height - 1)

      let targetCol = currentCol
      let targetRow = currentRow

      switch (direction) {
        case 'up':
          targetRow -= 1
          break
        case 'down':
          targetRow += 1
          break
        case 'left':
          targetCol -= 1
          break
        case 'right':
          targetCol += 1
          break
      }

      if (targetCol < 0 || targetCol >= width) {
        if (!this.pacmanConfig.allowWraparound) {
          return false
        }
        targetCol = Phaser.Math.Wrap(targetCol, 0, width)
      }

      if (targetRow < 0 || targetRow >= height) {
        return false
      }

      const targetTile = this.layoutGrid[targetRow]?.[targetCol]
      return targetTile !== '#'
    }

    private updateScatterChaseTimers(deltaSeconds: number) {
      const interval = this.scatterIntervals[this.scatterIndex]
      if (!interval) return

      if (this.isScatter) {
        this.scatterTimer += deltaSeconds * 1000
        if (this.scatterTimer >= interval.scatterMs) {
          this.scatterTimer = 0
          this.isScatter = false
          this.ghosts.children.each((ghostObj) => {
            const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
            const state = ghost.getData('state')
            if (state !== 'frightened' && state !== 'returning') {
              ghost.setData('state', 'chase')
            }
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
            const state = ghost.getData('state')
            if (state !== 'frightened' && state !== 'returning') {
              ghost.setData('state', 'scatter')
            }
            return true
          })
        }
      }
    }

    private updateFrightenedState(deltaSeconds: number) {
      if (this.frightenedTimer <= 0) return

      this.frightenedTimer = Math.max(0, this.frightenedTimer - deltaSeconds * 1000)
      if (this.frightenedTimer === 0) {
        this.exitFrightenedMode()
      }
    }

    private enterFrightenedMode() {
      this.frightenedTimer = this.frightenedDurationMs
      this.ghosts.children.each((ghostObj) => {
        const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
        const state = ghost.getData('state') as string
        if (state === 'returning') {
          return true
        }

        ghost.setData('state', 'frightened')
        ghost.setData('direction', null)
        ghost.setTint(0x3d7eff)
        ghost.setAlpha(0.9)
        return true
      })
    }

    private exitFrightenedMode() {
      this.ghosts.children.each((ghostObj) => {
        const ghost = ghostObj as Phaser.Physics.Arcade.Sprite
        if (ghost.getData('state') === 'frightened') {
          ghost.clearTint()
          ghost.setAlpha(1)
          ghost.setData('state', this.isScatter ? 'scatter' : 'chase')
        }
        return true
      })
    }

    private chooseGhostDirection(ghost: Phaser.Physics.Arcade.Sprite) {
      const state = ghost.getData('state') as string
      const currentDirection = ghost.getData('direction') as Direction | null
      const options = DIRECTIONS.filter((dir) => this.canMoveForSprite(ghost, dir))

      if (options.length === 0) {
        ghost.setData('direction', null)
        return
      }

      if (state === 'frightened') {
        ghost.setData('direction', Phaser.Utils.Array.GetRandom(options))
        return
      }

      let candidates = options
      if (currentDirection) {
        const opposite = this.getOppositeDirection(currentDirection)
        const filtered = options.filter((dir) => dir !== opposite)
        if (filtered.length > 0) {
          candidates = filtered
        }
      }

      const target = this.getGhostTarget(ghost, state)
      if (!target) {
        ghost.setData('direction', Phaser.Utils.Array.GetRandom(candidates))
        return
      }

      let bestDirection = candidates[0]
      let bestDistance = Number.POSITIVE_INFINITY

      for (const dir of candidates) {
        const projected = this.getNextTileCenter(ghost, dir)
        const distance = Phaser.Math.Distance.Between(projected.x, projected.y, target.x, target.y)
        if (distance < bestDistance - 0.01) {
          bestDistance = distance
          bestDirection = dir
        }
      }

      ghost.setData('direction', bestDirection)
    }

    private getGhostTarget(ghost: Phaser.Physics.Arcade.Sprite, state: string) {
      if (state === 'returning') {
        return ghost.getData('spawnPoint') as PhaserVector2 | null
      }

      if (state === 'scatter') {
        return ghost.getData('scatterTarget') as PhaserVector2 | null
      }

      const config = ghost.getData('config') as PacmanEnemyEntry | undefined
      if (!config) {
        return new Phaser.Math.Vector2(this.player.x, this.player.y)
      }

      switch (config.behavior) {
        case 'ambusher': {
          const offsetTiles = 4
          const dir = this.direction
          const vector = dir ? this.getDirectionVector(dir) : new Phaser.Math.Vector2(1, 0)
          return new Phaser.Math.Vector2(
            this.player.x + vector.x * TILE_SIZE * offsetTiles,
            this.player.y + vector.y * TILE_SIZE * offsetTiles
          )
        }
        case 'patroller': {
          const scatterTarget = ghost.getData('scatterTarget') as PhaserVector2 | null
          if (scatterTarget) {
            return scatterTarget.clone()
          }
          break
        }
        case 'random':
          return this.getRandomOpenTileTarget()
        case 'chaser':
        default:
          return new Phaser.Math.Vector2(this.player.x, this.player.y)
      }
    }

    private getRandomOpenTileTarget() {
      if (this.navigableTiles.length === 0) {
        return new Phaser.Math.Vector2(this.player.x, this.player.y)
      }

      const tile = Phaser.Utils.Array.GetRandom(this.navigableTiles)
      return tile ? tile.clone() : new Phaser.Math.Vector2(this.player.x, this.player.y)
    }

    private getOppositeDirection(direction: Direction): Direction {
      switch (direction) {
        case 'up':
          return 'down'
        case 'down':
          return 'up'
        case 'left':
          return 'right'
        case 'right':
        default:
          return 'left'
      }
    }

    private getDirectionVector(direction: Direction) {
      switch (direction) {
        case 'up':
          return new Phaser.Math.Vector2(0, -1)
        case 'down':
          return new Phaser.Math.Vector2(0, 1)
        case 'left':
          return new Phaser.Math.Vector2(-1, 0)
        case 'right':
        default:
          return new Phaser.Math.Vector2(1, 0)
      }
    }

    private getNextTileCenter(sprite: Phaser.Physics.Arcade.Sprite, direction: Direction) {
      const vector = this.getDirectionVector(direction)
      return new Phaser.Math.Vector2(sprite.x + vector.x * TILE_SIZE, sprite.y + vector.y * TILE_SIZE)
    }

    private isAtTileCenter(sprite: Phaser.Physics.Arcade.Sprite) {
      const col = Math.round((sprite.x - TILE_SIZE / 2) / TILE_SIZE)
      const row = Math.round((sprite.y - TILE_SIZE / 2) / TILE_SIZE)
      const centerX = col * TILE_SIZE + TILE_SIZE / 2
      const centerY = row * TILE_SIZE + TILE_SIZE / 2
      return Math.abs(sprite.x - centerX) < 2 && Math.abs(sprite.y - centerY) < 2
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
        this.snapPlayerToGrid(dir)
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

    private snapPlayerToGrid(direction: Direction) {
      if (!this.player) return

      const width = this.layoutGrid.length > 0 ? this.layoutGrid[0]?.length ?? GRID_WIDTH : GRID_WIDTH
      const height = this.layoutGrid.length > 0 ? this.layoutGrid.length : GRID_HEIGHT

      if (direction === 'left' || direction === 'right') {
        const row = clamp(Math.round((this.player.y - TILE_SIZE / 2) / TILE_SIZE), 0, height - 1)
        this.player.y = row * TILE_SIZE + TILE_SIZE / 2
        this.player.setVelocityY(0)
      } else {
        const col = Phaser.Math.Wrap(Math.round((this.player.x - TILE_SIZE / 2) / TILE_SIZE), 0, width)
        this.player.x = col * TILE_SIZE + TILE_SIZE / 2
        this.player.setVelocityX(0)
      }
    }

  }

  return PacmanScene as PhaserSceneType
}

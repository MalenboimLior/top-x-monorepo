import Phaser from 'phaser'

export default class BaseGameScene extends Phaser.Scene {
  score = 0
  level = 1
  soundOn = true
  isPaused = false

  private scoreText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private soundBtn!: Phaser.GameObjects.Rectangle & { icon?: Phaser.GameObjects.Text }
  private pauseBtn!: Phaser.GameObjects.Rectangle & { icon?: Phaser.GameObjects.Text }
  private virtualJoystick?: any // phaser3-rex-plugins
  private debugText?: Phaser.GameObjects.Text // Debug display
  private lastJoystickForce = 0 // Track last force to detect release
  private lastJoystickDirection: string | null = null // Track last direction
  private topBar!: Phaser.GameObjects.Rectangle
  private borderFrame!: {
    top: Phaser.GameObjects.Rectangle
    bottom: Phaser.GameObjects.Rectangle
    left: Phaser.GameObjects.Rectangle
    right: Phaser.GameObjects.Rectangle
  }

  constructor() {
    super('BaseGameScene')
  }

  preload() {
    // Rex Virtual Joystick is loaded via CDN in index.html
    // UI buttons are created using Phaser shapes/text instead of loading images
  }

  create() {
    this.createUI()
    this.createControls()
    this.startSnakeGame() // ← your actual game logic starts here
  }

  // ==================== UI ====================
  private createUI() {
    // Create game border/frame inside the canvas
    const borderThickness = 3
    const borderColor = 0x666666
    
    // Create and store border rectangles
    this.borderFrame = {
      top: this.add.rectangle(0, 0, this.scale.width, borderThickness, borderColor).setOrigin(0, 0).setDepth(999),
      bottom: this.add.rectangle(0, this.scale.height - borderThickness, this.scale.width, borderThickness, borderColor).setOrigin(0, 0).setDepth(999),
      left: this.add.rectangle(0, 0, borderThickness, this.scale.height, borderColor).setOrigin(0, 0).setDepth(999),
      right: this.add.rectangle(this.scale.width - borderThickness, 0, borderThickness, this.scale.height, borderColor).setOrigin(0, 0).setDepth(999)
    }

    this.topBar = this.add.rectangle(0, 0, this.scale.width, 60, 0x000000, 0.8).setOrigin(0, 0).setDepth(1000)

    this.scoreText = this.add.text(20, 15, 'Score: 0', { fontSize: '24px', color: '#fff' }).setDepth(1001)
    this.levelText = this.add.text(this.scale.width / 2, 15, 'Level: 1', { fontSize: '24px', color: '#fff' }).setOrigin(0.5, 0).setDepth(1001)

    // Create sound button using shapes
    const soundBtnBg = this.add.rectangle(this.scale.width - 120, 30, 40, 40, 0x444444).setInteractive({ useHandCursor: true }).setDepth(1001)
    const soundBtnIcon = this.add.text(this.scale.width - 120, 30, this.soundOn ? '🔊' : '🔇', { fontSize: '24px' }).setOrigin(0.5).setDepth(1002)
    this.soundBtn = soundBtnBg as any
    this.soundBtn.icon = soundBtnIcon

    // Create pause button using shapes
    const pauseBtnBg = this.add.rectangle(this.scale.width - 60, 30, 40, 40, 0x444444).setInteractive({ useHandCursor: true }).setDepth(1001)
    const pauseBtnIcon = this.add.text(this.scale.width - 60, 30, '⏸', { fontSize: '24px' }).setOrigin(0.5).setDepth(1002)
    this.pauseBtn = pauseBtnBg as any
    this.pauseBtn.icon = pauseBtnIcon

    this.soundBtn.on('pointerdown', () => this.toggleSound())
    this.pauseBtn.on('pointerdown', () => this.togglePause())

    this.scale.on('resize', this.resizeUI, this)
  }

  private resizeUI() {
    const borderThickness = 3
    
    // Update border frame positions and sizes
    this.borderFrame.top.setSize(this.scale.width, borderThickness)
    this.borderFrame.bottom.setPosition(0, this.scale.height - borderThickness).setSize(this.scale.width, borderThickness)
    this.borderFrame.left.setSize(borderThickness, this.scale.height)
    this.borderFrame.right.setPosition(this.scale.width - borderThickness, 0).setSize(borderThickness, this.scale.height)
    
    // Update top bar
    this.topBar.setSize(this.scale.width, 60)
    
    // Update UI elements
    this.levelText.x = this.scale.width / 2
    this.soundBtn.x = this.scale.width - 120
    if (this.soundBtn.icon) this.soundBtn.icon.x = this.scale.width - 120
    this.pauseBtn.x = this.scale.width - 60
    if (this.pauseBtn.icon) this.pauseBtn.icon.x = this.scale.width - 60
    
    // Update virtual joystick position (mobile)
    if (this.virtualJoystick) {
      const joystickX = 100
      const joystickY = this.scale.height - 100
      this.virtualJoystick.setPosition(joystickX, joystickY)
    }
  }

  toggleSound() {
    this.soundOn = !this.soundOn
    if (this.soundBtn.icon) {
      this.soundBtn.icon.setText(this.soundOn ? '🔊' : '🔇')
    }
    this.sound.setMute(!this.soundOn)
  }

  togglePause() {
    this.isPaused = !this.isPaused
    if (this.pauseBtn.icon) {
      this.pauseBtn.icon.setText(this.isPaused ? '▶' : '⏸')
    }
    this.isPaused ? this.physics.pause() : this.physics.resume()
  }

  // ==================== CONTROLS ====================
  private createControls() {
    // Keyboard
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.handleInput(e.key.toLowerCase()))

    // Swipe
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!p.downTime) return
      const swipeTime = p.upTime! - p.downTime!
      const swipeDist = Phaser.Math.Distance.Between(p.downX!, p.downY!, p.upX!, p.upY!)
      if (swipeTime < 1000 && swipeDist > 50) {
        const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(p.downX!, p.downY!, p.upX!, p.upY!))
        this.handleSwipe(angle)
      }
    })

    // Virtual Joystick (mobile)
    if (this.sys.game.device.os.desktop === false) {
      const joystickPlugin = this.plugins.get('rexVirtualJoystick')
      if (joystickPlugin) {
        // Position joystick in bottom-left with safe margins
        const joystickX = 100
        const joystickY = this.scale.height - 100
        
        this.virtualJoystick = joystickPlugin.add(this, {
          x: joystickX,
          y: joystickY,
          radius: 70, // Larger radius for easier control
          base: this.add.circle(0, 0, 70, 0x888888, 0.5).setDepth(2000), // More visible
          thumb: this.add.circle(0, 0, 35, 0xffffff, 0.8).setDepth(2001), // More opaque
          // dir: '8dir', // 8-directional (up, down, left, right, and diagonals)
          // forceMin: 16, // Minimum force to register
          enable: true
        })
        
        console.log('Virtual joystick created at:', joystickX, joystickY)
        
        // Add debug text display
        this.debugText = this.add.text(10, 80, 'Debug: Waiting...', {
          fontSize: '16px',
          color: '#ffff00',
          backgroundColor: '#000000',
          padding: { x: 5, y: 5 }
        }).setDepth(2002)
      } else {
        console.warn('Virtual joystick plugin not available')
      }
    }
  }

  private handleInput(key: string) {
    // Snake game controls
    if (key === 'arrowup' || key === 'w') {
      if (this.direction !== 'down') this.nextDirection = 'up'
    } else if (key === 'arrowdown' || key === 's') {
      if (this.direction !== 'up') this.nextDirection = 'down'
    } else if (key === 'arrowleft' || key === 'a') {
      if (this.direction !== 'right') this.nextDirection = 'left'
    } else if (key === 'arrowright' || key === 'd') {
      if (this.direction !== 'left') this.nextDirection = 'right'
    }
  }
  
  private handleSwipe(angle: number) {
    // Snake game swipe controls
    if (angle > 315 || angle <= 45) {
      // Right
      if (this.direction !== 'left') this.nextDirection = 'right'
    } else if (angle > 45 && angle <= 135) {
      // Down
      if (this.direction !== 'up') this.nextDirection = 'down'
    } else if (angle > 135 && angle <= 225) {
      // Left
      if (this.direction !== 'right') this.nextDirection = 'left'
    } else {
      // Up
      if (this.direction !== 'down') this.nextDirection = 'up'
    }
  }
  getJoystickDirection() {
    if (!this.virtualJoystick) {
      console.log('No joystick available')
      return null
    }
    
    // Get force and angle from joystick
    const force = this.virtualJoystick.force
    let angle = this.virtualJoystick.angle
    
    // Check if joystick is being released (force is decreasing significantly)
    const isReleasing = this.lastJoystickForce > 30 && force < this.lastJoystickForce * 0.7
    this.lastJoystickForce = force
    
    // Log raw values
    if (force > 5) { // Only log when joystick is being used
      console.log('Joystick - Force:', force.toFixed(2), 'Raw Angle:', angle.toFixed(2), 'Releasing:', isReleasing)
    }
    
    // If joystick is being released, ignore all input immediately
    if (isReleasing || force < 25) {
      if (force > 5) {
        console.log('🔄 Joystick releasing, ignoring all input')
      }
      if (force < 10) {
        this.lastJoystickDirection = null
      }
      return null
    }
    
    // Rex joystick returns angles from -180 to 180
    // Normalize to 0-360 range
    if (angle < 0) {
      angle = angle + 360
    }
    
    console.log('Normalized angle:', angle.toFixed(2))
    
    // Get angle in degrees (0-360)
    // Rex joystick: 0° = right, 90° = down, 180° = left, 270° = up
    let direction: string
    
    // Determine direction based on angle ranges
    // Each direction gets a 90-degree range centered on its cardinal direction
    if (angle >= 315 || angle < 45) {
      // Right: 315-360 and 0-45
      direction = 'right'
      // Extra check: if we're detecting "right" but force is relatively low,
      // it might be the joystick returning to center - ignore it
      if (force < 35 && this.lastJoystickDirection && this.lastJoystickDirection !== 'right') {
        console.log('⚠️ Ignoring weak "right" detection (likely centering), force:', force)
        return this.lastJoystickDirection // Keep previous direction
      }
    } else if (angle >= 45 && angle < 135) {
      // Down: 45-135
      direction = 'down'
    } else if (angle >= 135 && angle < 225) {
      // Left: 135-225
      direction = 'left'
    } else {
      // Up: 225-315
      direction = 'up'
    }
    
    console.log('→ Detected direction:', direction)
    this.lastJoystickDirection = direction
    return direction
  }

  // ==================== SIMPLE SNAKE GAME ====================
  private snake!: Phaser.GameObjects.Rectangle[]
  private direction = 'right'
  private nextDirection = 'right'
  private food!: Phaser.GameObjects.Arc
  private timer!: Phaser.Time.TimerEvent

  private startSnakeGame() {
    const grid = 20
    const size = 20

    this.snake = []
    for (let i = 4; i >= 0; i--) {
      const seg = this.add.rectangle(200 + i * size, 200, size - 2, size - 2, 0x00ff00).setOrigin(0)
      this.snake.push(seg)
    }

    this.createFood()

    this.timer = this.time.addEvent({
      delay: 150,
      callback: this.moveSnake,
      callbackScope: this,
      loop: true
    })
  }

  private createFood() {
    const x = Phaser.Math.Between(0, Math.floor(this.scale.width / 20) - 1) * 20
    const y = Phaser.Math.Between(80, Math.floor(this.scale.height / 20) - 1) * 20
    this.food = this.add.circle(x + 10, y + 10, 10, 0xff0000)
    this.physics.add.existing(this.food)
  }

  private moveSnake() {
    if (this.isPaused) return

    // Update current direction from queued next direction
    this.direction = this.nextDirection

    const head = this.snake[0]
    let newX = head.x
    let newY = head.y

    switch (this.direction) {
      case 'up': newY -= 20; break
      case 'down': newY += 20; break
      case 'left': newX -= 20; break
      case 'right': newX += 20; break
    }

    // wrap or die
    if (newX < 0 || newX >= this.scale.width || newY < 80 || newY >= this.scale.height) {
      this.scene.restart()
      return
    }

    const newHead = this.add.rectangle(newX, newY, 18, 18, 0x00ff00).setOrigin(0)

    this.snake.unshift(newHead)

    // eat food?
    if (Phaser.Geom.Intersects.RectangleToRectangle(newHead.getBounds(), this.food.getBounds())) {
      this.score += 10
      this.scoreText.setText(`Score: ${this.score}`)
      this.food.destroy()
      this.createFood()
      if (this.score % 50 === 0) {
        this.level++
        this.levelText.setText(`Level: ${this.level}`)
        this.timer.delay = Math.max(50, this.timer.delay - 10)
      }
    } else {
      const tail = this.snake.pop()!
      tail.destroy()
    }
  }

  // Override these in future games
  update() {
    // Joystick continuous check
    const joy = this.getJoystickDirection()
    
    // Update debug display
    if (this.debugText && this.virtualJoystick) {
      const force = this.virtualJoystick.force
      let angle = this.virtualJoystick.angle
      // Normalize angle for display
      const normalizedAngle = angle < 0 ? angle + 360 : angle
      const isReleasing = this.lastJoystickForce > 0 && force < this.lastJoystickForce - 10
      this.debugText.setText(
        `Joy: ${joy || 'none'}\n` +
        `Force: ${force.toFixed(1)}${isReleasing ? ' ⬇️' : ''}\n` +
        `Angle: ${normalizedAngle.toFixed(1)}°\n` +
        `Cur: ${this.direction}\n` +
        `Next: ${this.nextDirection}`
      )
    }
    
    if (joy) {
      console.log('Joy detected:', joy, '| Current:', this.direction, '| Next:', this.nextDirection)
      
      // Check if the new direction is valid (not opposite of current direction)
      const opposites: Record<string, string> = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
      }
      
      // Only update if not trying to go in opposite direction
      if (opposites[this.direction] !== joy) {
        console.log('✓ Setting nextDirection to:', joy)
        this.nextDirection = joy
      } else {
        console.log('✗ Cannot go opposite direction. Current:', this.direction, 'Attempted:', joy)
      }
    }
  }
}
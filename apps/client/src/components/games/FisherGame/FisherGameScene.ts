// apps/client/src/components/games/FisherGame/FisherGameScene.ts
// Tiny Fishing Clone - Complete Implementation

import type { FisherGameConfig, FisherGameLevelConfig } from '@top-x/shared/types/fisherGame';
// @ts-ignore - format utility may not have types
import { formatNumber } from '@top-x/shared/utils/format';

type PhaserNamespace = typeof import('phaser');

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 600;
const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH;
const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : DEFAULT_HEIGHT;
const WIDTH = Math.min(viewportWidth, DEFAULT_WIDTH);
const HEIGHT = Math.min(viewportHeight, DEFAULT_HEIGHT);

const DEFAULT_FISHER_GAME_CONFIG: FisherGameConfig = {
  levelsConfig: [
    {
      catchConfig: [
        { depthMin: 0, depthMax: 10, item: 'sardine', value: 10, rarity: 1 },
        { depthMin: 5, depthMax: 15, item: 'shoe', value: 30, rarity: 2 },
      ],
      upgradeConfig: [
        { type: 'maxFish', baseCost: 100, increment: 50 },
        { type: 'maxDepth', baseCost: 200, increment: 100 },
        { type: 'offlineEarnings', baseCost: 500, increment: 200 },
      ],
      backgroundImage: 'https://picsum.photos/800/600?random=1',
      levelHeader: 'Beach Day',
    },
  ],
  backgroundImage: 'https://picsum.photos/800/600?random=1',
  fishermanImage: 'https://api.dicebear.com/7.x/personas/svg?seed=fisherman',
  hookSpeed: 120,
  offlineRate: 1,
};

interface UpgradeLevels {
  maxFish: number;
  maxDepth: number;
  offlineEarnings: number;
}

export default function createFisherGameScene(Phaser: PhaserNamespace, config?: FisherGameConfig) {
  class FisherScene extends Phaser.Scene {
    config: FisherGameConfig;
    
    // Visual elements
    skyGraphics!: Phaser.GameObjects.Graphics;
    waterGraphics!: Phaser.GameObjects.Graphics;
    treesGraphics!: Phaser.GameObjects.Graphics;
    sparkles: Phaser.GameObjects.Ellipse[] = [];
    fisherman!: Phaser.GameObjects.Container;
    boat!: Phaser.GameObjects.Rectangle;
    line!: Phaser.GameObjects.Graphics;
    hook!: Phaser.Physics.Arcade.Sprite;
    
    // UI Elements - Top Bar
    settingsButton!: Phaser.GameObjects.Container;
    earningsText!: Phaser.GameObjects.Text;
    earningsLabel!: Phaser.GameObjects.Text;
    bestScoreBanner!: Phaser.GameObjects.Container;
    bestScoreText!: Phaser.GameObjects.Text;
    aquariumButton!: Phaser.GameObjects.Container;
    
    // UI Elements - Sidebar
    hooksButton!: Phaser.GameObjects.Container;
    giftBoxButton!: Phaser.GameObjects.Container;
    timerText!: Phaser.GameObjects.Text;
    
    // UI Elements - Cast Meter (Circular PLAY Button)
    playButton!: Phaser.GameObjects.Container;
    playButtonBg!: Phaser.GameObjects.Arc;
    playButtonLabel!: Phaser.GameObjects.Text;
    minLabel!: Phaser.GameObjects.Text;
    maxLabel!: Phaser.GameObjects.Text;
    castPointer!: Phaser.GameObjects.Rectangle;
    castPower = 0;
    castDirection = 1;
    
    // UI Elements - Upgrade Panels
    maxFishesPanel!: Phaser.GameObjects.Container;
    maxDepthPanel!: Phaser.GameObjects.Container;
    offlineEarningsPanel!: Phaser.GameObjects.Container;
    
    // Game state
    earnings = 0;
    bestScore = 0;
    upgradeLevels: UpgradeLevels = { maxFish: 1, maxDepth: 1, offlineEarnings: 1 };
    maxFish = 3;
    maxDepthMeters = 9;
    offlineRate = 25; // $/min
    lastPlayTime = Date.now();
    
    // Fishing mechanics
    gameState: 'idle' | 'casting' | 'dropping' | 'reeling' = 'idle';
    hookX = WIDTH / 2;
    hookY = 0;
    hookDepth = 0;
    hookSpeed = 3; // Horizontal movement speed
    caughtFish: Phaser.GameObjects.Container[] = [];
    fishGroup!: Phaser.Physics.Arcade.Group;
    
    // Current level
    currentLevel = 0;
    levelConfig!: FisherGameLevelConfig;
    
    constructor() {
      super({ key: 'FisherScene' });
      this.config = { ...DEFAULT_FISHER_GAME_CONFIG, ...(config || {}) };
      this.loadBestScore();
      this.loadUpgradeLevels();
      this.calculateOfflineEarnings();
    }
    
    loadBestScore() {
      const saved = localStorage.getItem('fisherGame_bestScore');
      if (saved) {
        this.bestScore = parseInt(saved, 10) || 0;
      }
    }
    
    saveBestScore() {
      localStorage.setItem('fisherGame_bestScore', this.bestScore.toString());
    }
    
    loadUpgradeLevels() {
      const saved = localStorage.getItem('fisherGame_upgradeLevels');
      if (saved) {
        try {
          this.upgradeLevels = JSON.parse(saved);
          this.applyUpgrades();
        } catch (e) {
          console.error('Failed to load upgrade levels', e);
        }
      }
    }
    
    saveUpgradeLevels() {
      localStorage.setItem('fisherGame_upgradeLevels', JSON.stringify(this.upgradeLevels));
    }
    
    calculateOfflineEarnings() {
      const savedTime = localStorage.getItem('fisherGame_lastPlayTime');
      if (savedTime) {
        const lastTime = parseInt(savedTime, 10);
        const now = Date.now();
        const minutesAway = Math.floor((now - lastTime) / 60000);
        if (minutesAway > 0 && minutesAway < 1440) { // Max 24 hours
          const offlineEarnings = minutesAway * this.offlineRate;
          this.earnings += offlineEarnings;
          this.updateEarningsDisplay();
        }
      }
      this.lastPlayTime = Date.now();
      localStorage.setItem('fisherGame_lastPlayTime', this.lastPlayTime.toString());
    }
    
    applyUpgrades() {
      const levelConfig = this.levelConfig?.upgradeConfig || this.config.levelsConfig[0]?.upgradeConfig || [];
      
      // Max Fish
      const maxFishUpgrade = levelConfig.find((u: any) => u.type === 'maxFish');
      if (maxFishUpgrade) {
        this.maxFish = 3 + (this.upgradeLevels.maxFish - 1);
      }
      
      // Max Depth
      const maxDepthUpgrade = levelConfig.find((u: any) => u.type === 'maxDepth');
      if (maxDepthUpgrade) {
        this.maxDepthMeters = 9 + (this.upgradeLevels.maxDepth - 1);
      }
      
      // Offline Earnings
      const offlineUpgrade = levelConfig.find((u: any) => u.type === 'offlineEarnings');
      if (offlineUpgrade) {
        this.offlineRate = 25 * this.upgradeLevels.offlineEarnings;
      }
    }
    
    preload() {
      // Create placeholder sprites programmatically
      this.createPlaceholderSprites();
    }
    
    createPlaceholderSprites() {
      // Fisherman sprite (orange jacket, beard, beanie)
      const fishermanTexture = this.textures.createCanvas('fisherman', 60, 80);
      if (fishermanTexture) {
        const ctx = fishermanTexture.getContext();
        // Body (orange jacket)
        ctx.fillStyle = '#FF6B35';
        ctx.fillRect(15, 30, 30, 40);
        // Head
        ctx.fillStyle = '#D4A574';
        ctx.beginPath();
        ctx.arc(30, 25, 12, 0, Math.PI * 2);
        ctx.fill();
        // Beard
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(20, 32, 20, 10);
        // Beanie
        ctx.fillStyle = '#1E3A8A';
        ctx.fillRect(18, 18, 24, 12);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(18, 18, 24, 6);
        fishermanTexture.refresh();
      }
      
      // Boat sprite
      const boatTexture = this.textures.createCanvas('boat', 80, 25);
      if (boatTexture) {
        const boatCtx = boatTexture.getContext();
        boatCtx.fillStyle = '#2C1810';
        boatCtx.fillRect(0, 10, 80, 15);
        boatCtx.beginPath();
        boatCtx.arc(40, 10, 40, Math.PI, 0, false);
        boatCtx.fill();
        boatTexture.refresh();
      }
      
      // Fish sprites (different colors)
      const fishColors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA'];
      fishColors.forEach((color, i) => {
        const fishTexture = this.textures.createCanvas(`fish${i}`, 30, 20);
        if (fishTexture) {
          const fishCtx = fishTexture.getContext();
          fishCtx.fillStyle = color;
          fishCtx.beginPath();
          fishCtx.ellipse(15, 10, 12, 8, 0, 0, Math.PI * 2);
          fishCtx.fill();
          // Tail
          fishCtx.beginPath();
          fishCtx.moveTo(3, 10);
          fishCtx.lineTo(0, 5);
          fishCtx.lineTo(0, 15);
          fishCtx.closePath();
          fishCtx.fill();
          // Eye
          fishCtx.fillStyle = '#000';
          fishCtx.beginPath();
          fishCtx.arc(20, 8, 2, 0, Math.PI * 2);
          fishCtx.fill();
          fishTexture.refresh();
        }
      });
    }
    
    create() {
      this.currentLevel = 0;
      this.levelConfig = this.config.levelsConfig[this.currentLevel] || this.config.levelsConfig[0];
      
      // Create sky gradient
      this.createSky();
      
      // Create trees on horizon
      this.createTrees();
      
      // Create water
      this.createWater();
      
      // Create sparkles
      this.createSparkles();
      
      // Create fisherman in boat
      this.createFishermanAndBoat();
      
      // Create fishing line
      this.line = this.add.graphics().setDepth(5);
      
      // Create hook as physics sprite (for collision detection)
      // First create a texture for the hook
      const hookGraphics = this.add.graphics();
      hookGraphics.fillStyle(0x666666);
      hookGraphics.fillCircle(8, 8, 8);
      hookGraphics.generateTexture('hook', 16, 16);
      hookGraphics.destroy();
      
      // Create hook sprite with physics body
      this.hook = this.physics.add.sprite(WIDTH / 2, 200, 'hook').setDepth(6).setVisible(false);
      (this.hook.body as Phaser.Physics.Arcade.Body).setCircle(8); // Set circular hitbox
      (this.hook.body as Phaser.Physics.Arcade.Body).setImmovable(true); // Hook doesn't move from physics
      this.hookX = WIDTH / 2; // Initialize hook X position
      
      // Create UI - Top Bar
      this.createTopBar();
      
      // Create UI - Sidebar
      this.createSidebar();
      
      // Create UI - Cast Meter (Circular PLAY Button)
      this.createCastMeter();
      
      // Create UI - Upgrade Panels
      this.createUpgradePanels();
      
      // Initialize fish group
      this.fishGroup = this.physics.add.group();
      
      // Input handlers
      this.input.on('pointerdown', this.onPointerDown, this);
      this.input.on('pointerup', this.onPointerUp, this);
      
      // Enable keyboard input for hook movement
      this.input.keyboard?.createCursorKeys();
      
      // Resize handling
      this.scale.resize(WIDTH, HEIGHT);
      this.scale.setGameSize(WIDTH, HEIGHT);
      
      window.addEventListener('resize', () => {
        const w = Math.min(window.innerWidth, 400);
        const h = Math.min(window.innerHeight, 600);
        this.scale.resize(w, h);
        this.scale.setGameSize(w, h);
      });
      
      // Update earnings display
      this.updateEarningsDisplay();
      this.updateBestScoreDisplay();
      this.updateUpgradePanels();
      
      // Start timer
      this.startTimer();
    }
    
    createSky() {
      const skyHeight = HEIGHT / 3;
      this.skyGraphics = this.add.graphics();
      
      // Purple to teal gradient (approximated with rectangles)
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const r = Math.floor(107 + (78 - 107) * ratio); // 0x6B -> 0x4E
        const g = Math.floor(78 + (205 - 78) * ratio); // 0x4E -> 0xCD
        const b = Math.floor(255 + (196 - 255) * ratio); // 0xFF -> 0xC4
        const color = Phaser.Display.Color.GetColor(r, g, b);
        this.skyGraphics.fillStyle(color);
        this.skyGraphics.fillRect(0, (skyHeight / steps) * i, WIDTH, skyHeight / steps);
      }
    }
    
    createTrees() {
      const horizonY = HEIGHT / 3;
      this.treesGraphics = this.add.graphics().setDepth(2);
      this.treesGraphics.fillStyle(0x228B22);
      
      // Create tree silhouettes
      for (let i = 0; i < 8; i++) {
        const x = (WIDTH / 8) * i + Phaser.Math.Between(-20, 20);
        const treeWidth = Phaser.Math.Between(15, 30);
        const treeHeight = Phaser.Math.Between(20, 40);
        
        // Simple triangle tree
        this.treesGraphics.fillTriangle(
          x, horizonY,
          x - treeWidth / 2, horizonY - treeHeight,
          x + treeWidth / 2, horizonY - treeHeight
        );
        
        // Some trees have trunks
        if (Math.random() > 0.5) {
          this.treesGraphics.fillRect(x - 3, horizonY, 6, 10);
        }
      }
    }
    
    createWater() {
      const waterStartY = HEIGHT / 3;
      const waterHeight = HEIGHT - waterStartY;
      this.waterGraphics = this.add.graphics().setDepth(1);
      
      // Water gradient (blue shades)
      const steps = 15;
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const r = Math.floor(0 + (0) * ratio); // 0x00
        const g = Math.floor(105 + (34 - 105) * ratio); // 0x69 -> 0x22
        const b = Math.floor(148 + (68 - 148) * ratio); // 0x94 -> 0x44
        const color = Phaser.Display.Color.GetColor(r, g, b);
        this.waterGraphics.fillStyle(color);
        this.waterGraphics.fillRect(0, waterStartY + (waterHeight / steps) * i, WIDTH, waterHeight / steps);
      }
      
      // Wavy water surface line
      this.waterGraphics.lineStyle(2, 0x004466, 0.8);
      const wavePoints: { x: number; y: number }[] = [];
      for (let x = 0; x <= WIDTH; x += 5) {
        const y = waterStartY + Math.sin(x * 0.02 + Date.now() * 0.001) * 3;
        wavePoints.push({ x, y });
      }
      for (let i = 1; i < wavePoints.length; i++) {
        this.waterGraphics.lineBetween(wavePoints[i - 1].x, wavePoints[i - 1].y, wavePoints[i].x, wavePoints[i].y);
      }
    }
    
    createSparkles() {
      const skyHeight = HEIGHT / 3;
      for (let i = 0; i < 5; i++) {
        const sparkle = this.add.ellipse(
          Phaser.Math.Between(0, WIDTH),
          Phaser.Math.Between(0, skyHeight),
          4, 4,
          0xFFD700
        ).setDepth(3);
        this.sparkles.push(sparkle);
        
        // Animate sparkles
        this.tweens.add({
          targets: sparkle,
          alpha: { from: 0.3, to: 1 },
          scale: { from: 0.8, to: 1.2 },
          duration: Phaser.Math.Between(1000, 2000),
          yoyo: true,
          repeat: -1,
          delay: i * 200
        });
      }
    }
    
    createFishermanAndBoat() {
      const waterStartY = HEIGHT / 3;
      const boatY = waterStartY + 10;
      
      // Boat
      this.boat = this.add.rectangle(WIDTH / 2, boatY, 80, 25, 0x2C1810).setDepth(8);
      
      // Fisherman
      this.fisherman = this.add.container(WIDTH / 2, boatY - 15);
      const fishermanSprite = this.add.sprite(0, 0, 'fisherman').setOrigin(0.5, 1);
      this.fisherman.add(fishermanSprite);
      this.fisherman.setDepth(9);
    }
    
    createTopBar() {
      // Settings button (top left)
      this.settingsButton = this.add.container(30, 30);
      const settingsBg = this.add.rectangle(0, 0, 40, 40, 0xCCCCCC).setOrigin(0.5);
      const settingsIcon = this.add.graphics();
      settingsIcon.lineStyle(3, 0x333333);
      settingsIcon.beginPath();
      settingsIcon.arc(0, 0, 8, 0, Math.PI * 2);
      settingsIcon.moveTo(0, -8);
      settingsIcon.lineTo(0, 8);
      settingsIcon.moveTo(-8, 0);
      settingsIcon.lineTo(8, 0);
      settingsIcon.strokePath();
      settingsIcon.setPosition(0, 0);
      this.settingsButton.add([settingsBg, settingsIcon]);
      this.settingsButton.setDepth(20).setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 40), Phaser.Geom.Rectangle.Contains);
      
      // Earnings (center)
      this.earningsLabel = this.add.text(WIDTH / 2, 20, 'EARNINGS', {
        font: '12px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5, 0).setDepth(20);
      
      this.earningsText = this.add.text(WIDTH / 2, 35, '$0', {
        font: 'bold 32px Arial',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5, 0).setDepth(20);
      
      // Feather icon next to earnings
      const featherIcon = this.add.text(WIDTH / 2 - 60, 35, '🪶', {
        font: '24px Arial'
      }).setOrigin(0.5, 0).setDepth(20);
      
      // Best Score banner (top right)
      this.bestScoreBanner = this.add.container(WIDTH - 80, 30);
      const bannerBg = this.add.rectangle(0, 0, 70, 50, 0xFF6B35).setOrigin(0.5);
      const bestLabel = this.add.text(0, -12, 'BEST', {
        font: '10px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      const trophyIcon = this.add.text(0, 0, '🏆', {
        font: '20px Arial'
      }).setOrigin(0.5);
      this.bestScoreText = this.add.text(0, 15, '$0', {
        font: 'bold 14px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      this.bestScoreBanner.add([bannerBg, bestLabel, trophyIcon, this.bestScoreText]);
      this.bestScoreBanner.setDepth(20);
      
      // Aquarium button (far right)
      this.aquariumButton = this.add.container(WIDTH - 30, 80);
      const aquariumBg = this.add.rectangle(0, 0, 60, 60, 0xFF6B35).setOrigin(0.5);
      const fishIcon = this.add.text(0, -8, '🐟', {
        font: '24px Arial'
      }).setOrigin(0.5);
      const aquariumLabel = this.add.text(0, 15, 'AQUARIUM', {
        font: '10px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      this.aquariumButton.add([aquariumBg, fishIcon, aquariumLabel]);
      this.aquariumButton.setDepth(20).setInteractive(new Phaser.Geom.Rectangle(-30, -30, 60, 60), Phaser.Geom.Rectangle.Contains);
    }
    
    createSidebar() {
      // Hooks button
      this.hooksButton = this.add.container(30, HEIGHT / 2);
      const hooksBg = this.add.rectangle(0, 0, 50, 50, 0xFFFFFF).setOrigin(0.5);
      const hookIcon = this.add.graphics();
      hookIcon.lineStyle(3, 0x333333);
      hookIcon.beginPath();
      hookIcon.moveTo(0, -15);
      hookIcon.lineTo(0, 5);
      hookIcon.lineTo(8, 8);
      hookIcon.strokePath();
      hookIcon.fillStyle(0x333333);
      hookIcon.fillCircle(8, 8, 2);
      hookIcon.setPosition(0, 0);
      const hooksLabel = this.add.text(0, 35, 'HOOKS', {
        font: '10px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      this.hooksButton.add([hooksBg, hookIcon, hooksLabel]);
      this.hooksButton.setDepth(20).setInteractive(new Phaser.Geom.Rectangle(-25, -25, 50, 60), Phaser.Geom.Rectangle.Contains);
      
      // Gift box button
      this.giftBoxButton = this.add.container(30, HEIGHT / 2 + 70);
      const giftBg = this.add.rectangle(0, 0, 50, 50, 0xFFFFFF).setOrigin(0.5);
      const giftIcon = this.add.text(0, 0, '🎁', {
        font: '30px Arial'
      }).setOrigin(0.5);
      this.giftBoxButton.add([giftBg, giftIcon]);
      this.giftBoxButton.setDepth(20).setInteractive(new Phaser.Geom.Rectangle(-25, -25, 50, 50), Phaser.Geom.Rectangle.Contains);
      
      // Timer
      this.timerText = this.add.text(30, HEIGHT / 2 + 130, '00:00:00', {
        font: '14px Arial',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5).setDepth(20);
    }
    
    createCastMeter() {
      const waterStartY = HEIGHT / 3;
      const playButtonY = waterStartY + 80;
      
      this.playButton = this.add.container(WIDTH / 2, playButtonY);
      
      // Background circle
      this.playButtonBg = this.add.circle(0, 0, 50, 0xFF6B35).setDepth(10);
      
      // PLAY label
      this.playButtonLabel = this.add.text(0, -5, 'PLAY', {
        font: 'bold 16px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5).setDepth(11);
      
      // MIN/MAX labels
      this.minLabel = this.add.text(-65, 0, 'MIN', {
        font: '12px Arial',
        color: '#FFFFFF'
      }).setOrigin(1, 0.5).setDepth(11);
      
      this.maxLabel = this.add.text(65, 0, 'MAX', {
        font: '12px Arial',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5).setDepth(11);
      
      // Cast pointer (red rectangle)
      this.castPointer = this.add.rectangle(-40, 0, 12, 20, 0xFF0000).setOrigin(0.5).setDepth(12);
      
      // Arrow pointing up from MAX side
      const maxArrow = this.add.triangle(75, -15, 0, 0, 8, 12, 16, 0, 0xFFFFFF).setOrigin(0.5).setDepth(11);
      
      this.playButton.add([
        this.playButtonBg,
        this.playButtonLabel,
        this.minLabel,
        this.maxLabel,
        this.castPointer,
        maxArrow
      ]);
      
      this.playButton.setDepth(10).setInteractive(new Phaser.Geom.Circle(0, 0, 50), Phaser.Geom.Circle.Contains);
    }
    
    createUpgradePanels() {
      const panelY = HEIGHT - 80;
      const panelSpacing = WIDTH / 3;
      
      // Max Fishes Panel
      this.maxFishesPanel = this.createUpgradePanel(
        panelSpacing * 0.5,
        panelY,
        'MAX FISHES',
        '🐟',
        () => this.maxFish,
        () => this.getUpgradeCost('maxFish'),
        () => this.upgradeMaxFish()
      );
      
      // Max Depth Panel
      this.maxDepthPanel = this.createUpgradePanel(
        panelSpacing * 1.5,
        panelY,
        'MAX DEPTH',
        '🎣',
        () => `${this.maxDepthMeters}m`,
        () => this.getUpgradeCost('maxDepth'),
        () => this.upgradeMaxDepth()
      );
      
      // Offline Earnings Panel
      this.offlineEarningsPanel = this.createUpgradePanel(
        panelSpacing * 2.5,
        panelY,
        'OFFLINE EARNINGS',
        '💰',
        () => `${this.offlineRate}$/MIN`,
        () => this.getUpgradeCost('offlineEarnings'),
        () => this.upgradeOfflineEarnings()
      );
    }
    
    createUpgradePanel(
      x: number,
      y: number,
      title: string,
      icon: string,
      getCurrentValue: () => string | number,
      getCost: () => number,
      onClick: () => void
    ): Phaser.GameObjects.Container {
      const panel = this.add.container(x, y);
      
      // Background
      const bg = this.add.rectangle(0, 0, 100, 70, 0xFF6B35).setOrigin(0.5);
      
      // Arrow above
      const arrow = this.add.text(0, -45, '↑', {
        font: 'bold 20px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
      // Title
      const titleText = this.add.text(0, -25, title, {
        font: 'bold 10px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
      // Icon
      const iconText = this.add.text(0, -8, icon, {
        font: '20px Arial'
      }).setOrigin(0.5);
      
      // Current value
      const valueText = this.add.text(0, 12, String(getCurrentValue()), {
        font: 'bold 12px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
      // Cost
      const costText = this.add.text(0, 28, `$${getCost()}`, {
        font: '12px Arial',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
      panel.add([bg, arrow, titleText, iconText, valueText, costText]);
      panel.setDepth(20).setInteractive(new Phaser.Geom.Rectangle(-50, -35, 100, 70), Phaser.Geom.Rectangle.Contains);
      
      // Store update function
      (panel as any).updatePanel = () => {
        valueText.setText(String(getCurrentValue()));
        costText.setText(`$${getCost()}`);
      };
      
      panel.on('pointerdown', onClick);
      
      return panel;
    }
    
    startTimer() {
      let seconds = 0;
      this.time.addEvent({
        delay: 1000,
        callback: () => {
          seconds++;
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          this.timerText.setText(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          );
        },
        loop: true
      });
    }
    
    update() {
      if (this.gameState === 'casting') {
        this.updateCastMeter();
      } else if (this.gameState === 'dropping') {
        this.updateHookDrop();
      } else if (this.gameState === 'reeling') {
        this.updateReeling();
      }
      
      this.updateLine();
      this.updateFish();
    }
    
    updateCastMeter() {
      // Oscillate cast power between 0 and 1
      const speed = 0.08;
      this.castPower += speed * this.castDirection;
      
      if (this.castPower >= 1) {
        this.castPower = 1;
        this.castDirection = -1;
      } else if (this.castPower <= 0) {
        this.castPower = 0;
        this.castDirection = 1;
      }
      
      // Update pointer position (-40 to 40 range)
      this.castPointer.x = -40 + (this.castPower * 80);
      
      // Change button color based on power (green zone > 70%)
      const isGreenZone = this.castPower > 0.7;
      this.playButtonBg.setFillStyle(isGreenZone ? 0x00FF00 : 0xFF6B35);
    }
    
    updateHookDrop() {
      // Allow horizontal movement while hook is dropping
      const cursors = this.input.keyboard?.createCursorKeys();
      const pointer = this.input.activePointer;
      
      // Handle horizontal movement - keyboard (arrow keys)
      if (cursors?.left?.isDown) {
        this.hookX = Math.max(50, this.hookX - this.hookSpeed);
      }
      if (cursors?.right?.isDown) {
        this.hookX = Math.min(WIDTH - 50, this.hookX + this.hookSpeed);
      }
      
      // Handle horizontal movement - touch/mouse (drag or tap)
      if (pointer.isDown && pointer.y > HEIGHT / 3) {
        // Only move hook if pointer is in water area
        this.hookX = Phaser.Math.Clamp(pointer.x, 50, WIDTH - 50);
      }
      
      // Check for overlap with fish while dropping too
      this.physics.overlap(this.hook, this.fishGroup, (hook: any, fish: any) => {
        this.collectFish(fish as Phaser.Physics.Arcade.Sprite);
      }, undefined, this);
    }
    
    updateReeling() {
      // Allow horizontal movement during reeling
      const cursors = this.input.keyboard?.createCursorKeys();
      const pointer = this.input.activePointer;
      
      // Handle horizontal movement - keyboard (arrow keys)
      if (cursors?.left?.isDown) {
        this.hookX = Math.max(50, this.hookX - this.hookSpeed);
      }
      if (cursors?.right?.isDown) {
        this.hookX = Math.min(WIDTH - 50, this.hookX + this.hookSpeed);
      }
      
      // Handle horizontal movement - touch/mouse (drag or tap)
      if (pointer.isDown && pointer.y > HEIGHT / 3) {
        // Only move hook if pointer is in water area
        this.hookX = Phaser.Math.Clamp(pointer.x, 50, WIDTH - 50);
      }
      
      // Reel up
      this.hookY -= 3;
      this.hook.x = this.hookX;
      this.hook.y = this.hookY;
      
      // Move caught fish with hook
      this.caughtFish.forEach((fish, index) => {
        fish.x = Phaser.Math.Linear(fish.x, this.hookX, 0.15);
        fish.y = Phaser.Math.Linear(fish.y, this.hookY - 20 - (index * 25), 0.15);
      });
      
      // Check for overlap with fish while reeling
      this.physics.overlap(this.hook, this.fishGroup, (hook: any, fish: any) => {
        this.collectFish(fish as Phaser.Physics.Arcade.Sprite);
      }, undefined, this);
      
      // Check if hook reached surface
      const waterStartY = HEIGHT / 3;
      if (this.hookY <= waterStartY + 20) {
        this.sellCatch();
      }
    }
    
    updateLine() {
      if (!this.hook.visible) return;
      
      const waterStartY = HEIGHT / 3;
      const lineStartY = waterStartY + 10;
      const fishermanX = WIDTH / 2; // Line starts from fisherman
      
      this.line.clear();
      this.line.lineStyle(2, 0xFFFFFF, 0.9);
      this.line.lineBetween(fishermanX, lineStartY, this.hookX, this.hookY);
    }
    
    updateFish() {
      // Fish swimming animation could go here
    }
    
    onPointerDown(pointer: Phaser.Input.Pointer) {
      if (this.gameState !== 'idle') return;
      
      // Check if clicking on upgrade panels
      const clickedPanel = [this.maxFishesPanel, this.maxDepthPanel, this.offlineEarningsPanel].find(panel => {
        const bounds = panel.getBounds();
        return bounds.contains(pointer.x, pointer.y);
      });
      
      if (clickedPanel) {
        return; // Panel click handler will fire
      }
      
      // Check if clicking on play button
      const playBounds = this.playButton.getBounds();
      if (playBounds.contains(pointer.x, pointer.y)) {
        this.startCasting();
        return;
      }
    }
    
    onPointerUp() {
      if (this.gameState === 'casting') {
        this.releaseCast();
      }
    }
    
    startCasting() {
      this.gameState = 'casting';
      this.castPower = 0;
      this.castDirection = 1;
      this.hook.setVisible(false);
      this.spawnFish();
      // Hide UI during casting
      this.hideFishingUI();
      // Hide play button
      if (this.playButton) this.playButton.setVisible(false);
    }
    
    releaseCast() {
      this.gameState = 'idle';
      
      // Calculate depth based on cast power
      const maxDepthPixels = HEIGHT - (HEIGHT / 3) - 100;
      const targetDepth = (HEIGHT / 3) + 50 + (this.castPower * Math.min(maxDepthPixels, this.maxDepthMeters * 10));
      
      this.dropHook(targetDepth);
    }
    
    dropHook(targetDepth: number) {
      const waterStartY = HEIGHT / 3;
      const fishermanX = WIDTH / 2; // Drop from fisherman position
      
      this.hookX = fishermanX;
      this.hook.x = fishermanX;
      this.hook.y = waterStartY + 20;
      this.hook.setVisible(true);
      this.hookY = waterStartY + 20;
      this.gameState = 'dropping';
      
      // Hide UI during fishing
      this.hideFishingUI();
      
      this.tweens.add({
        targets: this,
        hookY: targetDepth,
        duration: 2000,
        ease: 'Linear',
        onUpdate: () => {
          this.hook.y = this.hookY;
          this.hook.x = this.hookX; // Keep X position from fisherman
        },
        onComplete: () => {
          this.gameState = 'reeling';
          this.hookDepth = this.hookY;
        }
      });
    }
    
    spawnFish() {
      this.fishGroup.clear(true, true);
      
      const catchConfig = this.levelConfig?.catchConfig || [];
      const waterStartY = HEIGHT / 3;
      const fishermanX = WIDTH / 2; // Fisherman position (center)
      
      catchConfig.forEach((config: any, configIndex: number) => {
        const count = config.rarity * 8; // Spawn more fish (increased from 3 to 8)
        
        for (let i = 0; i < count; i++) {
          const depthPercent = Phaser.Math.FloatBetween(config.depthMin / 100, config.depthMax / 100);
          // Start fish deeper - at least 100px below water surface, and spread across deeper depths
          const minDepth = 100; // Minimum depth from water surface
          const maxDepth = HEIGHT - waterStartY - 80; // Maximum depth (leave some space at bottom)
          const fishY = waterStartY + minDepth + (depthPercent * (maxDepth - minDepth));
          
          // Spawn fish vertically under fisherman with some horizontal spread
          const spread = 80; // Horizontal spread around fisherman
          const fishX = fishermanX + Phaser.Math.Between(-spread, spread);
          
          const fishIndex = configIndex % 5; // Cycle through fish colors
          const fish = this.fishGroup.create(fishX, fishY, `fish${fishIndex}`) as Phaser.Physics.Arcade.Sprite;
          
          fish.setScale(0.6).setDepth(4);
          fish.setActive(true);
          fish.setVisible(true);
          
          // Fish swim horizontally with some vertical movement
          fish.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(-5, 5));
          
          // Store config data on fish
          (fish as any).catchConfig = config;
        }
      });
    }
    
    collectFish(fish: Phaser.Physics.Arcade.Sprite) {
      if (this.caughtFish.length >= this.maxFish) return;
      if (!fish.active) return; // Already caught
      
      // Mark fish as inactive and hide
      fish.setActive(false);
      fish.setVisible(false);
      this.fishGroup.remove(fish);
      
      // Create visual representation of caught fish
      const caughtFishContainer = this.add.container(fish.x, fish.y);
      const caughtFishSprite = this.add.sprite(0, 0, fish.texture.key).setScale(0.6);
      caughtFishContainer.add(caughtFishSprite);
      caughtFishContainer.setDepth(7);
      
      this.caughtFish.push(caughtFishContainer);
    }
    
    sellCatch() {
      let total = 0;
      
      this.caughtFish.forEach((fishContainer) => {
        // Get value from catch config if available
        const fishSprite = fishContainer.list[0] as Phaser.GameObjects.Sprite;
        const fishData = this.fishGroup.children.entries.find(f => 
          (f as Phaser.Physics.Arcade.Sprite).texture?.key === fishSprite.texture.key
        ) as any;
        
        const value = fishData?.catchConfig?.value || 15;
        total += value;
        
        fishContainer.destroy();
      });
      
      this.earnings += total;
      
      if (this.earnings > this.bestScore) {
        this.bestScore = this.earnings;
        this.saveBestScore();
      }
      
      this.updateEarningsDisplay();
      this.updateBestScoreDisplay();
      
      this.showPoints(`+$${total}`, WIDTH / 2, HEIGHT / 2);
      
      this.gameState = 'idle';
      this.hook.setVisible(false);
      this.caughtFish = [];
      
      // Show UI again when idle
      this.showFishingUI();
      // Show play button again
      if (this.playButton) this.playButton.setVisible(true);
    }
    
    updateEarningsDisplay() {
      if (!this.earningsText) return; // UI not created yet
      const formatted = formatNumber(this.earnings);
      this.earningsText.setText(`$${formatted}`);
    }
    
    updateBestScoreDisplay() {
      if (!this.bestScoreText) return; // UI not created yet
      const formatted = formatNumber(this.bestScore);
      this.bestScoreText.setText(`$${formatted}`);
    }
    
    updateUpgradePanels() {
      if (!this.maxFishesPanel || !this.maxDepthPanel || !this.offlineEarningsPanel) return; // UI not created yet
      (this.maxFishesPanel as any).updatePanel();
      (this.maxDepthPanel as any).updatePanel();
      (this.offlineEarningsPanel as any).updatePanel();
    }
    
    getUpgradeCost(type: 'maxFish' | 'maxDepth' | 'offlineEarnings'): number {
      const levelConfig = this.levelConfig?.upgradeConfig || this.config.levelsConfig[0]?.upgradeConfig || [];
      const upgradeConfig = levelConfig.find((u: any) => u.type === type);
      
      if (!upgradeConfig) return 999999;
      
      const level = this.upgradeLevels[type];
      return upgradeConfig.baseCost + (upgradeConfig.increment * (level - 1));
    }
    
    upgradeMaxFish() {
      const cost = this.getUpgradeCost('maxFish');
      if (this.earnings < cost) return;
      
      this.earnings -= cost;
      this.upgradeLevels.maxFish++;
      this.applyUpgrades();
      this.saveUpgradeLevels();
      this.updateEarningsDisplay();
      this.updateUpgradePanels();
    }
    
    upgradeMaxDepth() {
      const cost = this.getUpgradeCost('maxDepth');
      if (this.earnings < cost) return;
      
      this.earnings -= cost;
      this.upgradeLevels.maxDepth++;
      this.applyUpgrades();
      this.saveUpgradeLevels();
      this.updateEarningsDisplay();
      this.updateUpgradePanels();
    }
    
    upgradeOfflineEarnings() {
      const cost = this.getUpgradeCost('offlineEarnings');
      if (this.earnings < cost) return;
      
      this.earnings -= cost;
      this.upgradeLevels.offlineEarnings++;
      this.applyUpgrades();
      this.saveUpgradeLevels();
      this.updateEarningsDisplay();
      this.updateUpgradePanels();
    }
    
    hideFishingUI() {
      // Hide upgrade panels
      if (this.maxFishesPanel) this.maxFishesPanel.setVisible(false);
      if (this.maxDepthPanel) this.maxDepthPanel.setVisible(false);
      if (this.offlineEarningsPanel) this.offlineEarningsPanel.setVisible(false);
      
      // Hide sidebar
      if (this.hooksButton) this.hooksButton.setVisible(false);
      if (this.giftBoxButton) this.giftBoxButton.setVisible(false);
      
      // Hide aquarium button
      if (this.aquariumButton) this.aquariumButton.setVisible(false);
      
      // Hide play button
      if (this.playButton) this.playButton.setVisible(false);
    }
    
    showFishingUI() {
      // Show upgrade panels
      if (this.maxFishesPanel) this.maxFishesPanel.setVisible(true);
      if (this.maxDepthPanel) this.maxDepthPanel.setVisible(true);
      if (this.offlineEarningsPanel) this.offlineEarningsPanel.setVisible(true);
      
      // Show sidebar
      if (this.hooksButton) this.hooksButton.setVisible(true);
      if (this.giftBoxButton) this.giftBoxButton.setVisible(true);
      
      // Show aquarium button
      if (this.aquariumButton) this.aquariumButton.setVisible(true);
      
      // Show play button
      if (this.playButton) this.playButton.setVisible(true);
    }
    
    showPoints(text: string, x: number, y: number) {
      const txt = this.add.text(x, y, text, {
        font: 'bold 28px Arial',
        color: '#00FF88',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(25);
      
      this.tweens.add({
        targets: txt,
        y: y - 80,
        alpha: 0,
        scale: 1.5,
        duration: 1500,
        onComplete: () => txt.destroy()
      });
    }
  }
  
  return FisherScene;
}
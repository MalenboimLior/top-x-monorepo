<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Phaser from 'phaser'
import BaseGameScene from './BaseGameScene'

const gameContainer = ref<HTMLDivElement>()
let game: Phaser.Game | null = null

onMounted(async () => {
  if (!gameContainer.value) {
    console.error('SampleGame: Missing container element')
    return
  }

  // Import Rex Virtual Joystick plugin from npm
  let VirtualJoystickPlugin = null
  try {
    const rexPluginsModule = await import('phaser3-rex-plugins/plugins/virtualjoystick-plugin.js')
    VirtualJoystickPlugin = rexPluginsModule.default || rexPluginsModule
    console.log('Rex Virtual Joystick plugin loaded from npm')
  } catch (error) {
    console.warn('Failed to load Rex Virtual Joystick plugin from npm:', error)
    console.warn('Virtual joystick will not work on mobile devices.')
  }
  
  const plugins: Phaser.Types.Core.PluginObjectItem[] = []
  
  if (VirtualJoystickPlugin) {
    plugins.push({
      key: 'rexVirtualJoystick',
      plugin: VirtualJoystickPlugin,
      start: true
    })
    console.log('Rex Virtual Joystick plugin registered successfully')
  }

  // Get navbar height dynamically
  const getNavbarHeight = () => {
    const navbar = document.querySelector('.navbar') as HTMLElement
    if (navbar) {
      return navbar.offsetHeight
    }
    // Fallback to estimated height if navbar not found (desktop ~60px, mobile ~70px)
    return window.innerWidth > 768 ? 60 : 70
  }

  // Calculate available dimensions (account for navbar and browser chrome)
  const getAvailableHeight = () => {
    const navbarHeight = getNavbarHeight()
    
    // Use visual viewport if available (better for mobile)
    if (window.visualViewport) {
      return window.visualViewport.height - navbarHeight
    }
    // Fallback to innerHeight minus navbar
    return window.innerHeight - navbarHeight
  }

  const getAvailableWidth = () => {
    if (window.visualViewport) {
      return window.visualViewport.width
    }
    return window.innerWidth
  }
  
  // Use adaptive resolution based on device
  // Mobile: use more vertical space; Desktop: use wider aspect ratio
  const isMobile = window.innerWidth < 768
  const availableWidth = getAvailableWidth() - 16 // Account for border + margins
  const availableHeight = getAvailableHeight() - 16 // Account for border + margins
  
  let GAME_WIDTH: number
  let GAME_HEIGHT: number
  
  if (isMobile) {
    // Mobile: maximize usage of available space with slight padding
    GAME_WIDTH = Math.min(availableWidth, 600) // Max 600px wide
    GAME_HEIGHT = Math.min(availableHeight, GAME_WIDTH * 1.5) // Portrait-ish ratio
  } else {
    // Desktop: use 16:10 aspect ratio
    GAME_WIDTH = Math.min(availableWidth, 1000)
    GAME_HEIGHT = Math.min(availableHeight, GAME_WIDTH * 0.625) // 16:10 ratio
  }
  
  // Set wrapper height to account for navbar
  const wrapper = gameContainer.value?.parentElement
  if (wrapper) {
    const navbarHeight = getNavbarHeight()
    if (window.visualViewport) {
      wrapper.style.height = `${window.visualViewport.height - navbarHeight}px`
    } else {
      wrapper.style.height = `${window.innerHeight - navbarHeight}px`
    }
  }
  
  // Create Phaser game with calculated dimensions
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameContainer.value,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: { default: 'arcade' },
    scale: {
      mode: Phaser.Scale.FIT, // Maintains aspect ratio
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    backgroundColor: '#1a1a1a',
    plugins: plugins.length > 0 ? {
      global: plugins
    } : undefined,
    scene: BaseGameScene
  })

  // Handle viewport resize (mobile browser chrome showing/hiding, navbar changes, orientation changes)
  const handleResize = () => {
    if (game && gameContainer.value) {
      // Update wrapper height
      const wrapper = gameContainer.value?.parentElement
      if (wrapper) {
        const navbarHeight = getNavbarHeight()
        if (window.visualViewport) {
          wrapper.style.height = `${window.visualViewport.height - navbarHeight}px`
        } else {
          wrapper.style.height = `${window.innerHeight - navbarHeight}px`
        }
      }
      
      // Recalculate game dimensions for new viewport
      const newIsMobile = window.innerWidth < 768
      const newAvailableWidth = getAvailableWidth() - 16
      const newAvailableHeight = getAvailableHeight() - 16
      
      let newWidth: number
      let newHeight: number
      
      if (newIsMobile) {
        newWidth = Math.min(newAvailableWidth, 600)
        newHeight = Math.min(newAvailableHeight, newWidth * 1.5)
      } else {
        newWidth = Math.min(newAvailableWidth, 1000)
        newHeight = Math.min(newAvailableHeight, newWidth * 0.625)
      }
      
      // Resize the game with new dimensions
      game.scale.resize(newWidth, newHeight)
    }
  }

  window.addEventListener('resize', handleResize)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize)
  }

  // Cleanup
  const cleanup = () => {
    window.removeEventListener('resize', handleResize)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleResize)
    }
  }
  
  // Store cleanup function for onBeforeUnmount
  ;(gameContainer.value as any).__cleanup = cleanup
})

onBeforeUnmount(() => {
  // Cleanup resize listeners
  if (gameContainer.value && (gameContainer.value as any).__cleanup) {
    (gameContainer.value as any).__cleanup()
  }
  
  if (game) {
    game.destroy(true)
    game = null
  }
})
</script>

<template>
  <div class="game-wrapper">
    <div ref="gameContainer" class="game-container" />
  </div>
</template>

<style scoped>
.game-wrapper {
  width: 100vw;
  /* Height accounts for navbar - will be calculated dynamically */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #2a2a2a;
  overflow: hidden;
  box-sizing: border-box;
  /* Use calc to account for navbar, but JS will handle dynamic sizing */
  min-height: calc(100vh - var(--navbar-height, 60px));
}

.game-container {
  border: 4px solid #4a4a4a;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  /* Allow Phaser to add letterboxing/pillarboxing as needed */
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
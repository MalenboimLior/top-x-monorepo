# 10MB Payload Fix Plan

## 🔍 Root Cause Analysis

### The Problem: 6.9MB ZoneReveal Assets in Build

**Finding**: All ZoneReveal game spritesheets (6.9 MB total) are being copied to `dist/assets/zonereveal/` during build, even though:
- They're only needed when playing ZoneReveal game
- The route is lazy-loaded (good!)
- But the assets are always in the build output

**Why This Is Bad**:
1. Assets are accessible via URL, so they count toward network payload
2. Browser may prefetch or cache them unnecessarily
3. They're downloaded even if user never plays the game
4. **Accounts for 70% of the 10MB payload!**

### Current Asset Loading

Looking at `ZoneRevealScene.ts`:
- Background image: ✅ Loads from Firebase Storage
- Spritesheets: ❌ Load from `/assets/zonereveal/` (local paths)
- Some assets can be overridden via config (which uses Firebase Storage)

## ✅ Solution: Move ZoneReveal Assets to Firebase Storage

### Option 1: Exclude from Build + Use Firebase Storage (RECOMMENDED)

**Steps**:

1. **Upload ZoneReveal assets to Firebase Storage** (if not already done)
   - Upload all spritesheets to Firebase Storage
   - Get public URLs for each asset

2. **Update DEFAULT_ZONE_REVEAL_CONFIG** to use Firebase Storage URLs
   ```typescript
   const DEFAULT_ZONE_REVEAL_CONFIG: ZoneRevealConfig = {
     backgroundImage: 'https://firebasestorage.googleapis.com/...',
     spritesheets: {
       player: 'https://firebasestorage.googleapis.com/.../Monocle_spritesheet.png',
       enemy: 'https://firebasestorage.googleapis.com/.../monster_spritesheet.png',
       // ... etc
     },
     // ...
   };
   ```

3. **Exclude zonereveal folder from Vite build**
   - Configure Vite to not copy this folder

4. **Verify game still works**
   - Test ZoneReveal game loads assets from Firebase Storage

**Expected Savings**: **~6.5-7 MB** (65-70% reduction!)

### Option 2: Keep Assets But Optimize Them

If assets must stay in build:
1. Convert PNG to WebP (50-70% smaller)
2. Remove unused temp files
3. Compress images

**Expected Savings**: ~3-4 MB

## 🎯 Implementation Steps

### Step 1: Exclude ZoneReveal Assets from Build

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  // ... existing config
  
  plugins: [
    vue(),
    // Custom plugin to exclude zonereveal from public copy
    {
      name: 'exclude-zonereveal',
      generateBundle() {
        // Vite copies public folder by default
        // We'll handle it manually to exclude zonereveal
      },
      writeBundle() {
        // Copy public assets except zonereveal folder
        const publicDir = resolve(__dirname, 'public');
        const distDir = resolve(__dirname, 'dist');
        
        // Copy non-zonereveal assets
        // Implementation depends on your file structure
      }
    }
  ],
  
  publicDir: false, // Disable automatic public copy
  
  // ... rest of config
});
```

**OR** simpler approach - use Vite's `publicDir` with a custom copy function.

Actually, the simplest solution is to:

1. Move `public/assets/zonereveal/` to a different location (not in public)
2. Update code to load from Firebase Storage URLs only
3. Remove the folder from public directory

### Step 2: Update Default Config

Update `apps/client/src/components/games/zonereveal/ZoneRevealScene.ts`:

```typescript
const DEFAULT_ZONE_REVEAL_CONFIG: ZoneRevealConfig = {
  backgroundImage: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fbackground.jpg?alt=media',
  spritesheets: {
    player: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2FMonocle_spritesheet.png?alt=media',
    enemy: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fmonster_spritesheet.png?alt=media',
    robot: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2FAlien_spritesheet.png?alt=media',
    microbe: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fmicrobe_spritesheet.png?alt=media',
    heart: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fheart_spritesheet.png?alt=media',
    clock: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Ftime_spritesheet.png?alt=media',
    speed: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fspeed_spritesheet.png?alt=media',
    freeze: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Ffreeze_spritesheet.png?alt=media'
  },
  heartIcon: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Fheart_icon.png?alt=media',
  answer: {
    solution: 'Top X',
    accepted: ['TopX', 'Top-X'],
    image: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media',
  },
  levelsConfig: [
    {
      // ... config
      hiddenImage: 'https://firebasestorage.googleapis.com/v0/b/top-x-co.firebasestorage.app/o/zonereveal%2Flevel1.jpg?alt=media',
    }
  ]
};
```

### Step 3: Remove from Public Folder

1. Move `public/assets/zonereveal/` out of public (or delete if uploaded to Firebase)
2. Rebuild and verify assets aren't in dist
3. Test ZoneReveal game works with Firebase Storage URLs

## 📊 Expected Impact

### After Removing ZoneReveal Assets:

**Before**:
- Network Payload: **10,015 KiB (~10 MB)**
- LCP: 18.4s
- FCP: 3.6s

**After**:
- Network Payload: **~3,015 KiB (~3 MB)** ✅ (70% reduction!)
- LCP: Should drop to ~6-8s (60% improvement)
- FCP: Should improve slightly

### Additional Optimizations:

1. **Image optimization** (convert to WebP): Another 1-2 MB savings
2. **CSS optimization**: 200-300 KB savings
3. **Cache headers**: Reduces repeat visit payload significantly

**Final Target**: < 2 MB for initial load ✅

## 🚨 Quick Win Alternative

If moving to Firebase Storage is complex, **immediate fix**:

1. Move `public/assets/zonereveal/` to `assets-backup/` (outside public)
2. Keep only essential assets that might be referenced elsewhere
3. Upload to Firebase Storage and update configs
4. Rebuild - assets won't be in dist

This can be done in **15 minutes** and will immediately reduce payload by 70%!

---

**Priority**: **CRITICAL** - Do this first before any other optimizations!


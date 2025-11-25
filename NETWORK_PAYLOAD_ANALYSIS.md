# Network Payload Investigation Report
**Date**: November 25, 2025
**Total Payload**: ~10,015 KiB (~10 MB)

## 🔍 Investigation Results

### Top Contributors to 10MB Payload

| Asset Type | Size | Location | Issue | Priority |
|------------|------|----------|-------|----------|
| **ZoneReveal Game Assets** | **6.9 MB** | `dist/assets/zonereveal/` | 🚨 **Bundled in dist - loaded even if never used!** | **CRITICAL** |
| Phaser Game Engine | 1.4 MB | `vendor-phaser-*.js` | Code-split ✅ (only loads on game pages) | Medium |
| Vendor CSS (Bulma) | 664 KB | `vendor-*.css` | Large CSS framework | High |
| Firebase SDK | 584 KB | `vendor-firebase-*.js` | Reasonable size | Low |
| Other Vendors | 360 KB | `vendor-*.js` | Various libraries | Low |
| Main App Bundle | 120 KB | `index-*.js` | Reasonable | Low |

### 🚨 CRITICAL FINDING: ZoneReveal Assets (6.9 MB!)

**Problem**: All ZoneReveal game spritesheets are being copied to `dist/assets/zonereveal/` and are available for download even though:
- They're only needed when playing the ZoneReveal game
- Most users will never visit that game
- They're loaded from Firebase Storage at runtime anyway

**Files Included** (Total: 6.9 MB):
- `Monocle_spritesheet.png`: 612 KB
- `robot_spritesheet.png`: 476 KB
- `temp/spritesheet_monocle_8x256.png`: 460 KB
- `monster_spritesheet.png`: 408 KB
- `temp/enemy.png`: 390 KB
- `temp/trailSplitter.png`: 384 KB
- `temp/sentinel.png`: 384 KB
- `temp/player.png`: 384 KB
- `temp/chaosSphere.png`: 384 KB
- `temp/emoji_ Monocle_8x256.png`: 377 KB
- `temp/emoji_ Monocle_6x256_g.png`: 357 KB
- `temp/emoji_ Monocle_6x256.png`: 324 KB
- `microbe_spritesheet.png`: 270 KB
- `time_spritesheet.png`: 233 KB
- `heart_icon.png`: 224 KB
- `freeze_spritesheet.png`: 218 KB
- `anonymous.png`: 210 KB
- `speed_spritesheet.png`: 189 KB
- `heart_spritesheet.png`: 100 KB
- `level1.jpg`: 92 KB
- Plus many more...

**Why This Is A Problem:**
1. These files are in the build output, making them accessible via URL
2. Even though they're lazy-loaded by Phaser, they're still taking up space
3. The browser may prefetch them or they may be loaded unnecessarily
4. **This accounts for ~70% of the 10MB payload!**

## ✅ Solutions

### Solution 1: Exclude ZoneReveal Assets from Build (RECOMMENDED)

Since ZoneReveal assets are loaded from Firebase Storage at runtime via Phaser's `preload()`, they don't need to be in the build.

**Implementation**:
1. Move ZoneReveal assets to Firebase Storage (if not already there)
2. Exclude them from Vite build
3. Keep only the assets that are actually referenced in the code

**Expected Savings**: ~6.5-7 MB (65-70% reduction!)

### Solution 2: Optimize ZoneReveal Assets

If assets must stay in the build:
1. Convert PNG spritesheets to WebP (50-70% smaller)
2. Compress images before build
3. Remove unused temp files

**Expected Savings**: ~3-4 MB

### Solution 3: Lazy Load ZoneReveal Route

Ensure ZoneReveal route and assets are only loaded when the game page is accessed (already done via code splitting).

## 📊 Other Optimizations

### 1. Vendor CSS (664 KB)

**Issue**: Bulma CSS is quite large and may include unused styles.

**Solutions**:
- Use PurgeCSS to remove unused CSS
- Consider switching to a smaller CSS framework
- Only import needed Bulma components

**Expected Savings**: 200-300 KB

### 2. Image Assets

**Current Issues**:
- Images not in WebP format
- No image compression
- Some duplicate assets (`background-pattern.png` appears twice)

**Solutions**:
- Convert all images to WebP
- Compress images
- Remove duplicates
- Use responsive images with srcset

**Expected Savings**: 1-2 MB

### 3. Code Splitting

**Good News**: Code splitting is already implemented!
- Phaser is in its own chunk (1.4 MB)
- Firebase is in its own chunk (584 KB)
- Route-based splitting appears to be working

**Recommendations**:
- Ensure all game routes are lazy-loaded
- Verify game assets aren't loaded on homepage

## 🎯 Immediate Action Plan

### Priority 1: Remove ZoneReveal Assets from Build (6.9 MB savings!)

**Steps**:
1. Verify ZoneReveal assets are in Firebase Storage
2. Update `vite.config.ts` to exclude `public/assets/zonereveal/` from build
3. Ensure game loads assets from Firebase Storage URLs only
4. Test that game still works after removal

### Priority 2: Optimize Remaining Images (1-2 MB savings)

1. Convert all images to WebP
2. Compress images
3. Remove duplicate files
4. Add responsive images

### Priority 3: Optimize CSS (200-300 KB savings)

1. Add PurgeCSS to remove unused Bulma styles
2. Or switch to smaller CSS solution

### Priority 4: Cache Headers (Reduces repeat visit payload)

1. Configure Firebase Hosting cache headers
2. Implement service worker

## 📈 Expected Results

**After Priority 1 (Remove ZoneReveal from build)**:
- Network Payload: 10 MB → **~3-3.5 MB** (65-70% reduction!)
- LCP: Should improve significantly
- Initial Load: Much faster

**After All Optimizations**:
- Network Payload: **< 2 MB** for initial load ✅
- Repeat Visits: < 500 KB (cached assets) ✅
- LCP: < 3s ✅

## 🔧 Implementation Details

### Exclude ZoneReveal from Vite Build

Add to `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    // ... existing config
    external: [
      // ZoneReveal assets loaded from Firebase Storage
      /^\/assets\/zonereveal\//
    ]
  },
  // Exclude from public directory copy
  copyPublicDir: {
    exclude: ['assets/zonereveal/**']
  }
}
```

Or use `vite-plugin-static-copy` to selectively copy assets.

### Verify Assets Are in Firebase Storage

Check that ZoneReveal assets are accessible via Firebase Storage URLs in production. If not, upload them.

---

**Next Steps**: Implement Priority 1 immediately - this will solve 70% of the payload problem!


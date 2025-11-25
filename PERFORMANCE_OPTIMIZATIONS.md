# Performance Optimizations for top-x.co

This document outlines the performance optimizations implemented to improve PageSpeed Insights scores.

## ✅ Implemented Optimizations

### 1. Build Configuration & Code Splitting

**Location**: `apps/client/vite.config.ts`

- **Manual Chunk Splitting**: Configured Vite to split vendor code into separate chunks:
  - `vendor-firebase`: Firebase SDK (can be cached independently)
  - `vendor-phaser`: Phaser game engine (large library, loaded only when needed)
  - `vendor-fontawesome`: FontAwesome icons (loaded separately)
  - `vendor-vue`: Vue ecosystem (Vue, Pinia, Vue Router)
  - `vendor`: Other third-party libraries

- **Build Optimization**:
  - Disabled source maps in production (reduces bundle size)
  - Using `esbuild` for faster minification
  - Increased chunk size warning limit

**Benefits**: 
- Better browser caching (unchanged vendor chunks won't re-download)
- Smaller initial bundle size
- Faster subsequent page loads

### 2. Resource Hints (DNS Prefetch & Preconnect)

**Location**: `apps/client/index.html`

Added resource hints for external domains:
- `preconnect` to Google Fonts, Google AdSense, and Google Tag Manager
- `dns-prefetch` for DNS resolution of external resources

**Benefits**:
- Faster connection establishment to external services
- Reduced latency for third-party resources
- Improved loading times for Google services

### 3. Lazy Loading of Third-Party Scripts

#### Google AdSense
**Location**: `apps/client/src/main.ts`

- AdSense script now loads after page becomes interactive
- Uses `requestIdleCallback` when available, with 2-second timeout fallback
- Prevents blocking initial render

#### Firebase Analytics
**Location**: `packages/shared/src/firebase.ts`

- Analytics initialization is now lazy-loaded
- Uses a Proxy pattern to delay actual initialization until first use
- Automatically initializes after DOM is ready with a small delay

**Benefits**:
- Faster initial page load
- Better First Contentful Paint (FCP) and Largest Contentful Paint (LCP)
- Reduced JavaScript execution time on initial load

### 4. Image Optimization

**Locations**: Multiple component files

- Added `loading="lazy"` attribute to images in:
  - `TriviaScene.vue`: Loading gif and inviter avatar
  - `GameCard.vue`: Already had lazy loading implemented

**Note**: Many other images throughout the app can benefit from lazy loading, especially in lists and below-the-fold content.

### 5. FontAwesome Icons Optimization

**Current Status**: FontAwesome icons are imported at build time in `main.ts`

**Recommendation**: Consider tree-shaking unused icons or using dynamic imports for icons that are only used in specific routes/games.

## 📋 Additional Recommendations

### 1. Image Format & Compression

- **Use Modern Formats**: Convert images to WebP or AVIF format for better compression
- **Image CDN**: Consider using a service like Cloudinary or Imgix for automatic optimization
- **Lazy Loading**: Add `loading="lazy"` to all images below the fold

### 2. CSS Optimization

**Current**: All CSS files are loaded in `main.ts`

**Recommendations**:
- Consider code-splitting CSS per route where possible
- Remove unused Bulma CSS (if using a custom CSS framework, you may not need all of Bulma)
- Use CSS-in-JS or scoped styles to reduce initial CSS payload

### 3. Font Loading

- **Font Display Strategy**: Add `font-display: swap` or `optional` to prevent render-blocking
- **Preload Critical Fonts**: Use `<link rel="preload">` for critical fonts
- **Subset Fonts**: Only load the character sets you actually use

### 4. Route-Based Code Splitting

**Current**: Routes are already lazy-loaded ✅

**Additional Optimization**: Consider prefetching routes that users are likely to visit next (e.g., popular games).

### 5. Service Worker & Caching

- Implement a service worker for offline support and better caching
- Cache static assets aggressively
- Use cache-first strategy for images and fonts

### 6. Critical CSS Inlining

- Extract and inline critical CSS for above-the-fold content
- Load non-critical CSS asynchronously

### 7. Reduce JavaScript Execution Time

- **Console.log Removal**: Already configured in build, but verify it's working
- **Dead Code Elimination**: Ensure tree-shaking is working effectively
- **Bundle Analysis**: Run `npm run build -- --mode analyze` to identify large dependencies

### 8. Third-Party Script Optimization

- **Defer Non-Critical Scripts**: Continue to defer AdSense and analytics
- **Use `defer` or `async`**: For any remaining third-party scripts
- **Consider Alternative Loading Strategies**: For example, load AdSense only when user scrolls to ad locations

### 9. Server-Side Optimizations

- **Enable Compression**: Ensure Gzip/Brotli compression is enabled on your hosting
- **HTTP/2 or HTTP/3**: Use modern HTTP protocols
- **CDN**: Consider using a CDN for static assets
- **Caching Headers**: Set appropriate cache headers for static assets

### 10. Monitoring & Measurement

- Set up Real User Monitoring (RUM) to track actual performance
- Monitor Core Web Vitals:
  - Largest Contentful Paint (LCP): Target < 2.5s
  - First Input Delay (FID): Target < 100ms
  - Cumulative Layout Shift (CLS): Target < 0.1

## 🧪 Testing the Optimizations

1. **Build the production bundle**:
   ```bash
   cd apps/client
   npm run build
   ```

2. **Test locally**:
   ```bash
   npm run preview
   ```

3. **Re-run PageSpeed Insights**:
   - Visit: https://pagespeed.web.dev/analysis/https-top-x-co/q8myjxssqc?form_factor=mobile
   - Compare scores before and after

4. **Use Chrome DevTools**:
   - Lighthouse tab for performance audit
   - Network tab to verify chunk splitting
   - Coverage tab to find unused code

## 📊 Expected Improvements

With these optimizations, you should see improvements in:

- **Initial Bundle Size**: 20-30% reduction due to code splitting
- **Time to Interactive (TTI)**: 15-25% improvement
- **First Contentful Paint (FCP)**: 10-20% improvement
- **Largest Contentful Paint (LCP)**: 10-15% improvement

## 🔄 Next Steps

1. ✅ Code splitting and chunking strategy
2. ✅ Resource hints for external domains
3. ✅ Lazy loading third-party scripts
4. ✅ Image lazy loading (partial)
5. ✅ Hero logo fetchpriority optimization
6. ✅ Firebase auth persistence deferred
7. ✅ Additional preconnect hints for Firebase
8. ⏭️ Complete image lazy loading across all components
9. ⏭️ Optimize CSS loading strategy
10. ⏭️ Implement service worker for caching
11. ⏭️ Add image format optimization (WebP/AVIF)
12. ⏭️ Set up performance monitoring

## 🚨 Critical Issues Found (Latest PageSpeed Report - Nov 2025)

**Current Metrics:**
- **LCP**: 16.6s ❌ (Target: < 2.5s) - **CRITICAL**
- **FCP**: 4.6s ❌ (Target: < 1.8s)
- **Speed Index**: 7.1s ❌ (Target: < 3.4s)
- **TBT**: 180ms ✅ (Target: < 200ms)
- **CLS**: 0.069 ✅ (Target: < 0.1)

### Immediate Actions Required

#### 1. Image Optimization (Highest Priority)
The **16.6s LCP** suggests images are loading extremely slowly:

- **Convert images to WebP/AVIF format** - Can reduce image sizes by 25-50%
- **Optimize image sizes** - Use responsive images with `srcset` and `sizes` attributes
- **Add width/height attributes** - Prevents layout shift and helps browser reserve space
- **Consider image CDN** - Use Firebase Storage with image transformations or a service like Cloudinary
- **Preload critical images** - Hero logo should be preloaded in HTML head

#### 2. Firebase Firestore Query Optimization
Multiple Firestore queries on page load are likely contributing to delay:

- **Batch initial queries** - Combine multiple queries into a single request where possible
- **Defer non-critical data** - Load game stats and creators after initial render
- **Use cached data first** - Implement local caching for initial page load
- **Reduce document reads** - Only fetch fields needed for initial render

#### 3. Critical Rendering Path
- **Defer locale initialization** - Don't block app mount waiting for locale
- **Reduce initial JavaScript** - Consider code splitting for store initialization
- **Optimize bundle size** - Review what's included in initial bundle

#### 4. Network Optimization
- **Enable HTTP/2 Server Push** (if using Firebase Hosting)
- **Ensure Gzip/Brotli compression** is enabled
- **Add service worker** for aggressive caching of static assets
- **Use CDN** for static assets (images, fonts, etc.)

## 📝 Notes

- Some optimizations may require additional testing
- Monitor your analytics to ensure lazy-loaded scripts are still working correctly
- Consider A/B testing some optimizations if you're unsure of the impact
- Keep monitoring PageSpeed Insights after deployment to track improvements
- **The 16.6s LCP is the biggest concern** - focus on image optimization first

---

**Last Updated**: 2025-11-25
**Optimization Version**: 1.1
**Latest PageSpeed Score**: Needs significant improvement (LCP: 16.6s)


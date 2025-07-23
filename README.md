# top-x-monorepo

Usage Tips
Build All: npm run build – Runs "build" script in every workspace (apps/client, apps/admin, packages/shared, functions) if defined.
Build Specific: e.g., npm run build:client – Targets one package.
Deploy: npm run deploy – Builds all, then deploys to Firebase.
Install Deps: From root, npm install installs across workspaces (hoists common deps).
Add Dep to Package: e.g., In apps/client: npm install axios --workspace=apps/client.
Troubleshoot: If builds nest unexpectedly (e.g., lib/functions/src), check tsconfig.json "rootDir" and "include" in each package.



npm run dev
pnpm dev --host  
pnpm build
cd ../apps/admin
cd ../apps/client
firebase deploy --only hosting 


cd packages/shared
sudo npm install
npm run build
sudo npm link
cd ../apps/admin
sudo npm link @top-x/shared
cd ../client
sudo npm link @top-x/shared


TOP-X Project Summary

The TOP-X project is a monorepo with two Vue 3 apps (apps/client and apps/admin) using TypeScript, Vite, Firebase (via vuefire), Bulma, and a shared package (packages/shared). The client app is a gaming portal for players and developers, featuring mini-games (e.g., Trivia), user profiles, leaderboards, frenemy searches, and social features, with Firebase authentication via X. The admin app manages game types and games, restricted to admin users. Key updates include:

Shared Package: @top-x/shared provides common types (User, Game, GameType), components (Card.vue, CustomButton.vue), and Firebase config (db).
Client App (apps/client): Includes Home.vue (game list), Profile.vue (user stats), NavBar.vue (user display, login/logout), and router/index.ts with auth guards. Uses Pinia stores (user.ts, trivia.ts) for state management.
Admin App (apps/admin): Features Login.vue (admin-only X login with debug logs), Home.vue (dashboard), GameManagement.vue, and NavBar.vue (admin user display). router/index.ts enforces auth and admin checks.
Functions: Firebase Cloud Functions (functions/src/index.ts) handle backend logic.
Tech Stack: Vue 3 Composition API, TypeScript, Vite, Firebase (auth, Firestore, functions), Bulma, FontAwesome, Pinia, Axios, html2canvas, vue-draggable-plus.
Style: Mobile-first, X.com-inspired dark theme.

https://top-x.co/__/auth/handler?apiKey=AIzaSyAMCJDhKNbPsFPUv04rZSM1LvsUxHugASs&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=http%3A%2F%2Flocalhost%3A5173%2F&v=11.9.0&eventId=8027640721&providerId=twitter.com
https://top-x.co/__/auth/handler?apiKey=AIzaSyAMCJDhKNbPsFPUv04rZSM1LvsUxHugASs&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Ftop-x.co%2F&v=10.14.1&eventId=1620789127&providerId=twitter.com
https://top-x.co/__/auth/handler?apiKey=AIzaSyAMCJDhKNbPsFPUv04rZSM1LvsUxHugASs&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Ftop-x.co%2F&v=10.14.1&eventId=2697766382


http://localhost:5173/games/PyramidTier?game=Pyramid_Cities


Prompt Templates for Game Cloning and Assets in TOP-X

Based on our discussion, here are the self-contained prompt templates for Grok. They incorporate all necessary TOP-X details (tech stack, structure, vibe coding principles, mobile focus, Firebase integration, dark X-inspired theme with Bulma styles) to ensure generated code/assets fit seamlessly. Use placeholders like [GAME_NAME] for customization. The first template focuses on cloning a game and includes generating an assets list. The second is for creating assets (e.g., generating detailed prompts/descriptions for AI image/audio tools, as Grok can't directly generate media but can describe them for tools like Midjourney or Stable Diffusion).

Prompt Template for Grok: Game Clone with Assets List
"You are Grok, assisting with vibe coding for the TOP-X project—a monorepo Vue 3 gaming portal using TypeScript, Vite, Firebase (via vuefire for auth/Firestore/functions), Bulma for styling, Pinia stores (e.g., user.ts, trivia.ts), and a shared package (@top-x/shared with types like User/Game/GameType, components like Card.vue/CustomButton.vue, and Firebase config db). The client app (apps/client) has views/games/[Game].vue for mini-games, integrated with Phaser 3 for 2D scenes. Style: Mobile-first, dark X.com-inspired theme (hex #0d1117 backgrounds, Bulma buttons). Project structure includes src/assets for images/audio, src/components for Vue wrappers, src/stores for state, src/router/index.ts with auth guards.

Generate a complete Phaser 3 mini-game clone in TypeScript, inspired by [ORIGINAL_GAME_NAME e.g., Flappy Bird], adapted to TOP-X vibe: [BRIEF_GAME_VIBE e.g., flying X-bird dodging rivals]. Include:

Core mechanics: [LIST_MECHANICS e.g., touch tap to jump, auto-scroll, obstacle collisions, scoring based on distance].
UI/Visuals: Dark theme buttons/text matching Bulma, animations/particles for feedback.
Integrations: Firebase for score sync (users/{userId}/games/[game_slug], leaderboards collection), Pinia for state, shared types for user data. Mobile optimizations: Phaser.Scale.FIT, touch events, low-resource for mini-games.
Vue 3 wrapper: A [GameName]Game.vue component using Composition API, mounting Phaser in onMounted(), destroying in onBeforeUnmount(), with Firebase auth check.
Full code output: Phaser scene class (preload/create/update methods), then the Vue .vue file. Make modular with comments for extensions.
First, output a detailed assets list needed: Categorize by type (sprites/images, audio, animations/atlases), with descriptions (e.g., 'bird.png: 64x64 pixel art flying character in dark theme'), file paths (src/assets/games/[game_slug]/), and why needed. Suggest free sources or AI generation prompts if custom.

Ensure all code is TypeScript-typed, vibe-coding friendly (intuitive, commented for iterations), and fits TOP-X without external deps beyond installed (Phaser, vuefire, etc.). Output sections: 1. Assets List (table format), 2. Phaser Scene Code, 3. Vue Component Code."

Prompt Template for Grok: Creating Assets
"You are Grok, helping create assets for TOP-X Phaser mini-games via vibe coding. Project details: Vue 3 monorepo with TypeScript/Vite/Firebase/Bulma/Pinia/@top-x/shared. Assets go in src/assets/games/[game_slug] (e.g., images in PNG, audio in MP3/OGG). Theme: Mobile-first dark X-inspired (hex #0d1117, low-contrast for night mode, Bulma-style elements). Focus on 2D mini-games, low-file-size for fast preload.

Based on this assets list from a game clone [PASTE_ASSETS_LIST_FROM_PREVIOUS_PROMPT e.g., bird.png: 64x64 pixel art...]:

For each visual asset (sprites/backgrounds/UI): Generate a detailed prompt for AI image tools (e.g., Midjourney/Stable Diffusion) including style (pixel art/vector, dark theme, X-vibe), dimensions, format (PNG), and variations (e.g., idle/flying animations as sprite sheet).
For audio: Generate prompts for AI audio tools (e.g., Suno/AIVA) or describe free sound effects (e.g., 'jump.mp3: Short boing sound, 1-2s, royalty-free from Freesound').
For animations/atlases: Suggest JSON structure for Phaser texture atlases (e.g., via TexturePacker export).
Output in table: Columns: Asset Name, Type (image/audio/etc.), Generation Prompt/Description, File Path Suggestion, Usage Notes (e.g., preload in Phaser).
Make prompts self-contained, ethical (original designs inspired by [ORIGINAL_GAME_NAME], not copies), and optimized for mobile (small sizes, 8-bit/retro vibe if fits). If no tool access, describe how to create manually in Aseprite/GIMP/Audacity."
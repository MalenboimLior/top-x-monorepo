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
# top-x-monorepo

cd packages/shared
sudo npm install
npm run build
sudo npm link
cd ../apps/admin
sudo npm link @top-x/shared
cd ../client
sudo npm link @top-x/shared


TOP-X Project Summary

The TOP-X project is a monorepo with two Vue 3 apps (apps/client and apps/admin) using TypeScript, Vite, Firebase (via vuefire), Bulma, and a shared package (packages/shared). The client app is a gaming portal for players and developers, featuring mini-games (e.g., Trivia), user profiles, leaderboards, rival searches, and social features, with Firebase authentication via X. The admin app manages game types and games, restricted to admin users. Key updates include:

Shared Package: @top-x/shared provides common types (User, Game, GameType), components (Card.vue, CustomButton.vue), and Firebase config (db).
Client App (apps/client): Includes Home.vue (game list), Profile.vue (user stats), NavBar.vue (user display, login/logout), and router/index.ts with auth guards. Uses Pinia stores (user.ts, trivia.ts) for state management.
Admin App (apps/admin): Features Login.vue (admin-only X login with debug logs), Home.vue (dashboard), GameManagement.vue, and NavBar.vue (admin user display). router/index.ts enforces auth and admin checks.
Functions: Firebase Cloud Functions (functions/src/index.ts) handle backend logic.
Tech Stack: Vue 3 Composition API, TypeScript, Vite, Firebase (auth, Firestore, functions), Bulma, FontAwesome, Pinia, Axios, html2canvas, vue-draggable-plus.
Style: Mobile-first, X.com-inspired dark theme.
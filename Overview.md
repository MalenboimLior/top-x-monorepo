TOP‑X Monorepo Overview
Folder Structure
apps/ – front‑end applications

admin/ – admin dashboard for managing game types, games, rows, items, and questions. Vue 3 + Vite + TypeScript.

client/ – public gaming portal (home, profiles, game views, etc.). Vue 3 + Vite + TypeScript.

packages/shared/ – shared package @top-x/shared containing:

Firebase initialization (app, auth, db, functions, analytics, storage).

Common Vue components (Card, CustomButton, ImageUploader, ImageUploaderCircleSprite).

Utilities (analytics helpers, formatting) and all TypeScript types.

functions/ – Firebase Cloud Functions (Node/TypeScript) with REST/Callable endpoints for leaderboards, user sync with X (Twitter), and score/stat aggregation.

Root files: firebase.json, firestore.rules, firestore.indexes.json, cors.json, tsconfig.json, package.json, etc.

Database
Firestore (rules and indexes in root).

Collections include gameTypes, games, users, with subcollections such as leaderboard and stats under games/{gameId}.

Cloud Functions keep leaderboards and aggregated statistics in sync and provide HTTP endpoints for leaderboard queries and percentile calculations.

Tech Stack
Vue 3 Composition API with TypeScript and Vite.

Firebase: Authentication, Firestore, Cloud Functions, Analytics, Storage.

Bulma for styling, FontAwesome icons.

Pinia for state management.

Axios, html2canvas, vue-draggable-plus, etc.

Monorepo managed via npm workspaces.

Type Management & Shared Components
All types live in packages/shared/src/types and are exported through a barrel file.

tsconfig.json in packages/shared uses emitDeclarationOnly and project references so all apps/functions share the same type definitions (@top-x/shared/types).

Custom type definition (e.g., vue-smooth-dnd.d.ts) lives alongside other types.

Shared Vue components (Card, CustomButton, ImageUploader*, etc.) are published from the same package and imported by both client and admin apps.

Adding Games Using Game Types
Define a game type (admin app → GameTypeRecord.vue):

Provides ID, name, description, and selects a custom config type from CONFIG_TYPES (PyramidConfig, TriviaConfig, ZoneRevealConfig).

Saved to Firestore gameTypes collection.

Create a game (admin app → GameRecord.vue):

Choose a gameTypeId and fill out game fields (name, description, language, image, etc.).

Depending on the custom type selected for its game type, the form exposes specific config editors (e.g., Pyramid rows/items, Trivia questions, ZoneReveal level config).

Saved to games collection, with optional VIP list and community flags.

Client app automatically lists active games from Firestore, displaying community vs. admin games and navigating to the correct game view (/games/PyramidTier, /games/Trivia, /games/ZoneReveal) based on gameTypeId.

Packages/Apps in Context
admin: Management UI—protected routes, game/game-type CRUD, row/item/question editors, uses shared components and types.

client: Player‑facing portal—home listing, profile, games, leaderboards, daily challenges, Pinia stores, analytics tracking.

functions: Serverless APIs—leaderboard queries, user data sync with X, percentile calculations, VIP/around/friends leaderboards.

shared: Cross‑project code—Firebase setup, analytics helper, reusable UI components, full type system for games, users, configs, and utilities.

This structure allows new games or game types to be added centrally in the admin app, propagated via shared types/components, and immediately consumable by the client app and backend functions.
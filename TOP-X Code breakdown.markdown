🧩 TOP-X Project Summary

Overview
TOP-X is a monorepo containing two Vue 3 applications — a player-facing client and an admin dashboard — built with TypeScript, Vite, Firebase (via vuefire), and a shared package for common logic and UI components.
The project delivers a social gaming platform with user-generated mini-games, leaderboards, and profile features.

📦 Monorepo Structure

apps/client — the public gaming portal
apps/admin — the game management dashboard
packages/shared — shared types, components, and Firebase config
functions — Firebase Cloud Functions backend

🔗 Shared Package – @top-x/shared
Provides reusable code across both apps:
Types: User, Game, GameType
UI Components: Card.vue, CustomButton.vue
Firebase Config: Firestore db instance and initialization

🎮 Client App (apps/client)
A player-facing portal with:
Views:
Home.vue — game list
Profile.vue — user stats and achievements
NavBar.vue — login/logout and user info
Auth & Routing: Firebase Auth via X (Twitter); protected routes via router guards
State Management: Pinia stores (user.ts, trivia.ts)
Features:
Trivia and other mini-games
Leaderboards and rival search
User profiles and social sharing

🛠 Admin App (apps/admin)
Admin-only dashboard for game management:
Views:
Login.vue — X login (with enhanced debug logging)
Home.vue — overview dashboard
GameManagement.vue — CRUD interface for games
NavBar.vue — admin user display
Routing: Guards enforce authentication + admin status
☁️ Cloud Functions (functions/src/index.ts)
Implements backend logic for data handling and admin operations via Firebase Functions.

⚙️ Tech Stack
Frontend: Vue 3 (Composition API), TypeScript, Vite
Backend: Firebase (Auth, Firestore, Functions)
UI: Bulma CSS + FontAwesome
State & Utilities: Pinia, Axios, html2canvas, vue-draggable-plus
Style: Mobile-first, dark theme inspired by X (Twitter)

Rewrite code check list:
1. 📦check apps/client/src/stores/locale.ts 
4. 📦📦Fix home page
5. 📦📦remove content system


2. 📦Firebase index
3. 📦upgrade analytics
7. 📦check Sync on X and Post on X
11. 🧩daily chalange rewrite
12. 🎮Trivia logic
15. 📦add game from client - need to think about db rules and functions
16. 📦profile page - optimize reads 
17. 📦add followers / following 
18. 🧩sepreate game logic as much as possible 
19.  make db ruls to keep trivia game secure and all other collections
20 - unlisted

done
6. 🧩Leaderboard service not function
13. Understand Pyramid add item and pyramid state
14. 🧩Service to get game (remove all firebase ref) and get daily chalange (leaderboard from service and component)


8. 🧩rewrite favorite feature 
9. 🧩rewrite game counter feature
10. 🧩rewrite submit socre
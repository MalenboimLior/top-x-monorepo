# TOP-X Project Summary

Monorepo with two Vue 3 apps (`client`, `admin`) using TypeScript, Vite, Firebase, Bulma, and a shared package (`@top-x/shared`).

- **Shared Package**: Exports types (`User`, `Game`, `GameType`), components (`Card.vue`, `CustomButton.vue`), and Firebase config (`db`).
- **Client App**: Gaming portal with `Home.vue` (game list), `Profile.vue` (user stats), `NavBar.vue` (user display, login/logout), and auth-guarded routes. Uses Pinia (`user.ts`, `trivia.ts`).
- **Admin App**: Manages games via `Login.vue` (admin-only X login), `Home.vue` (dashboard), `GameManagement.vue`, and `NavBar.vue`. Routes restrict non-logged-in/non-admin access.
- **Functions**: Firebase Cloud Functions in `functions/src/index.ts`.
- **Tech**: Vue 3 Composition API, TypeScript, Vite, Firebase (auth, Firestore, functions), Bulma, FontAwesome, Pinia, Axios, `html2canvas`, `vue-draggable-plus`.
- **Style**: Mobile-first, X.com-inspired dark theme.

Recent updates improved admin login debugging, added user info in `NavBar.vue`, and enforced route protection in the `admin` app.
# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).


## Shared design tokens & layout utilities

Global CSS tokens and layout helpers live in [`src/styles/tokens.css`](./src/styles/tokens.css) and [`src/styles/layout.css`](./src/styles/layout.css). These files are imported once in [`src/main.ts`](./src/main.ts) so every component can use the shared variables and utilities without additional imports.

- **Tokens (`tokens.css`)** expose breakpoints, container widths, spacing, and typography scales via custom properties (e.g. `var(--space-6)` or `var(--font-size-500)`). Prefer these variables over hard-coded values to keep spacing and type consistent.
- **Layout utilities (`layout.css`)** provide reusable classes:
  - `.layout-container` constrains content width and applies responsive horizontal padding. Add it to wrappers that previously set `max-width` and `margin: 0 auto`.
  - `.section-stack` creates a vertical flex stack with a configurable gap. Override the gap with the `--section-stack-gap` custom property when a section needs tighter or looser spacing.
  - `.surface` applies the shared glassmorphism surface treatment (background, border, padding). Extend it with component-specific effects such as unique shadows.

When adjusting layout or spacing in components, start by checking whether an existing token or utility already matches the need before introducing new values. This keeps future updates centralized in one place.


firebase deploy --only hosting

//rm -rf dist
//cd functions                                    
//npm run build
//firebase deploy --only functions

firebase deploy --only firestore:indexes
npm run dev

npm run build



all is working,

I want to change the trigger for updating "syncXUserData" 
not every time the user doc is updated (as it happen every game played) but every login or new session.

@username scored 231 pts!
🏆|■■■■■■■■□□| 90% 🏆

You are top 90% #SmartestOnX

Can you Top me?
🔝 https://link.com/usuhxjjjx

×Xx×ØŢŤøƤƮƬøþƬøƿ-×»0


📣 Naming + Hashtag Combos:
#SmartestOnX
#TheSmartestChallenge
#XSmartest
#AreYouTheSmartest

The Smartest Challenge – broad appeal, challenge-ready
X’s Smartest – elite vibe, easy to build identity/community around
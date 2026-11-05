# Spec — tests

## End-to-end (Playwright) — `portfolio/e2e/`
- `shared.spec.ts` (tous appareils), `mobile.spec.ts`, `desktop.spec.ts`, helpers dans `helpers.ts`.
- Config `portfolio/playwright.config.ts` : **build de production sur le port 3100** (jamais `pnpm dev` : il compile à la demande → timings instables).
- Projets : `desktop-chromium`, `mobile-chromium` (Pixel 7), `small-mobile-chromium` (iPhone SE) ; `mobile-webkit` (iPhone 13) **en CI uniquement**.
- CI : `.github/workflows/e2e.yml` (lint, tsc, tests, rapport en artefact).

## Pièges connus (déjà rencontrés)
- `scroll-behavior: smooth` rend les éléments « instables » pour Playwright → `gotoHome` l'annule pendant les tests.
- Fausse horloge : l'installer **après** l'hydratation (`html[data-hydrated]`) et utiliser `clock.fastForward`, jamais `runFor` (rejoue chaque frame du canvas).
- WebGL sans GPU : lancer Chromium avec SwiftShader (`chromiumGL` dans la config), sinon `/hub` sature le thread principal.
- Speed Insights renvoie 404 hors Vercel : erreur console ignorée dans `trackErrors`.
- Le conteneur cloud est lent : un « timeout while setting up context » isolé n'est pas un bug ; relancer le test seul pour confirmer. En CI : `retries: 1`.
- WebKit mobile n'a pas de `mouse.wheel` : passer par `window.scrollBy` (voir `mobile.spec.ts`).
- Taps rapides : `locator.tap()` est lent (re-vérifie l'élément) → `page.touchscreen.tap(x, y)` pour les séquences chronométrées ; côté app, compter au `pointerdown` (Safari peut fusionner des taps en double-tap).
- Quitter `/hub` (démontage WebGL logiciel) peut faire planter le navigateur en CI : le test vérifie seulement le lien retour.
- WebKit n'est pas installable dans le conteneur cloud : il ne tourne qu'en CI.

## Non-régressions couvertes
Fiche bloquée après ouvertures/fermetures rapides · page qui glisse sur le côté (éléments fixes compris) ·
header qui intercepte les taps · menu (tap extérieur, scroll, toggles rapides) · scroll restauré et bloqué
derrière la fiche · hover collé après tap · tailles tactiles · Konami / 5 taps · barre repliée après 30 s · son mémorisé.

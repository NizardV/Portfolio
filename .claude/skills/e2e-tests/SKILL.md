---
name: e2e-tests
description: Lancer, écrire ou déboguer les tests end-to-end Playwright du portfolio (desktop, mobile, WebKit en CI). À utiliser pour vérifier une modif d'interface, reproduire un bug mobile, ou quand le workflow « E2E tests » est rouge.
---

# Tests end-to-end

## Lancer (dans `portfolio/`)
- `pnpm test:e2e` — build de prod + serveur sur le port 3100, tous les projets (1 worker en local).
- Un test : `pnpm exec playwright test -g "nom du test" --project=mobile-chromium`.
- Interactif : `pnpm test:e2e:ui`. Échecs : `test-results/<test>/error-context.md` + `test-failed-1.png`.
- Dans le conteneur cloud, Chromium est préinstallé (`/opt/pw-browsers`) mais **pas WebKit** : le projet
  `mobile-webkit` ne tourne qu'en CI.

## Écrire
- Utiliser les helpers de `e2e/helpers.ts` : `gotoHome` (attend l'hydratation, coupe le smooth scroll),
  `horizontalOverflow`, `scrollThrough`, `openFirstProject`, `menuButton`, `mobileMenu`, `useFakeClock`.
- Mettre le test dans `shared` (tous appareils), `mobile` ou `desktop`.
- Pour un bug corrigé, écrire d'abord le test qui le reproduit, puis corriger.
- Fausse horloge : `gotoHome` puis `useFakeClock`, avancer avec `page.clock.fastForward`.

## Déboguer un bug mobile
1. Reproduire avec un script Playwright (`devices['iPhone SE' | 'iPhone 13' | 'Pixel 7']`), en enchaînant les actions.
2. Inspecter : `document.elementsFromPoint(x, y)` (qui reçoit le tap ?), `getBoundingClientRect` image par image
   (élément instable ?), `document.body.style` (scroll verrouillé ?), éléments qui dépassent à droite.
3. Voir les pièges connus dans `.claude/specs/testing.md`.

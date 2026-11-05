# Décisions

Format : date · décision · pourquoi. Ajouter en bas, ne pas réécrire l'historique.

- **2026-11-04 · Pas de refonte 100 % 3D ; un Easter Egg mène à un hub 3D (`/hub`).** Le site reste rapide, lisible pour un recruteur et bon en SEO ; la 3D est un bonus pour qui la trouve. three.js n'est chargé que sur `/hub`.
- **2026-11-04 · Accès au hub : code Konami (clavier) et 5 taps sur le logo (tactile).** Indice discret : texte glitch dans le footer + léger glitch du logo.
- **2026-11-04 · Direction artistique du hub : liminal / Backrooms** (salle jaune, néons, portes entrouvertes), préférée à « terminal » et « cosmos ».
- **2026-11-04 · Le hub ne présente que des projets perso** (ni le portfolio, ni les projets d'école). Une porte = une fenêtre vivante sur un vrai projet plutôt qu'un univers construit de zéro. Première porte envisagée : Vigil.
- **2026-11-04 · Projets d'école (dont CYNA) restent dans la section Projets du site.** Lien démo CYNA direct vers `cyna.nizard.dev`.
- **2026-11-04 · Refonte visuelle** : hero canvas 2D animé (pas de bannière LinkedIn/QR code), frise pour expérience et formation, fiches projets en dialog, sons d'interface coupés par défaut.
- **2026-11-04 · Barre de navigation visible, repliée seulement après 30 s d'inactivité.** Le repli au scroll gênait.
- **2026-11-04 · Suppressions** : bouton CV (non maintenu, liens cassés), section Compétences (les technos sont des badges sur projets et expériences), route `/api/veille` (Vigil la remplacera dans le hub).
- **2026-11-05 · Overlays sans `AnimatePresence`** (exit bloqué observé) → `usePresence` + CSS. Menu mobile toujours monté, positionné en absolu sous la barre.
- **2026-11-05 · Tests end-to-end Playwright** sur le build de production, desktop + Android + petit iPhone (Chromium) + iPhone WebKit en CI.

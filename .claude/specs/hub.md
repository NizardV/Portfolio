# Spec — Hub (Easter Egg, `/hub`)

## Principe
Salle liminale façon Backrooms où chaque **porte** mène à un **projet perso**. Page `noindex`, three.js
(R3F + drei + postprocessing) chargé uniquement ici via `dynamic(..., { ssr: false })`.

## Accès
- Clavier : code Konami ↑↑↓↓←→←→BA n'importe où sur l'accueil (`lib/useKonami.ts`).
- Tactile : 5 taps sur le logo NV en moins de 3 s (`Portfolio.tsx`, `onLogoPointerDown` : compté au pointerdown, Safari peut fusionner des taps rapides).
- Indice : `components/EggHint.tsx` (footer) + `.egg-logo` (globals.css). Statique et discret sous reduced-motion.

## Fichiers
- `src/app/hub/page.tsx` (metadata noindex) → `components/hub/HubClient.tsx` (chargement + bouton RETOUR)
  → `components/hub/HubScene.tsx` (salle, portes, néons, post-processing, overlay « porte verrouillée »).
- `components/hub/universes.ts` : liste des portes `{ id, name, tagline, color, href }`. `href: null` = verrouillée.
- Textures 100 % procédurales (canvas) : aucun asset réseau (CSP).

## Portes
| Porte | Idée | État |
| --- | --- | --- |
| 🟩 Vigil | salle de contrôle, stats live (remplacera l'ancienne route veille) | à faire : nouveau Vigil en prod (vigil.nizard.dev) |
| 🟨 Backrooms | teaser jouable (1-2 couloirs) + bouton « Jouer sur Roblox » | à faire |
| 🟦 Infra | état du VPS en direct, salle serveur | **intégrée à Vigil** (salles serveurs), plus de porte dédiée |

Blindtest abandonné (2026-11-08) : sa porte disparaît.

## Refonte v2 (en cours)
Le hub devient un monde liminal à la première personne : prairie dreamcore → porte blanche → hall d'hôtel (hub)
→ Poolrooms, centre commercial, étage de bureaux (Vigil : poste de surveillance + salles serveurs au sous-sol),
entrée Backrooms glitchée. Design complet et étapes (une PR chacune) : Notion « Design — Hub liminal v2 »
(sous-page de « Hub nizard.dev »).

En construction sur **`/hub/v2`** (noindex, lié nulle part ; `/hub` reste l'ancien hub jusqu'à la bascule).
Code : `components/hub/world/`
- `zones.ts` : carte du monde en **données** (spawn, collisions, portails, ambiance). Ajouter un lieu = une entrée
  ici + une scène dans `scenes/` + une ligne dans `scenes/index.ts` (une scène = un chunk chargé à la demande).
- `World.tsx` : orchestration (voile de transition, pointer lock, son, mobile, plein écran).
- `GameMenu.tsx` (bouton MENU / Échap) : onglets Lieux, Graphismes, Audio, Contrôles ; réglages dans `settings.ts`
  (mémorisés dans le navigateur). Souris : `unadjustedMovement` + filtre des sauts aberrants (bug Chrome/Windows
  qui faisait « recentrer » la vue). Menu : Tab (ouvre et ferme ; Maj+Tab navigue dans le menu) ou Échap. Balancement : suit « réduire les animations » du
  système tant que le joueur n'a pas choisi (`headBob: null`).
- iPhone : pas d'API plein écran (tous les navigateurs iOS = WebKit). `/hub/v2` porte `apple-mobile-web-app-capable`
  + `public/hub.webmanifest` (scope `/hub/`) : « Sur l'écran d'accueil » ouvre le rêve sans barres.
- `Player.tsx` (1re personne, collisions cercle/boîtes de `collision.ts`), `input.ts` (`KeyboardEvent.code` :
  ZQSD et WASD), `TouchControls.tsx` (joystick + glisser), `audio.ts` (ambiances Web Audio synthétisées),
  `Fallback.tsx` (sans WebGL), `env.ts` (reduced motion, tactile, localStorage protégé).
- Piège : dans une scène, `<color attach="background">` / `<fog>` doivent être enfants directs de la scène
  (pas d'un `<group>`), sinon ils s'attachent au groupe et le ciel reste noir.

## Idées en attente
- Bourdonnement des néons (démarre au premier clic).
- Une nouvelle porte par nouveau projet perso (ajout dans `universes.ts`).

Backlog détaillé : fiche Notion « Hub nizard.dev ».

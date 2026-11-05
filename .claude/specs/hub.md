# Spec — Hub (Easter Egg, `/hub`)

## Principe
Salle liminale façon Backrooms où chaque **porte** mène à un **projet perso**. Page `noindex`, three.js
(R3F + drei + postprocessing) chargé uniquement ici via `dynamic(..., { ssr: false })`.

## Accès
- Clavier : code Konami ↑↑↓↓←→←→BA n'importe où sur l'accueil (`lib/useKonami.ts`).
- Tactile : 5 taps sur le logo NV en moins de 2 s (`Portfolio.tsx`, `onLogoTap`).
- Indice : `components/EggHint.tsx` (footer) + `.egg-logo` (globals.css). Statique et discret sous reduced-motion.

## Fichiers
- `src/app/hub/page.tsx` (metadata noindex) → `components/hub/HubClient.tsx` (chargement + bouton RETOUR)
  → `components/hub/HubScene.tsx` (salle, portes, néons, post-processing, overlay « porte verrouillée »).
- `components/hub/universes.ts` : liste des portes `{ id, name, tagline, color, href }`. `href: null` = verrouillée.
- Textures 100 % procédurales (canvas) : aucun asset réseau (CSP).

## Portes
| Porte | Idée | État |
| --- | --- | --- |
| 🟩 Vigil | salle de contrôle, stats live (remplacera l'ancienne route veille) | à faire, **prioritaire** |
| 🟨 Backrooms | teaser jouable (1-2 couloirs) + bouton « Jouer sur Roblox » | à faire |
| 🟪 Blindtest | mini blindtest de 3 extraits | idée (projet pas encore commencé) |
| 🟦 Infra | état du VPS en direct, salle serveur | à faire |

## Idées en attente
- Bourdonnement des néons (démarre au premier clic).
- Une nouvelle porte par nouveau projet perso (ajout dans `universes.ts`).

Backlog détaillé : fiche Notion « Hub nizard.dev ».

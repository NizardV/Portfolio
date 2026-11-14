# Spec — Hub (Easter Egg, `/hub`)

## Principe
Un **rêve liminal à la première personne**, exploré par curiosité. Chaque projet perso y est une branche du monde.
Page `noindex`, three.js (R3F + drei + postprocessing) chargé uniquement ici via `dynamic(..., { ssr: false })`.
Design complet, parcours et étapes (une PR chacune) : Notion « Design — Hub liminal v2 » (sous-page de « Hub nizard.dev »).

Plan validé le 2026-11-14 (Atlas : https://claude.ai/artifact/Rc5UG9PqiQteK6YzhA5ZtX, détails dans Notion) :
prairie → porte blanche → **le Lobby** (hub : labyrinthe jaune) → branches : bureaux isolés (dont 2 pièces pilotées par
Vigil : salle de surveillance, salle serveurs), bassins → canaux → ville rouge (secret), commerce (futur disquaire) →
studio, hôtel-atrium, Dreamcore (trou dans la prairie → salle de jeux → chutes en plein air), porte scellée du jeu
Backrooms. Principe : « cohérent, et en même temps pas » ; pas d'architecture trop proche du réel.

**En prod** : la prairie → porte blanche → **le Lobby** ; ses seuils vers les branches sont fermés (bandeau au clic).
`/hub/v2` (adresse de construction) redirige vers `/hub`.

## Accès
- Clavier : code Konami ↑↑↓↓←→←→BA n'importe où sur l'accueil (`lib/useKonami.ts`).
- Tactile : 5 taps sur le logo NV en moins de 3 s (`Portfolio.tsx`, `onLogoPointerDown` : compté au pointerdown, Safari peut fusionner des taps rapides).
- Indice : `components/EggHint.tsx` (footer) + `.egg-logo` (globals.css). Statique et discret sous reduced-motion.

## Code : `components/hub/world/`
- `zones.ts` : carte du monde en **données** (spawn, collisions, portails, interactions, sol, ambiance). Ajouter un lieu =
  une entrée ici + une scène dans `scenes/` + une ligne dans `scenes/index.ts` (une scène = un chunk chargé à la demande).
- `World.tsx` : orchestration (voile de transition, pointer lock, interactions, son, mobile, plein écran, filtre).
- `GameMenu.tsx` (bouton « MENU · TAB », Tab ou Échap) : onglets Lieux, Graphismes, Audio, Contrôles ; réglages dans
  `settings.ts` (mémorisés dans le navigateur). Tab ouvre et ferme ; Maj+Tab navigue dans le menu.
  Bouton : PC = toujours là mais très transparent, net quand la souris libre approche ; mobile = s'efface après 4 s.
- Souris : filtre des sauts aberrants (bug Chrome/Windows qui « recentrait » la vue). **PAS `unadjustedMovement`** :
  le curseur restait enfermé dans la fenêtre après le menu. F11 détecté (redimensionnement) et reflété dans le menu.
- Balancement / effets de course : suivent « réduire les animations » tant que le joueur n'a pas choisi (`headBob: null`).
- iPhone : pas d'API plein écran (tous les navigateurs iOS = WebKit). `/hub` porte `apple-mobile-web-app-capable`
  + `public/hub.webmanifest` (scope `/hub`) : « Sur l'écran d'accueil » ouvre le rêve sans barres (testé OK, iPhone 16).
- `Player.tsx` (1re personne, collisions cercle/boîtes de `collision.ts`, sol via `Zone.ground`, pas, focus des
  interactions), `input.ts` (`KeyboardEvent.code` : ZQSD et WASD), `TouchControls.tsx` (joystick + glisser),
  `Fallback.tsx` (sans WebGL), `env.ts` (reduced motion, tactile, localStorage protégé).
- Interactions : `Zone.interactables` (E, clic, bouton mobile) ; `blocker` = mur tant que non utilisé ; `locked` = porte
  de projet (secousse + bruit + bandeau). `Portal.requires` / `opens`. État partagé avec les scènes : `state.ts`.
- Son (`audio.ts`, tout synthétisé) : vent à rafales + oiseaux, néons, pas selon `Zone.floor`, grincement, porte verrouillée.
- Qualité : `byQuality` / `QualityContext`. Sans GPU (SwiftShader…), « Auto » = Basse. Filtre de rêve
  (`DreamFilter.tsx` : grain, couleurs adoucies, vignettage) coupé en Basse.
- **Prairie** (`scenes/meadow/`) : relief = `terrain.ts` (fonction TS + même formule en GLSL, utilisée par le sol,
  le joueur et l'herbe) ; herbe instanciée qui suit le joueur, 3 couches en fondu (proche animée ~30 m, moyenne la plus
  dense ~70 m, lointaine peu animée ~135 m) ; ciel en dégradé (direction normalisée PAR PIXEL) + cumulus en sprites ;
  porte blanche fermée à ouvrir (s'ouvre vers le joueur).
- **Lobby** : données dans `world/lobby.ts` (grille 12 × 12 de cases de 5 m, labyrinthe généré avec une graine fixe
  = identique pour tous ; pièces spéciales : grande salle de 10 m et sa galerie inaccessible, fosse + escalier + puits
  d'étagères, estrade + escalier, champ de trous sur un « second lobby » en dessous, couloir écrasant ; plafonds de
  hauteurs variées ; seuils des branches `EXITS`). Le sol (`lobbyGround`) suit escaliers et fosses ; un dénivelé
  sur un côté ouvert devient une rambarde (collision). Rendu `scenes/lobby/` : `geometry.ts` fusionne murs, sols,
  plafonds en quelques maillages (UV en mètres monde), `textures.ts` (papier peint, moquette, taches, faïence, béton).
  Pour vérifier un changement de plan : générer une vue de dessus (transpiler `lobby.ts`) plutôt que marcher.
- Pièges : dans une scène, `<color attach="background">` / `<fog>` doivent être enfants directs de la scène (pas d'un
  `<group>`), sinon le ciel reste noir. Ne jamais retirer une lumière (recompilation des shaders) : intensité 0.
- Tests locaux : tuer tout `next start` resté sur le port 3100 avant de relancer (sinon chunks périmés, page blanche).

## Projets (`components/hub/universes.ts`)
| Projet | Lieu prévu | État |
| --- | --- | --- |
| 🟩 Vigil (+ Infra) | bureaux isolés : salle de surveillance + salle serveurs, pilotées par Vigil | ascenseur fermé dans le Lobby |
| 🟨 Backrooms | porte scellée au fond du Lobby, teaser jouable + « Jouer sur Roblox » | porte scellée dans le Lobby |

Blindtest abandonné (2026-11-08). Backlog détaillé : fiche Notion « Hub nizard.dev ».

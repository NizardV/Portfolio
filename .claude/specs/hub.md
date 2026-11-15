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

**État (PR #65, 2026-11-14)** : les 11 lieux existent en version « telle quelle » (pour se projeter, détails à venir) :
prairie, Lobby, bureaux, bassins, canaux, ville rouge, commerce, hôtel, salle de jeux, collines, lotissement. Le menu
Lieux permet d'y voyager une fois découverts. Restent à brancher : Backrooms (porte scellée) et Vigil (écrans factices).
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
- **Kit d'architecture** (`archi/`) : un lieu = union de formes 2D (boîte inclinée/arrondie, cercle, polygone, capsule)
  moins des solides (piliers, cloisons, maisons de hauteur `h`), en champ de distance signé (`sdf.ts`). La forme placée
  **après** gagne (son sol plat ou en rampe, son plafond). `build.ts` extrait murs (marching squares + RDP), sols,
  plafonds, retombées, contremarches, rambardes (chute > 0,6 m) et plafonniers ; AO en couleurs de sommet.
  `materials.ts` : textures procédurales neutres, teintées par lieu (`Palette` dans `Architecture.tsx`, `Place.tsx`).
  Lumière : plafonniers émissifs (bloom) + 3 à 10 point lights qui suivent le joueur sur les plafonniers proches.
- **Collision** = le même champ : `Space.collide` teste 16 points autour du joueur (le min de l'union sous-estime la
  distance aux raccords : un gradient y bloquait). Marche : 0,45 m max sans rampe.
- **Contours** (`contour.ts`) : le sens de chaque segment se décide sur la **topologie de la grille** (milieux d'arêtes
  + coin intérieur), jamais en ré-échantillonnant le champ, et seules les boucles réellement fermées sont gardées.
  Sinon (bug du 2026-11-14) : boucles ouvertes refermées de force → murs en travers des salles, sols/plafonds manquants.
- **Raccords** (`build.ts`) : les solides (piliers, cloisons) sont dessinés depuis leur **forme exacte** (`solidOutline`,
  = la collision), pas tracés ; les murs suivent les pièces par morceaux de 1 m (25 cm aux changements de pièce), du sol le
  plus bas au plafond le plus haut ; les faces entre deux pièces sont dessinées des deux côtés (à 1 cm) et par morceaux ;
  sols/plafonds débordent de 12 cm derrière les murs et de 10 cm sous la pièce suivante (4 mm en retrait). Sinon : fentes
  de vide aux raccords. `Solid.ghost` = collision seule (la clôture de la salle de jeux, dessinée par la scène).
- **Audit à la 1re personne** : `pnpm hub:audit [LIEU]` (`scripts/hub-audit.mjs`, sans navigateur) lance 144 rayons depuis
  l'œil, tous les 2 m de chaque lieu atteignable, et compte : **vide** (rayon qui s'échappe), **fantôme** (mur traversable),
  **invisible** (blocage sans mur). Plus des rayons **verticaux** (sol / plafond) tous les 25 cm de tout l'intérieur, 8 cm
  sur les raccords entre formes : le sol doit être à `ground`, le plafond à `ceiling` (formes `open` exclues ; sur un
  raccord, toute hauteur entre les deux côtés est acceptée). `--full` liste tous les endroits. À relancer après chaque
  modif de plan. Corrigé le 2026-11-15 (`build.ts`) : fentes de vide aux raccords (une pièce réduite à une bande de
  quelques cm entre deux pièces posées après elle n'était plus tracée par la grille de 40 cm) → chaque forme déborde de
  20 cm, 8 mm en retrait, sur les pièces antérieures dont le sol est aussi haut ou plus haut (plafond aussi bas ou plus
  bas), et la bande sous / au-dessus des pièces suivantes passe à 25 cm (10 cm sous un ciel ouvert) ; sols en rampe
  découpés aux lignes où la pente commence et s'arrête (sinon jusqu'à 17 cm d'écart). Reste : une dizaine d'encoches
  par lieu dans les coins, ~70 rayons « vide » dans le Lobby (raccords de murs).
- **Visite à la 1re personne** : `localStorage["hub-debug-spawn"] = JSON.stringify({ zone, x, z, yaw, pitch })` fait
  démarrer le rêve à cet endroit (captures Playwright d'un lieu précis) et expose `window.__hub` (`debug.ts` :
  scène, zone, `teleport`). Le groupe de l'architecture s'appelle `archi` (exclu de l'audit des objets).
- **Tournée** : `node scripts/hub-tour.mjs <zone>` — vues automatiques, carte, audit des objets posés par les scènes,
  draw calls ; puis revue par l'agent `hub-critic` (`.claude/agents/`) selon
  `skills/hub-level-design/references/liminal-rubric.md`.
- **Construction découpée** (`slice.ts`) : `buildSpace` est un générateur ; `lazyBuilt` le joue par tranches (6 ms en
  préparation, 40 ms dès qu'on est dans le lieu) et renvoie une promesse lue par `use()` dans la scène. `PREPARE` (`scenes/index.ts`) prépare code + géométrie des lieux
  derrière les portes du lieu courant : la porte montre son lieu sans saccade.
- **Piège** : deux formes qui se touchent **sans se chevaucher** créent un mur invisible d'épaisseur nulle. Toujours
  ≥ 0,3 m de recouvrement (`throat()` de `places/common.ts` le fait). Vérifier un plan : transpiler `places/*.ts` en
  .mjs et faire un parcours en largeur avec `fits` + règle de marche, plutôt que marcher.
- **Lieux** : données dans `places/*.ts` et `lobby.ts` (généré, graine fixe, ~160 m : salles repères, remplissage
  déformé, couloirs MST + boucles), rendu dans `scenes/<lieu>/`. Ville rouge, collines, lotissement : `walls: false`
  (plein air, bord invisible).
- **Portes sans fondu** : `Portal.link` → `PortalWindow` (drei `MeshPortalMaterial`, `worldUnits`) montre le lieu
  d'arrivée en direct ; franchir le plan remonte le joueur de l'autre côté (`throughDoor`, pose conservée). Chaque côté
  a besoin d'une « gorge » au-delà de l'ancre. Near caméra 0,03. Seules les chutes (trous Dreamcore) gardent un fondu.
  Retour de la ville rouge : escalier éclairé au bout de l'avenue → porte secrète du Lobby.
- `Atmosphere.tsx` pose fond + brouillard via `useThree` (marche aussi dans les scènes de portail ; un `<color attach>`
  dans un `<group>` laisse le ciel noir). Post-traitement par lieu (`Zone.post`) : bloom, teinte, contraste, grain,
  vignettage. **Pas d'AO** : N8AO plante avec three r172+, SSAO trop bruité. Réverbération par lieu (`Zone.reverb`).
- **Draw calls** (budget 300 par vue, mesuré par `hub:tour`) : `Model.tsx` fusionne chaque modèle Blender par matériau au
  chargement (une maison = ~100 morceaux → < 10) ; les nœuds animés restent à part (`node`, et `moving` pour ceux qu'il
  porte, ex. les chevaux du manège). Feuillages des arbres (`Kit.tsx`) fusionnés par couleur. Ne pas multiplier les
  petits `<mesh>` répétés : fusionner (`mergeGeometries`) ou instancier.
- Pièges : ne jamais retirer une lumière (recompilation des shaders) : intensité 0. Pas de « faisceau » en boîte
  translucide : vu de près, il recouvre l'écran d'un triangle net, même très transparent.
- Tests locaux : tuer tout `next start` resté sur le port 3100 avant de relancer (sinon chunks périmés, page blanche).

## Projets (`components/hub/universes.ts`)
| Projet | Lieu prévu | État |
| --- | --- | --- |
| 🟩 Vigil (+ Infra) | bureaux isolés : salle de surveillance + salle serveurs, pilotées par Vigil | bureaux en place, écrans factices (données publiques agrégées à brancher) |
| 🟨 Backrooms | porte au fond du Lobby, de l'autre côté d'un vide (inatteignable, glitchs) ; plus tard teaser + « Jouer sur Roblox » | en place (prompt sans mention du jeu) |

Blindtest abandonné (2026-11-08). Backlog détaillé : fiche Notion « Hub nizard.dev ».

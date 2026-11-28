---
name: hub-skin
description: Passer un lieu (ou des pièces) du hub liminal (/hub) du kit SDF au modèle Blender « skin » — murs, sols, plafonds, plinthes, poutres et plafonniers construits proprement depuis le plan du jeu. Règles de construction établies et guide de dépannage (symptôme → cause → correctif). À utiliser pour tout lieu à habiller ou tout bug de construction d'un lieu déjà habillé.
---

# Habiller un lieu (skin)

Le plan peut être fou (le *quoi*), la construction est toujours propre (le *comment*) : voir la règle d'or de
`../hub-level-design/references/liminal-rubric.md`. Le skin construit dans Blender ce que le kit dessinait au
marching squares : arêtes droites, raccords nets, plafonniers dans les dalles.

## Chaîne (depuis `portfolio/`)
1. Plan : `skin: "<nom>"` sur chaque forme concernée (`places/<lieu>.ts` ou `lobby.ts`). Nom `^[a-z0-9_-]+$`.
   Plafonds : hauteur standard `STD_CEIL` (2,75) pour couloirs et remplissages ; les connecteurs (rampes, seuils,
   vestibules) prennent le plafond de la grande pièce qui les contient.
2. `pnpm hub:plan <LIEU> <nom>` → `tools/blender/plans/<nom>.json`.
3. `"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --background --python tools/blender/skin.py -- <nom>`
   → `public/hub/models/skins/<nom>.glb` (lobby : 17 k triangles, 1,2 Mo) **et sa lumière précalculée**
   `<nom>-light.jpg` (`tools/blender/bake.py`, Cycles sur la carte graphique, ~7 min pour le lobby ; `SKIN_BAKE=0` pour
   itérer vite sur la géométrie, `BAKE_SIZE`/`BAKE_SAMPLES`/`BAKE_WATTS`/`BAKE_SMOOTH` pour régler).
4. Scène : `const skin = useSkin("<nom>", PALETTE)` (`archi/Skin.tsx`), `<primitive object={skin.model} />`, panneaux
   `skin.panels` fusionnés dans ceux d'`Architecture` ; précharger dans `PREPARE` (`scenes/index.ts`).
5. Recette : skill `hub-qa` (audit à 0, dense, critique).

## Règles de construction (`tools/blender/skin.py`) — ne pas les défaire
- **La pièce posée après possède le sol** là où deux pièces se recouvrent (comme le jeu).
- **Le plafond le plus haut gagne** (pas de « caisson » dans les seuils) : un découpeur ne monte qu'au plafond de la
  pièce suivante.
- **Rampes en dernier** dans l'ordre du plan (`allShapes = [...corridors, ...fillers, ...landmarks, ...features,
  ...vestibules, ...ramps]`) : sinon une pièce posée après coupe la rampe (falaise).
- **Découpeurs rétrécis de 5 mm** : jamais de faces de contact coplanaires (sinon faces internes = murs en plein vide).
- **Solveur booléen EXACT** (`SKIN_SOLVER`) : Manifold perd des sols.
- **Trianguler avant de classer** les faces (centre d'une face concave hors de la face) ; garder une face seulement si
  une pièce habillée la possède et qu'il n'y a pas de volume derrière.
- UV en mètres ; plafond sur la grille de dalles de sa pièce (origine au centre, angle de la pièce).
- Plinthes 12 cm (décalées de 1,5 cm) ; poutres 12 × 8 cm aux raccords de grilles de plafond **différentes** ;
  plafonniers = 1 dalle (60 cm) ou 2 × 2 dalles dans les grandes pièces (plafond > 3,6 m ou > 150 m²), pas de
  max(3|4 dalles, lights/0,6) × 0,6, 30 cm des murs, éteints ≤ min(0,15, dead de la pièce). Stockés en extras
  `panels` (export `extras=True`).
- **Lumière précalculée** (2026-11-22) : une lumière de zone sous chaque plafonnier allumé, rebonds compris, cuite dans
  une 2e couche d'UV (`lightmap`, TEXCOORD_1) ; stockée en sRGB divisée par 4 (`SCALE` = `LIGHTMAP_SCALE` de
  `Skin.tsx`) ; lissée (flou gaussien limité aux pixels cuits). Côté jeu : `MeshBasicMaterial` texture × lumière cuite,
  les lampes mobiles (`Architecture`) n'éclairent plus que les objets (intensité de la palette baissée en conséquence).
  Les lampes mobiles près du plafond crament les dalles : ne pas revenir à l'éclairage dynamique des murs.
- **Une seule grille de dalles par lieu** (2026-11-22, choix de l'utilisateur) : même sens, même origine partout
  (`skin.py` `GLOBAL_GRID`, `SKIN_GRID=room` pour revenir aux grilles par pièce) ; une pièce de biais a ses dalles
  coupées le long de ses murs ; pas de poutres. Néons sur un même rythme : un tube toutes les 4 dalles, un 2 × 2 toutes
  les 8 dans les grandes salles ; on retire un néon qui tomberait sur un pilier ou à moins de 30 cm d'un mur.
- **Murets posés sur le plan** (`archi/murets.ts`) : le jeu en tire la collision, `skin.py` les dessine depuis
  l'export (`murets`). Murs côte à côte à quelques cm alignés (`lobby.ts alignWalls`, audit `jog`).
- **Balcons, pas de fentes** (2026-11-22, choix de l'utilisateur) : un niveau surélevé ou en contrebas est entouré d'un
  hall au sol 0 sous son plafond haut (`lobby.ts` : `ring`, `walk-hall`, posés avant l'estrade/la place, hors `ROOMS`) ;
  ses bords sont fermés par des **murets** (1 m, 15 cm, enduit uni teinté comme le mur, tablette ; `skin.py murets()`),
  jamais par des garde-corps métalliques (le kit n'en pose plus dans un skin). Une rampe par côté (pas deux à moins de
  5 m), éclairée.
- **Pas de taches répétées dans les textures de base** (moquette, papier peint) : répétées à chaque carreau, elles
  dessinent une grille. L'usure se pose à la main, là où elle a du sens.
- **Jamais de texture empaquetée dans le .glb** : le chargeur crée des URL `blob:` bloquées par la CSP ; le jeu habille
  les matériaux nommés (`f:<sol>`, `w:<mur>`, `c:<plafond>`, `trim`, `beam`) avec ses textures.
- Côté kit (`archi/build.ts`) : une pièce habillée n'a plus ni murs (décision au milieu du segment + 5 cm), ni sols,
  plafonds, soffites, contremarches, panneaux ; les garde-corps restent au kit.

## Dépannage
| Symptôme | Cause | Correctif |
| --- | --- | --- |
| Textures absentes, erreur CSP `blob:` | images empaquetées dans le glb | ne pas exporter d'images ; matériaux nommés |
| Murs debout en plein milieu d'une salle | faces internes de l'union (contacts coplanaires) | découpeurs rétrécis 5 mm + test « volume derrière » |
| Mur manquant ou en trop à une ouverture concave | classement sur le centre d'une face concave | trianguler avant de classer |
| Mur présent deux fois ou absent | kit et Blender décident chacun de leur côté | le kit décide au milieu du segment + 5 cm, Blender suit le propriétaire |
| Trou dans le sol sous une pièce | solveur Manifold | `EXACT` |
| Falaise au milieu d'une rampe | pièce posée après la rampe qui la recouvre | rampes en dernier dans `allShapes` |
| « Caisson » de plafond bas dans une porte | plafond du seuil plus bas que la pièce | plus haut plafond gagne (skin + audit alignés) |
| Audit : faux plafonds bas partout | l'audit compte les poutres | `readGlb` saute le nœud « trims » |
| Halos blancs autour des néons, plafond cramé | lampes mobiles à 35 cm des dalles | lumière précalculée (`bake.py`) |
| Lumière cuite incohérente, taches partout | Cycles cuit à travers la couche d'UV **active** : c'était celle des textures (en mètres, superposée) | couche `lightmap` active pendant le calcul, la 1re rétablie après |
| Grille de taches sombres sur un sol | tache dessinée dans la texture de base, répétée à chaque carreau | textures de base sans taches |
| Plafonniers de travers / à cheval sur 2 dalles | lumières hors de la grille de la pièce | grille de la pièce (origine, angle), compte `skewed` de l'audit |
| Néons décalés de ~1/3 de dalle partout (pas sur le plan, à l'écran) | l'export glTF écrit V = 1 − v : grille de texture décalée de 1 mod 0,6 = 40 cm | `skin.py` écrit 1 − v avant l'export ; `skewed` mesure sur les UV du modèle |
| Néons tournés par rapport aux dalles dans une pièce tournée | panneau tourné de +a, dalles de −a (`tileFrame`) | `Architecture` tourne de −a |

Nouveau piège trouvé ? L'ajouter à ce tableau **et** en faire un contrôle (skill `hub-bug-triage`, étape 4).

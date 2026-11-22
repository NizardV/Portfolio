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
   → `public/hub/models/skins/<nom>.glb` (lobby : ~35 s, 17 k triangles, < 1 Mo).
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
| Plafonniers de travers / à cheval sur 2 dalles | lumières hors de la grille de la pièce | grille de la pièce (origine, angle), compte `skewed` de l'audit |

Nouveau piège trouvé ? L'ajouter à ce tableau **et** en faire un contrôle (skill `hub-bug-triage`, étape 4).

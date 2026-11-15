---
name: hub-level-design
description: Concevoir ou retravailler une zone du hub liminal (/hub) de bout en bout — plan validé, points d'intérêt, modèles Blender et ressources CC0/CC-BY, construction avec le kit d'architecture, vérification à la 1re personne, sous-PR. À utiliser pour tout rework de zone (prairie, Lobby, Dreamcore, Motion, Edward, Pipedreams, bassins…) ou toute nouvelle zone.
---

# Concevoir une zone du hub

Objectif de chaque zone : **surprendre, rendre curieux, favoriser au maximum l'exploration**. Principe d'ambiance :
« cohérent, et en même temps pas » ; pas d'architecture trop proche du réel. Rework lourd assumé.

## 0. Contexte
- Lire `.claude/specs/hub.md` (kit, pièges) et la page Notion « Design — Hub liminal v2 » (références par zone,
  retours de l'utilisateur, ce qui a plu : ex. la zone paisible de Dreamcore).
- Les PR du hub sont **empilées** sur la branche d'intégration #65 ; rien ne part en prod avant que l'ensemble soit
  propre. Une sous-PR par zone, base = la sous-PR précédente.

## 1. Plan (à faire valider AVANT de coder)
Publier un Artifact (comme l'« Atlas du rêve ») avec, pour la zone :
- **plan de dessus** : salles, passages, niveaux (couleur = hauteur), échelle en mètres ;
- **non linéaire** : au moins 2 itinéraires vers la sortie, des boucles, des culs-de-sac qui récompensent, des
  raccourcis qui ne s'ouvrent qu'une fois découverts ; jamais un simple couloir de salles en file ;
- **points d'intérêt** (6 à 12 par zone), chacun avec un **niveau de découverte** :
  - *évident* : visible depuis le chemin principal, attire l'œil (lumière, couleur, verticalité, son) ;
  - *à chercher* : hors du chemin, derrière un détour, en hauteur, au fond d'une salle annexe ;
  - *caché* : passage discret, recoin sombre, faux mur, vue lointaine inatteignable, élément qui change ;
- **lignes de vue** : ce qu'on aperçoit de loin pour donner envie d'y aller ;
- **ambiance par sous-zone** : lumière, couleur, matériaux, **son** (l'ambiance sonore doit évoluer d'une
  sous-zone à l'autre, pas une boucle unique pour toute la zone) ;
- maquette greybox three.js dans l'Artifact si utile.
Attendre la validation (ou les corrections) de l'utilisateur.

## 2. Ressources : chercher avant de modéliser
1. **CC0** (aucune mention requise) : Poly Haven (modèles, textures, HDRI ; API), ambientCG (textures), Kenney,
   Quaternius, kits liminaux CC0 (itch.io, opengameart). Vérifier la licence **sur la page** de chaque ressource.
2. **CC-BY** accepté **avec crédit** : ajouter l'entrée dans `components/hub/world/credits.ts` (auteur, titre, lien,
   licence), affichée dans l'onglet **Crédits** du menu (Tab). Refuser tout ce qui porte « NoAI », NC, ND ou une
   licence floue.
3. Sinon, **modéliser dans Blender** (étape 3).
Fichiers : `portfolio/public/hub/models/<zone>/*.glb`, textures `portfolio/public/hub/textures/`. Jamais de
ressource chargée depuis un domaine externe (CSP).

## 3. Modéliser dans Blender (par script, réutilisable)
- Blender : `C:\Program Files\Blender Foundation\Blender 5.3\blender.exe`, sans interface :
  `blender --background --python portfolio/tools/blender/<generateur>.py -- <args>`.
- Un **générateur paramétrable par famille** (`tools/blender/`) : maisons, manège, arbres, panneaux, clôtures,
  lampadaires, tuyaux, mobilier… Paramètres = dimensions, couleurs, usure, inclinaison. Réutilisé dans toutes les zones.
- Formes : biseaux (modificateur Bevel), subdivisions là où c'est rond, pas de « tout cubique » ; légères
  imperfections (inclinaisons, irrégularités) qui rendent le décor étrange.
- Matériaux : Principled BSDF uniquement (seul ce qui passe en glTF) ; textures ≤ 1024 px, JPEG pour la couleur.
- **Éclairage précalculé** pour les décors statiques importants : bake (Cycles) de la lumière/AO dans une texture,
  appliquée en `lightMap`/`aoMap` côté Three.js.
- **Vérifier** : rendu d'aperçu PNG (EEVEE) de chaque modèle, le regarder, corriger avant d'intégrer.
- Export : `.glb`, `export_apply=True`, Draco niveau 6, pas de caméras ni de lumières. Budget : < 1 Mo et < 30 k
  triangles par modèle, instancier les objets répétés.
- Détails d'export et d'optimisation : skill `blender-web-pipeline`.

## 4. Construire
- Plan : `components/hub/world/places/<zone>.ts` avec le kit `archi/` (voir le spec). Règles :
  ≥ 0,3 m de recouvrement entre formes qui se touchent ; solides = collision exacte ; `ghost` pour les collisions
  d'objets dessinés par la scène ; `ceilMat` pour un plafond différent du sol.
- **Tout objet qu'on peut heurter a sa collision** dès sa création : un solide `ghost` (cercle pour un tronc et ses
  feuilles basses, boîte pour un meuble, capsule pour un garde-corps), positions partagées entre plan et scène (ex.
  `props()` et les constantes exportées de `places/playground.ts`). Garder ≥ 1 m de passage (joueur : 70 cm de
  diamètre). `hub:tour` signale les objets traversables restants.
- Scène : `scenes/<zone>/` ; modèles via `useGLTF(url, "/draco/")` (décodeur servi localement depuis `public/draco/`),
  préchargés avec `PREPARE` (`scenes/index.ts`).
- Son : nouvelle ambiance dans `audio.ts` si besoin, **et** changement d'ambiance par sous-zone.
- Lumière : la pool suit le joueur ; limiter les point lights propres à la scène (≤ 8 visibles).

## 5. Vérifier comme un joueur
Grille commune : `references/liminal-rubric.md` (bugs, langage liminal, envie d'explorer, finition, sévérités).
- `pnpm hub:audit <LIEU> [--full]` : l'**architecture** — tout atteignable, 0 mur fantôme, vide < 0,05 % des rayons,
  pas de blocage invisible, 0 trou de sol ou de plafond (rayons verticaux, raccords compris).
- `node scripts/hub-tour.mjs <zone> [--only V03,V52]` (`pnpm hub:tour`, ~20 s par vue, en arrière-plan ; `--only` = revoir
  ces vues de la dernière tournée après une correction) : les
  **objets posés par les scènes** (traversables, flottants, enfoncés, dans un mur), une carte de dessus
  (`map.png` : zones inaccessibles en bleu nuit), des vues choisies seules (arrivée, interactions, passages, coins les
  plus éloignés, objets signalés), draw calls par vue, erreurs console. Sortie : `<tmp>/hub-tour/<zone>/`.
  Rebuild automatique si les sources sont plus récentes ; `--port 3101` si un vieux serveur occupe 3100.
- **Revue à froid** : lancer l'agent `hub-critic` sur ce dossier (il n'a pas construit la zone, il lit la grille et
  chaque planche). Trier ses constats avec l'utilisateur, corriger par lots, relancer tournée + critique jusqu'à
  0 bloquant. Ne pas se contenter de sa propre relecture des captures : c'est le biais qu'on évite.
- Vue ponctuelle à la main : `localStorage["hub-debug-spawn"] = JSON.stringify({ zone, x, z, yaw, pitch })` ; avec
  ce réglage, `window.__hub.teleport(x, z, yaw, pitch)` déplace la caméra sans recharger (`debug.ts`).
- `tsc`, `eslint`, `next build`, E2E hub (`e2e-tests`). Tuer tout `next start` resté sur le port 3100 avant de relancer.

## 6. Livrer
- Sous-PR empilée (skill `ship-change` pour l'auteur des commits, la description en français, le suivi CI toutes les
  5 min). Ne jamais merger sans « merge » explicite.
- Résumé à l'utilisateur : ce qui a changé, les points d'intérêt (sans révéler les cachés s'il veut les trouver),
  le lien de preview, ce qui n'a pas pu être testé.
- Mettre à jour la page Notion (retours traités, reste à faire) et `.claude/specs/hub.md` si le kit a changé.

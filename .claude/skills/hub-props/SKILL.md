---
name: hub-props
description: Modéliser dans Blender, par script, les objets posés dans le hub liminal (/hub) — mobilier, appareils, signalétique, souvenirs, tout ce qui n'est ni mur ni sol ni plafond ni structure — aux dimensions réelles, avec planche de contrôle 4 angles, export groupé par lieu et collisions. À utiliser pour tout nouvel objet ou pour remplacer un objet fait en primitives three.js.
---

# Modéliser les objets du hub

Décision du 2026-11-22 : **tout objet** autre que murs, plafonds et structure est modélisé dans Blender (plus de
`boxGeometry`/`cylinderGeometry` assemblés dans les scènes). Le décor « fait main » est ce qui manquait au rendu
(« on dirait généré par IA / Roblox »). On procède **lieu par lieu**, en même temps que son skin (skill `hub-skin`).

## 1. Chercher avant de modéliser
Un modèle CC0 (Poly Haven, Kenney, Quaternius, ambientCG pour les textures) qui convient → l'adapter dans Blender
(échelle, matériaux nommés, triangles). Licence vérifiée sur la page ; CC-BY seulement avec crédit dans
`components/hub/world/credits.ts`. Sinon, script.

## 2. Un générateur par famille (`tools/blender/props/<famille>.py`)
- Paramètres plutôt que copies : une chaise de bureau → 3 variantes (hauteur, accoudoirs, usure) par arguments.
- Pièces communes dans `tools/blender/lib.py` (box biseauté, cyl, tube, `bevel`, `mat`…) ; ajouter là toute pièce
  réutilisable (pied, poignée, vis, grille d'aération) au lieu de la refaire.

## 3. Règles de modélisation
- **Dimensions réelles en mètres** (relever une cote de référence : chaise d'assise 45 cm, bureau 74 cm, porte 2,04 m,
  interrupteur 1,10 m, prise 30 cm). L'œil du joueur est à 1,65 m.
- **Origine au point d'appui** : centre de la base au sol (z = 0), face avant vers −Y Blender (−z jeu), pour que la
  scène pose l'objet sans décalage. Objet mural : origine au dos, à sa hauteur de pose notée dans le nom ou les extras.
- **Arêtes biseautées** (2 à 10 mm selon la taille) : c'est ce qui accroche la lumière et retire l'effet « bloc ».
- Matériaux Principled BSDF **nommés** et partagés par lieu (`metal_brushed`, `plastic_beige`, `wood_veneer`…) ;
  textures en fichiers JPEG/WebP ≤ 1024 px, **jamais empaquetées** (CSP `blob:`) ; pas de Draco/KTX2 (CSP sans
  `wasm-unsafe-eval`).
- Budget : 500–3 000 triangles par objet (souvenir mis en scène : jusqu'à 8 000). Pas de faces cachées sous l'objet
  posé au sol.
- Usure plausible et localisée (coins, bas, poignées), jamais uniforme.

## 4. Planche de contrôle (obligatoire avant intégration)
Rendu EEVEE 4 angles (face, 3/4, profil, dessus) à côté d'une silhouette de 1,75 m et d'une grille de 60 cm →
`tools/blender/previews/props/<objet>.png`. La regarder : échelle, biseaux, matériaux, rien de « tout cubique ». La
passer à l'agent `hub-critic` avec la grille (catégorie D) quand plusieurs objets sont prêts.

## 5. Export et intégration
- Un `.glb` par lieu : `public/hub/models/props/<lieu>.glb`, un nœud nommé par objet (le jeu les instancie par nom).
- Côté jeu : charger une fois, instancier les répétitions (`Model.tsx` fusionne par matériau), précharger dans `PREPARE`.
- **Collision dès la pose** : solide `ghost` aux cotes de l'objet dans le plan, positions partagées plan/scène.
- Recette : skill `hub-qa` (l'audit des objets doit rester à 0 : ni traversable, ni flottant, ni enfoncé, ni dans un mur).

## Coût, pour arbitrer
Jeu : neutre ou gain (moins de draw calls qu'un assemblage de primitives, instanciation). Travail : ~1 famille par
séance de 15–30 min avec la planche ; d'où les familles paramétrées et l'ordre lieu par lieu.

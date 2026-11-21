# Grille liminale — ce qu'on vérifie sur chaque vue

Référence commune au constructeur (avant de livrer) et à l'agent `hub-critic` (revue à froid). Principe du hub :
**« cohérent, et en même temps pas »** — l'étrangeté doit avoir l'air *voulue*, jamais *ratée*. Un bug visuel casse
le rêve ; une anomalie bien posée le renforce. La question à se poser devant chaque bizarrerie : « un joueur
croira-t-il que c'est fait exprès ? »

## Règle d'or : la corruption touche le *quoi*, jamais le *comment* (2026-11-21)

- Le **quoi** (le plan, la logique) peut être fou : pièce plus grande que son bâtiment, couloir qui boucle, estrade au
  milieu de nulle part. Le **comment** (la construction) est toujours propre, comme dans un vrai bâtiment : c'est ce qui
  fait les Backrooms de Kane Pixels.
- **Une étrangeté voulue est déclarée** dans les données du plan, avec un nom (`repeat`, `decale`, `papier-tourne`,
  `trop-haut`…), entière, rare (1 ou 2 par pièce), au service de l'histoire, et si possible elle disparaît quand le
  souvenir revient. **Tout ce qui est bizarre et non déclaré est un bug.**
- Un « accident heureux » repéré en jeu peut être **promu** : on le déclare, puis on le construit proprement.
- Contrôles automatiques de construction (`hub:audit`) : *hanging* (pan dont le bas ne repose sur rien), *floating*
  (plafond abaissé qui pend au-dessus d'un sol libre), *rail* (garde-corps dans un mur), *skewed* (plafonnier hors de la
  grille des dalles de sa pièce). Aucun n'est jamais voulu.
- **Avant de montrer une preview** : ces contrôles à zéro (hors étrangetés déclarées), critique sans bloquant ni
  important. L'utilisateur juge l'ambiance, il ne fait pas la recette.

## A. Bugs (toujours à corriger)
- Objet qui flotte, s'enfonce dans le sol ou traverse un mur sans intention lisible.
- Objet qu'on traverse en marchant (pas de collision) ou mur invisible qui bloque.
- Z-fighting (deux surfaces qui scintillent), faces manquantes, intérieur d'un modèle visible, normales inversées
  (face noire ou transparente), texture étirée ou à l'échelle absurde, couture de texture évidente.
- Trou de vide (fond noir ou couleur de brouillard) à un raccord sol/mur/plafond.
- Lumière qui fuit à travers un mur, zone noire sans raison, plafonnier allumé sans aucune lumière autour.
- Porte, escalier ou ouverture qui ne mène nulle part sans que ce soit mis en scène.
- Échelle incohérente d'un objet du quotidien par rapport au joueur (œil à 1,65 m) : porte à 3 m, chaise géante,
  interrupteur à 2 m — sauf si c'est le sujet de la pièce et que tout autour le dit.

## B. Langage liminal (ce qui rend un espace « backrooms »)
- **Proportions familières, agencement impossible** : les détails à l'échelle humaine sont justes (portes ~2 m,
  plinthes, prises, dalles de plafond 60 cm, marches 17 cm) ; c'est l'agencement qui dérape (couloirs trop longs,
  pièces sans fonction, symétries répétées, boucles).
- **Répétition + une anomalie** : un motif régulier (dalles, néons, portes identiques) et, de temps en temps, UNE
  chose qui cloche (néon mort, porte murée, mobilier déplacé). Dix anomalies au même endroit = bruit, plus d'effet.
- **Vide habité** : peu d'objets, mais chacun raconte un usage passé (chaise tournée vers un mur, gobelet oublié).
  Un espace vide sans indice est juste vide ; un espace encombré n'est plus liminal.
- **Usure plausible** : taches, dalles décalées, papier peint décollé, poussière dans les coins — concentrée là où
  elle aurait du sens (bas des murs, près des aérations), pas uniforme.
- **Lumière** : néons froids légèrement verts/jaunes, éclairage plat et uniforme ; les variations (une zone plus
  sombre, un néon qui grésille) servent de repères ou de tension. Pas de lumière « jolie » de jeu AAA qui contredit
  l'ambiance.
- **Silence et son** : bourdonnement, pas qui résonnent selon la taille de la pièce ; chaque sous-zone sonne
  différemment.
- **Pas de monstre, pas de gore** : l'inquiétude vient de l'espace, pas d'un jump scare.

## C. Lisibilité et envie d'explorer
- Depuis chaque point de vue, au moins **une chose attire l'œil** au loin (lumière différente, couleur, ouverture,
  verticalité) : sinon la vue est morte.
- Les points d'intérêt *évidents* se voient depuis le chemin principal ; les *cachés* ont un indice discret.
- Les passages se lisent comme des passages (cadre, changement de lumière ou de sol) ; un cul-de-sac récompense.
- La carte (`map.png`) : pas de grandes zones intérieures inaccessibles par erreur (bleu nuit), pas de couloir
  unique en file, des boucles.

## D. Finition
- Raccords propres entre kit d'architecture et modèles Blender (même teinte de lumière, même échelle de texture).
- Matériaux cohérents dans une même sous-zone ; transitions de sol nettes (plinthe, seuil) plutôt que franches
  sans raccord.
- Rien de « tout cubique » : biseaux, légères irrégularités.
- Performance : < 300 draw calls et < 1,5 M triangles sur la pire vue.

## Sévérité
- **bloquant** : bug de catégorie A visible depuis un chemin normal, ou qui bloque / fait sortir le joueur.
- **important** : casse l'ambiance ou la lisibilité (B, C) sur une zone entière ou un point d'intérêt.
- **mineur** : finition (D), détail visible seulement en cherchant.
- **idée** : proposition pour surprendre davantage, sans rien retirer de l'existant.

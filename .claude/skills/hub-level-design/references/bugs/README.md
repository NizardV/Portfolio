# Galerie de bugs du hub

Ce que l'utilisateur a déjà dû signaler : le critique (`hub-critic`) lit cette page avant chaque revue et cherche ces
motifs en priorité. Une entrée = un motif (pas un endroit), avec une capture annotée `<id>.jpg` quand on en a une, le
symptôme à l'image, et le contrôle automatique qui le couvre désormais (skill `hub-bug-triage`, étape 4).

| id | Motif, tel qu'il se voit | Contrôle automatique |
| --- | --- | --- |
| `seam-void` | fente de vide (noir ou brouillard) au raccord sol/mur/plafond entre deux pièces | audit `void`, `floor`, `ceiling` ; dense `voidBlob` |
| `phantom-wall` | pan de mur debout au milieu d'une salle, ou mur qu'on traverse | audit `phantom` |
| `invisible-wall` | on bute sur rien | audit `invisible` |
| `hanging` | pan de mur ou retombée dont le bas ne repose sur rien | audit `hanging` |
| `ceiling-caisson` | plafond qui descend en caisson dans un seuil / une porte | audit `ceiling` (plus haut plafond gagne) |
| `ramp-cliff` | marche ou falaise au milieu d'une rampe | audit `floor` |
| `light-offgrid` | plafonnier à cheval sur deux dalles, de travers, ou rectangle étiré qui ne suit pas les dalles (signalé par l’utilisateur le 2026-11-22 : export glTF qui inverse V → grille décalée de 40 cm ; rotation +a au lieu de −a) | audit `skewed`, mesuré sur la texture affichée (UV du modèle, inversion glTF comprise) |
| `light-halo` | halo blanc cramé autour d'un plafonnier ou sur un mur proche | dense `blown` |
| `rail-in-wall` | garde-corps qui rentre dans un mur | audit `rail` |
| `prop-float` | objet qui flotte ou s'enfonce, ombre décollée | tournée `floating`, `sunk` |
| `prop-walkthrough` | objet qu'on traverse | tournée `traversable` |
| `zfight` | deux surfaces qui scintillent au même endroit | dense `zfight` |
| `wall-deformed` | mur ondulé, arête en escalier, coin arrondi non voulu (ancien kit marching squares) | passage au skin (`hub-skin`) ; critique |
| `ai-look` | objet trop simple « en primitives », sans biseau ni usure | passage aux objets Blender (`hub-props`) ; critique |
| `pillar-misplaced` | pilier au milieu d'un passage ou qui ne porte rien de lisible | critique |

Ajouter une capture : enregistrer `<id>.jpg` ici (capture de la touche P ou vue de tournée, ≤ 300 Ko), entourer le
défaut si besoin, et compléter la ligne.

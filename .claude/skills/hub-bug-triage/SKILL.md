---
name: hub-bug-triage
description: Traiter un bug du hub liminal (/hub) signalé par l'utilisateur (touche P en jeu, capture, description) ou trouvé par la recette — reproduire la vue exacte, classer (construction, étrangeté à déclarer, goût), corriger, puis transformer le bug en contrôle automatique pour qu'il ne revienne nulle part.
---

# Traiter un bug du hub

Principe : **un bug = une règle**. Chaque bug que l'utilisateur a dû voir est un trou dans nos contrôles ; le corriger
à un endroit ne suffit pas, il faut qu'il ne puisse plus exister ailleurs.

## 1. Récupérer le signalement
- **Touche P** (testeurs : `/hub?dev=1` une fois, `?dev=0` pour couper) : enregistre une capture
  `hub-bug_<zone>_<x>_<z>_<yaw>_<pitch>.jpg` dans les Téléchargements (`C:\Users\Nizard\Downloads`) et copie
  `<zone> x,z,yaw,pitch`. Lister les nouveaux fichiers `hub-bug_*` ; la position est dans le nom.
- Capture sans position : retrouver le lieu à l'œil, puis la position avec la carte (`map.png` d'une tournée).

## 2. Reproduire
`node scripts/hub-tour.mjs <zone> --at "x,z,yaw,pitch" --port 3101` → `<tmp>/hub-tour/<zone>-at/views/A01.png`.
Comparer avec la capture : même chose visible ? Sinon (lié au mouvement, au son, au GPU de l'utilisateur), le noter et
demander une précision **une seule fois**.

## 3. Classer (grille : `../hub-level-design/references/liminal-rubric.md`)
| Classe | Exemple | Action |
| --- | --- | --- |
| **construction** (le *comment*) | jour au raccord, plafonnier hors grille, objet qui flotte, z-fighting | corriger, puis étape 4 |
| **étrangeté non déclarée** (le *quoi*) | pièce trop haute qui plaît | la **déclarer** (nom de glitch dans le plan) et la construire proprement, ou la retirer |
| **goût** | trop sombre, trop vide | proposer 1–2 options à l'utilisateur, pas de règle automatique |

## 4. Transformer en règle
Se demander : « quel contrôle aurait vu ça sans moi ? », puis l'ajouter au bon endroit :
- géométrie de l'architecture → `scripts/hub-audit.mjs` (nouveau compte, à 0 attendu) ;
- objet posé par une scène → audit des objets de `scripts/hub-tour.mjs` ;
- ce qui ne se voit qu'à l'image → mesure de `measure()` dans `hub-tour.mjs` (avec sa limite) ;
- règle de construction du skin → `tools/blender/skin.py` + ligne dans `../hub-skin/SKILL.md` ;
- impossible à automatiser → capture annotée dans la galerie `../hub-level-design/references/bugs/` (le critique la lit).
Vérifier que le nouveau contrôle **trouve** le bug avant la correction et **0** après, sur **tous** les lieux
(`hub:audit` sur chacun) : il trouvera souvent les mêmes ailleurs, les corriger dans la foulée.

## 5. Clore
Commit « fix(hub): <bug> + contrôle <nom> », ligne dans le verdict de recette, réponse courte à l'utilisateur :
corrigé où, et quel contrôle l'empêche maintenant de revenir.

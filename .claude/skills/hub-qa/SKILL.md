---
name: hub-qa
description: Recette complète d'un lieu du hub liminal (/hub) avant toute preview montrée à l'utilisateur — audit d'architecture à zéro, couverture dense sur la carte graphique avec analyse automatique des images, critique à froid, verdict écrit. À utiliser après chaque modification d'un lieu (skin, objets, lumière), avant de dire « tu peux tester ».
---

# Recette d'un lieu du hub

But : l'utilisateur juge l'**ambiance**, jamais la **construction**. Il ne doit trouver aucun bug que les outils ou le
critique pouvaient trouver. Grille : `../hub-level-design/references/liminal-rubric.md` (règle d'or quoi/comment).
Tant qu'une étape n'est pas verte, **pas de preview**. Tout en arrière-plan, sans attendre l'utilisateur.

## 1. Audit d'architecture — `pnpm hub:audit <LIEU> --full` (depuis `portfolio/`)
Doit être à **0** partout : void, phantom, invisible, floor, ceiling, hanging, floating, rail, skewed.
- Seule exception : une **étrangeté déclarée** dans le plan (nom de glitch dans les données de la forme). L'écrire
  dans le verdict avec son nom.
- Un compte non nul « inexpliqué » n'est jamais acceptable : l'expliquer (faux positif → corriger l'audit, en le
  notant) ou le corriger. Ne pas monter un seuil pour faire passer.

## 2. Couverture dense — `node scripts/hub-tour.mjs <zone> --dense [6] --port 3101`
Rendu sur la vraie carte graphique (Chrome headless, D3D11 : rien ne s'ouvre à l'écran ; `--soft` = SwiftShader).
Un point tous les 6 m de sol atteignable, 8 directions + plafond + sol. Chaque vue est mesurée :
| Mesure | Ce qu'elle trouve | Limite |
| --- | --- | --- |
| `blown` | halo cramé : blocs 4×4 dont la moyenne du canal le plus sombre ≥ 225 (le grain disperse les pixels de ±40) ; vues « plafond » exclues | 4 % (les plafonniers 2 × 2 seuls font ~3,5 % dans une grande salle) |
| `voidBlob` | trou sur le vide : plus grande tache de noir pur (0-3) | 1,5 % |
| `zfight` | scintillement : même image, plan proche de la caméra décalé de 3 %, horloge gelée → pixels qui basculent (rien ne bouge à l’écran) | 0,05 % |
Sortie `<tmp>/hub-tour/<zone>-dense/` : `report.md` (section Images = vues au-delà des limites), planches des seules vues
signalées, toutes les vues dans `views/`. Pour chaque vue signalée : l'ouvrir, trancher **bug** ou **voulu**
(ex. plafonnier vu de dessous = blanc normal), corriger les bugs, relancer `--at "x,z,yaw,pitch"` sur ces vues.
Si une limite donne trop de faux positifs, l'ajuster **dans le script** avec la raison en commentaire.

## 3. Tournée normale — `node scripts/hub-tour.mjs <zone> --port 3101`
Vues choisies (arrivée, interactions, passages, coins lointains, objets signalés) + audit des objets posés
(traversable, floating, sunk, in-wall : **0**) + draw calls (< 300) et triangles (< 1,5 M) sur la pire vue + 0 erreur
console.

## 4. Critique à froid — agent `hub-critic`
Le lancer sur le dossier de la tournée normale **et** sur les planches de la dense (par lots si nombreuses). Il lit la
galerie `../hub-level-design/references/bugs/`. Corriger tout **bloquant** et **important** ; relancer 2–4 sur ce qui a
bougé. Ne pas remplacer le critique par sa propre relecture (biais du constructeur).

## 5. Verdict (dans la description de PR et le message à l'utilisateur)
```
Recette <lieu> — <date>
Audit : 0 partout (étrangetés déclarées : …)
Dense : N vues, 0 au-delà des limites (ou : k vues voulues, listées)
Tournée : 0 objet signalé · pire vue X calls / Y k tris · 0 erreur console
Critique : 0 bloquant, 0 important · mineurs restants : …
Non vérifiable ici : son, sensations de déplacement, appareils faibles
```
Puis seulement : lien de preview + ce qu'il faut regarder (l'ambiance).

## Pièges connus
- Un vieux `next start` de l'utilisateur occupe parfois :3100 → toujours `--port 3101` ; ne pas tuer le sien.
- `pnpm` local 11 ≠ repo 10 : le script appelle `node_modules/.bin`/`next` directement, ne pas lancer `pnpm build`.
- Attendre la fin d'une commande en arrière-plan : la notification arrive seule ; grep `Error:` et pas « errors ».
- Rebuild automatique si `src/` est plus récent que `.next/BUILD_ID` (un seul serveur à la fois sur le port).

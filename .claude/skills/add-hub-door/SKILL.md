---
name: add-hub-door
description: Ajouter un lieu ou ouvrir une branche du hub secret (/hub, monde liminal à la première personne) — nouveau lieu (hall d'hôtel, Poolrooms, bureaux Vigil…), nouvelle porte de projet, ou construction de la branche derrière une porte verrouillée (Vigil avec Infra intégrée, Backrooms).
---

# Ajouter un lieu / ouvrir une branche du hub

1. Lire `.claude/specs/hub.md` (architecture, pièges) et la page Notion « Design — Hub liminal v2 » (parcours,
   direction artistique, étape suivante).
2. **Nouveau lieu** (une PR par lieu) :
   - `world/zones.ts` : ajouter l'id à `ZoneId`, l'entrée dans `ZONES` (spawn, collisions, portails, interactions,
     `floor`, `ambience`, `ground` si relief) et sa place dans `ZONE_ORDER` ;
   - `world/scenes/<lieu>/<Lieu>.tsx` + une ligne dans `world/scenes/index.ts` (chunk chargé à la demande) ;
   - relier par des portails (`requires` / `opens` pour les portes à ouvrir) ;
   - densité / effets via `byQuality(useQuality(), …)` ; ambiance dans `audio.ts` si nouvelle.
3. **Nouvelle porte de projet** : une entrée dans `components/hub/universes.ts` ; elle apparaît verrouillée dans la
   salle jaune (`PROJECT_DOORS`, 3 emplacements). **Ouvrir une branche** : retirer `locked` de son interactable et
   lui donner `blocker` + un portail `requires` vers le nouveau lieu.
4. Contraintes :
   - aucun asset réseau externe (CSP) : procédural, ou fichiers CC0 dans `public/` (crédits tenus à jour) ;
   - three.js uniquement sur `/hub` ;
   - données live (Vigil, VPS) via une route publique agrégée côté Vigil, jamais de secret côté client ;
   - pas de texte flottant : texte seulement sur des objets du décor (plaques, écrans) ;
   - garder le style liminal, grand et réaliste ; tester mobile (perf, joystick, bouton d'interaction) ;
   - test dans `e2e/shared.spec.ts` si le menu ou la navigation changent.
5. Livrer avec le skill `ship-change` et cocher l'étape dans la page Notion du design.

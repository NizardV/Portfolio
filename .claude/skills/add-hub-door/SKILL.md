---
name: add-hub-door
description: Ajouter ou ouvrir une porte du hub 3D secret (/hub) — nouvelle porte pour un projet perso, ou construction de l'univers derrière une porte existante (Vigil, Backrooms, Blindtest, Infra).
---

# Ajouter / ouvrir une porte du hub

1. Lire `.claude/specs/hub.md` (principe, portes prévues) et la fiche Notion « Hub nizard.dev ».
2. **Nouvelle porte** : ajouter une entrée dans `portfolio/src/components/hub/universes.ts`
   (`{ id, name, tagline, color, href: null }`). `HubScene` place les portes sur les murs ; au-delà de 4,
   adapter le placement (angles / plusieurs portes par mur).
3. **Ouvrir une porte** : créer la route `src/app/hub/<id>/page.tsx` (noindex, comme `/hub`), charger la scène
   avec `dynamic(..., { ssr: false })`, puis mettre `href: "/hub/<id>"` dans `universes.ts`.
   Prévoir un bouton RETOUR vers `/hub`.
4. Contraintes :
   - aucun asset réseau externe (CSP) : textures procédurales ou fichiers dans `public/` ;
   - three.js uniquement dans les routes `/hub*` ;
   - données live (Vigil, VPS) via une route API Next côté serveur, jamais de secret côté client ;
   - garder le style liminal (voir `specs/design.md`) ;
   - tester sur mobile (tap sur les portes, perf) et ajouter un test dans `e2e/shared.spec.ts`.
5. Livrer avec le skill `ship-change` et cocher la porte dans la fiche Notion.

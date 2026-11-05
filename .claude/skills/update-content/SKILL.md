---
name: update-content
description: Mettre à jour le contenu du portfolio (statut, expériences, formations, projets, textes FR/EN, technos/badges). À utiliser quand l'utilisateur annonce un changement de situation, un nouveau projet, ou qu'une info du site est périmée.
---

# Mettre à jour le contenu

| Quoi | Où |
| --- | --- |
| Textes d'interface (hero, à propos, contact, nav) FR + EN | `portfolio/src/lib/dict.ts` |
| Badge de statut du hero, carte « À propos » (dates) | `src/components/sections/HeroSection.tsx`, `AboutSection.tsx` |
| Expériences (récentes en premier) | `src/data/experiences.ts` |
| Formations | `src/data/educations.ts` |
| Projets (`personal: true` = projet perso) | `src/data/projects.ts` |
| Technos affichées en badges | `src/data/tech.ts` (une entrée par techno, réutilisée partout) |
| Icône d'une nouvelle techno | `src/components/SkillBadge.tsx` (import `Si*` de react-icons + `iconMap` + alias) |
| Description Google | `src/app/layout.tsx` (`metadata.description`) |

## Règles
- Toujours écrire **FR et EN**.
- Référencer les technos via `tech.xxx` (jamais d'objet `{ label, icon }` recopié : SonarCloud bloque la duplication).
- Pas de section Compétences : les technos vont sur les expériences et les projets.
- Projets d'école dans « Projets », projets perso dans « Projets personnels » ; le hub ne montre que du perso.
- Ne rien inventer : si une mission, une date ou un lien manque, **demander**.
- Mettre à jour `.claude/specs/portfolio.md` (section « Personne ») quand la situation change.
- LinkedIn : pas d'accès ; proposer le texte à coller (titre + « À propos »).

# Spec — design

- Fond `#0b1020`, grille légère + halos radiaux cyan (`rgba(0,179,255)`) et violet (`rgba(168,85,247)`).
- Accents : cyan `#22d3ee`/`cyan-300`, fuchsia `#e879f9`, dégradé cyan → fuchsia (soulignés, titres de section).
- Cartes : `fx/GlowCard` (bordure `white/10`, fond `white/[0.06]`, halo sous la souris), pas de backdrop-filter.
- Titres de section : `fx/SectionTitle` numéroté (`01 / Projets`) + filet dégradé.
- Badges technos : `SkillBadge` (icônes react-icons/si). Ajouter une techno : `data/tech.ts` + alias d'icône dans `SkillBadge.tsx` si besoin.
- Mobile first : base = mobile, `sm:`/`md:`/`lg:` pour élargir. Zones tactiles ≥ 36 px. Rien ne déborde à droite.
- Hub : jaune `#c8b65a`, moquette `#8a7a3e`, brouillard `#3b3317`, néons `#fff6d0`.

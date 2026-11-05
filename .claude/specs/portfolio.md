# Spec — site principal (nizard.dev)

## Personne (à jour au 2026-11-05)
- **Concepteur Développeur en alternance** à la CPAM de Côte-d'Or (Dijon), sept. 2026 → août 2028.
  Missions : recueil du besoin (services internes, autres CPAM, CARSAT), cahier des charges, dev web
  Symfony + PostgreSQL conteneurisé Podman (+ services Python/FastAPI), démo, qualification avec cahier
  de recette, formulaire QERSI (analyse de risques), mise en production interne.
- **Mastère EADL** (Expert en Architecture et Développement Logiciel), DIIAGE Dijon, 2026 → 2028.
- Bachelor CPI (DIIAGE) obtenu, BTS SIO SLAM obtenu, Bac général (Maths/NSI) mention Bien.
- Stage APRR (Eiffage) 2026 : data / architecture (Talend, Snowflake, TIBCO EBX, Power BI).
- LinkedIn : https://www.linkedin.com/in/nizard-verdenal — GitHub : https://github.com/NizardV
  Claude n'a pas accès à LinkedIn : fournir le texte à coller.

## Sections (ordre de la nav)
1. **À propos** (`#about`) — hero : canvas de particules (`fx/HeroCanvas`, masqué en CSS, pas d'overlay coloré),
   badge de statut, nom, sous-titre, CTA (Me contacter, GitHub, LinkedIn), carte « À propos ».
2. **Projets** (`#projects`) — cartes compactes → dialog détaillé (`usePresence`, `useScrollLock`).
   Projets d'école puis « Projets personnels » (`personal: true`). Actuellement seul le portfolio est perso.
3. **Expérience** (`#experience`) — frise (`fx/Timeline`), technos en badges.
4. **Formation** (`#education`) — frise.
5. **Contact** (`#contact`) — formulaire → `/api/contact` (Resend ; env `RESEND_API_KEY`, `MAIL_TO`, `MAIL_FROM`).

## Comportements
- Bilingue FR/EN (`LangToggle`), FR par défaut.
- Header : visible, se replie après 30 s d'inactivité (`useIdleHeader`), reste affiché si survolé ou si le menu mobile est ouvert.
- Menu mobile : toujours monté (CSS), fond assombri, se ferme au tap extérieur, au scroll, à Échap, après un lien.
- Sons (`lib/sound.tsx`) : WebAudio, coupés par défaut, mémorisés. Branchés globalement sur liens/boutons/onglets/champs.
  `data-sound="open|close|off"` pour changer/couper le son d'un élément, `data-sound-hover` pour un élément non interactif,
  `data-no-hover` pour couper le son de survol.
- Effets : apparition au scroll (`fx/Reveal`), halo sous la souris sur les cartes (`fx/GlowCard`, desktop),
  halo du curseur (`fx/CursorGlow`, desktop uniquement). Tout respecte `prefers-reduced-motion`.
- Sécurité : CSP avec nonce dans `src/middleware.ts` (pas de ressources externes ; three.js/fonts locales).

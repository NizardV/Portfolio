# nizard.dev — mémoire projet

Portfolio de Nizard Verdenal (Next.js 16 / React 19 / Tailwind 3 / Framer Motion), déployé sur Vercel.
Ce dossier remplace l'historique des conversations : lire ce fichier, puis le spec ou le skill concerné.

- `specs/` : ce qui existe et pourquoi (portfolio, hub, design, tests)
- `skills/` : procédures à suivre (livrer une modif, mettre à jour le contenu, ajouter une porte au hub, tests)
- `decisions.md` : décisions prises et leurs raisons — ne pas les remettre en question sans demander

## L'utilisateur
- Parle français, souvent depuis son téléphone : réponses courtes, liens cliquables, pas de jargon inutile.
- Temps limité (Vigil et le jeu Backrooms Roblox passent avant) : avancer par petites PR.
- Ne merger une PR **que sur demande explicite**. Proposer, puis attendre le « merge ».
- Si une info semble périmée (statut, dates, projets), **demander** plutôt que deviner.

## Repo
- App dans `portfolio/` (Vercel Root Directory = `portfolio`). Rien d'utile à la racine à part `.github/`, `.claude/`, `README.md`.
- Gestionnaire : **pnpm 10**, Node 20. Commandes dans `portfolio/` : `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:e2e`.
- Tout le contenu est en TypeScript : textes `src/lib/dict.ts` (FR/EN), données `src/data/*.ts`, technos `src/data/tech.ts`. Pas de JSON chargé au runtime.

## Règles qui ont déjà coûté cher
- **Auteur des commits = `Nizard Verdenal <152202133+NizardV@users.noreply.github.com>`** (`git commit --author=...`). Vercel (plan Hobby) bloque le déploiement si l'auteur n'est pas membre du projet. Garder les trailers `Co-Authored-By`.
- **SonarCloud bloque au-delà de 3 % de duplication** sur le nouveau code : factoriser (ex. `data/tech.ts`) plutôt que répéter des objets.
- Toute dépendance utilisée par l'app va dans `portfolio/package.json` (Vercel n'installe que ce dossier).
- **Pas d'`AnimatePresence` pour les overlays** (fiche projet, menu) : l'exit pouvait rester bloqué avec le scroll verrouillé. Utiliser `usePresence` + transitions CSS, ou un élément toujours monté basculé en CSS.
- **Pas de `backdrop-filter` sur mobile** (cartes, overlays) : saccades et bugs Safari. Le header ne floute qu'à partir de `md:`.
- Aucun élément (même `fixed`) ne doit dépasser à droite de l'écran : sur mobile la page glisse sur le côté.
- Les styles `hover:` ne s'appliquent qu'aux appareils qui survolent (`hoverOnlyWhenSupported`).

## Workflow Git
- Branche de travail imposée par la session (`claude/...`). Quand sa PR est mergée, repartir de `origin/main` sur la même branche.
- Une PR par sujet, description en français (résumé, tests). Surveiller : Vercel (preview), SonarCloud, CodeQL, workflow E2E. Détails : `skills/ship-change`.

## À reprendre (au 2026-11-05)
- **Audit de sécurité** mis de côté : à reprendre en entier. Point de départ : 69 alertes Dependabot sur `main` (10 critiques, 28 hautes) → une PR de mise à jour des dépendances (vérifier build + `pnpm test:e2e`).
- **Hub** (2026-11-08) : monde liminal à la première personne en prod sur `/hub` (prairie → salle jaune). Prochaine étape : le hall d'hôtel, puis les branches (voir `specs/hub.md` et Notion). Le nouveau Vigil est en prod (repo `NizardV/vigil-app`, pas dans ce repo).

## Liens
- Prod : https://nizard.dev — Hub secret : https://nizard.dev/hub
- Notion (Personal OS) : fiche « Hub nizard.dev » et « Refonte nizard.dev » (backlog à jour).

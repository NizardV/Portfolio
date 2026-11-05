# nizard.dev

Portfolio de **Nizard Verdenal** : Concepteur Développeur en alternance à la CPAM de Côte-d'Or et étudiant en Mastère EADL au DIIAGE (Dijon).

🌐 **[nizard.dev](https://nizard.dev)**

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS, composants UI façon shadcn/ui, icônes lucide / react-icons
- Framer Motion pour les animations, canvas 2D pour le hero
- WebAudio pour les sons d'interface (aucun fichier audio)
- [Resend](https://resend.com) pour le formulaire de contact
- Déploiement sur [Vercel](https://vercel.com), analyse avec SonarCloud et CodeQL

## Fonctionnalités

- Site bilingue FR / EN
- Hero animé : champ de particules qui réagit à la souris
- Fiches projets détaillées, frise chronologique pour l'expérience et la formation
- Barre de navigation qui ne se replie qu'après 30 s d'inactivité
- Sons d'interface optionnels (coupés par défaut, choix mémorisé)
- Respect de `prefers-reduced-motion`
- Formulaire de contact avec validation côté serveur
- En-têtes de sécurité (CSP avec nonce) via le middleware

## Structure

```
portfolio/
├── public/brand/          # logo et icônes
└── src/
    ├── app/
    │   ├── page.tsx       # page d'accueil
    │   ├── layout.tsx     # métadonnées, providers
    │   └── api/contact/   # envoi du formulaire (Resend)
    ├── components/
    │   ├── Portfolio.tsx  # page principale : header, sections, footer
    │   ├── sections/      # Hero, Projets, Expérience, Formation, Contact
    │   ├── fx/            # effets : hero canvas, cartes lumineuses, frise, apparitions…
    │   └── ui/            # primitives (button, card, badge, toast)
    ├── data/              # contenu : projets, expériences, formations
    ├── lib/               # textes FR/EN (dict.ts), sons, hooks
    ├── types/             # types partagés
    └── middleware.ts      # CSP
```

## Modifier le contenu

Tout le contenu est dans le code, typé, à un seul endroit :

| Contenu | Fichier |
| --- | --- |
| Textes de l'interface (hero, à propos, contact…) en FR et EN | `src/lib/dict.ts` |
| Projets (`personal: true` pour un projet perso) et leurs technos | `src/data/projects.ts` |
| Expériences (avec leurs technos en `stack`) | `src/data/experiences.ts` |
| Formations | `src/data/educations.ts` |

## Lancer en local

Prérequis : Node.js 20+ et [pnpm](https://pnpm.io).

```bash
cd portfolio
pnpm install
pnpm dev        # http://localhost:3000
```

Autres commandes : `pnpm build`, `pnpm start`, `pnpm lint`.

### Tests end-to-end

Tests [Playwright](https://playwright.dev) dans `portfolio/e2e/`, lancés sur le build de production :

```bash
cd portfolio
pnpm exec playwright install chromium webkit   # une seule fois
pnpm test:e2e                                  # ou pnpm test:e2e:ui pour le mode interactif
```

| Fichier | Contenu |
| --- | --- |
| `shared.spec.ts` | tous les appareils : chargement sans erreur, aucun débordement horizontal, header qui ne masque pas la page, langue, fiches projets (ouverture, fermeture, enchaînements rapides, scroll restauré), hub |
| `mobile.spec.ts` | menu mobile (tap à l'extérieur, scroll, liens, toggles rapides), scroll bloqué derrière une fiche, survol qui ne reste pas collé, taille des zones tactiles, accès au hub par le logo |
| `desktop.spec.ts` | navigation, barre qui se replie après 30 s d'inactivité, code Konami, préférence de son mémorisée |

Projets : desktop Chrome, Pixel 7, iPhone SE (Chromium) et, en CI, iPhone 13 sous WebKit (moteur de Safari). La CI (`.github/workflows/e2e.yml`) les lance sur chaque PR, avec lint et typecheck.

### Variables d'environnement

À mettre dans `portfolio/.env.local` (ou dans les réglages du projet Vercel) :

| Variable | Rôle |
| --- | --- |
| `RESEND_API_KEY` | clé API Resend pour le formulaire de contact |
| `MAIL_TO` | adresse qui reçoit les messages |
| `MAIL_FROM` | expéditeur des mails (domaine vérifié sur Resend) |

## Déploiement

Chaque push est déployé par Vercel, avec le **Root Directory** du projet réglé sur `portfolio`. Les PR ont une preview automatique, et `main` part en production.

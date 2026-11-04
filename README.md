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
    │   ├── sections/      # Hero, Projets, Expérience, Formation, Compétences, Contact
    │   ├── fx/            # effets : hero canvas, cartes lumineuses, frise, apparitions…
    │   └── ui/            # primitives (button, card, badge, toast)
    ├── data/              # contenu : projets, expériences, formations, compétences
    ├── lib/               # textes FR/EN (dict.ts), sons, hooks
    ├── types/             # types partagés
    └── middleware.ts      # CSP
```

## Modifier le contenu

Tout le contenu est dans le code, typé, à un seul endroit :

| Contenu | Fichier |
| --- | --- |
| Textes de l'interface (hero, à propos, contact…) en FR et EN | `src/lib/dict.ts` |
| Projets (`personal: true` pour un projet perso) | `src/data/projects.ts` |
| Expériences | `src/data/experiences.ts` |
| Formations | `src/data/educations.ts` |
| Compétences | `src/data/skills.ts` |

## Lancer en local

Prérequis : Node.js 20+ et [pnpm](https://pnpm.io).

```bash
cd portfolio
pnpm install
pnpm dev        # http://localhost:3000
```

Autres commandes : `pnpm build`, `pnpm start`, `pnpm lint`.

### Variables d'environnement

À mettre dans `portfolio/.env.local` (ou dans les réglages du projet Vercel) :

| Variable | Rôle |
| --- | --- |
| `RESEND_API_KEY` | clé API Resend pour le formulaire de contact |
| `MAIL_TO` | adresse qui reçoit les messages |
| `MAIL_FROM` | expéditeur des mails (domaine vérifié sur Resend) |

## Déploiement

Chaque push est déployé par Vercel, avec le **Root Directory** du projet réglé sur `portfolio`. Les PR ont une preview automatique, et `main` part en production.

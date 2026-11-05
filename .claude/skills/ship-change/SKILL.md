---
name: ship-change
description: Livrer une modification du portfolio nizard.dev de bout en bout (branche, vérifications, commit avec le bon auteur, push, PR, suivi Vercel/SonarCloud/CI, merge sur demande). À utiliser pour toute modif de code ou de contenu du repo Portfolio.
---

# Livrer une modification

1. **Partir de main** si la PR précédente de la branche est mergée :
   `git fetch origin main && git checkout -B <branche-de-session> origin/main`.
2. **Coder** dans `portfolio/`. Contenu → skill `update-content`. Hub → skill `add-hub-door`.
3. **Vérifier en local** (dans `portfolio/`) :
   - `pnpm exec tsc --noEmit` et `pnpm lint` (seul warning toléré : `nonce` inutilisé dans `layout.tsx`)
   - `pnpm build`
   - `pnpm test:e2e` si le comportement ou la mise en page change (voir skill `e2e-tests`)
   - pour du visuel : capture Playwright desktop + mobile (`devices['iPhone 13']`) et la regarder.
4. **Commit avec l'auteur de l'utilisateur** (sinon Vercel refuse de déployer) :
   ```bash
   git commit --author="Nizard Verdenal <152202133+NizardV@users.noreply.github.com>" -m "type(scope): résumé
   ...
   Co-Authored-By: ..."
   ```
5. **Push** sur la branche de session, puis **PR en français** (Résumé / Tests, liens). Une PR par sujet.
6. **S'abonner à la PR** et surveiller :
   - Vercel : lien de preview dans le commentaire du bot Vercel sur la PR (actuellement `https://portfolio-git-claude-notion-personal-p-8e3587-nizardvs-projects.vercel.app`) → le donner à l'utilisateur.
   - SonarCloud : quality gate (duplication ≤ 3 %, fiabilité A). Pas d'accès au rapport détaillé depuis le conteneur :
     corriger la cause probable (souvent des objets dupliqués → factoriser).
   - CodeQL et workflow « E2E tests ».
   - Les logs Vercel ne sont pas accessibles : si le build casse sans être reproductible, demander à l'utilisateur de coller les logs.
7. **Merger seulement quand l'utilisateur le demande** (`merge_method: merge`), puis vérifier le statut Vercel de prod
   sur le commit de merge et mettre à jour la fiche Notion concernée si besoin.

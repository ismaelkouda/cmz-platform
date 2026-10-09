# C6 — protocole de recette humaine des compositions v2

- **Date :** 2026-10-09
- **Issue :**
  [#64 — PLAT-9](https://github.com/ismaelkouda/cmz-platform/issues/64)
- **Dossier de promotion :**
  [`c6-promotion-compositions-v2-2026-10-09.md`](./c6-promotion-compositions-v2-2026-10-09.md)
- **Statut :** protocole de clôture ; l'exécution et l'attestation humaines
  restent requises

## 1. But et frontière de la recette

Ce protocole permet au reviewer humain de confirmer les huit observations C6
sans déduire un comportement à partir d'une CI verte ou d'une capture. Il
combine :

1. les applications Angular et React réellement compilées ;
2. un backend déterministe installé par Playwright, sans appel externe ;
3. les oracles de composition qui observent les requêtes, invalidations,
   permissions, annulations et doubles soumissions ;
4. une revue bornée du core générateur.

Un simple `nx serve` n'est pas une recette recevable : les applications de
preuve attendent un contexte d'accès et des réponses API que les scénarios
Playwright installent explicitement. Une inspection seulement visuelle ne peut
pas non plus prouver le payload wire ou l'absence d'une requête.

Cette recette ne prouve pas :

- le backend SEOS vivant ou un contrat OpenAPI officiel ;
- la fidélité pixel, VoiceOver, NVDA ou le zoom multi-OS ;
- un pattern générique de page composite au-delà de C5 ;
- les objets uniques, maps, workflows ordonnés ou invalidations inter-pages.

## 2. Préconditions et sécurité

- partir d'un clone ou worktree propre au SHA fusionné sur `main` ;
- utiliser les versions Node et Bun exigées par le dépôt ;
- installer avec `bun install --frozen-lockfile` si `node_modules` est absent ;
- ne définir aucune URL, aucun token et aucun identifiant SEOS ;
- ne pas modifier les tests, fixtures ou contrats pendant la recette ;
- ne pas recopier de secret ou de donnée personnelle dans #64.
- utiliser les ports dédiés ci-dessous et `CI=1` : la configuration locale de
  Playwright autorise sinon la réutilisation silencieuse d'un ancien serveur,
  qui pourrait provenir d'un autre worktree ou d'un autre SHA.

Relever avant de commencer :

```bash
git status --short --branch
git rev-parse HEAD
node --version
bun --version
```

La recette s'arrête si le worktree est sale, si le SHA n'est pas celui relu, si
le port dédié est déjà occupé ou si une application tente un appel hors de
`127.0.0.1` et des routes interceptées `/api/**`. Il ne faut ni tuer un serveur
inconnu ni le réutiliser : choisir un autre port explicite et le reporter dans
l'attestation.

## 3. Rejouer les preuves déterministes

Exécuter dans cet ordre :

```bash
bun run check:composition-registry
bun run check:generator-platform:angular
bun run check:generator-platform:reactjs
bunx nx test backoffice-angular \
  --include=apps/backoffice-angular/src/app/regressions/users-management-c5-baseline.spec.ts \
  --skip-nx-cache
```

Ces commandes prouvent respectivement :

- l'identité, les hashs et les oracles déclarés pour les compositions ;
- les comportements de composition Angular ;
- les comportements de composition React ;
- la baseline observable de la page SEOS, réseau remplacé et réellement
  réexécutée plutôt que relue depuis le cache Nx.

Un résultat rouge bloque l'attestation. Il ne doit pas être contourné en
relançant aveuglément, en retirant un test ou en changeant une fixture.

## 4. Examiner les applications dans un vrai navigateur

### 4.1 Angular

Lancer l'interface Playwright :

```bash
CI=1 E2E_APP_PORT=4400 bunx playwright test \
  -c apps/users-management-proof/playwright.config.mjs \
  --ui
```

Dans l'interface, exécuter et examiner au minimum :

- `adaptive-create-oracles.spec.ts` : formulaire, payload, mono-vol, erreur et
  invalidation après succès ;
- `data-view-capability-oracles.spec.ts` : chargement de la liste et
  rafraîchissement ciblé ;
- le test `refuse la création sans permission dans chaque classe` de
  `presentation-candidates.spec.ts`.

Utiliser la timeline, les snapshots DOM et la vue réseau de Playwright. Pour
avancer action par action dans un navigateur visible :

```bash
CI=1 E2E_APP_PORT=4400 bunx playwright test \
  -c apps/users-management-proof/playwright.config.mjs \
  adaptive-create-oracles.spec.ts \
  --debug
```

### 4.2 React

Lancer l'interface Playwright :

```bash
CI=1 E2E_APP_PORT=4402 bunx playwright test \
  -c apps/users-management-react-proof/playwright.config.mjs \
  --ui
```

Exécuter et examiner les quatre tests de `users-management-browser.spec.ts` :

- recherche, filtres et rafraîchissement ;
- création et payload exact ;
- conservation du dialogue et des valeurs après erreur métier ;
- refus avant transport sans permission.

Pour avancer action par action :

```bash
CI=1 E2E_APP_PORT=4402 bunx playwright test \
  -c apps/users-management-react-proof/playwright.config.mjs \
  users-management-browser.spec.ts \
  --debug
```

La recette Angular et la recette React sont distinctes. Un résultat observé sur
une cible ne vaut pas preuve pour l'autre.

## 5. Matrice des huit confirmations

| #   | Observation à confirmer                 | Preuve à lire ou observer                                                     | Critère d'acceptation                                                                          |
| --- | --------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | comparaison SEOS exacte                 | baseline C5 + §5 du dossier C6                                                | les quatre lignes décrivent les mêmes effets de données ; les écarts UI restent hors promotion |
| 2   | deux listes indépendantes               | tests de composition Angular et React + démarrage navigateur                  | un GET utilisateurs et un GET profils partent sans dépendance cachée entre eux                 |
| 3   | commande à cinq champs                  | scénario de création + requête POST observée                                  | `first_name`, `last_name`, `email`, `phone`, `profile_id`, sans champ inventé                  |
| 4   | invalidation ciblée au succès           | compteur/requêtes des tests de composition                                    | un nouveau GET utilisateurs, aucun nouveau GET profils                                         |
| 5   | erreur métier sans invalidation         | scénario d'erreur Angular et React                                            | données et formulaire utiles conservés ; aucun nouveau GET                                     |
| 6   | permission avant transport              | scénarios sans `users.create`                                                 | contrôle désactivé/refusé et aucun POST                                                        |
| 7   | états, annulations et double soumission | tests `page-composition-users-v2.spec.ts` des deux cibles et mono-vol Angular | états conformes au plan ; annulation des lectures ; au plus un POST                            |
| 8   | core sans spécialisation SEOS           | diff de promotion et recherche ci-dessous                                     | aucun nom SEOS, utilisateur ou branche spécifique C5 dans le core                              |

Pour le point 8, la recherche est un filet de détection, pas un substitut à la
lecture du diff :

```bash
rg -n -i 'seos|users-management|create-user|profiles-select|users-list' \
  tools/generator-platform/core
```

Toute occurrence doit être expliquée. Une occurrence métier exécutable dans le
core bloque la confirmation ; un exemple ou un commentaire doit rester hors du
core partagé.

## 6. Attestation à publier dans #64

Le reviewer publie une réponse explicite, liée au SHA réellement examiné. Il ne
répond pas seulement « approuvé » ou « tout est bon ».

```text
SHA examiné : <sha main>
Environnement : <OS, navigateur, versions Node et Bun>
Commandes déterministes : <succès/échec pour chaque commande du §3>
Angular Playwright : <tests examinés et résultat>
React Playwright : <tests examinés et résultat>

1. Comparaison SEOS : confirmé / refusé — <note>
2. Deux listes indépendantes : confirmé / refusé — <note>
3. POST à cinq champs : confirmé / refusé — <note>
4. Succès, reload utilisateurs seulement : confirmé / refusé — <note>
5. Erreur métier sans invalidation : confirmé / refusé — <note>
6. Permission refusée avant transport : confirmé / refusé — <note>
7. États, annulations et double soumission : confirmé / refusé — <note>
8. Core sans spécialisation SEOS/C5 : confirmé / refusé — <note>

Limites constatées : <aucune ou liste précise>
Verdict #64 : clôture acceptée / clôture refusée
```

Une observation refusée garde #64 ouverte et cite le scénario reproductible. Une
attestation complète, les preuves techniques déjà fusionnées et la CI
post-fusion verte permettent ensuite seulement de fermer #64.

# ADR-0006 — Conventions de collaboration et garde-fous automatisés

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Amendement :** 2026-08-02 — Protection de branche `main` (G-2) + CODEOWNERS
  par zone (G-1)

## Contexte

Un monorepo concentre le travail de plusieurs équipes et de plusieurs
technologies dans un même historique. Ce qui n'était qu'une préférence dans un
dépôt mono-application y devient une contrainte de fonctionnement : un
historique illisible rend `nx affected` difficile à exploiter, une modification
du socle qui passe sans relecture affecte tous les packages, et un binaire
committé alourdit le clone de tout le monde, définitivement.

Le projet d'origine fournit trois exemples concrets de ce qui arrive faute de
garde-fous :

- son `.gitignore` liste `tools/env`, `src/environments` et `src/assets/config`,
  mais `git ls-files` montre que ces fichiers **sont suivis** — ils l'étaient
  avant l'ajout de la règle, qui ne s'applique donc pas à eux ;
- `src/assets.zip` (9,9 Mo) est versionné, et le dépôt Git pèse 87 Mo ;
- la CI déclare Node 18 alors qu'Angular 21 exige Node ≥ 20.19.

Aucun de ces trois problèmes n'est dû à de la négligence : ce sont des erreurs
qu'aucun outil ne signalait.

## Décision

### Convention de commit — Conventional Commits

Vérifiée automatiquement par commitlint sur le hook `commit-msg`. Types
autorisés restreints à dix (`feat`, `fix`, `refactor`, `perf`, `docs`, `test`,
`build`, `ci`, `chore`, `revert`), portée en kebab-case désignant le package
concerné, en-tête limité à 72 caractères.

```
feat(backoffice-angular): ajoute la page de connexion
fix(shared-domain): corrige la validation des coordonnées
```

La portée reste facultative : certains commits sont légitimement transverses.

### Convention de branches

| Motif                         | Usage                                               |
| ----------------------------- | --------------------------------------------------- |
| `main`                        | Branche de référence, base de `nx affected`         |
| `feat/<ticket>-<description>` | Nouvelle fonctionnalité                             |
| `fix/<ticket>-<description>`  | Correction                                          |
| `refactor/<description>`      | Refonte sans changement de comportement             |
| `reconstruction/<domaine>`    | Reconstruction d'un domaine depuis le projet source |

Cette convention est imposée côté forge par la protection de `main`
(`.github/branch-protection.main.json`, appliquée via `bun run protect:main`) :
PR obligatoire, 1 approbation, status checks CI, pas de force-push.

### Garde-fous automatisés

| Hook         | Contrôle                              | Script                         |
| ------------ | ------------------------------------- | ------------------------------ |
| `pre-commit` | Aucun fichier volumineux ajouté       | `check:weight`                 |
| `pre-commit` | Formatage des fichiers modifiés       | `lint-staged` + Prettier       |
| `commit-msg` | Message conforme à la convention      | `commitlint`                   |
| `pre-push`   | Politique de version unique respectée | `check:versions`               |
| `pre-push`   | Pas de secret dans les commits pushés | `check:secrets -- --pre-push`  |
| `preinstall` | Node et bun conformes à `engines`     | `check:engines`                |

Le placement de chaque contrôle est délibéré : au plus tôt, mais pas au point de
gêner. Vérifier les versions à chaque commit serait pénible pour un bénéfice nul
— au `push` suffit. Vérifier le moteur Node au `preinstall`, en revanche, évite
un échec de build incompréhensible une demi-heure plus tard.

### Relecture — `CODEOWNERS`

`.github/CODEOWNERS` impose une relecture par zone (socle / kernel / modules /
apps / docs / corpus). Peuplé en équipes de 1 (`@ismaelkouda`) ; substituer des
équipes GitHub `@cmz/…` sans changer la structure. Couplé à
`require_code_owner_reviews` sur `main`.

### Protection de branche `main`

En plus des hooks locaux (contournables via `--no-verify`), `main` exige les
jobs bloquants de `.github/workflows/ci.yml`, une approbation, et refuse le
force-push — y compris pour les admins (`enforce_admins`).

## Justification

Chaque garde-fou répond à un problème **constaté**, pas supposé. C'est le
critère qui a présidé au choix : aucun contrôle n'a été ajouté « au cas où ».

Le contrôle de poids mérite une justification particulière : contrairement aux
autres, il porte sur un dommage **irréversible**. Un commit mal formaté se
corrige, une version divergente se rectifie ; un binaire entré dans l'historique
n'en sort qu'au prix d'une réécriture complète du dépôt et d'une
resynchronisation de tous les clones. Il vaut donc mieux le bloquer avant.

Chaque garde-fou a été validé **sur un cas d'échec délibéré** et pas seulement
sur le cas nominal : un garde-fou qu'on n'a jamais vu échouer n'est pas un
garde-fou vérifié.

## Conséquences

### Positives

- L'historique reste exploitable, ce qui est la matière première de
  `nx affected`.
- Les erreurs du projet d'origine ne peuvent pas se reproduire silencieusement.
- Le socle ne peut pas être modifié sans relecture.

### Négatives / dette acceptée

- Friction supplémentaire à chaque commit. `--no-verify` reste disponible pour
  les cas légitimes, et le message d'erreur du contrôle de poids le rappelle
  explicitement plutôt que de laisser l'utilisateur bloqué.
- **Les hooks dépendent de `bun` dans le PATH.** Les clients Git graphiques
  n'exécutent pas le profil du shell ; chaque hook rétablit donc explicitement
  `$HOME/.bun/bin` en tête de PATH. Une installation de bun à un emplacement non
  standard nécessitera un
  [`~/.config/husky/init.sh`](https://typicode.github.io/husky/how-to.html).
- **Le `preinstall` contraint le `Dockerfile`.** Satisfait : le
  [`Dockerfile`](../../Dockerfile) racine copie `tools/` avant
  `bun install --frozen-lockfile` (G-4).
- Les hooks ne s'exécutent que localement : la CI rejoue les mêmes contrôles
  (`ci.yml`, y compris `check:secrets` / job Secret scan) ; `--no-verify` local
  ne passe pas la forge.
- **Une équipe CODEOWNERS inexistante ne provoque aucune erreur** : la règle
  est ignorée en silence — ne jamais retirer le handle valide d'une zone avant
  d'avoir substitué une équipe GitHub réelle.
- Solo : 1 approbation requise empêche d'approuver sa propre PR — prévoir un
  second regard ou, à titre temporaire seulement, assouplir `enforce_admins`.

### Points à réévaluer

- Le seuil de 1 Mo (100 Ko pour les archives et binaires) est arbitraire. À
  ajuster si les assets légitimes du back-office le dépassent régulièrement.
- Si les hooks ralentissent trop les commits une fois le dépôt volumineux,
  déplacer `lint-staged` du `pre-commit` vers le `pre-push`.

## Références

- Constats issus de `git ls-files` et `du -sh .git` sur le projet d'origine.
- [analyse du projet source](../architecture/analyse-du-projet-source.md)

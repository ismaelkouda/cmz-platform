# Phase 01d — Conventions de collaboration et traitement des observations

- **Statut :** ✅ Terminée (une réserve : Nx Cloud, voir ci-dessous)
- **Date :** 2026-07-21
- **Prérequis :** [Phase 01c](./phase-01c-politique-de-versions.md)
- **ADR associés :**
  [ADR-0006 — Conventions de collaboration](../adr/0006-conventions-de-collaboration.md),
  [ADR-0007 — Configuration runtime](../adr/0007-configuration-runtime.md),
  [ADR-0008 — Outillage de tests](../adr/0008-outillage-de-tests.md)
- **Origine :** points A1 à A5 et observations O1 à O5 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Objectif

Solder les points d'amélioration et les observations de la revue de socle, de
façon à aborder la Phase 02 sans dette de cadrage.

## Périmètre

### Inclus

- Conventions de commit et de branches, hooks Git, formatage (A1, A2).
- `CODEOWNERS` (A4) et contrôle effectif des versions de Node et bun (A5).
- `.gitignore` réellement opérant sur la configuration d'environnement (O1).
- Décisions cadrées pour la configuration runtime (O2), le poids du dépôt (O3),
  l'outillage de tests (O4) et la stratégie de migration (O5).

### Explicitement exclu

- **Nx Cloud (A3) : non activé.** Voir la réserve ci-dessous.
- Rejeu des contrôles en CI : Phase 06. Tant que la CI ne les exécute pas, les
  hooks restent contournables.
- Application effective des ADR-0007 et ADR-0008 : Phases 06 et 05.

## Étapes exécutées

### 1. Formatage et conventions (A1, A2)

Ajout de `prettier`, `husky`, `commitlint` et `lint-staged` en dépendances de
développement de la racine, avec `.prettierrc.json`, `.prettierignore`,
`commitlint.config.mjs` et `.lintstagedrc.json`.

Convention retenue : **Conventional Commits**, dix types autorisés, portée en
kebab-case, en-tête à 72 caractères maximum. La convention de branches est
documentée dans l'[ADR-0006](../adr/0006-conventions-de-collaboration.md) mais
volontairement non imposée par un hook — c'est le rôle des règles de protection
de branche côté forge.

### 2. Garde-fous automatisés

| Hook         | Contrôle                            | Script                          |
| ------------ | ----------------------------------- | ------------------------------- |
| `preinstall` | Node et bun conformes à `engines`   | `tools/check-engines.mjs`       |
| `pre-commit` | Aucun fichier volumineux ajouté     | `tools/check-file-weight.mjs`   |
| `pre-commit` | Formatage des fichiers mis en scène | `lint-staged`                   |
| `commit-msg` | Message conforme à la convention    | `commitlint`                    |
| `pre-push`   | Politique de version unique         | `tools/check-catalog-usage.mjs` |

### 3. Contrôle des moteurs (A5)

`engines` documentait une contrainte sans l'appliquer : ni npm ni bun n'échouent
sur une version de Node non conforme. `check-engines.mjs`, branché sur
`preinstall`, transforme la documentation en garantie — et échoue avant
l'installation plutôt qu'au milieu d'un build incompréhensible.

### 4. `CODEOWNERS` (A4)

`.github/CODEOWNERS`, organisé par zone, avec le socle explicitement couvert :
`package.json` (qui porte le catalog de versions), `nx.json`, `tools/`,
`.husky/`, `docs/adr/`.

Un seul propriétaire est déclaré aujourd'hui, faute d'équipes constituées. Le
fichier documente en tête qu'**une équipe inexistante n'y provoque aucune
erreur** : la règle est ignorée en silence, ce qui en fait un piège classique.

### 5. `.gitignore` opérant (O1)

Réécriture complète, avec une section dédiée à la configuration d'environnement
et aux secrets (`.env*`, `*.pem`, `*.key`, `assets/config/env.js`).

Le fichier documente en commentaire le piège rencontré sur le projet d'origine :
ces motifs **n'ont aucun effet sur un fichier déjà suivi par Git**. La
vérification utile est `git check-ignore -v <fichier>`, et le retrait se fait
par `git rm --cached`.

### 6. Poids du dépôt (O3)

`check-file-weight.mjs`, branché sur `pre-commit` : refus au-delà de 1 Mo, seuil
abaissé à 100 Ko pour les archives et binaires. Le contrôle porte sur les
fichiers mis en scène, pas sur l'arbre entier.

Ce garde-fou traite un dommage **irréversible** — un binaire entré dans
l'historique n'en sort qu'au prix d'une réécriture du dépôt. Le message d'erreur
rappelle `--no-verify` pour les cas légitimes, plutôt que de laisser
l'utilisateur bloqué sans issue.

### 7. Décisions cadrées (O2, O4, O5)

- **[ADR-0007](../adr/0007-configuration-runtime.md)** — le mécanisme
  `window.__env` du projet d'origine est conservé (un artefact unique promu de
  recette en production), avec trois corrections : valeurs hors du dépôt,
  fichier généré réellement ignoré, validation au démarrage.
- **[ADR-0008](../adr/0008-outillage-de-tests.md)** — Vitest en unitaire (défaut
  d'Angular 21) et Playwright en end-to-end. Protractor n'est pas migré mais
  réécrit.
- **[Stratégie de reconstruction](../architecture/strategie-de-reconstruction.md)**
  — cadrage de la Phase 07.

### 8. Analyse du couplage du projet d'origine

Réalisée pour fonder la stratégie de migration sur des mesures plutôt que sur
des impressions. Résultat marquant : **12 domaines sur 18 n'ont aucune
dépendance vers un autre domaine**, et les 6 restants en totalisent 16 en tout.
Le couplage passe presque exclusivement par `shared/` (plus de 3 300 imports).

Conséquence directe : une fois `shared/` et `core/` migrés, les 18 domaines
peuvent l'être en parallèle et dans n'importe quel ordre. C'est ce qui rend la
Phase 07 tenable.

## Vérifications

Chaque garde-fou a été validé sur un cas nominal **et sur un cas d'échec
délibéré** — un garde-fou qu'on n'a jamais vu échouer n'est pas vérifié.

| Contrôle         | Cas testé                                                        | Résultat                                    |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `check:engines`  | Node 22.22.3 vs plage exigée                                     | ✅ code 0                                   |
| `commitlint`     | `feat(backoffice-angular): ajoute la page de connexion`          | ✅ code 0                                   |
| `commitlint`     | `Ajout de trucs.` (type absent, point final)                     | ✅ code 1, 3 problèmes signalés             |
| `commitlint`     | `feat(BackOffice): Ajoute Un Truc` (casse de portée et de sujet) | ✅ code 1                                   |
| `check:weight`   | Aucun fichier volumineux                                         | ✅ code 0                                   |
| `check:weight`   | Archive de 1,9 Mo mise en scène                                  | ✅ code 1, fichier nommé et taille affichée |
| `check:versions` | Aucune violation                                                 | ✅ code 0                                   |

Les fichiers de test ont été supprimés après validation.

## Réserve — Nx Cloud (A3) non activé

**Nx Cloud n'a pas pu être activé, et le point A3 reste ouvert.**

Deux raisons, dont une qui subsiste quel que soit l'environnement :

1. `cloud.nx.app` est inaccessible depuis l'environnement d'exécution utilisé
   (bloqué par le proxy réseau) ;
2. surtout, l'activation rattache le workspace à un **compte Nx Cloud** et
   génère un jeton d'accès. C'est une opération qui engage un compte et une
   facturation : elle revient au propriétaire du dépôt, pas à un outil agissant
   en son nom.

Marche à suivre, depuis un poste disposant d'un accès réseau :

```bash
bunx nx connect
```

La commande affiche une URL de rattachement à ouvrir dans un navigateur. Une
fois le workspace revendiqué, un `nxCloudId` est ajouté à `nx.json` — c'est ce
champ qu'il faudra committer.

Rappel de l'enjeu : sans cache distribué, chaque agent de CI reconstruit tout.
L'écart devient significatif à mesure que les packages se multiplient — le sujet
est donc à reprendre en Phase 06, au moment de configurer la CI.

## Points d'attention

- **Les hooks ne s'exécutent que localement.** Tant que la CI ne rejoue pas les
  mêmes contrôles (Phase 06), un `--no-verify` suffit à tout contourner.
- **`CODEOWNERS` doit être relu à chaque constitution d'équipe** — une équipe
  inexistante y est ignorée sans avertissement.
- **Le seuil de 1 Mo est arbitraire.** À ajuster si les assets légitimes du
  back-office le dépassent régulièrement.
- **Script mort du projet d'origine :** `scripts/generate-structure.ps1` n'est
  plus utilisé et ne doit pas être migré. Il reste référencé par les scripts
  `generate-structure` et `gsc` du `package.json` d'origine, ainsi que par son
  `README` — ces trois références sont à supprimer côté projet source, hors
  périmètre de ce monorepo.

## Suite

**Phase 02 — Application Angular** : installation de `@nx/angular` et génération
de `apps/backoffice-angular` (package `@cmz/backoffice-angular`), premier
consommateur du catalog de versions et premier package soumis aux conventions
mises en place ici.

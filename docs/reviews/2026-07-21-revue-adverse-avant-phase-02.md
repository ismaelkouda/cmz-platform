# Revue adverse — seconde vérification avant Phase 02

- **Date :** 2026-07-21
- **Portée :** socle du monorepo à l'issue des phases 01 à 01d
- **Méthode :** vérification **adverse** — on ne rejoue pas les contrôles qui
  passent déjà, on cherche les hypothèses non testées et les scénarios qui
  cassent
- **Résultat :** 3 défauts réels trouvés et corrigés, 2 incohérences
  documentaires corrigées, 1 contrainte à porter en Phase 06

## Pourquoi une seconde revue

La première revue portait sur ce qui **manquait** au socle. Celle-ci porte sur
ce qui a été **construit depuis** : garde-fous, scripts, conventions. Ces
éléments n'avaient été validés que dans les conditions où ils avaient été écrits
— un environnement Linux, avec `bun` dans le PATH, sur un dépôt déjà installé.

La question posée ici est différente : _dans quelles conditions ce socle
cesse-t-il de fonctionner ?_

---

## Défauts trouvés et corrigés

### D1 — Les hooks Git échouaient sans `bun` dans le PATH 🔴

**Scénario :** un développeur commite depuis VS Code, Sourcetree ou GitKraken.
Ces clients n'exécutent pas le profil du shell : le PATH y est minimal et `bun`
en est absent.

**Constaté :** exécution du hook avec un PATH réduit à `/usr/bin:/bin`.

```
.husky/pre-push: 1: bun: not found
code retour = 127
```

Le commit ou le push est refusé, avec un message qui ne dit rien de la cause
réelle. La bonne nouvelle est qu'il échoue **bruyamment** (127) plutôt que de
passer en silence — un garde-fou qui ne s'exécute pas mais retourne 0 aurait été
bien pire, car il aurait donné l'illusion d'une protection.

**Correction :** les trois hooks rétablissent explicitement le PATH
d'installation par défaut de bun avant toute chose :

```sh
export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:$PATH"
```

**Vérifié après correction :** hook exécuté avec `PATH=/usr/bin:/bin` → code 0.

### D2 — Le hook `preinstall` casse le schéma de cache Docker 🟠

**Scénario :** le `Dockerfile` du projet d'origine applique le schéma classique
de mise en cache des couches :

```dockerfile
COPY package.json .
RUN bun install          # ← couche mise en cache tant que package.json ne change pas
COPY . .
```

Or `preinstall` exécute `node tools/check-engines.mjs`, et `tools/` n'est pas
encore copié à cet instant.

**Constaté :** reproduction isolée du scénario.

```
error: preinstall script from "d" exited with 1
code retour = 1
```

**Décision : ne pas affaiblir le contrôle.** Rendre `preinstall` tolérant
(`|| true`) le viderait de son sens — il existe précisément pour empêcher une
installation sur un Node incompatible, ce qui est déjà arrivé sur le projet
d'origine (CI en Node 18 pour un projet Angular 21).

La correction appartient au `Dockerfile`, qui doit copier `tools/` avec le
manifeste :

```dockerfile
COPY package.json bun.lock ./
COPY tools/ ./tools/
RUN bun install
COPY . .
```

Le cache de couche reste efficace : `tools/` change rarement.

**Statut :** contrainte documentée, à appliquer en **Phase 06**. Aucun
`Dockerfile` n'existe encore dans ce monorepo.

### D3 — Versions du catalog divergentes de l'outillage du projet d'origine 🟡

Le catalog `tooling` épingle `@angular/cli` et `@angular/build` en **21.2.16**,
alors que le projet d'origine a **21.2.14** installé — son framework étant en
21.2.16.

**Vérifié :** `@angular/cli@21.2.16` et `@angular/build@21.2.16` existent bien
sur le registre (HTTP 200).

**Décision : conserver 21.2.16.** La CLI et le framework Angular sont publiés en
lockstep — une CLI 21.2.16 est conçue pour un framework 21.2.16. L'écart du
projet d'origine est un décalage de mise à jour, pas une contrainte à
reproduire. Aligner l'ensemble sur 21.2.16 est **plus cohérent** que l'existant.

Point noté pour la Phase 02 : le catalog ne couvre pas encore
`@angular-devkit/build-angular` ni `@schematics/angular`, dont `@nx/angular` a
besoin. Ils y seront ajoutés une fois les contraintes réelles connues — les
épingler à l'aveugle maintenant serait précisément le genre de sur-contrainte
qui provoque des conflits d'installation.

---

## Incohérences documentaires corrigées

| Fichier          | Problème                                                            | Correction                       |
| ---------------- | ------------------------------------------------------------------- | -------------------------------- |
| `docs/README.md` | Référence à `packages/<stack>-*`, structure abandonnée en Phase 01b | Remplacée par `apps/` et `libs/` |
| `README.md`      | « phases 01 et 01b terminées » alors que 01c et 01d le sont aussi   | « phases 01 à 01d terminées »    |

`docs/phases/phase-01-squelette-nx.md` mentionne également `packages/*` : c'est
**correct et conservé**, ce document décrit l'état du dépôt à sa date. Un
journal qu'on réécrit rétroactivement perd sa raison d'être.

---

## Hypothèses vérifiées sans défaut

Ces points étaient supposés vrais et n'avaient jamais été testés.

### Le clone vierge fonctionne de bout en bout

Test décisif du socle : `git clone` dans un répertoire neuf, puis `bun install`.

| Étape                   | Résultat                                     |
| ----------------------- | -------------------------------------------- |
| `preinstall` s'exécute  | ✅ « Environnement conforme — Node 22.22.3 » |
| `prepare` active husky  | ✅ `core.hooksPath = .husky/_`               |
| 344 paquets installés   | ✅                                           |
| `bun run check:all`     | ✅ les trois contrôles passent               |
| `bunx nx show projects` | ✅ code 0                                    |

### bun exécute bien `preinstall` et `prepare`

Le comportement de bun sur les scripts de cycle de vie diffère de npm — il
bloque par défaut ceux des **dépendances**. Vérifié que ceux du **package
racine** s'exécutent normalement : sans cela, `check-engines` et l'activation
des hooks n'auraient jamais tourné.

### husky n'échoue pas en l'absence de dépôt Git

Scénario CI et Docker, où `.git` est souvent absent.

```
$ husky
.git can't be found
code retour = 0
```

husky avertit sans échouer : `bun install` ne casse pas en CI.

### Le parseur semver de `check-engines` est exact

Ce script a été écrit sans dépendance externe ; son parseur devait donc être
vérifié plutôt que supposé. Neuf cas limites contre
`^20.19.0 || ^22.12.0 || >=24.0.0` :

| Version | Attendu | Obtenu     | Cas                              |
| ------- | ------- | ---------- | -------------------------------- |
| 18.20.0 | rejeté  | ✅ rejeté  | Node de la CI d'origine          |
| 20.0.0  | rejeté  | ✅ rejeté  | sous le minimum de la branche 20 |
| 20.19.0 | accepté | ✅ accepté | minimum exact                    |
| 20.30.1 | accepté | ✅ accepté | branche 20 récente               |
| 22.11.0 | rejeté  | ✅ rejeté  | sous le minimum de la branche 22 |
| 22.22.3 | accepté | ✅ accepté | version courante                 |
| 23.5.0  | rejeté  | ✅ rejeté  | branche impaire, non supportée   |
| 24.0.0  | accepté | ✅ accepté | minimum de la branche 24         |
| 26.1.0  | accepté | ✅ accepté | version future                   |

Les cas 20.0.0, 22.11.0 et 23.5.0 sont ceux qu'un parseur naïf laisse passer.

### `@nx/angular` 23.1.0 est compatible avec Angular 21

Vérification bloquante pour la Phase 02 — un incompatibilité ici aurait remis en
cause le choix de version de Nx.

```json
{
    "@angular/build": ">= 20.0.0 < 23.0.0",
    "@angular-devkit/build-angular": ">= 20.0.0 < 23.0.0",
    "@schematics/angular": ">= 20.0.0 < 23.0.0",
    "rxjs": "^6.5.3 || ^7.5.0"
}
```

Angular 21 est dans la plage, et la contrainte `rxjs` est satisfaite par le
7.8.2 du catalog. **La Phase 02 est viable en l'état.**

### `nx.json` ne contient aucune clé invalide

Toutes les clés déclarées ont été confrontées au schéma de Nx 23.1.0.
`workspaceLayout` et `defaultBase` y figurent bien — une clé silencieusement
ignorée aurait donné une configuration décorative.

### Tous les liens internes de la documentation résolvent

Revérifié **après** le reformatage automatique par Prettier, qui avait réécrit
l'intégralité des tableaux Markdown. Aucun lien cassé sur les 25 documents.

---

## Ce qui reste ouvert

| Point                              | Nature                                                                          | Échéance                      |
| ---------------------------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| Nx Cloud (A3)                      | Nécessite un compte — hors de portée d'un outil agissant au nom du propriétaire | Phase 06                      |
| `Dockerfile` copiant `tools/` (D2) | Contrainte à respecter à la création du Dockerfile                              | Phase 06                      |
| Rejeu des contrôles en CI          | Les hooks restent contournables par `--no-verify`                               | Phase 06                      |
| Catalog à compléter                | `@angular-devkit/build-angular`, `@schematics/angular`                          | Phase 02                      |
| `CODEOWNERS` à peupler             | Une équipe inexistante y est ignorée sans avertissement                         | À la constitution des équipes |

---

## Conclusion

Le socle est **prêt pour la Phase 02**. Les trois défauts trouvés étaient tous
des angles morts d'environnement — PATH restreint, système de fichiers Docker,
divergence de versions — c'est-à-dire précisément ce qu'une vérification menée
dans les conditions d'écriture ne révèle jamais.

Aucun ne remettait en cause une décision d'architecture : les ADR-0001 à 0008
sont confirmés en l'état.

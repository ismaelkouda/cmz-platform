# ADR-0011 — Adaptation au monorepo par post-traitement, pas par fork des générateurs

- **Statut :** Accepted
- **Date :** 2026-07-22

## Contexte

Les générateurs SEOS (`generate-reference-module.js`, 1 984 lignes, et ses
homologues) produisent une **arborescence d'application unique** :
`src/presentation/pages/{MODULE}/{couche}/...`, avec des imports par alias
(`@presentation/pages/<module>/...`, `@pages/...`, `@shared/...`, `@core/...`).

Le monorepo attend au contraire des **packages `libs/*` par couche et par
module** ([ADR-0003](./0003-nommage-et-structure.md),
[ADR-0004](./0004-graphe-de-dependances-declarees.md), décision D2), avec des
imports par nom de package (`@cmz/<module>-domain`) et des dépendances déclarées
en `workspace:*`.

Il faut donc transformer la sortie du générateur. La question est **où** opère
cette transformation.

### Ce que la lecture du code a établi

Mesuré sur le module de référence `administrative-infrastructure` (106/106) :

- les imports intra-module expriment déjà les dépendances de couche dans le sens
  Clean Architecture — `application/use-case` importe
  `domain/{contracts, entities, repositories, value-objects}`, `di` importe
  tout, `presentation` importe `application`/`domain` ;
- répartition par couche (module complet, 2 entités) : `domain` 63,
  `application` 72, `infrastructure` 49, `presentation` 36, `di` 7, + `routes` ;
- le noyau est référencé par `@shared/*` (188) et `@core/*` (12).

Autrement dit, la structure produite **est déjà découpée en couches** ; il ne
reste qu'à la distribuer en packages et à réécrire les alias en noms de package.

## Options envisagées

### Option A — Forker / paramétrer chaque générateur

Modifier les générateurs pour qu'ils émettent directement dans
`libs/<module>/ <couche>/` avec des imports `@cmz/*`.

- Avantages : une seule étape, sortie directement au bon format.
- Inconvénients : il faut modifier **chaque** générateur (crud, action-request,
  et les deux à extraire), soit 4 forks à maintenir ; on risque de casser 23
  itérations de réglage du générateur CRUD ; toute évolution amont du pattern
  (v24…) impose de re-porter le fork ; mélange « ce qu'est le pattern » et « où
  il vit dans le monorepo ».

### Option B — Post-traitement : un adaptateur unique

Laisser les générateurs **intacts** (ils produisent la sortie canonique validée
par `check-pattern`), puis appliquer un **adaptateur monorepo** qui :

1. distribue les dossiers de couche dans les libs de couche ;
2. réécrit les imports alias en imports de package ;
3. émet `package.json` (deps `workspace:*` + `catalog:`) et `project.json` (tags
   Nx) par lib.

- Avantages : les générateurs restent la source canonique, non touchée ; **un
  seul** adaptateur, réutilisable par les 4 patterns (ils émettent tous la même
  structure de couches) ; séparation nette entre « le pattern » (amont, stable)
  et « la structure monorepo » (notre choix) ; testable isolément ; une
  évolution amont du pattern ne casse pas l'adaptateur.
- Inconvénients : deux étapes au lieu d'une ; l'adaptateur doit connaître la
  table de correspondance couche → lib et alias → package.

## Décision

**Option B.** On ne forke pas les générateurs. On écrit **un adaptateur
monorepo** qui post-traite la sortie de n'importe quel générateur SEOS.

### Emplacement des outils (concrétise D1)

- Les **générateurs et schémas SEOS** restent en amont, dans le dépôt tiers
  publié ([ADR-0009](./0009-reconstruction-pilotee-par-patterns.md)) — ils sont
  génériques.
- L'**adaptateur monorepo** est **notre** code et vit dans **ce dépôt**
  (`tools/seos-adapter/`), parce qu'il encode nos choix structurels (lib par
  couche, scope `@cmz/*`, catalog). Il n'a de sens que pour ce monorepo.

### Correspondance couche → lib (D2)

| Couche générée    | Lib                    | Nom                    | Tag                | Dépend de            |
| ----------------- | ---------------------- | ---------------------- | ------------------ | -------------------- |
| `domain/`         | `libs/<m>/domain`      | `@cmz/<m>-domain`      | `type:domain`      | `@cmz/shared-domain` |
| `infrastructure/` | `libs/<m>/data`        | `@cmz/<m>-data`        | `type:data`        | domain               |
| `application/`    | `libs/<m>/application` | `@cmz/<m>-application` | `type:application` | domain, data         |
| `presentation/`   | `libs/<m>/ui`          | `@cmz/<m>-ui`          | `type:ui`          | domain, application  |
| `di/` + `routes`  | `libs/<m>/feature`     | `@cmz/<m>-feature`     | `type:feature`     | toutes               |

### Table de réécriture des imports

| Alias source                                                      | Devient                                       |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `@presentation/pages/<m>/domain/…` · `@pages/<m>/domain/…`        | `@cmz/<m>-domain`                             |
| `…/infrastructure/…`                                              | `@cmz/<m>-data`                               |
| `…/application/…`                                                 | `@cmz/<m>-application`                        |
| `…/presentation/…`                                                | `@cmz/<m>-ui`                                 |
| `…/di/…`                                                          | `@cmz/<m>-feature`                            |
| `@shared/domain/…` · `@shared/data/…` · `@shared/interface/…` · … | `@cmz/shared-domain` · `@cmz/shared-data` · … |
| `@core/…`                                                         | `@cmz/core`                                   |

La réécriture est déterministe (table + AST via ts-morph, pas de regex fragile
sur du TypeScript).

### Pipeline par entité

```
générer (sortie canonique, imports @pages)
  → check-pattern.js : 106/106            (valide le pattern AVANT distribution)
  → adaptateur : distribue en libs + réécrit les imports
  → adaptateur : émet package.json (workspace:*/catalog:) + project.json (tags)
  → tsc --noEmit / nx build / nx lint / nx graph
```

`check-pattern` s'exécute **avant** distribution, sur la sortie plate : il
valide le pattern, pas la disposition monorepo. La distribution qui suit est un
déplacement mécanique, sans perte possible (vérifiable au compte de fichiers).
`check-semantics` peut tourner avant ou après (il lit le contenu, pas
l'arborescence).

## Justification

L'argument décisif est la **réutilisation et la stabilité**. Un adaptateur
unique sert les 4 patterns parce qu'ils partagent la même structure de couches ;
forker imposerait 4 maintenances parallèles. Et garder les générateurs intacts
protège les 23 itérations de réglage : le risque de régression se déplace vers
un outil neuf, isolé et testable, plutôt que vers un actif éprouvé.

Ce découpage prolonge la philosophie SEOS : séparer ce qui est stable (le
pattern) de ce qui est contextuel (la structure d'accueil) — exactement comme le
profil de convention sépare le code des conventions de framework
([ADR-0010](./0010-flux-de-generation-assistee-par-ia.md)).

## Conséquences

### Positives

- Un seul outil d'adaptation pour tous les patterns, présents et à venir.
- Les générateurs restent canoniques et re-synchronisables avec l'amont.
- L'adaptateur est testable en isolation (entrée = sortie générateur, sortie =
  libs) et vérifiable (compte de fichiers, `nx graph` acyclique).
- `check-pattern` continue de valider le pattern sans modification.

### Négatives / dette acceptée

- Deux étapes de génération à orchestrer (générer, puis adapter).
- L'adaptateur doit rester synchronisé si un pattern introduit une nouvelle
  couche — mais c'est une table à étendre, pas un fork à re-porter.
- `check-semantics.js` et `check-pattern.js` prennent aujourd'hui un chemin de
  module plat ; on les exécute donc **avant** distribution, ce qui impose que le
  pipeline conserve la sortie plate intermédiaire le temps des vérifications.

### Points à réévaluer

- Si un pattern se révélait impossible à distribuer proprement (couplage
  circulaire entre couches), reconsidérer le découpage de CE pattern — pas
  l'adaptateur.
- Découpage de `presentation` en `ui` (présentationnel) et `feature`
  (routes/pages) : à affiner quand un module réel à composants sera traité.

## Références

- Lecture du module de référence `administrative-infrastructure` (imports,
  répartition par couche) — Phase 04.
- [ADR-0004 — Graphe de dépendances par déclaration explicite](./0004-graphe-de-dependances-declarees.md)
- [ADR-0009 — Reconstruction pilotée par les patterns SEOS](./0009-reconstruction-pilotee-par-patterns.md)

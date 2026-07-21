# Plan d'exécution

- **Dernière mise à jour :** 2026-07-21
- **Objectif :** reconstruire `cmz-backoffice-frontend` en Angular 22 dans le
  monorepo, par génération à partir des patterns SEOS
  ([ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md))
- **Point de départ :** socle terminé — voir [état du socle](./etat-du-socle.md)

## Comment lire ce plan

Chaque phase déclare un **critère de sortie vérifiable par une commande**. Une
phase n'est pas terminée parce qu'elle « semble faite » : elle l'est quand la
commande passe.

**Aucune date n'est donnée.** Nous n'avons pas de vélocité mesurée sur ce type
de travail, et le volume réel de la Phase 07 dépend d'une mesure qui n'a pas
encore été faite (§ Phase 03). Annoncer un calendrier maintenant reviendrait à
inventer un chiffre. Les efforts sont exprimés en ordres de grandeur relatifs,
et la Phase 03 produira les données nécessaires à un vrai chiffrage.

## Vue d'ensemble

| Phase | Objet                                                         | Bloque             | Effort         |
| ----- | ------------------------------------------------------------- | ------------------ | -------------- |
| 02    | Application Angular 22 + validation du pattern sur une entité | Tout               | Faible         |
| 03    | Mesure de couverture des patterns sur les 53 entités          | 07                 | Faible         |
| 04    | Adaptation des générateurs au monorepo                        | 06, 07             | **Élevé**      |
| 05    | Socle transverse `shared/` + `core/` (584 fichiers)           | 07                 | **Élevé**      |
| 06    | Qualité, tests, CI, Docker                                    | 07 (partiellement) | Moyen          |
| 07    | Reconstruction des 53 entités                                 | 08                 | **Très élevé** |
| 08    | Vérification fonctionnelle globale                            | —                  | Moyen          |

Les phases 02 et 03 sont des **phases de mesure** : peu coûteuses, mais elles
conditionnent tout le reste. Les exécuter avant tout engagement est le point le
plus important de ce plan.

---

## Phase 02 — Application Angular 22 et validation du pattern

**Objectif réel : répondre à une question, pas produire du code.** Les patterns
SEOS ont été extraits sur Angular 21. Ils décrivent une structure de fichiers et
des responsabilités, pas des API du framework — leur validité sur Angular 22 est
probable mais non vérifiée. Si elle est fausse, tout le plan change.

### Étapes

**02.1 — Installer le plugin Angular**

```bash
bun add -d @nx/angular@23.1.0
```

Compatibilité déjà vérifiée : `@nx/angular` 23.1.0 déclare
`@angular/build: ">= 20.0.0 < 23.0.0"`.

**02.2 — Compléter le catalog**

`@nx/angular` requiert `@angular-devkit/build-angular` et `@schematics/angular`,
absents du catalog. Les ajouter au catalog `tooling` **après** avoir relevé les
versions réellement résolues — pas avant.

**02.3 — Générer l'application**

```bash
bunx nx g @nx/angular:application backoffice-angular \
  --directory=apps/backoffice-angular \
  --standalone --style=scss --routing \
  --unitTestRunner=vitest --e2eTestRunner=none \
  --bundler=esbuild
```

`--e2eTestRunner=none` : Playwright est mis en place en Phase 06, pas ici.

**02.4 — Mettre le package en conformité**

Le générateur écrit des versions en dur dans le `package.json` du package. Les
remplacer par `catalog:` / `catalog:tooling`, puis vérifier.

**02.5 — Valider le pattern sur une entité — l'étape qui compte**

Générer une entité de référence dans l'application neuve, puis :

```bash
node <seos>/tools/check-pattern.js apps/backoffice-angular/src/app/<module> <entite>
bunx nx build backoffice-angular
```

Choisir une entité du module `administrative-infrastructure`, seul module validé
106/106 sur le schéma v23.

### Critère de sortie

```bash
bunx nx build backoffice-angular          # succès
bun run check:versions                     # aucune violation
node <seos>/tools/check-pattern.js ...     # 106/106
```

### Décision à prendre — D1 : où vivent les outils SEOS

Les schémas et outils vivent aujourd'hui dans le dépôt source. Trois options :

| Option                                       | Avantage                                           | Inconvénient                                          |
| -------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Package `libs/seos-tooling` dans ce monorepo | Une seule vérité, versionnée avec ce qui l'utilise | Le dépôt source perd l'outillage, ou on duplique      |
| Dépendance vers le dépôt source              | Pas de duplication                                 | Couplage inter-dépôts, versions difficiles à aligner  |
| Dépôt tiers publié                           | Propre, réutilisable par les deux                  | Coût de mise en place, cadence de publication à gérer |

**À trancher avant la Phase 04**, qui modifie ces outils. Sans décision, deux
dépôts porteront une vérité partagée et divergeront.

### Si le pattern ne tient pas sur Angular 22

Ce n'est pas un échec du plan mais une information. Deux issues : ajuster le
schéma (une version v24 documentant les écarts Angular 22), ou revenir à Angular
21 en révisant l'[ADR-0005](../adr/0005-versions-du-socle.md). La décision se
prend sur la nature des écarts constatés, pas par avance.

---

## Phase 03 — Mesure de couverture des patterns

**Phase de mesure, peu coûteuse, et le seul chemin vers un chiffrage honnête.**
Aujourd'hui les patterns sont prouvés sur 6 unités ; le projet en compte 53.

### Étapes

**03.1 — Exécuter le mineur sur le projet source**

```bash
node <seos>/tools/extract-pattern.js
```

L'outil découvre les entités par signal structurel et calcule la fréquence
d'apparition de chaque chemin normalisé.

**03.2 — Vérifier chaque entité contre le schéma**

```bash
for entite in <les 53>; do
  node <seos>/tools/check-pattern.js <module> "$entite"
done
```

**03.3 — Classer**

| Classe      | Définition                          | Traitement en Phase 07                               |
| ----------- | ----------------------------------- | ---------------------------------------------------- |
| Conforme    | 106/106 ou écart documenté          | Génération directe                                   |
| Proche      | Écart mineur, réductible            | Génération + ajustement                              |
| Hors schéma | Ne relève d'aucun des deux patterns | Extraction d'un nouveau pattern, ou reprise manuelle |

**03.4 — Traiter les trois domaines sans commande**

`interactive-map`, `monitoring` et `reporting` ne déclarent aucune commande : ce
sont probablement des domaines en lecture seule. Le mineur distingue déjà ce
sous-corpus. Deux voies : extraire un troisième pattern `read-only-view` si la
forme se répète, ou les traiter manuellement.

### Critère de sortie

Un tableau des 53 entités classées, ajouté à
[l'analyse du projet source](./analyse-du-projet-source.md), et un chiffrage de
la Phase 07 fondé dessus.

### Ce que la mesure peut révéler

| Couverture | Conséquence sur le plan                                              |
| ---------- | -------------------------------------------------------------------- |
| > 80 %     | Le plan tient tel quel                                               |
| 40–80 %    | Phase 07 scindée : génération puis reprise manuelle                  |
| < 40 %     | Le cadrage est à revoir — la génération ne serait plus le bon levier |

---

## Phase 04 — Adaptation des générateurs au monorepo

**La phase la plus incertaine, et l'objectif de recherche du projet SEOS.**

Les générateurs produisent `src/presentation/pages/{MODULE}/`, une arborescence
d'application unique. Le monorepo attend des packages `libs/*` portant leur
`package.json` et leurs dépendances déclarées en `workspace:*`
([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)).

C'est exactement la généralisation que `besoin-reformule-SEOS.md` (§4.4) désigne
comme deuxième cible de validation : passer d'une structure applicative à une
**structure organisationnelle** différente.

### Étapes

**04.1 — Décider du découpage d'un domaine en packages**

Question préalable : un domaine devient-il **une** bibliothèque ou **plusieurs**
?

Les 106 fichiers canoniques se répartissent en `application` 31, `domain` 26,
`infrastructure` 23, `presentation` 21, `di` 4. Deux options :

| Option                            | Conséquence                                                |
| --------------------------------- | ---------------------------------------------------------- |
| Une lib par domaine               | 18 packages, frontières internes non opposables            |
| Une lib par couche et par domaine | ~72 packages, frontières réellement imposées par le graphe |

La seconde sert l'[ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)
mais multiplie les `package.json`. **À trancher sur un domaine pilote**, pas
dans l'abstrait.

**04.2 — Paramétrer la sortie du générateur**

Ajouter une notion de package cible : chemin de sortie, nom `@cmz/*`,
`package.json` généré avec les dépendances internes en `workspace:*` et les
dépendances du socle en `catalog:`.

**04.3 — Générer le `project.json` et les tags Nx**

Tags de couche (`type:domain`, `type:data`, `type:feature`…) pour que les règles
de frontières ESLint de la Phase 06 aient prise.

**04.4 — Adapter `check-pattern.js` et `check-semantics.js`**

Ils prennent un chemin de module ; il faut qu'ils acceptent un chemin de
package.

### Critère de sortie

Le générateur produit un package `libs/*` qui :

```bash
bun install                                  # résout les workspace:*
bunx nx build <package>                      # compile
bunx nx graph                                # dépendances attendues, aucune autre
node <seos>/tools/check-pattern.js ...       # 106/106
bun run check:versions                       # aucune violation
```

### Risque principal

Le générateur fait 1 984 lignes écrites pour un seul mode de sortie. Si son
architecture ne s'y prête pas, il faudra soit le refondre, soit générer dans
l'ancienne forme puis transformer — **décider après lecture du code, pas
avant.**

---

## Phase 05 — Socle transverse

584 fichiers TypeScript : `shared/domain` 129, `shared/data` 50,
`shared/application` 5, `shared/components` 351, `core/` 28, divers 21.

Plus de 3 300 imports du projet source pointent vers `shared/*` : **rien ne peut
être reconstruit avant**. C'est la seule phase réellement séquentielle.

### Ordre imposé par les dépendances

```
shared/domain  →  shared/data  →  shared/application  →  shared/components  →  core/
```

Le domaine ne dépend de rien ; les composants dépendent de tout le reste.

### Packages cibles

| Package                   | Source                                    | Fichiers |
| ------------------------- | ----------------------------------------- | -------- |
| `@cmz/shared-domain`      | `shared/domain` + `shared/class`          | ~130     |
| `@cmz/shared-data`        | `shared/data`                             | 50       |
| `@cmz/shared-application` | `shared/application`                      | 5        |
| `@cmz/shared-ui`          | `shared/components` + `shared/directives` | ~352     |
| `@cmz/core`               | `core/`                                   | 28       |
| `@cmz/shared-constants`   | `shared/constants` + `shared/interface`   | ~15      |

`shared/components` (351 fichiers, 30 composants) est le gros morceau et
mériterait probablement d'être scindé — à décider une fois son contenu
inventorié.

### Dépendances métier

Elles arrivent **ici** et non plus tôt : `shared/components` en est le principal
consommateur, et rien ne sert d'installer PrimeNG avant d'avoir un composant qui
l'utilise.

| Famille      | Paquets                                                              |
| ------------ | -------------------------------------------------------------------- |
| État         | `@ngrx/store`, `effects`, `entity`, `signals`, `router-store`        |
| UI           | `primeng`, `@primeng/themes`, `primeicons`, `primeflex`, `bootstrap` |
| i18n         | `@ngx-translate/core`, `http-loader`                                 |
| Cartographie | `ol`                                                                 |
| Documents    | `exceljs`, `file-saver`, `pdfmake`                                   |
| Divers       | `quill`, `apexcharts`, `sweetalert2`, `date-fns`, `jwt-decode`       |

Chacune est ajoutée **au catalog** au moment de son introduction
([ADR-0005](../adr/0005-versions-du-socle.md)) — un paquet métier installé en
version libre dans un package est exactement ce que `check:versions` refuse.

Ne pas reprendre en bloc les 60 dépendances du projet source : n'installer que
ce qu'un package consomme réellement. Le `package.json` source contient des
dépendances manifestement inutilisées (`i`, `chalk`, `commander`,
`replace-json-property`).

### Étapes

**05.1** Inventorier les dépendances internes de `shared/` — quel sous-dossier
importe quel autre. Sans cette carte, le découpage produira des cycles.

**05.2 à 05.6** Un package par étape, dans l'ordre ci-dessus. Chacun compile et
passe `nx graph` avant de passer au suivant.

**05.7** Vérifier l'absence de cycle : `bunx nx graph` doit rester acyclique.

### Critère de sortie

```bash
bunx nx run-many -t build --projects=tag:scope:shared   # tout compile
bunx nx graph                                            # aucun cycle
```

### Piège

`shared/` du projet source **n'a pas été passé au crible des patterns** — les
schémas SEOS couvrent les entités métier, pas le socle transverse. Cette phase
est donc une **reprise manuelle**, pas une génération. C'est la principale
différence avec la Phase 07, et elle explique son coût.

---

## Phase 06 — Qualité, tests, CI, déploiement

### Étapes

**06.1 — ESLint et frontières**

Règle `@nx/enforce-module-boundaries` appuyée sur les tags de la Phase 04 :

```
type:domain      → ne dépend de rien
type:data        → domain
type:application → domain, data
type:ui          → domain, constants
type:feature     → toutes les couches
app              → feature
```

C'est ce qui rend l'architecture **opposable** plutôt que documentaire.

**06.2 — Stylelint** — repris du projet source.

**06.3 — Vitest** ([ADR-0008](../adr/0008-outillage-de-tests.md)) via
`@angular/build:unit-test`.

**06.4 — Playwright** — réécriture, pas migration : Protractor est abandonné
depuis Angular 12.

**06.5 — Configuration runtime**
([ADR-0007](../adr/0007-configuration-runtime.md)) — reprendre
`generate-env.js`, avec les trois corrections : valeurs hors du dépôt, fichier
généré réellement ignoré, validation au démarrage.

**06.6 — Docker**

Contrainte connue : le hook `preinstall` impose de copier `tools/` **avant**
l'installation.

```dockerfile
COPY package.json bun.lock ./
COPY tools/ ./tools/
RUN bun install
COPY . .
```

**06.7 — CI**

Rejouer les mêmes contrôles que les hooks — sinon `--no-verify` suffit à tout
contourner. Node aligné sur `engines` (le projet source déclarait Node 18 pour
un projet Angular 21 : ne pas reproduire).

```bash
bun run check:all
bun run format:check
bunx nx affected -t lint test build
```

**06.8 — Nx Cloud**

`bunx nx connect` — nécessite un compte, revient au propriétaire du dépôt.

### Critère de sortie

Un pipeline qui passe de bout en bout sur une branche, et une image Docker qui
démarre avec une configuration injectée.

---

## Phase 07 — Reconstruction des domaines

**La phase la plus lourde**, et la seule dont le volume dépend d'une mesure qui
n'a pas encore été faite (Phase 03).

### Séquencement

| Lot    | Contenu                                                                 | Parallélisable                 |
| ------ | ----------------------------------------------------------------------- | ------------------------------ |
| Pilote | 1 entité de `administrative-infrastructure`                             | Non — valide la méthode        |
| Lot 1  | `authentication` (3 opérations, pattern `action-request`)               | Non — valide le second pattern |
| Lot 2  | Domaines conformes, du plus petit au plus grand                         | **Oui**                        |
| Lot 3  | Domaines « proches »                                                    | Oui                            |
| Lot 4  | Hors schéma : `interactive-map`, `monitoring`, `reporting`, et le reste | Oui                            |

**La parallélisation est réelle, pas théorique** : 12 domaines sur 18 n'ont
aucune dépendance vers un autre domaine, et les 6 restants totalisent 16
imports.

`content-management` (637 fichiers, 19 composants, 16 % de la base) est traité
en dernier et probablement découpé.

### Boucle par entité

1. Générer les 106 fichiers dans le package cible.
2. Reporter le contenu métier depuis le projet source — règles de gestion,
   validations, libellés.
3. `check-pattern.js` → 106/106.
4. `check-semantics.js` → aucune erreur.
5. `nx build`, `nx lint`, tests Vitest.
6. `nx graph` : dépendances attendues, **et aucune inattendue**.
7. Parcours principal vérifié contre l'application source.

### Le piège central

Le schéma `crud-entity` l'écrit lui-même : ces vérifications couvrent la
**conformité structurelle**, pas le contenu sémantique. Il renvoie à **neuf
expériences** où des déviations réelles ont été trouvées malgré 100 % de
conformité.

106/106 signifie que les bons fichiers existent au bon endroit — pas que
l'entité fonctionne. `check-semantics.js` couvre neuf familles de bugs réels
(defer manquant, clé i18n absente, handler d'erreur non enregistré…), ce qui est
beaucoup, mais pas tout. **L'étape 7 n'est pas optionnelle.**

### Traitement des 16 imports inter-domaines

Chacun est examiné individuellement : soit il révèle un concept qui a sa place
dans `shared/`, soit un couplage à supprimer. Ne pas les reproduire
mécaniquement.

---

## Phase 08 — Vérification fonctionnelle

### Trois niveaux, du moins coûteux au plus coûteux

**08.1 — Structurel.** `nx graph` sur l'ensemble : aucune dépendance imprévue,
aucun cycle, frontières ESLint respectées.

**08.2 — Fonctionnel.** Parcours principal de chaque domaine rejoué à
l'identique sur les deux applications, avec les mêmes données. C'est le seul
niveau qui détecte une règle de gestion mal reportée.

**08.3 — Non-régression.** Suite Playwright sur les parcours critiques,
constituée au fil de la Phase 07 et non à la fin.

### Critère de sortie du projet

- Tous les domaines migrés selon les critères de la Phase 07.
- `bunx nx run-many -t lint test build` passe sur l'intégralité du monorepo.
- Suite Playwright verte sur les parcours critiques.
- Aucun écart fonctionnel non documenté par rapport à l'application source.
- Application déployée sur un environnement de recette et validée.

---

## Décisions bloquantes

| #   | Décision                                        | À prendre avant | Conséquence si reportée                      |
| --- | ----------------------------------------------- | --------------- | -------------------------------------------- |
| D1  | Emplacement des outils SEOS                     | Phase 04        | Deux dépôts divergent                        |
| D2  | Une lib par domaine ou par couche               | Phase 04        | Redécoupage de tous les packages             |
| D3  | Découpage de `shared/components` (351 fichiers) | Phase 05        | Un package obèse difficile à scinder ensuite |
| D4  | Sort des 3 domaines en lecture seule            | Phase 03        | Volume de la Phase 07 inconnu                |

## Ce qui rendrait ce plan caduc

Trois hypothèses le sous-tendent. Chacune est testée tôt et à faible coût —
c'est délibéré.

| Hypothèse                                   | Testée en | Si fausse                                  |
| ------------------------------------------- | --------- | ------------------------------------------ |
| Les patterns tiennent sur Angular 22        | Phase 02  | Ajuster le schéma, ou revenir à Angular 21 |
| La couverture des patterns est élevée       | Phase 03  | Phase 07 largement manuelle — replanifier  |
| Les générateurs sont adaptables au monorepo | Phase 04  | Générer puis transformer, ou refondre      |

L'ordre des phases est construit pour que **la découverte d'une hypothèse fausse
coûte le moins cher possible** : les deux phases de mesure passent avant les
deux phases lourdes.

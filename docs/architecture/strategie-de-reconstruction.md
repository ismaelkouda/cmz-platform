# Stratégie de reconstruction de cmz-backoffice-frontend

- **Statut :** Cadrage — appliqué à partir de la Phase 07
- **Dernière mise à jour :** 2026-07-21
- **ADR associés :** [ADR-0009](../adr/0005-versions-du-socle.md),
  [ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md),
  [ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)

## Nature du travail

|                               | Ce que ce n'est pas              | Ce que c'est                                                     |
| ----------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Nature                        | Migration                        | **Reconstruction générative**                                    |
| Unité de travail              | Le fichier                       | **L'entité** (106 fichiers) ou **l'opération** (34 fichiers)     |
| Source de vérité structurelle | Le code d'origine                | **Le schéma de pattern**                                         |
| Source de vérité métier       | Le code d'origine                | Le code d'origine (inchangé)                                     |
| Version d'Angular             | 21, à l'identique                | **22, la version courante**                                      |
| Effort principal              | Déplacer et réécrire les imports | **Reporter le contenu métier**                                   |
| Vérification                  | Comparaison manuelle             | `check-pattern` + `check-semantics` + vérification fonctionnelle |

## L'état des lieux, mesuré

| Indicateur                                          | Valeur                      |
| --------------------------------------------------- | --------------------------- |
| Entités déclarées dans le projet d'origine          | 53                          |
| Domaines fonctionnels                               | 18 (16 portant des entités) |
| Fichiers canoniques par entité CRUD                 | 106 (schéma v23)            |
| Fichiers canoniques par opération                   | 34 (schéma v6)              |
| Unités sur lesquelles les patterns sont **prouvés** | **6**                       |

Ce dernier chiffre est le plus important de ce document, et le seul qui doive
guider le séquencement.

## Le risque principal : la couverture des patterns

Les schémas sont validés sur 6 unités : `departments`, `municipalities`,
`regions` (CRUD), `login`, `forgot-password`, `reset-password` (opérations). Le
projet en compte 53.

L'hypothèse de SEOS est que la majorité des entités restantes se conforme au
schéma `crud-entity`. C'est plausible — l'architecture d'origine est homogène —
mais **ce n'est pas établi**. Trois domaines (`interactive-map`, `monitoring`,
`reporting`) ne déclarent aucune commande et ne relèvent visiblement d'aucun des
deux schémas.

Trois issues sont possibles, et elles n'ont pas le même coût :

| Couverture réelle | Conséquence                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Élevée (> 80 %)   | La génération porte l'essentiel du travail ; le cadrage tient                                              |
| Moyenne (40–80 %) | Extraire davantage de patterns pour couvrir les entités « proches »                                        |
| Faible (< 40 %)   | Le cadrage doit être revu — enrichir fortement les patterns, ou reconsidérer l'approche pour cette portion |

**Aucun calendrier ne doit être annoncé avant cette mesure.**
`extract-pattern.js` existe pour y répondre sur du code réel.

## Séquencement

### Étape 0 — Valider les patterns sur Angular 22 (bloquant)

Les schémas ont été extraits sur Angular 21. Ils décrivent une structure de
fichiers et des responsabilités, pas des API du framework : leur validité sur
Angular 22 est probable, mais non vérifiée.

**Sur une seule entité**, dans `apps/backoffice-angular` : générer, compiler,
passer `check-pattern.js`. Si le schéma tient, tout le reste s'enchaîne. Sinon,
il vaut mieux le découvrir sur une entité que sur cinquante.

### Étape 1 — Mesurer la couverture réelle

Exécuter `check-pattern.js` et `extract-pattern.js` sur les 53 entités du projet
d'origine, et classer :

- entités **conformes** au schéma `crud-entity` ;
- entités **proches** — conformes à un ensemble documenté de déviations près ;
- entités **hors schéma** — relevant d'un pattern non encore extrait, ou
  d'aucun.

Le résultat de cette étape conditionne tout le reste, y compris le chiffrage.

### Étape 2 — Adapter les générateurs au monorepo

Les générateurs produisent aujourd'hui `src/presentation/pages/{MODULE}/`, une
arborescence d'application unique. Le monorepo attend des packages `libs/*` avec
leur `package.json` et leurs dépendances déclarées en `workspace:*`
([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)).

C'est précisément la généralisation que SEOS s'était fixée comme deuxième cible
de validation (`besoin-reformule-SEOS.md`, §4.4) : passer d'une structure
applicative à une **structure organisationnelle** différente. Ce n'est pas un
détail d'adaptation, c'est un objectif de recherche du projet d'origine — et un
travail à chiffrer.

### Étape 3 — Socle transverse

`shared/domain` → `shared/data` → `shared/application` → `shared/components` →
`core/`.

Plus de 3 300 imports du projet d'origine pointent vers `shared/*` : rien ne
peut être reconstruit avant. L'ordre suit le sens des dépendances. Seule étape
réellement séquentielle.

### Étape 4 — Entités conformes

Générées puis remplies, dans n'importe quel ordre. L'analyse de couplage établit
que **12 domaines sur 18 n'ont aucune dépendance vers un autre domaine** — la
parallélisation est donc réelle, pas théorique.

Commencer par une entité du module de référence
(`administrative-infrastructure`), puisque c'est celle contre laquelle le schéma
a été validé à 106/106.

### Étape 5 — Entités hors schéma

Deux voies, à décider au cas par cas : extraire un nouveau pattern si la forme
se répète suffisamment, ou reprendre manuellement s'il s'agit d'un cas isolé.

Extraire un pattern pour une seule entité coûte plus cher que de l'écrire à la
main.

## Critère d'achèvement d'une entité

- [ ] Générée dans une bibliothèque `libs/*` avec ses tags Nx.
- [ ] `check-pattern.js` : 106/106 sur le schéma courant.
- [ ] `check-semantics.js` sans erreur.
- [ ] Contenu métier reporté depuis le projet d'origine et relu.
- [ ] Dépendances déclarées en `workspace:*`
      ([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)).
- [ ] Dépendances du socle passant par le catalog
      ([ADR-0005](../adr/0005-versions-du-socle.md)).
- [ ] `nx build` et `nx lint` passent.
- [ ] Tests unitaires Vitest ([ADR-0008](../adr/0008-outillage-de-tests.md))
      passants.
- [ ] Parcours principal vérifié par rapport à l'application d'origine.
- [ ] `nx graph` : dépendances attendues, **et aucune inattendue**.

## Le piège à ne pas manquer

Le schéma `crud-entity` l'écrit lui-même : ces vérifications couvrent la
**conformité structurelle**, pas le contenu sémantique. Il renvoie à neuf
expériences où des déviations réelles ont été trouvées **malgré 100 % de
conformité structurelle**.

Un générateur donne une impression de correction très supérieure à ce qu'il
garantit. 106/106 signifie que les bons fichiers existent au bon endroit — pas
que l'entité fonctionne. `check-semantics.js` existe pour combler une partie de
cet écart ; la vérification fonctionnelle reste indispensable pour le reste.

Le projet d'origine a documenté ce risque avant que nous ne le rencontrions.

## Points de vigilance

- **Ne pas reconstruire le mort.** Le projet d'origine contient un script
  obsolète (`scripts/generate-structure.ps1`) et un `src/assets.zip` de 9,9 Mo.
- **Les déviations documentées sont des décisions, pas des bogues.** Les schémas
  distinguent explicitement les résidus de refactor des écarts légitimes — les
  lire avant de « corriger » quoi que ce soit.
- **Deux dépôts porteront une vérité partagée** tant que l'emplacement des
  schémas et outils SEOS n'est pas tranché.
- **Protractor n'est pas repris** : réécriture en Playwright
  ([ADR-0008](../adr/0008-outillage-de-tests.md)).

## Suite

Ce document est un cadrage, pas un plan détaillé. Les étapes 0 et 1 produiront
les mesures qui permettront d'écrire ce plan — et pas avant.

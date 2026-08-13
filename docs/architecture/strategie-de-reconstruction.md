# Stratégie de reconstruction de cmz-backoffice-frontend

- **Statut :** Cadrage — appliqué à partir de la Phase 07
- **Dernière mise à jour :** 2026-07-22
- **ADR associés :** [ADR-0005](../adr/0005-versions-du-socle.md),
  [ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md),
  [ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md),
  [ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)
- **Portée (précision 2026-08-13) :** ce document couvre strictement le cas
  d'usage `cmz-backoffice-frontend`, un sous-ensemble de l'objectif global du
  dépôt depuis [ADR-0026](../adr/0026-reorientation-objectif-generation-generique.md).

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

| Indicateur                                 | Valeur                                  |
| ------------------------------------------ | --------------------------------------- |
| Entités déclarées dans le projet d'origine | 53                                      |
| Domaines fonctionnels                      | 18 (16 portant des entités)             |
| Fichiers canoniques par entité CRUD        | 106 (schéma v23)                        |
| Fichiers canoniques par opération          | 34 (schéma v6)                          |
| Patterns **prouvés** aujourd'hui           | 2 (`crud-entity`, `action-request`)     |
| Patterns **à extraire**                    | 2 (`read-only-view`, `workflow-action`) |
| Couverture par les patterns prouvés        | **41 %** (22/53)                        |
| Couverture générable après extraction      | **> 90 %**                              |

La couverture — et non le nombre de patterns — guide le séquencement. Elle a été
mesurée en Phase 03 ; le détail est dans
[l'analyse du projet source](./analyse-du-projet-source.md).

## La couverture des patterns — mesurée (Phase 03)

La mesure a été faite sur les 53 entités (détail et table complète dans
[l'analyse du projet source](./analyse-du-projet-source.md)). Résultat :

| Famille           |       Entités | Couverture                                                                                      |
| ----------------- | ------------: | ----------------------------------------------------------------------------------------------- |
| Conforme + Proche | **22 (41 %)** | Les deux patterns prouvés (`crud-entity`, `action-request`), directement ou après normalisation |
| Workflow-action   |     19 (36 %) | Un pattern **à extraire** (vues + transitions d'état sur file de tâches)                        |
| Lecture seule     |      9 (17 %) | Pattern **`read-only-view` à extraire** (D4)                                                    |
| Divers            |       3 (6 %) | Au cas par cas                                                                                  |

**Verdict : l'approche générative tient.** La couverture par les deux patterns
existants est de 41 % — bande « moyenne » du plan, dont la conséquence est
d'**extraire davantage de patterns**. Or les 59 % non couverts ne sont pas
dispersés : ce sont **deux familles régulières** (workflow-action, lecture
seule), extractibles par `extract-pattern.js` comme les deux premières. Une fois
ces deux patterns extraits, la couverture générable dépasse **90 %**.

Ce n'est donc pas un cas « < 40 % — reconsidérer l'approche ». C'est un cas «
extraire 2 patterns de plus », borné et conforme à la méthode SEOS.

## Séquencement

### Étape 0 — Valider les patterns sur Angular 22 (bloquant)

Les schémas ont été extraits sur Angular 21. Ils décrivent une structure de
fichiers et des responsabilités, pas des API du framework : leur validité sur
Angular 22 est probable, mais non vérifiée.

**Sur une seule entité**, dans `apps/backoffice-angular` : générer, compiler,
passer `check-pattern.js`. Si le schéma tient, tout le reste s'enchaîne. Sinon,
il vaut mieux le découvrir sur une entité que sur cinquante.

### Étape 1 — Mesurer la couverture réelle ✅ faite (Phase 03)

Résultat ci-dessus et dans
[l'analyse du projet source](./analyse-du-projet-source.md) : 41 % couvert par
les 2 patterns prouvés, 2 patterns à extraire (`read-only-view`,
`workflow-action`) pour dépasser 90 %.

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

### Étape 5 — Extraire les deux patterns manquants, puis générer leurs familles

La mesure de la Phase 03 a identifié deux familles régulières, pas des cas
isolés :

1. **`read-only-view`** (9 entités) — extraire depuis `reporting/reports`
   (pipeline query-only vérifié : entité + query bus/handler + use-case +
   repository), valider, puis générer `interactive-map`, `monitoring`,
   `reporting`.
2. **`workflow-action`** (19 entités) — extraire depuis `report-states` (vues +
   transitions d'état sur file de tâches), valider, puis générer `finalization`,
   `processing`, `requests`.

Les 3 « divers » (`notifications`, `access-logs`, `daily-goal`) sont tranchés en
dernier : ils se rattacheront probablement à l'une des deux familles, ou
justifieront une variante. Aucune reprise manuelle — la règle « aucun code
manuel » s'applique
([ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)).

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

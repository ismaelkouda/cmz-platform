# Factorisation de la duplication `report-states` ↔ `requests` — fonctionnalité « details »

- **Généré :** 2026-08-10, en exécution de la tâche P1-1 de
  `docs/architecture/backlog-llm.md`.
- **Portée de ce document :** inventaire factuel et proposition de
  structure. **Aucun code n'a été modifié pour produire ce document** —
  conformément à l'instruction P1-1, la factorisation elle-même reste une
  décision architecturale à valider séparément.
- **Méthode de vérification :** chaque fichier `report-states` a été
  comparé à son homologue `requests` après normalisation textuelle des
  identifiants (`ReportStates`/`Requests`, `report-states`/`requests`,
  `REPORT_STATES`/`REQUESTS`, `reportStates`/`requests` → un jeton neutre
  commun), puis diffé ligne à ligne. Un fichier classé « identique » l'est
  donc à l'exécution/au comportement près — seuls les noms diffèrent.

---

## 1. Fichiers dupliqués entre `report-states` et `requests` (fonctionnalité « details »)

Recherche exhaustive (`find libs/report-states -iname "*details*" -type f`,
idem pour `requests`) : **58 fichiers** côté `report-states`, **57**
côté `requests` (un fichier sans homologue, voir §2.3), répartis sur les
4 couches.

### Domain (`libs/{module}/domain/src/lib/`)

| report-states | requests |
| --- | --- |
| `entities/report-states-details.entity.ts` | `entities/requests-details.entity.ts` |
| `entities/report-states-details-approve.entity.ts` (+ `.spec.ts`) | `entities/requests-details-approve.entity.ts` (+ `.spec.ts`) |
| `entities/report-states-details-filter.entity.ts` | `entities/requests-details-filter.entity.ts` |
| `entities/report-states-details-reject.entity.ts` | `entities/requests-details-reject.entity.ts` |
| `entities/report-states-details-take.entity.ts` | `entities/requests-details-take.entity.ts` |
| `enums/report-states-details-qualification-state.enum.ts` | `enums/requests-details-qualification-state.enum.ts` |
| `enums/report-states-details-status.enum.ts` | `enums/requests-details-status.enum.ts` |
| `constants/report-states-details-workflow-timestamps.constant.ts` | `constants/requests-details-workflow-timestamps.constant.ts` |
| `contracts/report-states-details-filter.contract.ts` | `contracts/requests-details-filter.contract.ts` |
| `contracts/report-states-details-qualification.contract.ts` | `contracts/requests-details-qualification.contract.ts` |
| `contracts/report-states-details-take.contract.ts` | `contracts/requests-details-take.contract.ts` |
| `interfaces/report-states-details-workflow-timestamp.interface.ts` | `interfaces/requests-details-workflow-timestamp.interface.ts` |
| `props/report-states-details.props.ts` | `props/requests-details.props.ts` |
| `repositories/report-states-details.repository.ts` | `repositories/requests-details.repository.ts` |
| `utils/report-states-details-label.util.ts` (+ `.spec.ts`) | `utils/requests-details-label.util.ts` (+ `.spec.ts`) |
| `utils/report-states-details-permissions.util.ts` (+ `.spec.ts`) | `utils/requests-details-permissions.util.ts` (+ `.spec.ts`) |
| `utils/report-states-details-workflow-timestamps.util.ts` (+ `.spec.ts`) | `utils/requests-details-workflow-timestamps.util.ts` (+ `.spec.ts`) |
| `value-objects/report-states-details-filter.vo.ts` (+ `.spec.ts`) | `value-objects/requests-details-filter.vo.ts` (+ `.spec.ts`) |
| `value-objects/report-states-details-qualification.vo.ts` (+ `.spec.ts`) | `value-objects/requests-details-qualification.vo.ts` (+ `.spec.ts`) |
| `value-objects/report-states-details-take.vo.ts` | `value-objects/requests-details-take.vo.ts` |

### Data (`libs/{module}/data/src/lib/`)

| report-states | requests |
| --- | --- |
| `dtos/report-states-details-api.dto.ts` | `dtos/requests-details-api.dto.ts` |
| `dtos/report-states-details-approve-api.dto.ts` | `dtos/requests-details-approve-api.dto.ts` |
| `dtos/report-states-details-filter-api.dto.ts` | `dtos/requests-details-filter-api.dto.ts` |
| `dtos/report-states-details-reject-api.dto.ts` | `dtos/requests-details-reject-api.dto.ts` |
| `dtos/report-states-details-take-api.dto.ts` | `dtos/requests-details-take-api.dto.ts` |
| `mappers/report-states-details.mapper.ts` (+ `.mapper.spec.ts`) | `mappers/requests-details.mapper.ts` (**sans** `.mapper.spec.ts` — voir §2.3) |
| `mappers/report-states-details-approve.mapper.ts` | `mappers/requests-details-approve.mapper.ts` |
| `mappers/report-states-details-filter.mapper.ts` | `mappers/requests-details-filter.mapper.ts` |
| `mappers/report-states-details-reject.mapper.ts` | `mappers/requests-details-reject.mapper.ts` |
| `mappers/report-states-details-take.mapper.ts` | `mappers/requests-details-take.mapper.ts` |
| `mappers/report-states-details-mappers.spec.ts` | `mappers/requests-details-mappers.spec.ts` |
| `repositories/report-states-details.repository.impl.ts` | `repositories/requests-details.repository.impl.ts` |
| `sources/report-states-details.api.ts` | `sources/requests-details.api.ts` |

### Application (`libs/{module}/application/src/lib/`)

| report-states | requests |
| --- | --- |
| `facades/report-states-details.facade.ts` | `facades/requests-details.facade.ts` |
| `use-cases/report-states-details.use-case.ts` (+ `.spec.ts`) | `use-cases/requests-details.use-case.ts` (+ `.spec.ts`) |

### UI (`libs/{module}/ui/src/lib/`)

| report-states | requests |
| --- | --- |
| `features/report-states-details-dialog.component.ts` | `features/requests-details-dialog.component.ts` |
| `features/report-states-details-edit-fields.component.ts` | `features/requests-details-edit-fields.component.ts` |
| `features/report-states-details-header.component.ts` | `features/requests-details-header.component.ts` |
| `features/report-states-details-info-panel.component.ts` | `features/requests-details-info-panel.component.ts` |
| `features/report-states-details-location-panel.component.ts` | `features/requests-details-location-panel.component.ts` |
| `features/report-states-details-photos-panel.component.ts` | `features/requests-details-photos-panel.component.ts` |
| `features/report-states-details-qualification-form.component.ts` | `features/requests-details-qualification-form.component.ts` |
| `features/report-states-details-sidebar.component.ts` | `features/requests-details-sidebar.component.ts` |
| `features/report-states-details-step-bar.component.ts` | `features/requests-details-step-bar.component.ts` |
| `constants/report-states-details-approval-type.constant.ts` | `constants/requests-details-approval-type.constant.ts` |
| `constants/report-states-details-callback-type.constant.ts` | `constants/requests-details-callback-type.constant.ts` |
| `constants/report-states-details-reject-motif.constant.ts` | `constants/requests-details-reject-motif.constant.ts` |
| `constants/report-states-details-status-badge.constant.ts` | `constants/requests-details-status-badge.constant.ts` |
| `constants/report-states-details-status-label.constant.ts` | `constants/requests-details-status-label.constant.ts` |
| `constants/report-states-details-tab.constant.ts` | `constants/requests-details-tab.constant.ts` |

---

## 2. Différences réelles trouvées (au-delà du renommage)

Sur les 58 fichiers `report-states`, après normalisation des identifiants :

- **45 fichiers strictement identiques** (0 différence, y compris
  l'indentation) — duplication pure, aucune divergence de comportement.
- **10 fichiers ne diffèrent que par du formatage Prettier** (retour à la
  ligne d'un appel de fonction ou d'un type sur une vs plusieurs lignes,
  aucun changement sémantique) : `report-states-details.use-case.ts`,
  `report-states-details-api.dto.ts`, `report-states-details.mapper.ts`,
  `report-states-details-approve.entity.spec.ts`,
  `report-states-details.repository.ts`,
  `report-states-details-label.util.ts`,
  `report-states-details-permissions.util.ts`,
  `report-states-details-status-label.constant.ts`,
  `report-states-details-tab.constant.ts`,
  `report-states-details-edit-fields.component.ts`. Probablement dû à des
  exécutions Prettier indépendantes après le copier-coller initial — sans
  impact fonctionnel.
- **3 différences réelles, non cosmétiques**, détaillées ci-dessous.

### 2.1 — Cibles de rafraîchissement différentes dans les façades (différence légitime, pas un bug)

`report-states-details.facade.ts` invalide le cache de trois façades
liste après une mutation (`ApproveXFacade`, `EvaluateXFacade`,
`RejectXFacade`), en s'appuyant sur les permissions
`REPORT_STATES_APPROVE_ROUTE` / `REPORT_STATES_EVALUATE_ROUTE`
(`libs/report-states/domain/src/lib/constants/report-states-rbac-paths.constant.ts`,
routes `/report-status/approved` et `/report-status/evaluated`).

`requests-details.facade.ts` invalide un jeu différent de façades liste
(`QueuesXFacade`, `TasksXFacade`, `AllXFacade`), avec les permissions
`REQUESTS_QUEUES_ROUTE` / `REQUESTS_TASKS_ROUTE`
(`libs/requests/domain/src/lib/constants/requests-rbac-paths.constant.ts`,
routes `/requests/queues` et `/requests/tasks`).

**Ce n'est pas un copier-coller incomplet** : les deux modules ont des
vues liste métier réellement différentes (report-states expose des listes
« approuvés »/« évalués » ; requests expose des listes « queues »/
« tâches »/« tous »). Une factorisation devra traiter ce point comme un
paramètre de configuration (liste des façades à invalider par module), pas
comme une divergence à corriger.

### 2.2 — Fonction type-guard présente uniquement côté `report-states`, jamais utilisée

`libs/report-states/domain/src/lib/enums/report-states-details-qualification-state.enum.ts`
exporte une fonction supplémentaire :

```typescript
export function isReportStatesDetailsQualificationState(
    value: string
): value is ReportStatesDetailsQualificationState {
    return Object.values(ReportStatesDetailsQualificationState).includes(
        value as ReportStatesDetailsQualificationState
    );
}
```

Elle est ré-exportée depuis `libs/report-states/domain/src/index.ts`
(ligne 24) mais **aucun appelant n'a été trouvé** dans le monorepo
(`grep -rn "isReportStatesDetailsQualificationState" libs/ apps/` ne
retourne que sa déclaration et son export). L'équivalent
`isRequestsDetailsQualificationState` n'existe pas côté `requests`
(confirmé : `grep -rn "isRequestsDetailsQualificationState" libs/ apps/`
ne retourne rien). Code mort public côté `report-states`, à signaler
séparément (candidat `knip` si la règle couvre les exports de lib) — non
traité ici, cette tâche ne modifie pas le code.

### 2.3 — Asymétrie de couverture de test sur le mapper principal

`report-states` a deux fichiers de test sur ses mappers data :
`report-states-details-mappers.spec.ts` (teste les 4 petits mappers
filter/take/approve/reject) et `report-states-details.mapper.spec.ts`
(teste `ReportStatesDetailsMapper`, le mapper principal qui construit
l'entité complète — 18 tests, ajouté ultérieurement d'après son
commentaire d'en-tête : « ce test passait déjà avant ce fichier grâce à
`report-states-details-mappers.spec.ts` (qui ne teste que les 4 mappers
request-side du même dossier, jamais celui-ci) »).

`requests` n'a qu'un seul fichier : `requests-details-mappers.spec.ts`,
qui ne teste que les 4 petits mappers. **`RequestsDetailsMapper` (le
mapper principal côté `requests`, équivalent de `ReportStatesDetailsMapper`)
n'a aucun test unitaire** — confirmé par
`grep -rln "RequestsDetailsMapper" libs/requests/ --include="*.spec.ts"`
qui ne retourne aucun fichier. C'est un point déjà relevé par l'auteur du
fichier `report-states-details.mapper.spec.ts` pour son propre module,
mais jamais répliqué côté `requests`. Signalé également dans
`docs/architecture/taches-restantes.md` (voir tâche liée) — non corrigé
ici, cette tâche ne modifie pas le code.

---

## 3. Proposition de structure pour une lib partagée

**Proposition, non validée — à trancher par un humain avant toute
implémentation.**

### 3.1 Nom et emplacement

Suivre la convention déjà en place pour les libs transversales
(`libs/shared/{domain,data,application,ui}`, projets `@cmz/shared-*`,
tags `scope:shared`/`type:*` — voir
`libs/shared/domain/project.json`). Créer un scope dédié plutôt que
d'étendre `shared` directement, pour ne pas mélanger des concepts
génériques (`shared-domain` contient déjà `ActorEntity`,
`TreaterInfoEntity`, etc., utilisés bien au-delà de « details ») avec un
concept spécifique au workflow de traitement de signalement :

```
libs/workflow-details/
├── domain/        (@cmz/workflow-details-domain)
├── data/          (@cmz/workflow-details-data)
├── application/   (@cmz/workflow-details-application)
└── ui/            (@cmz/workflow-details-ui)
```

Tags : `scope:workflow-details`, `type:{domain,data,application,ui}` —
cohérent avec l'invariant Nx du projet (0 import cross-domaine entre
modules fonctionnels ; `workflow-details` serait un module partagé au
même titre que `shared`, pas un module fonctionnel classique).

### 3.2 Ce qui migrerait (les 45 fichiers strictement identiques + les 10 à différence cosmétique)

Tout le domain sauf le type-guard mort (§2.2, à traiter séparément) :
entités (`DetailsEntity`, `DetailsApproveEntity`, `DetailsFilterEntity`,
`DetailsRejectEntity`, `DetailsTakeEntity`), enums (`DetailsStatus`,
`DetailsQualificationState`), contracts, value-objects, utils
(label/permissions/workflow-timestamps), props, repository port. Toute la
couche data (dtos, mappers, repository impl, source API) à l'exception du
mapper principal dont la clé wire diffère potentiellement selon le module
(`uniq_id` vs un identifiant propre — à vérifier avant migration, non
vérifié dans cette tâche). Toute la couche UI (dialog, panels, sidebar,
step-bar, edit-fields, constants) — le template HTML étant déjà identique
caractère pour caractère.

Le paramètre variable serait le **nom du module hôte** (`report-states` /
`requests`), à injecter (ex. via un token Angular ou un préfixe de clé
i18n configurable) plutôt que codé en dur — ce qui règle du même coup la
classe de bug de P1-2 (fuite de préfixe i18n), puisqu'un préfixe unique
codé en dur dans le code partagé ne pourrait plus diverger par copier-coller.

### 3.3 Ce qui resterait spécifique à chaque module

- La façade (`{module}-details.facade.ts`) resterait dans
  `report-states-application`/`requests-application` respectivement, ou
  deviendrait une factory paramétrée par la liste des façades à invalider
  (voir §2.1) — à trancher selon la préférence de conception (composition
  vs. configuration).
- Les constantes RBAC (`{MODULE}_APPROVE_ROUTE` etc.) restent propres à
  chaque module, elles encodent des routes métier réelles distinctes.
- Le use-case applicatif garde une signature par module (dépend du
  repository et du facade concrets de chaque module) sauf si le
  repository lui-même est unifié derrière une interface générique
  paramétrée par module — option plus invasive, non recommandée en
  première itération.

### 3.4 Risque à évaluer avant de trancher

Migrer 45+ fichiers vers une lib partagée est un changement mécanique
mais large (imports à réécrire dans les deux modules, tests à déplacer).
Avant de lancer cette migration, valider avec un humain : (a) le nom
`workflow-details` proposé ; (b) si le paramétrage du nom de module côté
i18n/UI est acceptable ou si une autre approche (génération de code,
héritage de composant) est préférée ; (c) l'ordre de priorité par rapport
au reste du backlog P1/P2.

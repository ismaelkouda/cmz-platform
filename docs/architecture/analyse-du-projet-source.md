# Analyse du projet source — cmz-backoffice-frontend

Mesures réalisées sur le code réel de `cmz-backoffice-frontend`, et non
supposées. Elles fondent la
[stratégie de reconstruction](./strategie-de-reconstruction.md).

- **Dernière mise à jour :** 2026-07-22
- **Source analysée :** `$SEOS_LEGACY_ROOT`,
  branche `feature/CMZ-feat-module-infrastructures`

## Volume

| Indicateur            | Valeur                      |
| --------------------- | --------------------------- |
| Fichiers TypeScript   | 4 003                       |
| Composants            | 149                         |
| Domaines fonctionnels | 18 (16 portant des entités) |
| Entités déclarées     | 53                          |

## Les domaines sont déjà découplés

C'est le constat le plus structurant de cette analyse.

| Constat                                                   | Mesure                       |
| --------------------------------------------------------- | ---------------------------- |
| Domaines sans **aucune** dépendance vers un autre domaine | **12 sur 18**                |
| Domaines avec une dépendance sortante                     | 6, totalisant **16 imports** |
| Imports vers `@shared/*`                                  | plus de 3 300                |

Les domaines ne communiquent pratiquement pas entre eux : tout le couplage passe
par `shared/`. L'architecture Clean du projet source a tenu.

**Conséquence directe :** une fois le socle transverse (`shared/`, `core/`) en
place, les 18 domaines peuvent être traités **en parallèle et dans n'importe
quel ordre**. C'est ce qui rend la reconstruction tenable.

Les 16 imports inter-domaines sont l'exception qui confirme la règle — chacun
doit être examiné individuellement : soit il révèle un concept qui a sa place
dans `shared/`, soit un couplage à supprimer. Ne pas les reproduire
mécaniquement.

## Volume par domaine

| Domaine                       | Fichiers | Composants | Entités |
| ----------------------------- | -------: | ---------: | ------: |
| not-found                     |        2 |          1 |       0 |
| interactive-map               |       23 |          2 |       1 |
| dashboard                     |       26 |          2 |       0 |
| seos-reference-action         |       32 |          1 |       1 |
| monitoring                    |       47 |          4 |       4 |
| reporting                     |       50 |          4 |       4 |
| authentication                |       89 |          3 |       3 |
| finalization                  |      136 |          3 |       4 |
| requests                      |      142 |          3 |       4 |
| communication                 |      189 |          6 |       2 |
| processing                    |      211 |          4 |       4 |
| administrative-infrastructure |      228 |          6 |       2 |
| coverage-areas                |      246 |          6 |       2 |
| report-states                 |      264 |          5 |       6 |
| settings-security             |      348 |          9 |       3 |
| administrative-boundary       |      352 |         11 |       3 |
| team-organization             |      386 |         11 |       4 |
| content-management            |      637 |         19 |       6 |

`content-management` représente à lui seul 16 % de la base : à traiter en
dernier, et probablement à découper en plusieurs bibliothèques.

## Le système SEOS

Le dossier `seos/` du projet source n'est pas de la documentation : c'est un
système de génération formalisé, décrit par son auteur comme _« un compilateur
d'architecture logicielle »_.

| Élément                                   | Contenu                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `patterns/crud-entity.pattern.json`       | Schéma canonique v23 — **106 fichiers** par entité     |
| `patterns/action-request.pattern.json`    | Schéma canonique v6 — **34 fichiers** par opération    |
| `tools/generate-reference-module.js`      | Générateur CRUD — 1 984 lignes                         |
| `tools/generate-action-request-module.js` | Générateur d'opérations — 698 lignes                   |
| `tools/check-semantics.js`                | Vérificateur sémantique — 727 lignes                   |
| `tools/extract-pattern.js`                | Extraction de pattern depuis du code réel — 410 lignes |
| `tools/check-pattern.js`                  | Conformité structurelle — 122 lignes                   |
| `SEOS-Assumptions-Register.md`            | Journal d'expériences — 1 082 lignes                   |

Répartition des 106 fichiers canoniques de `crud-entity` par couche :
`application` 31, `domain` 26, `infrastructure` 23, `presentation` 21, `di` 4,
racine 1.

Le schéma porte **23 itérations de conception** (`design_decisions_v3` à `v23`),
chacune rattachée à une expérience datée.

### Ce monorepo est la cible de validation prévue par SEOS

`besoin-reformule-SEOS.md`, §4.4, désigne explicitement **un monorepo TypeScript
à packages de type Nx** comme deuxième cible de validation du système — après le
frontend Angular mono-application.

Le présent dépôt n'est donc pas seulement le lieu d'une reconstruction : il est
l'objet d'expérience que SEOS s'était fixé. Ce qui est testé ici n'est pas la
généralisation à un autre _paradigme_ (Rust, Solana), mais à une autre
**structure organisationnelle** — monorepo multi-packages, frontières de build,
versions indépendantes. Le document source insiste sur cette distinction.

## Couverture des patterns — mesurée (Phase 03)

`check-pattern.js` a été passé sur les **53 entités**, contre les deux schémas
existants (`crud-entity`, `action-request`). Classement par meilleur score des
deux schémas :

| Classe                         | Critère                                | Nombre | Part |
| ------------------------------ | -------------------------------------- | -----: | ---: |
| **Conforme**                   | ≥ 95 % sur un schéma                   |      7 | 13 % |
| **Proche**                     | 65–95 % sur `crud-entity`              |     15 | 28 % |
| **Partiel — famille workflow** | 40–65 %, chaîne de commandes partielle |     19 | 36 % |
| **Lecture seule**              | pipeline query-only                    |      9 | 17 % |
| **Divers**                     | cas isolés                             |      3 |  6 % |

### Lecture des résultats

**22 entités (41 %) relèvent des deux patterns prouvés** — 7 conformes (les
modules de référence) + 15 « proches ». Les proches sont de vraies entités CRUD
à 65–89 %, dont l'écart s'explique : `administrative-boundary`
(departments/municipalities/regions, ~72 %) n'a pas encore été migré à la
convention « point » (déviation v10 documentée du schéma). Elles atteindront la
conformité après la même normalisation que le module de référence a reçue.

**Les 59 % restants se décomposent en deux familles régulières :**

- **Famille workflow-action (19, 36 %)** — `finalization`, `processing`,
  `requests`, `report-states` : vues (`all`/`queues`/`tasks`/`details`) et
  transitions d'état
  (`approve`/`close`/`reject`/`evaluate`/`download`/`take`/`treat`/`finalize`)
  sur une file de tâches partagée. → **pattern `workflow-action` extrait (v0,
  2026-07-31)** ; **4 modules IR clôturés** (`processing`, `requests`,
  `finalization`, `report-states`). Voir
  [`workflow-action.pattern.json`](./patterns/workflow-action.pattern.json) et
  [`STATUS.md`](../../STATUS.md).
- **Lecture seule (9, 17 %)** — `interactive-map` (1), `monitoring` (4),
  `reporting` (4). Pipeline minimal query-only : entité + query + use-case +
  repository, ~4 fichiers, aucune commande. → pattern **`read-only-view`**
  **partiellement instancié** (`monitoring`, `reporting` ✅ ; `interactive-map`
  ⚠️ vue statique) ; **extraction canonique du schéma JSON reste une tâche
  planifiée**, volet par volet (comme pour `workflow-action`).

**Divers (3)** — `communication/notifications`, `settings-security/access-logs`,
`team-organization/daily-goal` : à traiter au cas par cas une fois
`read-only-view` formalisé.

### Conséquence sur le chiffrage

Contre les **deux patterns historiques** (`crud-entity`, `action-request`), la
couverture mesurée restait de **41 %** — dans la bande « 40–80 % » du
[plan](./plan-d-execution.md).

**État au 2026-07-31 :**

- **`workflow-action`** : extrait et validé sur **4/4 modules** — couverture
  générable de cette famille **100 %**.
- **`read-only-view`** : **extrait (v0, 2026-08-01)** sur `monitoring` +
  `reporting` ; `interactive-map` ⚠️ partiel (Grafana OK, SIG hors IR). Schéma :
  [`read-only-view.pattern.json`](./patterns/read-only-view.pattern.json).
  **Corpus à émettre** (chains déclarées, outillage `emit-pairs` à brancher).
- Les **3 « divers »** restent à trancher individuellement.

L'approche générative tient ; le prochain levier de couverture est **l'émission
corpus read-only-view** (pattern v0 extrait 2026-08-01) puis générateur dédié —
pas une reprise manuelle des modules déjà livrés.

**Ce que ça change dans le plan :** la Phase 04 doit encore produire le
générateur `read-only-view`. La Phase 07 suit la maturité des patterns : les 22
conformes/proches (CRUD + action-request) et la famille workflow-action sont en
reconstruction ; les vues lecture seule suivent au fur et à mesure de
l'extraction du schéma.

## Ce qu'il ne faut pas reprendre

| Élément                          | Raison                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `scripts/generate-structure.ps1` | Script mort, confirmé inutilisé                                                                                  |
| `src/assets.zip` (9,9 Mo)        | Binaire versionné ; le dépôt Git pèse 87 Mo                                                                      |
| Tests Protractor                 | Abandonné depuis Angular 12 — à réécrire, pas à migrer                                                           |
| Configuration versionnée         | `tools/env/`, `src/environments/`, `src/assets/config/` sont suivis par Git malgré leur présence au `.gitignore` |

Sur ce dernier point : **aucun secret n'a été détecté** — uniquement des URL de
services internes et des paramètres d'apparence. Le risque n'est pas ce qui s'y
trouve, mais la fausse impression de protection que donne un `.gitignore`
inopérant.

En revanche, le mécanisme de configuration lui-même est un bon choix à conserver
([ADR-0007](../adr/0007-configuration-runtime.md)).

## Annexe — classification des 53 entités (Phase 03)

Score `check-pattern.js` de chaque entité contre les deux schémas existants.
`crud %` = conformité au schéma `crud-entity` (106 fichiers) ; `action %` =
conformité au schéma `action-request` (34 fichiers). Classe = meilleur
ajustement (voir la lecture ci-dessus). Regénérable par :
`node seos/tools/check-pattern.js <module> <entité> [--schema …]`.

| Entité                                              | crud % | action % | Classe            |
| --------------------------------------------------- | -----: | -------: | ----------------- |
| `administrative-boundary/departments`               |     72 |       29 | Proche            |
| `administrative-boundary/municipalities`            |     72 |       29 | Proche            |
| `administrative-boundary/regions`                   |     74 |       29 | Proche            |
| `content-management/home`                           |     76 |       29 | Proche            |
| `content-management/legal-notice`                   |     74 |       29 | Proche            |
| `content-management/news`                           |     76 |       29 | Proche            |
| `content-management/privacy-policy`                 |     74 |       29 | Proche            |
| `content-management/slide`                          |     76 |       29 | Proche            |
| `content-management/terms-use`                      |     74 |       29 | Proche            |
| `coverage-areas/mobile-network`                     |     89 |       38 | Proche            |
| `coverage-areas/site-group`                         |     96 |       38 | Conforme          |
| `team-organization/participants`                    |     80 |       26 | Proche            |
| `team-organization/teams`                           |     78 |       24 | Proche            |
| `settings-security/profiles-permissions`            |     72 |       29 | Proche            |
| `settings-security/users`                           |     68 |       29 | Proche            |
| `administrative-infrastructure/infrastructure`      |    100 |       47 | Conforme          |
| `administrative-infrastructure/infrastructure-type` |    100 |       47 | Conforme          |
| `team-organization/agents-performances`             |     41 |       26 | Workflow          |
| `team-organization/daily-goal`                      |     26 |       26 | Divers            |
| `settings-security/access-logs`                     |     20 |       29 | Divers            |
| `authentication/forgot-password`                    |     15 |      100 | Conforme          |
| `authentication/login`                              |     15 |      100 | Conforme          |
| `authentication/reset-password`                     |     15 |      100 | Conforme          |
| `communication/messaging`                           |     69 |       29 | Proche            |
| `communication/notifications`                       |     39 |       29 | Divers            |
| `finalization/all`                                  |     22 |       41 | Workflow          |
| `finalization/details`                              |     18 |       26 | Workflow (détail) |
| `finalization/queues`                               |     22 |       41 | Workflow          |
| `finalization/tasks`                                |     22 |       41 | Workflow          |
| `interactive-map/map`                               |      7 |       12 | Lecture seule     |
| `monitoring/jobs`                                   |      7 |       12 | Lecture seule     |
| `monitoring/node`                                   |      7 |       12 | Lecture seule     |
| `monitoring/resources`                              |      7 |       12 | Lecture seule     |
| `monitoring/services`                               |      7 |       12 | Lecture seule     |
| `processing/all`                                    |     23 |       41 | Workflow          |
| `processing/details`                                |     18 |       26 | Workflow (détail) |
| `processing/queues`                                 |     23 |       41 | Workflow          |
| `processing/tasks`                                  |     23 |       41 | Workflow          |
| `report-states/approve`                             |     24 |       41 | Workflow          |
| `report-states/close`                               |     24 |       41 | Workflow          |
| `report-states/details`                             |     18 |       26 | Workflow (détail) |
| `report-states/download`                            |     24 |       41 | Workflow          |
| `report-states/evaluate`                            |     24 |       41 | Workflow          |
| `report-states/reject`                              |     24 |       41 | Workflow          |
| `reporting/report-by-channel`                       |      6 |        9 | Lecture seule     |
| `reporting/report-by-operator`                      |      6 |        9 | Lecture seule     |
| `reporting/reports`                                 |      6 |        9 | Lecture seule     |
| `reporting/requests`                                |      6 |        9 | Lecture seule     |
| `requests/all`                                      |     23 |       41 | Workflow          |
| `requests/details`                                  |     18 |       26 | Workflow (détail) |
| `requests/queues`                                   |     23 |       41 | Workflow          |
| `requests/tasks`                                    |     23 |       41 | Workflow          |
| `seos-reference-action/sample-action`               |     15 |      100 | Conforme          |

Les `details` sont rattachés à la famille workflow (vues de détail d'une tâche).

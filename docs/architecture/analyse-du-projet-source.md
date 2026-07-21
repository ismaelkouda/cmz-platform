# Analyse du projet source — cmz-backoffice-frontend

Mesures réalisées sur le code réel de `cmz-backoffice-frontend`, et non
supposées. Elles fondent la
[stratégie de reconstruction](./strategie-de-reconstruction.md).

- **Dernière mise à jour :** 2026-07-21
- **Source analysée :** `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend`,
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

## Couverture des patterns — le risque principal

| Schéma              | Validé sur                                   | Module de référence                       |
| ------------------- | -------------------------------------------- | ----------------------------------------- |
| `crud-entity` v23   | `departments`, `municipalities`, `regions`   | `administrative-infrastructure` — 106/106 |
| `action-request` v6 | `login`, `forgot-password`, `reset-password` | `authentication`                          |

**Les patterns sont prouvés sur 6 unités. Le projet en compte 53.**

L'hypothèse de SEOS est que la majorité des entités restantes se conforme au
schéma `crud-entity`. Elle est plausible — l'architecture est homogène — mais
**elle n'est pas établie**. Trois domaines (`interactive-map`, `monitoring`,
`reporting`) ne déclarent aucune commande et ne relèvent visiblement d'aucun des
deux schémas.

Mesurer cette couverture est le préalable à tout chiffrage.

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

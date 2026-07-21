# Revue de socle — avant Phase 02

- **Date :** 2026-07-21
- **Portée :** état du monorepo à l'issue de la
  [Phase 01](../phases/phase-01-squelette-nx.md), et enseignements tirés de
  l'analyse du projet d'origine `cmz-backoffice-frontend`
- **Objet :** identifier ce qui doit être tranché ou corrigé **avant** de
  générer l'application Angular
- **Statut :** ✅ Soldée — un seul point reste ouvert (A3)

## Résultat

Cette revue avait relevé 17 points : 3 bloquants, 4 critiques, 5 améliorations
et 5 observations. **16 sur 17 ont été traités.** Le détail des points traités a
été retiré de ce document ; ils sont désormais consignés dans les décisions et
les phases qui en découlent.

| Point  | Objet                                           | Traitement                                                                                                                         |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| B1     | Git non initialisé                              | [Phase 01b](../phases/phase-01b-corrections-socle.md)                                                                              |
| B2     | Versions Node et bun non contraintes            | [Phase 01b](../phases/phase-01b-corrections-socle.md), appliquées en [01d](../phases/phase-01d-conventions-et-observations.md)     |
| B3     | Licence erronée                                 | [Phase 01b](../phases/phase-01b-corrections-socle.md)                                                                              |
| C1     | Graphe de dépendances aveugle aux imports       | [ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)                                                                         |
| C2     | Nom du monorepo contredisant son ambition       | [ADR-0003](../adr/0003-nommage-et-structure-du-monorepo.md)                                                                        |
| C3     | Structure `packages/*` plate                    | [ADR-0003](../adr/0003-nommage-et-structure-du-monorepo.md)                                                                        |
| C4     | Aucune politique de versions                    | [ADR-0005](../adr/0005-politique-de-version-unique.md), [Phase 01c](../phases/phase-01c-politique-de-versions.md)                  |
| A1     | Fichiers de socle manquants                     | [Phases 01b](../phases/phase-01b-corrections-socle.md) et [01d](../phases/phase-01d-conventions-et-observations.md)                |
| A2     | Conventions de commit et de branche             | [ADR-0006](../adr/0006-conventions-de-collaboration.md)                                                                            |
| **A3** | **Nx Cloud désactivé**                          | **⏳ Ouvert — voir ci-dessous**                                                                                                    |
| A4     | `CODEOWNERS` absent                             | [ADR-0006](../adr/0006-conventions-de-collaboration.md)                                                                            |
| A5     | Prérequis absents du README                     | [Phase 01b](../phases/phase-01b-corrections-socle.md), rendu effectif en [01d](../phases/phase-01d-conventions-et-observations.md) |
| O1     | `.gitignore` sans effet sur les fichiers suivis | [ADR-0007](../adr/0007-configuration-runtime.md), [Phase 01d](../phases/phase-01d-conventions-et-observations.md)                  |
| O2     | Configuration runtime — bon pattern à conserver | [ADR-0007](../adr/0007-configuration-runtime.md)                                                                                   |
| O3     | Poids du dépôt d'origine                        | [ADR-0006](../adr/0006-conventions-de-collaboration.md), [Phase 01d](../phases/phase-01d-conventions-et-observations.md)           |
| O4     | Tests e2e à réécrire, pas à migrer              | [ADR-0008](../adr/0008-outillage-de-tests.md)                                                                                      |
| O5     | Volume conditionnant la Phase 07                | [Stratégie de migration](../architecture/strategie-de-migration.md)                                                                |

---

## Point restant ouvert

### A3 — Nx Cloud non activé

Sans cache distribué, chaque agent de CI reconstruit l'intégralité du monorepo.
L'écart avec un cache partagé croît avec le nombre de packages : sur la cible
visée, il devient significatif.

L'activation n'a pas pu être réalisée pour deux raisons, dont une qui subsiste
quel que soit l'environnement :

1. `cloud.nx.app` était inaccessible depuis l'environnement d'exécution utilisé
   ;
2. surtout, l'activation rattache le workspace à un **compte Nx Cloud** et
   génère un jeton d'accès — une opération qui engage un compte et une
   facturation, et qui revient donc au propriétaire du dépôt.

**Marche à suivre**, depuis un poste disposant d'un accès réseau :

```bash
bunx nx connect
```

La commande affiche une URL de rattachement à ouvrir dans un navigateur. Une
fois le workspace revendiqué, un `nxCloudId` est ajouté à `nx.json` — c'est ce
champ qu'il faudra committer.

**Échéance :** Phase 06, au moment de configurer la CI — c'est là que le cache
distribué produit son effet.

---

## Constat conservé — le découplage du projet d'origine

Une mesure des imports croisés a été réalisée pour fonder la stratégie de
migration. Elle est conservée ici parce qu'elle constitue le fait le plus
structurant tiré de cette revue :

| Constat                                               | Mesure                   |
| ----------------------------------------------------- | ------------------------ |
| Domaines sans aucune dépendance vers un autre domaine | **12 sur 18**            |
| Domaines avec une dépendance sortante                 | 6, totalisant 16 imports |
| Imports vers `@shared/*`                              | plus de 3 300            |

L'architecture Clean du projet d'origine a tenu : les domaines ne communiquent
pratiquement pas entre eux, tout passe par `shared/`. Une fois `shared/` et
`core/` migrés, les 18 domaines peuvent l'être en parallèle — c'est ce qui rend
la Phase 07 tenable.

Le détail est repris dans la
[stratégie de migration](../architecture/strategie-de-migration.md).

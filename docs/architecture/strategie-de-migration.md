# Stratégie de migration depuis cmz-backoffice-frontend

- **Statut :** Cadrage — préparé en Phase 01d, appliqué en Phase 07
- **Dernière mise à jour :** 2026-07-21
- **Origine :** observation O5 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Ce que la migration représente

| Indicateur            | Valeur                                                      |
| --------------------- | ----------------------------------------------------------- |
| Fichiers TypeScript   | 4 003                                                       |
| Composants            | 149                                                         |
| Domaines fonctionnels | 18                                                          |
| Couches transverses   | `core/`, `shared/` (domain, data, application, components…) |

C'est de loin la phase la plus lourde du projet. Elle a besoin d'un ordre, d'un
critère d'achèvement et d'une méthode de vérification — sans quoi elle s'étire
sans qu'on sache jamais où elle en est.

## Le fait déterminant : les domaines sont déjà découplés

Une mesure des imports croisés entre domaines a été réalisée sur le code
d'origine. Le résultat oriente toute la stratégie :

| Constat                                               | Mesure                                |
| ----------------------------------------------------- | ------------------------------------- |
| Domaines sans aucune dépendance vers un autre domaine | **12 sur 18**                         |
| Domaines avec une seule dépendance sortante           | 6, totalisant **16 imports** au total |
| Imports vers `@shared/*`                              | plus de 3 300                         |

Autrement dit, **les domaines ne se parlent pratiquement pas entre eux** : tout
le couplage passe par `shared/`. L'architecture Clean du projet d'origine a
effectivement tenu.

Deux conséquences directes :

1. `shared/` et `core/` doivent être migrés **en premier** — ils sont la
   dépendance de tout le reste ;
2. une fois ce socle en place, les 18 domaines peuvent être migrés **dans
   n'importe quel ordre, et en parallèle** par plusieurs personnes, sans
   conflit. C'est ce qui rend la Phase 07 parallélisable, donc tenable.

## Volume par domaine

Trié par taille croissante — l'ordre de migration suggéré à l'intérieur d'un
même lot.

| Domaine                       | Fichiers | Composants |
| ----------------------------- | -------: | ---------: |
| not-found                     |        2 |          1 |
| interactive-map               |       23 |          2 |
| dashboard                     |       26 |          2 |
| seos-reference-action         |       32 |          1 |
| monitoring                    |       47 |          4 |
| reporting                     |       50 |          4 |
| authentication                |       89 |          3 |
| finalization                  |      136 |          3 |
| requests                      |      142 |          3 |
| communication                 |      189 |          6 |
| processing                    |      211 |          4 |
| administrative-infrastructure |      228 |          6 |
| coverage-areas                |      246 |          6 |
| report-states                 |      264 |          5 |
| settings-security             |      348 |          9 |
| administrative-boundary       |      352 |         11 |
| team-organization             |      386 |         11 |
| content-management            |      637 |         19 |

## Ordre de migration

### Lot 0 — Socle transverse (bloquant)

`shared/domain` → `shared/data` → `shared/application` → `shared/components` →
`core/`.

L'ordre suit le sens des dépendances : le domaine ne dépend de rien, les
composants dépendent de tout le reste. C'est le seul lot réellement séquentiel.

### Lot 1 — Domaines pilotes

`not-found`, `dashboard`, `authentication`.

Petits, sans dépendance sortante, mais représentatifs : `authentication` exerce
les gardes, les intercepteurs et le stockage ; `dashboard` exerce l'affichage de
données et les graphiques. L'objectif de ce lot n'est pas d'avancer en volume
mais de **valider la méthode** et de stabiliser les schémas de génération avant
de passer à l'échelle.

### Lot 2 — Domaines intermédiaires

`interactive-map`, `seos-reference-action`, `monitoring`, `reporting`,
`finalization`, `requests`. Parallélisables.

### Lot 3 — Domaines volumineux

`communication`, `processing`, `administrative-infrastructure`,
`coverage-areas`, `report-states`, `settings-security`,
`administrative-boundary`, `team-organization`, `content-management`.
Parallélisables. `content-management` (637 fichiers, 19 composants) mérite
probablement d'être découpé en plusieurs bibliothèques.

## Réécriture des imports

L'[ADR-0004](../adr/0004-graphe-de-dependances-declarees.md) impose des imports
par nom de package plutôt que par alias. La transformation à opérer :

```ts
// avant
import { Report } from '@shared/domain/entities/report';
// après
import { Report } from '@cmz/shared-domain';
```

Sur 4 003 fichiers, cette réécriture doit être **automatisée** (codemod
`ts-morph` ou équivalent) et non faite à la main. L'outil est à écrire pendant
le Lot 0, quand le nombre de fichiers concernés est encore faible et les erreurs
peu coûteuses.

## Critère d'achèvement d'un domaine

Un domaine n'est « migré » que lorsque **tous** ces points sont vrais :

- [ ] Le code vit dans une ou plusieurs bibliothèques sous `libs/`, avec des
      tags Nx.
- [ ] Les dépendances internes sont déclarées en `workspace:*` (ADR-0004).
- [ ] Aucun alias de chemin ne traverse une frontière de package.
- [ ] Les dépendances du socle passent par le catalog (ADR-0005), vérifié par
      `bun run check:versions`.
- [ ] `nx build` et `nx lint` passent sur le package.
- [ ] Les tests unitaires sont adaptés à Vitest (ADR-0008) et passent.
- [ ] Le domaine est accessible dans l'application et son parcours principal a
      été vérifié par rapport à l'application d'origine.
- [ ] `nx graph` montre les dépendances attendues — **et aucune dépendance
      inattendue**.

Ce dernier point est le plus utile : c'est lui qui détecte qu'un couplage
indésirable s'est introduit pendant la migration.

## Vérification par rapport à l'application d'origine

Trois niveaux, du moins coûteux au plus coûteux :

1. **Structurel** — `nx graph` ne fait apparaître aucune dépendance imprévue.
2. **Fonctionnel** — le parcours principal de chaque domaine est rejoué à
   l'identique sur les deux applications, avec les mêmes données.
3. **Non-régression** — les tests Playwright (ADR-0008) sont écrits au fil des
   domaines migrés, en priorité sur les parcours critiques.

## Points de vigilance

- **`content-management` est un cas à part** : 637 fichiers, 19 composants, soit
  16 % de la base à lui seul. À traiter en dernier, une fois la méthode
  éprouvée, et probablement à découper.
- **Les 16 imports inter-domaines** sont l'exception qui confirme le découplage
  — mais chacun doit être examiné : soit il révèle un concept qui a sa place
  dans `shared/`, soit un couplage à supprimer. Ne pas les reproduire
  mécaniquement.
- **Ne pas migrer le mort.** Le projet d'origine contient au moins un script
  obsolète (`scripts/generate-structure.ps1`) et un `src/assets.zip` de 9,9 Mo.
  La migration est l'occasion de ne pas les reprendre — pas de les transférer.
- **Protractor n'est pas à migrer** mais à réécrire (ADR-0008).

## Suite

Cette stratégie est un cadrage, pas un plan détaillé. Elle sera reprise et
affinée au moment de la Phase 07, une fois les Phases 02 à 06 achevées et la
structure des bibliothèques réellement arrêtée.

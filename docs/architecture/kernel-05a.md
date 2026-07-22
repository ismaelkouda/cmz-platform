# Phase 05a — Kernel transverse : catalogue et génération

Cadrage de la reconstruction du **kernel** de `shared/` (les 200 fichiers dont
dépendent les couches domain/data/application de toutes les entités). Le kernel
est produit par **génération IA sous contrats d'archétype** (Voie B,
[ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)) — aucun code
manuel.

- **Dernière mise à jour :** 2026-07-22
- **Cible de sortie :** une entité (couches domain/data/application) compile
  vert, c'est-à-dire que les `@cmz/shared-*` produits par l'adaptateur en Phase
  04 résolvent enfin.

## Les 4 libs kernel et leurs archétypes

Mesuré sur le projet source. « données » = fichier dont le contenu **est** la
valeur (structure triviale, repris tel quel comme donnée fournie) ; « structure
» = vrai patron de code, généré sous contrat.

| Lib                       | Source                    | Archétypes dominants                                                                                                                     | Nature                       |
| ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `@cmz/shared-constants`   | `constants` + `interface` | `constant` (11), `interface` (1)                                                                                                         | **données**                  |
| `@cmz/shared-domain`      | `domain` + `class`        | `service` (21), `error` (19), `interface` (17), `enum` (15), `entity` (9), `function` (8), `util` (9), `vo`, `validator`, `pipe`, `type` | mixte                        |
| `@cmz/shared-data`        | `data`                    | `mapper` (27), `dto` (22)                                                                                                                | **structure**, très régulier |
| `@cmz/shared-application` | `application`             | `base-facade` (3), `facade`                                                                                                              | structure                    |

~16 archétypes distincts couvrent l'essentiel des 200 fichiers : **on écrit ~16
contrats, pas 200 fichiers à la main.**

## Distinction données / structure

- **Données** (enums, constants, types, une interface) : le contenu est la
  valeur elle-même. Elle provient du source (le « données fournies par l'humain
  » du flux). La génération ne fait que la porter dans la structure de lib et la
  normaliser aux conventions (nommage, `as const`…).
- **Structure** (service, error, entity, mapper, dto, facade, validator, pipe,
  function) : vrai patron. L'IA le produit sous contrat d'archétype (rôle +
  règle
    - exemplaire + profil de convention), puis le portail de validation le
      contrôle.

## Casser les 2 cycles (préalable)

Le kernel est un DAG propre à **2 fichiers** près, à relocaliser avant de
générer :

| Fichier source                           | Cycle                                               | Décision                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/enums/priority-level.enum.ts`    | `domain → data` (l'enum importe `PriorityLevelDto`) | Le DTO n'a rien à faire référencé par un enum. À la génération : l'enum **ne référence pas** le DTO ; c'est le mapper (couche data) qui fait le lien enum↔DTO. Le cycle disparaît par construction. |
| `domain/services/history-data-parser.ts` | `domain → components`                               | Un service de parsing qui dépend de l'UI est mal placé. Il est généré dans `application` (orchestration) ou reste dans `domain` **sans** la dépendance UI. À trancher à la lecture de son contenu.  |

Ces relocalisations ne sont pas du code manuel : elles sont **actées dans les
contrats/générateurs**, donc reproductibles.

## Corrections de source à ne pas reproduire

- `contant.ts` (×4) : faute de frappe pour `constant.ts`. La génération produit
  `constant.ts`.
- Toute dépendance `@core`/`@pages` du kernel (10 fichiers vers `@core`) :
  examinée une à une — soit le concept rejoint le kernel, soit le couplage est
  supprimé. Le kernel généré ne référence **jamais** `@pages`.

## Ordre de génération (DAG)

```
shared-constants (feuille)
  → shared-domain
    → shared-data
      → shared-application
```

Chaque lib est générée, validée (tsc + eslint + revue), et son `nx graph`
vérifié acyclique avant la suivante. `shared-data` (2 archétypes, 49/50
fichiers) est le meilleur banc d'essai de la boucle après `shared-constants`.

## Boucle de génération d'une lib

1. Pour chaque fichier, déterminer son archétype.
2. Générer sous le contrat d'archétype
   ([`contracts/`](../../contracts/README.md)) = rôle + règle mécanique +
   exemplaire de référence + profil Angular 22 + données métier issues du
   source.
3. Portail de validation : `tsc --noEmit`, ESLint, revue du contenu métier.
4. `nx graph` : dépendances attendues, acyclique.

## Critère de sortie de 05a

```bash
bunx nx run-many -t build --projects=tag:scope:shared   # 4 libs kernel vertes
bunx nx graph                                            # acyclique
# + une entité (domain/data/application) qui build vert
```

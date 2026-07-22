# Contrat d'archétype — `mapper`

## Rôle

Un **mapper** traduit entre la forme réseau (DTO) et le modèle métier (entité,
value-object, enum). C'est le **seul** endroit où la conversion a lieu : le DTO
reste passif, le domaine ignore l'API.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data` pour le kernel). Dépend de
`domain` (workspace:\*), jamais l'inverse.

## Règle mécanique

- Une **classe exportée** `<Entité>Mapper`, injectable.
- Au moins une méthode de conversion (`mapFromDto`, et `mapToDto` si l'échange
  est bidirectionnel).
- Le mapper **importe** le DTO (couche data) et le type domaine (couche domain)
  — c'est lui qui porte le lien, résolvant les cycles apparents entre enum et
  DTO.
- Toujours prévoir un **cas par défaut** sur une conversion à correspondance
  fermée (`?? <valeur par défaut>`), jamais de `undefined` silencieux.
- Aucune règle de gestion métier dans le mapper : uniquement de la traduction de
  forme.

## Convention (depuis le profil, jamais codée en dur)

- **Décorateur** : `@Service()` — **pas** `@Injectable({ providedIn: 'root' })`.
  Le source, écrit en Angular ≤ 21, utilise l'ancienne forme ; la génération
  applique la convention Angular 22 du
  [profil](../conventions/angular-22.profile.json).
- Injection éventuelle par `inject()`, pas par constructeur.

## Exemplaire de référence

Source (Angular 21) — **à normaliser** :

```ts
import { Injectable } from '@angular/core';
import { ResponsibilitiesDto } from '@shared/data/dto/responsibilities.dto';
import { Responsibilities } from '@shared/domain/enums/responsibilities.enum';

@Injectable({ providedIn: 'root' })
export class ResponsibilitiesMapper {
    mapFromDto(dtoValue: ResponsibilitiesDto): Responsibilities {
        const map: Record<ResponsibilitiesDto, Responsibilities> = {
            [ResponsibilitiesDto.SUPERVISOR]: Responsibilities.SUPERVISOR,
            [ResponsibilitiesDto.LEADER]: Responsibilities.LEADER,
            [ResponsibilitiesDto.AGENT]: Responsibilities.AGENT,
        };
        return map[dtoValue] || Responsibilities.AGENT;
    }
}
```

Cible (Angular 22) — après application du profil :

```ts
import { Service } from '@angular/core';
import { ResponsibilitiesDto } from '@cmz/shared-data';
import { Responsibilities } from '@cmz/shared-domain';

@Service()
export class ResponsibilitiesMapper {
    mapFromDto(dtoValue: ResponsibilitiesDto): Responsibilities {
        const map: Record<ResponsibilitiesDto, Responsibilities> = {
            [ResponsibilitiesDto.SUPERVISOR]: Responsibilities.SUPERVISOR,
            [ResponsibilitiesDto.LEADER]: Responsibilities.LEADER,
            [ResponsibilitiesDto.AGENT]: Responsibilities.AGENT,
        };
        return map[dtoValue] ?? Responsibilities.AGENT;
    }
}
```

Deux différences appliquées automatiquement : `@Injectable({providedIn:'root'})`
→ `@Service()`, et `||` → `??` (défaut plus sûr sur les valeurs falsy
légitimes).

## Bases de mappers (support de pattern)

Le source fournit une famille de **bases abstraites** qui factorisent la
validation d'enveloppe (`{error, message, data}`) et le mapping d'items. Analyse
d'usage (par **nom de classe**, qui diffère du nom de fichier) :

| Base                    | Fichier            | Sous-classes | Décision                             |
| ----------------------- | ------------------ | -----------: | ------------------------------------ |
| `PaginatedMapper`       | paginated-response |           48 | **générée** (data = `Paginate<T>`)   |
| `SimpleResponseMapper`  | simple-response    |           41 | **générée** (data = `T`)             |
| `ArrayResponseMapper`   | array-response     |           15 | **générée** (data = `T[]`)           |
| `MessageResponseMapper` | message-response   |            1 | **générée** (message seul)           |
| `SimplePaginatedMapper` | custom-response    |            0 | **non reproduite** (100 % commentée) |
| `BaseMapper`            | base-mapper        |            0 | **non reproduite** (100 % commentée) |

Non-reproduction appliquée : les deux bases mortes ne sont pas portées ; la
fuite `console.log('dto: ', dto)` de `SimpleResponseMapper` est **supprimée**.

**Génération à la demande, pas en avance.** Ces bases sont un support de pattern
consommé **uniquement par les mappers de module** (les 15 sous-classes
`ArrayResponseMapper`, etc. vivent dans `presentation/pages/*`, pas dans
`shared`). Aucune n'a de consommateur _à l'intérieur_ de `shared-data`. On les
génère donc quand leur **premier consommateur** apparaît (Phase 07), pas
préventivement dans `shared-data` — sinon on committe une base abstraite sans
sous-classe (dette « prove-then-scale »).

**Option de convention ouverte (approbation requise)** : les 4 bases vivantes
répètent le même `validateResponse` et ne diffèrent que par la forme de `data`.
Elles pourraient fusionner en **une** base générique (template method : valider
une fois, différer `extractAndMap`). Défaut retenu ici : **garder les 4 bases
explicites** du source (plus débogables, plus proche du source, réversible) ; la
consolidation reste proposable.

## Prompt

> Produis un fichier `<entité>.mapper.ts` : une classe exportée `<Entité>Mapper`
> décorée `@Service()` (jamais `@Injectable`). Implémente la ou les conversions
> DTO ↔ domaine fournies en données. Importe le DTO depuis la lib data et le
> type domaine depuis la lib domain (par nom de package `@cmz/…`). Sur toute
> correspondance fermée, prévois un cas par défaut avec `??`. N'ajoute aucune
> règle de gestion métier — uniquement la traduction de forme.

**Données attendues** : les correspondances DTO ↔ domaine de l'entité, issues du
mapper source.

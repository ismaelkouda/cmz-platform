# Contrat d'archétype — `entity` (domaine)

## Rôle

Objet **métier immuable** : porte les données d'un concept du domaine sous une
forme stable, exprimée dans le langage du domaine (`camelCase`). À la différence
de l'`interface` de domaine (simple forme), l'entité est une **classe** — elle
peut porter des accesseurs et, plus tard, des invariants. Le DTO reste étranger
à l'entité : la conversion appartient au `mapper`.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `class` exportée** `<Nom>Entity`, champs `public readonly` déclarés en
  **paramètres de constructeur** (immuabilité par construction).
- **Aucun décorateur** (ce n'est pas un service Angular).
- **Aucun import de `data`** (pas de DTO) ni d'UI — anti-cycle. Peut référencer
  d'autres types du domaine (enum, interface) en **import relatif** intra-lib.
- **La forme est externalisée** : la forme métier de l'entité vit dans une
  `interface` **exportée** du dossier `interfaces/` (archétype `interface`), que
  l'entité **importe et `implements`**. Jamais d'interface déclarée _inline_
  dans le fichier d'entité — une forme = un fichier, réutilisable et non caché.
- Deux variantes observées, toutes deux admises :
    - **champs plats** : chaque donnée est un `readonly` du constructeur, typé
      par l'interface externalisée (`ActorEntity implements Actor`, `Actor`
      étant dans `interfaces/actor.interface.ts`).
    - **objet `props`** : le constructeur reçoit un unique `props` typé par une
      interface du domaine, exposé via des **getters** (`MessageEntity` +
      `MessageProps`).
- Structures **récursives** autorisées
  (`TreeNodeEntity.children: TreeNodeEntity[]`).

## Exemplaire

`interfaces/actor.interface.ts` :

```ts
export interface Actor {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email: string;
}
```

`entities/actor.entity.ts` :

```ts
import { Actor } from '../interfaces/actor.interface';

export class ActorEntity implements Actor {
    constructor(
        public readonly id: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly phone: string,
        public readonly email: string
    ) {}
}
```

## Prompt

> Produis une classe exportée `<Nom>Entity` aux champs `public readonly`
> fournis, déclarés en paramètres de constructeur, en `camelCase`. Aucun
> décorateur, aucun import de DTO. Réfère les enums/interfaces du domaine en
> import relatif. La forme métier est une `interface` exportée du dossier
> `interfaces/` que l'entité `implements` (jamais d'interface inline). Selon les
> données : champs plats ou objet `props` + getters.

**Données** : les champs → types du concept métier (issus de l'entité source,
`camelCase`).

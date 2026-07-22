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
- Deux variantes observées, toutes deux admises :
    - **champs plats** : chaque donnée est un `readonly` du constructeur
      (`ActorEntity`, `TimestampsEntity`…). Une interface de forme **locale, non
      exportée**, de même nom métier peut être `implements` pour documenter le
      contrat.
    - **objet `props`** : le constructeur reçoit un unique `props` typé par une
      interface de domaine, exposé via des **getters** (`MessageEntity`).
- Structures **récursives** autorisées
  (`TreeNodeEntity.children: TreeNodeEntity[]`).

## Exemplaire

```ts
interface Actor {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email: string;
}

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
> import relatif. Selon les données : champs plats (avec interface locale
> `implements` optionnelle) ou objet `props` + getters.

**Données** : les champs → types du concept métier (issus de l'entité source,
`camelCase`).

# Contrat d'archétype — `interface` (domaine)

## Rôle

Décrit une **forme de valeur du domaine** : un contrat de données métier pur,
sans identité ni cycle de vie (à la différence de l'`entity`). Sans
comportement.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `interface` exportée**, jamais de classe ni de décorateur.
- Champs en `camelCase` (langage du domaine, pas du réseau) ; `?` pour
  l'optionnel.
- **Ne référence pas `data`** (aucun import de DTO) — anti-cycle.
- Peut référencer d'autres types du domaine (même lib, import relatif).

## Exemplaire

```ts
export interface Coordinates {
    latitude: number;
    longitude: number;
    what3words?: string;
}
```

## Prompt

> Produis une `interface` exportée `<Nom>` avec les champs fournis en
> `camelCase`, `?` pour l'optionnel. Aucun décorateur, aucune méthode, aucun
> import de DTO.

**Données** : les champs → types de la forme métier.

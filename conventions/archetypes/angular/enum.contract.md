# Contrat d'archétype — `enum` (domaine)

## Rôle

Nomme un **ensemble fermé de concepts métier** du domaine. Distinct du
`dto-enum` (vocabulaire réseau de l'API) : l'`enum` domaine porte le concept, et
sa valeur est souvent une **clé i18n** (`'COMMON.AUTO'`) — c'est une **donnée**
du source, reprise telle quelle.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Un `enum` exporté**, clés `SCREAMING_SNAKE`, valeurs reprises **exactement**
  du source (clés i18n comprises).
- Aucun décorateur, aucun import.
- **Pas de dépendance vers `data`** : un enum de domaine ne référence jamais un
  DTO (règle anti-cycle, cf. `priority-level`). Le pont enum↔DTO est au mapper.
- Les variantes **présentationnelles** (`*Style`, valeurs `*_STYLE`) ne sont pas
  du domaine : elles ne sont pas générées ici (elles relèvent de la couche
  `ui`).

## Exemplaire

```ts
export enum LocationType {
    GPS = 'COMMON.GPS',
    NETWORK = 'COMMON.NETWORK',
    MANUAL = 'COMMON.MANUAL',
    WHAT3WORDS = 'COMMON.WHAT3WORDS',
    UNKNOWN = 'COMMON.UNKNOWN',
}
```

## Prompt

> Produis un `enum` exporté `<Nom>` reprenant **exactement** les membres et
> valeurs fournis. Aucun import, aucun décorateur, aucune référence à un DTO.
> N'inclus pas les variantes de style.

**Données** : les membres → valeurs de l'ensemble métier.

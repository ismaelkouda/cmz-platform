# Contrat d'archétype — `dto-enum`

## Rôle

Décrit un **ensemble fermé de valeurs string** tel que l'**API** l'expose (son
vocabulaire réseau). Distinct de l'enum de domaine (`@cmz/shared-domain`) : le
`dto-enum` porte les valeurs brutes de l'API, le domaine porte le concept métier
; le **mapper** fait le pont entre les deux.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data`).

## Règle mécanique

- **Un `enum` exporté** `<Nom>Dto`, membres = valeurs **littérales de l'API**
  (`'active'`, `'mtn'`…), jamais des valeurs réinventées.
- Clés en `SCREAMING_SNAKE` ; une clé non identifiante peut être citée
  (`'TEAM-LEADER' = 'team-leader'`).
- Aucun décorateur, aucun import.

## Exemplaire

```ts
export enum TelecomOperatorDto {
    MTN = 'mtn',
    ORANGE = 'orange',
    MOOV = 'moov',
}
```

## Prompt

> Produis un `enum` exporté `<Nom>Dto` dont les membres reprennent
> **exactement** les valeurs string de l'API fournies. Aucun import, aucun
> décorateur. Ne crée pas de valeur qui n'existe pas côté API.

**Données** : la liste des valeurs API de l'ensemble.

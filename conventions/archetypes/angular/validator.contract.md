# Contrat d'archétype — `validator` (domaine)

## Rôle

**Assertion métier** partagée : vérifie un invariant et **lève une
`domain-error`** si violé. Centralise une règle sinon dupliquée à travers les
modules.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

> À distinguer du **validateur de formulaire Angular** (`ValidatorFn`,
> `AbstractControl`, `@angular/forms`) qui, lui, est **UI** — pas domaine.

## Règle mécanique

- **Une `function` exportée** typée, retour `void` (assertion) ou `boolean`.
- Lève une **`domain-error`** (import relatif) sur violation ; pas de `console`,
  pas d'effet de bord.
- Aucune dépendance framework/UI/`data`. Un fichier = une assertion.

## Exemplaire

```ts
import { DateRangeInvalidError } from '../errors/validation/date-range-invalid.error';

export function assertValidDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw new DateRangeInvalidError();
    }
}
```

## Prompt

> Produis une `function` d'assertion exportée qui vérifie l'invariant fourni et
> lève la `domain-error` correspondante. Aucune dépendance `@angular/forms`/UI.

**Données** : l'invariant + l'erreur à lever.

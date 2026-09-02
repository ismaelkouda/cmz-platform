# Contrat d'archétype — `vo` (value-object)

## Rôle

Objet-valeur **immuable** défini par sa valeur (pas d'identité) : encapsule une
règle ou un invariant du domaine et n'expose que des opérations sûres. Créé par
**fabrique statique** validante (`create`/`fromEnum`), constructeur privé.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `class` exportée**, **constructeur `private`**, fabriques `static`.
- Champs `readonly` ; toute invalidité lève une **`domain-error`** (import
  relatif).
- Méthodes **pures** : prédicats (`isValid`), conversions (`toEnum`), `equals`.
- **Aucun parsing de DTO** dans le VO (`fromDto` interdit) — le pont
  réseau↔domaine appartient au `mapper`. Aucune dépendance UI (pas
  d'icônes/styles).
- Aucun décorateur, aucun import de `data`.

## Exemplaire

```ts
import { InvalidStartDateError } from '../errors/date-period/invalid-start-date.error';

export class DatePeriod {
    private constructor(
        public readonly start?: Date,
        public readonly end?: Date
    ) {}

    static create(start?: string | null): DatePeriod {
        const startDate = start ? new Date(start) : undefined;
        if (startDate && Number.isNaN(startDate.getTime())) {
            throw new InvalidStartDateError();
        }
        return new DatePeriod(startDate);
    }
}
```

## Prompt

> Produis un value-object `<Nom>` (ou `<Nom>VO`) : classe exportée, constructeur
> `private`, fabriques `static` validantes levant des `domain-error`, méthodes
> pures. Pas de `fromDto`, pas de dépendance UI/data.

**Données** : les invariants + opérations du VO source.

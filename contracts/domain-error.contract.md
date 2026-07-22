# Contrat d'archétype — `domain-error`

## Rôle

Échec **métier** typé et discriminable : porte un `code` stable, une clé i18n
d'affichage (`messageKey`) et un `statusCode` HTTP. Dérive de la base abstraite
`DomainError` pour être dispatché par `ErrorHandlerRegistry`.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `class` exportée** `<Nom>Error extends DomainError` (base importée en
  relatif : `../domain-error.abstract`).
- Trois membres `readonly` figés : `code`, `messageKey`, `statusCode`.
- Constructeur avec **message de repli humain**
  (`super(message ?? 'Human text')`), jamais le code ni la clé i18n comme
  message.
- `code`, `messageKey`, `statusCode` repris **exactement** du source (données
  i18n). Aucun décorateur, aucune dépendance UI/`data`.
- Un fichier = une classe.

## Exemplaire

```ts
import { DomainError } from '../domain-error.abstract';

export class NotFoundError extends DomainError {
    readonly code = 'NOT_FOUND';
    readonly messageKey = 'ERRORS.HTTP.NOT_FOUND';
    readonly statusCode = 404;

    constructor() {
        super('Resource not found');
    }
}
```

## Prompt

> Produis `<Nom>Error extends DomainError` (import relatif de la base) avec
> `code`/`messageKey`/`statusCode` **exactement** ceux fournis, et un `super()`
> au message de repli **humain**. Aucun décorateur, une seule classe par
> fichier.

**Données** : `code`, `messageKey`, `statusCode`, message de repli.

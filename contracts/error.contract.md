# Contrat d'archétype — `error` (domaine)

## Rôle

Représente un **échec métier typé** : une classe d'erreur portant un `code`
stable et, optionnellement, des fabriques statiques nommées pour les cas
courants. Permet un `catch` discriminant plutôt qu'un `Error` générique.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `class` exportée** `extends Error` (ou une base d'erreur du domaine).
- `super(message)` puis `this.name = '<Nom>'` et
  `Object.setPrototypeOf(this, <Nom>.prototype)` (fiabilise `instanceof` après
  transpilation).
- Un `code` stable en lecture seule (`public readonly code: string`).
- Fabriques statiques nommées optionnelles (`static fetchFailed(…)`) pour les
  cas récurrents.
- **Aucun décorateur**, aucune dépendance UI ni `data`.

## Exemplaire

```ts
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    static invalidResponse(message: string, originalError?: unknown): ApiError {
        return new ApiError(message, 'INVALID_RESPONSE', originalError);
    }
}
```

## Prompt

> Produis une classe d'erreur `<Nom> extends Error` avec `super(message)`,
> `this.name`, `Object.setPrototypeOf`, un `readonly code`, et les fabriques
> statiques fournies. Aucun décorateur, aucune dépendance UI/data.

**Données** : le nom, les codes/fabriques attendus, les messages.

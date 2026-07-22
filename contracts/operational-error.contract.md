# Contrat d'archétype — `operational-error`

## Rôle

Échec **technique / opérationnel** (transport API, filtre invalide) qui n'a pas
de sémantique métier ni de clé i18n. Autonome (`extends Error`), souvent doté de
**fabriques statiques** nommées et d'un `code` — parfois **dynamique** — pour un
`catch` discriminant.

## Couche

Là où l'erreur est **levée** : `ApiError` (transport) est consommée par la
couche `data` (bases de mappers) et `application` ; `InvalidFilterError` est
levée par un VO du domaine. À placer au plus près de ses consommateurs.

## Règle mécanique

- **Une `class` exportée** `extends Error`, `super(message)` puis
  `this.name = '<Nom>'` et **toujours**
  `Object.setPrototypeOf(this, <Nom>.prototype)` (robustesse `instanceof`).
- `code` en `readonly` (fixe ou reçu au constructeur).
- Fabriques statiques nommées optionnelles (`static invalidResponse(…)`).
- `originalError?: unknown` pour chaîner la cause, si pertinent.
- Aucun `messageKey`/`statusCode` (ce n'est pas une erreur métier), aucun
  décorateur.

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

> Produis `<Nom> extends Error` avec `super(message)`, `this.name`,
> `Object.setPrototypeOf`, un `readonly code` (fixe ou paramètre), les fabriques
> statiques fournies et un `originalError?` si une cause est chaînée. Ni
> `messageKey`, ni `statusCode`, ni décorateur.

**Données** : nom, code(s), fabriques, messages.

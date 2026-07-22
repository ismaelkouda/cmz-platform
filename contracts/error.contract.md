# Famille `error` — index

L'observation du source montre **deux formes** d'erreur, réunies à tort sous un
seul nom. Conformément à la granularité « une forme = un archétype », la famille
est **scindée** :

| Archétype           | Forme                                                                                         | Contrat                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `domain-error`      | erreur métier étendant la base abstraite `DomainError` (`code` + `messageKey` + `statusCode`) | [`domain-error.contract.md`](./domain-error.contract.md)           |
| `operational-error` | erreur technique autonome (`extends Error`), fabriques statiques, `code` dynamique            | [`operational-error.contract.md`](./operational-error.contract.md) |

## Base partagée `DomainError`

Support de pattern (comme les bases de mappers) : une classe **abstraite**
exportée dont dérivent toutes les `domain-error`. Vivante (le service
`ErrorHandlerRegistry` dispatche sur `DomainError`).

```ts
export abstract class DomainError extends Error {
    public abstract readonly code: string;
    public abstract readonly messageKey: string;
    public abstract readonly statusCode?: number;

    protected constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
```

## Non-reproduction (incohérences du source corrigées)

- **Un fichier = un symbole** : `date-period.error.ts` regroupait 3 classes →
  scindé en `invalid-date-range` / `invalid-start-date` / `invalid-end-date`.
- **`message` par défaut** : là où le source passait une **clé i18n**
  (`ServerError`) ou le **code** (`date-period`) comme message de repli, on met
  un message humain. `messageKey`, `statusCode`, `code` sont des **données i18n
  préservées à l'identique** (les modifier casserait les traductions).
- **`Object.setPrototypeOf`** ajouté là où il manquait (robustesse
  `instanceof`).

## Observations non corrigées (données, hors de notre contrôle)

- Namespaces `messageKey` hétérogènes (`ERRORS.HTTP.*` vs `COMMON.ERROR.*` pour
  `UnauthorizedError`) : dépendent des fichiers de traduction — à harmoniser
  avec l'équipe i18n, pas à deviner ici.

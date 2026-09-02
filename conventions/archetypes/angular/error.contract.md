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

## Consommation (Phase 07) — supprimer la répétition, pas les classes

Le source enregistre **33 handlers dont 31 identiques**
(`toast.error(translate.instant(error.message))`) et admet en commentaire le bug
récurrent « on oublie d'enregistrer un handler ». La cause n'est pas le nombre
de classes (générées depuis les données → coût quasi nul, type-safe), mais la
**consommation**. Règles pour la Phase 07 :

- **Handler par défaut** : `ErrorHandlerRegistry.handle()` applique, pour
  **tout** `DomainError` sans handler spécifique,
  `toast.error(transloco.translate( error.messageKey, error.params))`. On
  n'enregistre plus que les **exceptions** : `UnauthorizedError` (`warning` +
  `session.clear()`) et `ValidationError` (message serveur, sans traduction). 33
  → 2, et le bug d'oubli disparaît.
- **`messageKey`, pas `message`** : la traduction porte sur la clé i18n, d'où sa
  préservation stricte. `error.params` alimente l'interpolation.
- **i18n = Transloco** (`translate(key, params)`), **pas** `@ngx-translate`. Un
  `DomainError` porte donc un `params?` optionnel pour l'interpolation (« passer
  des arguments ») sans casser le modèle une-clé-par-erreur.
- **Pas de couplage shared→module** : le service de feedback partagé n'importe
  aucune erreur de module (le source le faisait — anti-pattern non reproduit).

## Observations non corrigées (données, hors de notre contrôle)

- Namespaces `messageKey` hétérogènes (`ERRORS.HTTP.*` vs `COMMON.ERROR.*` pour
  `UnauthorizedError`) : dépendent des fichiers de traduction — à harmoniser
  avec l'équipe i18n, pas à deviner ici.

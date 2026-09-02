# Contrat d'archétype — `service`

## Rôle

Classe **injectable** portant un comportement qui ne tient pas naturellement
dans une entité ou un VO. Un service appartient à la **couche de ses
dépendances**, jamais par défaut au domaine :

| Couche           | Un service y vit si…                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| `domain`         | métier **pur** : aucune dépendance framework / UI / HTTP / infra. Rare.             |
| `application`    | orchestration, état, use-cases ; peut injecter domaine + data/infra.                |
| `ui`             | dépend d'un rendu (toast, primeng, `Router`, formes UI).                            |
| `data` / `infra` | dépend du réseau (`HttpClient`) ou d'une lib externe (crypto, ExcelJS, OpenLayers). |

> Un service qui importe `HttpClient`, `ngx-toastr`, `primeng`,
> `@angular/router`, `crypto-js`, `ExcelJS`… **n'est pas** un service de
> domaine. Cf.
> [`docs/architecture/services-classification.md`](../../../docs/architecture/services-classification.md).

## Règle mécanique

- **Une classe exportée** `<Nom>Service`, décorée **`@Service()`** (profil
  Angular 22 — jamais `@Injectable({ providedIn: 'root' })`).
- Dépendances injectées par **`inject()`**, pas par constructeur.
- Pas de logique métier dupliquée avec le domaine ; un service `data`/`ui`
  orchestre, il ne redéfinit pas les règles.
- `any` proscrit : typer les entrées/sorties (le source en abuse — à corriger).

## Convention (depuis le profil, jamais codée en dur)

`@Injectable({ providedIn: 'root' })` → **`@Service()`**
([profil Angular 22](../../angular-22.profile.json)).

## Exemplaire (application)

```ts
import { Service, inject } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';

@Service()
export class ErrorHandlerRegistry {
    // dispatch générique par Type<DomainError> ou code ; aucun import UI ici
}
```

## Prompt

> Produis `<Nom>Service` décorée `@Service()`, dépendances par `inject()`, dans
> la **couche de ses dépendances** (cf. classification). Type tout, aucun `any`.
> N'ajoute aucune règle métier appartenant au domaine.

**Données** : le comportement du service source + sa couche cible
(classification).

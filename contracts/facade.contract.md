# Contrat d'archétype — `facade`

## Rôle

Orchestrateur **applicatif** (CQRS côté lecture) : expose l'état d'une ressource
à l'UI et déclenche les chargements. **État en signaux** (reco Angular), pas de
`BehaviorSubject`. Ne contient aucune règle métier (déléguée au domaine) ni
rendu.

## Couche

`application` → `@cmz/shared-application` (bases) ou `@cmz/<module>-application`
(facades concrètes). Dépend de `data`/`domain`, **jamais de `ui`**.

## Règle mécanique

- **État `signal<ResourceState<TData, TFilter>>`** ; accès par `computed`
  (`data`, `loading`, `error`, `filter`).
- Base **abstraite sans décorateur** ; la facade **concrète** de module est
  décorée `@Service()`.
- Chargement par un `Observable<TData>` fourni (couche data) ; sur erreur,
  dispatch via **`ErrorHandlerRegistry`** (application) — jamais un service UI.
- Deux bases : `BaseFacade<TData, TFilter>` (objet **ou** liste),
  `PaginatedFacade<TEntity, TFilter>` (ajoute `page` + `items`).
- Aucun `any` ; injection par `inject()`.

## Non-reproduction (défauts source corrigés)

- `Injectable({...});` en **statement** (sans `@`, donc sans décorateur) →
  supprimé.
- Décorateur `@Injectable` posé sur une **classe abstraite** → retiré (on ne
  provide pas une base).
- `debounceTime` sur une **réponse HTTP unique** (inutile) → retiré (le debounce
  appartient au déclencheur de filtre, côté composant).
- Couplage facade → `UiFeedbackService` (**ui**) → remplacé par
  `ErrorHandlerRegistry` (**application**).
- `simple-base-facade` (100 % commenté) et le bloc mort de `facade.utils` → non
  reproduits ; `console.log` retirés.

## Exemplaire (base)

```ts
export abstract class BaseFacade<TData, TFilter> {
    private readonly errorHandler = inject(ErrorHandlerRegistry);
    protected readonly _state = signal<ResourceState<TData, TFilter>>({
        filter: null,
        data: null,
        loading: false,
        error: null,
        lastFetch: 0,
    });
    readonly data = computed(() => this._state().data);
    readonly loading = computed(() => this._state().loading);

    protected fetch(filter: TFilter | null, loader$: Observable<TData>): void {
        /* set loading, subscribe, set data | errorHandler.handle(err) */
    }
}
```

## Prompt

> Produis une facade `<Nom>Facade` décorée `@Service()` étendant `BaseFacade`
> (ou `PaginatedFacade`). État en signaux, chargement via un `Observable` de la
> data, erreurs via `ErrorHandlerRegistry`. Aucun `any`, aucun import `ui`.

**Données** : la ressource, son filtre, la source de chargement (data).

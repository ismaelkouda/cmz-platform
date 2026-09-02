# Contrat d'archétype — `facade`

## Rôle

Orchestrateur **applicatif** (CQRS côté lecture) : expose l'état d'une ressource
à l'UI et déclenche les chargements. **État en signaux**, jamais de
`BehaviorSubject`. Ne contient aucune règle métier (déléguée au domaine) ni
rendu.

## Couche

`application` → `@cmz/shared-application` (bases) ou `@cmz/<module>-application`
(facades concrètes). Dépend de `data`/`domain`, **jamais de `ui`**.

## Règle mécanique

- **État serveur = primitive du profil actif** (`conventions/<plateforme>-<v>.profile.json`
  → `conventions.async_state`). Pour Angular v22 : `httpResource()` /
  `resource()` / `rxResource()` — la facade expose directement `resource.value`,
  `resource.isLoading`, `resource.error` (signaux), le rechargement est
  `resource.reload()` ou un `params` réactif.
- **Interop** : un `Observable` de la couche `data` est adapté par `rxResource()`
  ou `toSignal()`. Un loader `Observable` brut n'est un **fallback** que lorsque
  `resource()` ne convient pas (ex. write suivi d'un refetch orchestré à la
  main).
- Base **abstraite sans décorateur** ; la facade **concrète** de module est
  décorée `@Service()`.
- Sur erreur : dispatch via **`ErrorHandlerRegistry`** (application) — jamais un
  service UI.
- Aucun `any` ; injection par `inject()`.

## Forme historique (`BaseFacade` / `PaginatedFacade`)

`@cmz/shared-application` fournit `BaseFacade<TData, TFilter>` et
`PaginatedFacade<TEntity, TFilter>` (ajoute `page` + `items`), qui portent
l'état dans un `signal<ResourceState<…>>` alimenté par un loader `Observable`.
Ces bases restent **valides pour les modules existants** et pour la pagination
tant que `rxResource()` ne couvre pas le cas ; elles ne sont **pas le défaut
d'une nouvelle facade** — préférer `httpResource()` / `resource()`.

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
- État serveur maintenu à la main dans un `signal<ResourceState>` + loader
  `Observable` là où `httpResource()` / `resource()` suffit → non reproduit pour
  les nouvelles facades.

## Exemplaire (nouvelle facade — `resource()`)

```ts
@Service()
export class DashboardFacade {
    private readonly api = inject(DashboardApi);

    private readonly params = signal<DashboardFilter | null>(null);
    private readonly resource = rxResource({
        params: this.params,
        stream: ({ params }) => this.api.load(params),
    });

    readonly value = this.resource.value;
    readonly isLoading = this.resource.isLoading;
    readonly error = computed(() => this.resource.error());

    load(filter: DashboardFilter): void {
        this.params.set(filter);
    }
}
```

## Prompt

> Produis une facade `<Nom>Facade` décorée `@Service()`. État serveur via la
> primitive du profil actif (Angular → `httpResource()` / `resource()` /
> `rxResource()`), exposée en signaux (`value`, `isLoading`, `error`). Erreurs
> via `ErrorHandlerRegistry`. `BaseFacade`/`PaginatedFacade` seulement si le
> module existant l'impose ou pour une pagination non couverte par
> `rxResource()`. Aucun `any`, aucun import `ui`.

**Données** : la ressource, son filtre, la source de chargement (data).

# Archétypes — couche `application`

Dépend de `{domain module, @cmz/shared-application, @cmz/shared-domain}`. **Ne
dépend jamais de `data` ni `ui`** (le wiring port→impl se fait au niveau app ;
le feedback passe par les ports `NotificationPort`/`TranslationPort`, jamais
`UiFeedbackService`). CQRS dégénéré du source **supprimé** : pas de
`command`/`command-mapper`/`command-bus`/`handler`/`query`/`query-*`/
`application/dto`. Chaîne : **façade → use-case → repository (port)**.

## `use-case` (`@Service`, service applicatif)

- **Rôle DDD/CQRS** : orchestre validation (VO) + normalisation de filtre +
  appel au port. Une méthode par opération (`execute`, `create`, `update`,
  `delete`, `enable`/`disable` si applicable).
- **Règle mécanique** : injecte le **port** (`XRepository`), jamais l'impl data.
  Chaque méthode enveloppe l'appel dans `defer(() => …)` — reporte le `throw` du
  VO dans le flux Observable, pour qu'il soit rendu par la loop d'erreurs plutôt
  que de lever de façon synchrone.
- **Squelette** :
    ```ts
    @Service()
    export class XUseCase {
        private readonly repository = inject(XRepository);
        execute(
            contract: XFilterContract,
            page: string,
            options?: FetchOptions
        ): Observable<PageResult<XEntity>> {
            return defer(() =>
                this.repository.execute(
                    xFilterEntity(xFilterVo(contract)),
                    page,
                    options
                )
            );
        }
        create(contract: XCreateContract): Observable<MessageEntity> {
            return defer(() => this.repository.create(xCreateVo(contract)));
        }
        // update / delete / enable / disable — même forme
    }
    ```
- **Référence** : `use-cases/infrastructure-type.use-case.ts`,
  `use-cases/infrastructure-type-find-one.use-case.ts` (variante find-one : une
  seule méthode `execute`).
- **Variantes connues** : entité sans toggle → pas de méthodes
  `enable`/`disable` ; vue imbriquée (ex. `departments-by-region-id`) → même
  forme que liste, mais le filtre porte l'id parent.

## `facade` — collection (`@Service`, signal, `extends CollectionResourceFacade`)

- **Rôle DDD/CQRS** : façade signal-first exposée à l'UI pour une **liste
  paginée avec mutations**.
- **Règle mécanique** :
  `protected stream(params): Observable<PageResult<XEntity>>` délègue au
  use-case ; chaque mutation appelle
  `this.runAction(obs$, 'COMMON.SUCCESS.<OP>', () => this.reload())` — jamais de
  `.subscribe()` manuel, jamais d'accès direct à `NotificationPort` (c'est
  `runAction`, hérité du kernel, qui s'en charge).
- **Squelette** :
    ```ts
    @Service()
    export class XFacade extends CollectionResourceFacade<
        XEntity,
        XFilterContract
    > {
        private readonly useCase = inject(XUseCase);
        protected stream(
            params: PageQuery<XFilterContract>
        ): Observable<PageResult<XEntity>> {
            return this.useCase.execute(
                params.filter ?? {},
                params.page,
                params.options
            );
        }
        create(contract: XCreateContract): void {
            this.runAction(
                this.useCase.create(contract),
                'COMMON.SUCCESS.CREATE',
                () => this.reload()
            );
        }
        // update / delete / enable / disable — même forme
    }
    ```
- **Référence** : `facades/infrastructure-type.facade.ts`.

## `facade` — find-one / select (`@Service`, signal, `extends ResourceFacade`)

- **Rôle DDD/CQRS** : façade signal-first pour un **objet unique** (détail) ou
  un **tableau non paginé** (dropdown).
- **Règle mécanique** : find-one expose `read(filter, options?)` → `setParams` ;
  select expose `readonly options = computed(() => this.value() ?? [])` +
  `load(options?)`.
- **Squelette (find-one)** :
    ```ts
    @Service()
    export class XFindOneFacade extends ResourceFacade<
        XFindOneEntity,
        XFindOneParams
    > {
        private readonly useCase = inject(XFindOneUseCase);
        protected stream(params: XFindOneParams): Observable<XFindOneEntity> {
            return this.useCase.execute(params.filter, params.options);
        }
        read(filter: XFindOneFilterContract, options?: FetchOptions): void {
            this.setParams({ filter, options });
        }
    }
    ```
- **Référence** : `facades/infrastructure-type-find-one.facade.ts`,
  `facades/infrastructure-type-select.facade.ts`.
- **Variante à instruire pour `administrative-boundary`** : select **cascade**
  (région → départements embarqués) — le `SelectOption[]` classique ne suffit
  pas ; forme à définir dans le contrat data (`RegionsSelectItemApiDto` porte
  déjà `departments[]`) avant d'écrire ce fichier pour `region-select`.

## Dépendances (`package.json`)

`{domain module, @cmz/shared-application, @cmz/shared-domain, @angular/core, rxjs}`
— **jamais** `@cmz/*-data` ni `@cmz/shared-data`.

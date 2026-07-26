# Archétypes — couche `ui`

Dépend de
`{domain module, application module, @cmz/shared-application, @cmz/shared-ui, @cmz/shared-domain}`.
Standalone + `ChangeDetectionStrategy.OnPush` partout. Signal Forms
(`@angular/forms/signals`), jamais `ReactiveFormsModule`.

## `constants` — form-keys / filter-keys / table / tabs / paths

- **Rôle DDD/CQRS** : vocabulaire de clés utilisé par stores/presenters/
  templates — évite les chaînes en dur dispersées.
- **Règle mécanique** : `as const`, une clé par champ (`FORM_KEYS`) ou par champ
  de filtre (`FILTER_KEYS`). `TABLE` =
  `{cols: TableColumn[], globalFilterFields: string[]}`, colonnes typiques :
  `__index`, champs métier, `statusLabel` (jamais `status` brut), `updatedAt`,
  `__actionDropdown`.
- **Référence** : `constants/infrastructure-type-form-keys.constant.ts`,
  `constants/infrastructure-type-filter-keys.constant.ts`,
  `constants/infrastructure-type-table.constant.ts`.

## `status-label.constant` (si l'entité porte un statut)

- **Rôle DDD/CQRS** : libellés i18n du statut — **hors domaine** (le domaine ne
  connaît que le code wire).
- **Règle mécanique** : `Record<Status, string>` clé = valeur wire, valeur = clé
  i18n `COMMON.ACTIVE`/`COMMON.INACTIVE` (réutiliser le namespace `COMMON`
  existant, ne pas en recréer un par module).
- **Référence** : `constants/infrastructure-type-status-label.constant.ts`
  (`STATUS_LABEL`).

## `vm-props` (interface) + `presenter` (classe, `t: (key)=>string` injecté)

- **Rôle DDD/CQRS** : `Entity` (domaine, pur) → view-model (UI, avec libellés/
  styles/actions résolus).
- **Règle mécanique** : `statusStyle`/`statusLabel`/`actionsRef` sont **calculés
  dans le presenter**, jamais portés par l'entité domaine. Actions du dropdown =
  `dropdownActions: ActionDropdownItem[]`, chacune via
  `actionItem(t, {id, label, icon, allowed, tooltipKey, fallbackTooltip})`
  (factory kernel `action-item.factory.ts`). Delete
  `allowed: canDelete && <condition métier>` (ex. `status !== ACTIVE`, ou
  `childrenCount === 0` pour un parent hiérarchique).
- **Squelette** :
    ```ts
    export interface XVmProps {
        uniqId: string; /* champs affichés */
        status: Status;
        statusLabel: string;
        statusStyle: StatusStyle;
        updatedAt: string;
        actionsRef: string;
        dropdownActions: ActionDropdownItem[];
        disableDropdown: boolean;
        tooltipDropdown: string;
    }
    export class XPresenter {
        constructor(private readonly t: (key: string) => string) {}
        map(item: XEntity, permission: XPermission): XVmProps {
            /* … */
        }
    }
    ```
- **Référence** : `adapters/infrastructure-type-vm-props.interface.ts`,
  `adapters/infrastructure-type-vm.presenter.ts`.
- **Variante à instruire** : entité **sans toggle** (region/department/
  municipality) → pas d'action `ENABLE`/`DISABLE` dans `dropdownActions`, juste
  `EDIT`/`DELETE`.

## `filter-store` (`@Injectable()` non-root, `signal`)

- **Rôle DDD/CQRS** : modèle deux-voies pour `cmz-filter`, projeté vers le
  contrat domaine.
- **Règle mécanique** : `model = signal<Record<string,string>>(this.empty())` —
  **toutes les clés de filtre présentes dès l'init** (Signal Forms construit
  l'arbre de champs depuis les clés existantes ; un modèle `{}` casse
  `cmz-filter`). `toContract()` projette vers le contrat typé (dates → `Date`,
  statut → `isStatus(v) ? v : undefined`, jamais un cast `as Status` aveugle).
  `reset()` → `this.model.set(this.empty())`.
- **Squelette** :
    ```ts
    @Injectable()
    export class XFilterStore {
        readonly model = signal<Record<string, string>>(this.empty());
        private empty(): Record<string, string> {
            return {
                [KEYS.SEARCH]: '',
                [KEYS.STATUS]: '',
                [KEYS.START_DATE]: '',
                [KEYS.END_DATE]: '',
            };
        }
        toContract(): XFilterContract {
            const m = this.model();
            const status = m[KEYS.STATUS];
            return {
                search: m[KEYS.SEARCH] || undefined,
                status: isStatus(status) ? status : undefined /* dates */,
            };
        }
        reset(): void {
            this.model.set(this.empty());
        }
    }
    ```
- **Référence** : `stores/infrastructure-type-filter.store.ts`.
- **Variante à instruire** : filtre **cascade** (ex. filtrer les communes par
  région ET département) — clé de filtre supplémentaire dont les options
  dépendent d'une autre valeur du modèle (à documenter une fois rencontré).

## `form-store` (`@Injectable()` non-root, Signal Forms)

- **Rôle DDD/CQRS** : modèle + schéma de validation + hydratation edit/details
  pour le formulaire.
- **Règle mécanique** : `form(model, schema)` avec
  `required(schema.champ, {message:'COMMON.VALIDATION.REQUIRED'})` par champ
  requis, `disabled(schema.champ, () => this.isDetails())` par champ.
  Hydratation edit/details via un `effect()` qui lit la façade find-one et fait
  `untracked(() => this.model.set(...))` — jamais en mode `create`.
  `setMode(uniqId, mode)` : `create` → `reset()` ; sinon →
  `findOne.read({uniqId}, {forceRefresh:true})`.
- **Squelette** :
    ```ts
    @Injectable()
    export class XFormStore {
        private readonly findOne = inject(XFindOneFacade);
        readonly mode = signal<FormMode>('create');
        readonly isDetails = computed(() => this.mode() === 'details');
        readonly model = signal<XFormModel>({ champA: '', champB: '' });
        readonly form = form(this.model, (schema) => {
            required(schema.champA, { message: 'COMMON.VALIDATION.REQUIRED' });
            disabled(schema.champA, () => this.isDetails());
        });
        constructor() {
            effect(() => {
                const item = this.findOne.value();
                if (this.mode() === 'create' || !item) return;
                untracked(() => this.model.set({ champA: item.champA }));
            });
        }
        setMode(uniqId: string | null, mode: FormMode): void {
            /* … */
        }
        reset(): void {
            /* … */
        }
    }
    ```
- **Référence** : `stores/infrastructure-type-form.store.ts`,
  `stores/form-mode.type.ts` (type partagé `'create'|'edit'|'details'`).
- **Variante à instruire** : champ **select dépendant** (ex. commune → région
  puis département filtré) — le modèle porte les deux clés, la liste d'options
  du second select est `computed()` sur la valeur du premier.

## `feature` — list component

- **Rôle DDD/CQRS** : compose `cmz-filter` + `cmz-table` + `cmz-pagination` sur
  la façade `rxResource`.
- **Règle mécanique** :
  `itemsVM = computed(() => facade.items().map(i => presenter.map(i, permission)))`
  ; confirmations via `ConfirmDialogPort`, jamais un `confirm()` natif ;
  permissions via `PermissionActionsService`.
- **Référence** : `features/infrastructure-type-list.component.ts`.

## `feature` — form component

- **Rôle DDD/CQRS** : lie le `form-store` au template via `[formField]` +
  `cmz-field` (erreurs), soumet vers la façade.
- **Règle mécanique** : mode lu depuis les query params (`ref`, `uniqId`) au
  constructeur ; navigation retour **par `effect()` sur
  `facade.actionSuccess()`** (compare à `lastSeenSuccess`, jamais de polling) ;
  `onSubmit` court-circuite si `store.form().invalid()`.
- **Référence** : `features/infrastructure-type-form.component.ts`.

## `routes` (feature, lazy)

- **Rôle DDD/CQRS** : déclare les routes du feature ; **pas** de wiring DI ici
  (le composition-root est au niveau app).
- **Règle mécanique** : `loadComponent` pour list/form, `redirectTo` la liste
  sur le path vide.
- **Référence** : `features/infrastructure-type.routes.ts`.
- **Variante à instruire** : vue imbriquée en **route dédiée drill-down**
  (`departments-by-region-id`) → route sœur, pas un enfant de la route liste,
  avec un `data.breadcrumb` propre (décision actée pour
  `administrative-boundary`).

## `providers` (composition-root, niveau **app**, pas lib)

- **Rôle DDD/CQRS** : câble chaque port domaine à son impl `data`.
- **Règle mécanique** : `Provider[]` exporté par une fonction
  `provideX(): Provider[]`, fourni dans `app.config.ts` (**jamais** au niveau
  route — les façades sont des singletons root, un binding route-scoped ne
  serait pas vu, cf. NG0201 déjà rencontré).
- **Référence** :
  `apps/backoffice-angular/src/app/providers/administrative-infrastructure.providers.ts`.

## Dépendances (`package.json`)

`{domain module, application module, @cmz/shared-application, @cmz/shared-ui, @cmz/shared-domain, @angular/*}`
— jamais `@cmz/*-data`.

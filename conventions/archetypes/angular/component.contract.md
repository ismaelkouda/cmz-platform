# Contrat d'archétype — `component`

## Rôle

Un **composant de page / feature UI** orchestre l'affichage et les actions
utilisateur pour un volet métier. Il lit l'état via une **façade application**
(signaux), mappe vers un **VM** (presenter) et délègue les contrôles réutilisables
au design system (`@cmz/shared-ui`). **Zéro** règle métier dans le template ou
la classe : validation et mapping wire/domaine restent en domain/data.

## Couche

`ui` → `@cmz/<module>-ui`. Dépend de `application` + `domain` (types) +
`shared-ui` / `shared-application` (ports i18n, notification). **Jamais**
d'import direct de `data` (DTO/HTTP) ni d'autre `scope:` métier.

## Règle mécanique

| Invariant | Exigence |
| --------- | -------- |
| Standalone | `@Component({ … })` standalone implicite — jamais `standalone: true`, jamais de `NgModule` local |
| OnPush | Signaux uniquement ; ne pas déclarer `changeDetection` explicitement (OnPush est le défaut v22+) ; pas de `detectChanges` manuel hors tests |
| DI | `inject()` pour ports/façades — pas de constructeur gonflé de services HTTP |
| Template | i18n via le **mécanisme du profil actif** (`conventions/<plateforme>-<v>.profile.json` → `conventions.i18n` ; pour Angular : Transloco) / clé `MODULE.VOLET.*` — **pas** de littéraux utilisateur en dur, **pas** d'abstraction i18n maison |
| A11y | Boutons nommés (texte ou `aria-label`) ; champs filtrés avec `<label for>` ; icônes décoratives `aria-hidden="true"` ; groupes de toggle `role="group"` + `aria-pressed` (cf. T12-8) |
| Side-effects | Chargement initial dans le constructeur ou `effect` documenté via `facade.load(...)` — **pas** d'HTTP inline |
| Export | Exporté depuis `libs/<module>/ui/src/index.ts` et référencé en **lazy** par le contrat `route` |

## Non-reproduction (défauts source corrigés)

- PrimeNG / `*ngIf` / modules NgModule massifs → components standalone +
  design-system maison.
- `UiFeedbackService` UI dans la page pour les erreurs HTTP → errors routées
  par la facade/`ErrorHandlerRegistry` (application).
- `console.log` de debug (filters, grafana link) → non reproduits.
- Couplage direct Repository/API depuis le composant → **interdit**.

## Exemplaire de référence (page RO-view)

```ts
@Component({
    selector: 'cmz-dashboard-page',
    imports: [DashboardSkeletonComponent],
    imports: [TranslocoDirective, DashboardSkeletonComponent],
    providers: [DashboardFilterStore],
    template: `
        <section *transloco="let t" class="flex flex-col gap-6">
            <header>
                <h1>{{ t(ns + '.TITLE') }}</h1>
                <!-- filtre période : role=group + aria-pressed (T12-8) -->
            </header>
            @if (loading()) {
                <cmz-dashboard-skeleton />
            } @else if (vm(); as data) {
                <!-- cartes stats depuis presenter -->
            }
        </section>
    `,
})
export class DashboardPageComponent {
    private readonly facade = inject(DashboardFacade);

    protected readonly loading = this.facade.isLoading;
    protected readonly vm = computed(() => {
        const entity = this.facade.value();
        return entity ? this.presenter.map(entity) : undefined;
    });

    constructor() {
        this.facade.load(this.store.toContract());
    }
}
```

> i18n : `TranslocoDirective` (`*transloco="let t"`) ou le pipe `transloco` dans
> le template ; `inject(TranslocoService)` seulement pour une traduction
> impérative (message d'erreur construit en TS). Jamais de `TranslationPort` /
> `I18nPort` — retirés du repo (ADR-0036).

## Prompt

> Produis un composant standalone `<Nom>PageComponent` (ou `*ListComponent` /
> `*FormDialogComponent` suivant le nœud). Injecte la façade du module. i18n :
> mécanisme du profil actif (Angular → `TranslocoDirective` / pipe `transloco`).
> Template : clés i18n, a11y (labels, aria-\*, boutons nommés), `@if` / `@for`
> Angular control flow. Aucun import `@cmz/*-data`. Providers locaux uniquement
> pour stores de filtre page-scoped.

**Données** : nom du volet, façade, champs filter, colonnes table, actions
autorisées (`PermissionActionsService` si workflow-action).

**Oracle** : `@cmz/<module>-ui:build` ; tests a11y archétype (T12-8) en app.

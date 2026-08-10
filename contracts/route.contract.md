# Contrat d'archétype — `route`

## Rôle

Un fichier **`*.routes.ts`** déclare l'arbre de navigation d'un module UI : paths
stables, `loadComponent` lazy, éventuels enfants, `data` (breadcrumb, garde).
C'est le **contrat de composition** entre l'app shell (`app.routes.ts`) et les
pages du module — pas de logique métier, pas de providers globaux.

## Couche

`ui` → `libs/<module>/ui/src/lib/features/<module>.routes.ts` (ou nom homologué
par pattern). Importé en lazy depuis `apps/backoffice-angular` via
`loadChildren` / `import('@cmz/<module>-ui')`.

## Règle mécanique

| Invariant | Exigence |
| --------- | -------- |
| Type | `export const <MODULE>_ROUTES: Routes = [ … ]` |
| Lazy pages | **Toujours** `loadComponent: () => import(…).then(m => m.XxxComponent)` — pas d'import statique de page lourde dans le routes file (sauf redirect shell) |
| Redirects | `path: ''` avec `redirectTo` + `pathMatch: 'full'` quand le module a un volet par défaut |
| `data` | Breadcrumb i18n (`data.breadcrumb = 'MODULE.VOLET.BREADCRUMB.LABEL'`) quand le shell lit les miettes |
| Guards | Auth/path au **niveau shell** (`authGuard`, `pathsGuard`) — pas de re-copie dans chaque lib sauf exception documentée |
| Naming paths | Kebab-case wire-stable (`queues`, `tasks/actions`) — aligné legacy et `PermissionActionsService` |
| Export | Réexporté depuis `src/index.ts` du package ui |

## Non-reproduction (défauts source corrigés)

- Eager import de tous les components de page → **lazy** systématique (bundle
  split, budgets ADR-0016).
- Routes métier mélangées dans `AppModule` monolithique → routes **par module**
  exportées comme constante typée.
- `canActivate` métier hardcodé dans chaque feature → centralisé shell +
  `permissionGuard` si besoin.

## Exemplaire de référence (workflow-action)

```ts
import { Routes } from '@angular/router';

export const PROCESSING_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'queues',
        pathMatch: 'full',
    },
    {
        path: 'queues',
        loadComponent: () =>
            import('./queues-processing-page.component').then(
                (m) => m.QueuesProcessingPageComponent
            ),
        data: { breadcrumb: 'PROCESSING.QUEUES.BREADCRUMB.LABEL' },
    },
    {
        path: 'tasks',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./tasks-processing-page.component').then(
                        (m) => m.TasksProcessingPageComponent
                    ),
                data: { breadcrumb: 'PROCESSING.TASKS.BREADCRUMB.LABEL' },
            },
            {
                path: 'actions',
                loadComponent: () =>
                    import('./tasks-actions-processing-page.component').then(
                        (m) => m.TasksActionsProcessingPageComponent
                    ),
                data: {
                    breadcrumb: 'PROCESSING.TASKS.ACTIONS.BREADCRUMB.LABEL',
                },
            },
        ],
    },
];
```

## Exemplaire RO-view (dashboard)

```ts
export const DASHBOARD_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./dashboard-page.component').then(
                (m) => m.DashboardPageComponent
            ),
    },
];
```

## Prompt

> Produis `export const <MODULE>_ROUTES: Routes` avec lazy `loadComponent` pour
> chaque page, redirects `pathMatch: 'full'`, `data.breadcrumb` i18n. Aucun
> import de services métier. Paths en kebab-case stables.

**Données** : liste des volets (path → component file + clé breadcrumb).

**Oracle** : `@cmz/<module>-ui:build` ; smoke navigation = Playwright (T12-6)
hors schéma de paire fichier.

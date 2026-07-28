import { Routes } from '@angular/router';

export const MAP_INTERACTIVE_ROUTE = 'interactive';
export const MAP_VISUALIZATION_ROUTE = 'visualization';

export const INTERACTIVE_MAP_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: MAP_INTERACTIVE_ROUTE },
    {
        path: MAP_INTERACTIVE_ROUTE,
        data: { breadcrumb: 'INTERACTIVE_MAP.MAP.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./interactive-map-page.component').then(
                (m) => m.InteractiveMapPageComponent
            ),
    },
    {
        path: MAP_VISUALIZATION_ROUTE,
        data: { breadcrumb: 'INTERACTIVE_MAP.DASHBOARD.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./map-page.component').then((m) => m.MapPageComponent),
    },
    { path: '**', redirectTo: MAP_INTERACTIVE_ROUTE },
];

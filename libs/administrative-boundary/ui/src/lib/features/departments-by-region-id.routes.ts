import { Routes } from '@angular/router';

/**
 * Route sœur (pas enfant de la liste `region`) — drill-down dédié, cf.
 * décision « vue imbriquée en route dédiée ». Câblée par l'app au niveau
 * `region.routes` (data.breadcrumb propre défini à l'assemblage, Phase 6).
 */
export const DEPARTMENTS_BY_REGION_ID_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./departments-by-region-id.component').then(
                (m) => m.DepartmentsByRegionIdComponent
            ),
    },
];

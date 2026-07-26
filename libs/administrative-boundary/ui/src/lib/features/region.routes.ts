import { Routes } from '@angular/router';
import { REGION_FORM, REGION_LIST } from '../constants/region-paths.constant';

/**
 * Routes du feature `region` (lazy). Le wiring DI port→impl est fourni au
 * niveau app via `provideAdministrativeBoundary()`.
 */
export const REGION_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: REGION_LIST },
    {
        path: REGION_LIST,
        loadComponent: () =>
            import('./region-list.component').then(
                (m) => m.RegionListComponent
            ),
    },
    {
        path: REGION_FORM,
        loadComponent: () =>
            import('./region-form.component').then(
                (m) => m.RegionFormComponent
            ),
    },
];

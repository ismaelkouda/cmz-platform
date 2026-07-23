import { Routes } from '@angular/router';
import {
    INFRASTRUCTURE_TYPE_FORM,
    INFRASTRUCTURE_TYPE_LIST,
} from '../constants/infrastructure-type-paths.constant';

/**
 * Routes du feature `infrastructure-type` (lazy). Le wiring DI port→impl est
 * fourni au niveau app via `provideAdministrativeInfrastructure()`.
 */
export const INFRASTRUCTURE_TYPE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: INFRASTRUCTURE_TYPE_LIST },
    {
        path: INFRASTRUCTURE_TYPE_LIST,
        loadComponent: () =>
            import('./infrastructure-type-list.component').then(
                (m) => m.InfrastructureTypeListComponent
            ),
    },
    {
        path: INFRASTRUCTURE_TYPE_FORM,
        loadComponent: () =>
            import('./infrastructure-type-form.component').then(
                (m) => m.InfrastructureTypeFormComponent
            ),
    },
];

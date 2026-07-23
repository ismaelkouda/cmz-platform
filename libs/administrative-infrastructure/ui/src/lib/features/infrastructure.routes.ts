import { Routes } from '@angular/router';
import {
    INFRASTRUCTURE_FORM,
    INFRASTRUCTURE_LIST,
} from '../constants/infrastructure-paths.constant';

/**
 * Routes du feature `infrastructure` (lazy). Wiring DI fourni au niveau app via
 * `provideAdministrativeInfrastructure()`.
 */
export const INFRASTRUCTURE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: INFRASTRUCTURE_LIST },
    {
        path: INFRASTRUCTURE_LIST,
        loadComponent: () =>
            import('./infrastructure-list.component').then(
                (m) => m.InfrastructureListComponent
            ),
    },
    {
        path: INFRASTRUCTURE_FORM,
        loadComponent: () =>
            import('./infrastructure-form.component').then(
                (m) => m.InfrastructureFormComponent
            ),
    },
];

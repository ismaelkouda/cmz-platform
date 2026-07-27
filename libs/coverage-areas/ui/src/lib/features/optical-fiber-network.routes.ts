import { Routes } from '@angular/router';
import {
    OPTICAL_FIBER_NETWORK_FORM,
    OPTICAL_FIBER_NETWORK_LIST,
} from '../constants/optical-fiber-network-paths.constant';

/**
 * Routes du feature `optical-fiber-network` (lazy). Le wiring DI port→impl
 * est fourni au niveau app via `provideCoverageAreas()`. Pas de route
 * « historique » — décision constante depuis `site-group`.
 */
export const OPTICAL_FIBER_NETWORK_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: OPTICAL_FIBER_NETWORK_LIST },
    {
        path: OPTICAL_FIBER_NETWORK_LIST,
        loadComponent: () =>
            import('./optical-fiber-network-list.component').then(
                (m) => m.OpticalFiberNetworkListComponent
            ),
    },
    {
        path: OPTICAL_FIBER_NETWORK_FORM,
        loadComponent: () =>
            import('./optical-fiber-network-form.component').then(
                (m) => m.OpticalFiberNetworkFormComponent
            ),
    },
];

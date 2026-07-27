import { Routes } from '@angular/router';
import {
    MOBILE_NETWORK_FORM,
    MOBILE_NETWORK_LIST,
} from '../constants/mobile-network-paths.constant';

/**
 * Routes du feature `mobile-network` (lazy). Le wiring DI port→impl est
 * fourni au niveau app via `provideCoverageAreas()`. Pas de route
 * « historique » — décision constante depuis `site-group`.
 */
export const MOBILE_NETWORK_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: MOBILE_NETWORK_LIST },
    {
        path: MOBILE_NETWORK_LIST,
        loadComponent: () =>
            import('./mobile-network-list.component').then(
                (m) => m.MobileNetworkListComponent
            ),
    },
    {
        path: MOBILE_NETWORK_FORM,
        loadComponent: () =>
            import('./mobile-network-form.component').then(
                (m) => m.MobileNetworkFormComponent
            ),
    },
];

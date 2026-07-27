import { Routes } from '@angular/router';
import {
    RADIO_RELAY_LINKS_FORM,
    RADIO_RELAY_LINKS_LIST,
} from '../constants/radio-relay-links-paths.constant';

/**
 * Routes du feature `radio-relay-links` (lazy). Le wiring DI port→impl est
 * fourni au niveau app via `provideCoverageAreas()`.
 */
export const RADIO_RELAY_LINKS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: RADIO_RELAY_LINKS_LIST },
    {
        path: RADIO_RELAY_LINKS_LIST,
        loadComponent: () =>
            import('./radio-relay-links-list.component').then(
                (m) => m.RadioRelayLinksListComponent
            ),
    },
    {
        path: RADIO_RELAY_LINKS_FORM,
        loadComponent: () =>
            import('./radio-relay-links-form.component').then(
                (m) => m.RadioRelayLinksFormComponent
            ),
    },
];

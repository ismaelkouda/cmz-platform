import { Routes } from '@angular/router';
import {
    SITE_GROUP_FORM,
    SITE_GROUP_LIST,
} from '../constants/site-group-paths.constant';

/**
 * Routes du feature `site-group` (lazy). Le wiring DI port→impl est fourni au
 * niveau app via `provideCoverageAreas()`. Pas de route « historique » —
 * décision documentée (`module-coverage-areas.md`).
 */
export const SITE_GROUP_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: SITE_GROUP_LIST },
    {
        path: SITE_GROUP_LIST,
        loadComponent: () =>
            import('./site-group-list.component').then(
                (m) => m.SiteGroupListComponent
            ),
    },
    {
        path: SITE_GROUP_FORM,
        loadComponent: () =>
            import('./site-group-form.component').then(
                (m) => m.SiteGroupFormComponent
            ),
    },
];

import { Routes } from '@angular/router';
import {
    PROFILES_PERMISSIONS_FORM,
    PROFILES_PERMISSIONS_LIST,
} from '../constants/profiles-permissions-paths.constant';

export const PROFILES_PERMISSIONS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: PROFILES_PERMISSIONS_LIST },
    {
        path: PROFILES_PERMISSIONS_LIST,
        loadComponent: () =>
            import('./profiles-permissions-list.component').then(
                (m) => m.ProfilesPermissionsListComponent
            ),
    },
    {
        path: PROFILES_PERMISSIONS_FORM,
        loadComponent: () =>
            import('./profiles-permissions-form.component').then(
                (m) => m.ProfilesPermissionsFormComponent
            ),
    },
];

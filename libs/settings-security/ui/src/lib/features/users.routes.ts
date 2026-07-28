import { Routes } from '@angular/router';
import { USERS_FORM, USERS_LIST } from '../constants/users-paths.constant';

export const USERS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: USERS_LIST },
    {
        path: USERS_LIST,
        loadComponent: () =>
            import('./users-list.component').then((m) => m.UsersListComponent),
    },
    {
        path: USERS_FORM,
        loadComponent: () =>
            import('./users-form.component').then((m) => m.UsersFormComponent),
    },
];

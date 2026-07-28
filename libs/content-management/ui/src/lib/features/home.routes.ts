import { Routes } from '@angular/router';
import { HOME_FORM, HOME_LIST } from '../constants/home-paths.constant';

export const HOME_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: HOME_LIST },
    {
        path: HOME_LIST,
        loadComponent: () =>
            import('./home-list.component').then((m) => m.HomeListComponent),
    },
    {
        path: HOME_FORM,
        loadComponent: () =>
            import('./home-form.component').then((m) => m.HomeFormComponent),
    },
];

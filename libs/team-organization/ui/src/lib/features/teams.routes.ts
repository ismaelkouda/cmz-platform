import { Routes } from '@angular/router';
import { TEAMS_FORM, TEAMS_LIST } from '../constants/teams-paths.constant';

export const TEAMS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: TEAMS_LIST },
    {
        path: TEAMS_LIST,
        loadComponent: () =>
            import('./teams-list.component').then((m) => m.TeamsListComponent),
    },
    {
        path: TEAMS_FORM,
        loadComponent: () =>
            import('./teams-form.component').then((m) => m.TeamsFormComponent),
    },
];

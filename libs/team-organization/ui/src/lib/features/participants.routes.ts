import { Routes } from '@angular/router';
import {
    PARTICIPANTS_FORM,
    PARTICIPANTS_LIST,
} from '../constants/participants-paths.constant';

export const PARTICIPANTS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: PARTICIPANTS_LIST },
    {
        path: PARTICIPANTS_LIST,
        loadComponent: () =>
            import('./participants-list.component').then(
                (m) => m.ParticipantsListComponent
            ),
    },
    {
        path: PARTICIPANTS_FORM,
        loadComponent: () =>
            import('./participants-form.component').then(
                (m) => m.ParticipantsFormComponent
            ),
    },
];

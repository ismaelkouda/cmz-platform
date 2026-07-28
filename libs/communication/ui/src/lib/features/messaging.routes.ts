import { Routes } from '@angular/router';
import {
    MESSAGING_FORM,
    MESSAGING_LIST,
} from '../constants/messaging-paths.constant';

export const MESSAGING_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: MESSAGING_LIST },
    {
        path: MESSAGING_LIST,
        loadComponent: () =>
            import('./messaging-list.component').then(
                (m) => m.MessagingListComponent
            ),
    },
    {
        path: MESSAGING_FORM,
        loadComponent: () =>
            import('./messaging-form.component').then(
                (m) => m.MessagingFormComponent
            ),
    },
];

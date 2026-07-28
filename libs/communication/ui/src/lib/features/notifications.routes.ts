import { Routes } from '@angular/router';
import { NOTIFICATIONS_LIST } from '../constants/notifications-paths.constant';

export const NOTIFICATIONS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: NOTIFICATIONS_LIST },
    {
        path: NOTIFICATIONS_LIST,
        loadComponent: () =>
            import('./notifications-list.component').then(
                (m) => m.NotificationsListComponent
            ),
    },
];

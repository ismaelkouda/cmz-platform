import { Routes } from '@angular/router';
import { ACCESS_LOGS_LIST } from '../constants/access-logs-paths.constant';

/** Pas de route `form` : journal en lecture seule. */
export const ACCESS_LOGS_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: ACCESS_LOGS_LIST },
    {
        path: ACCESS_LOGS_LIST,
        loadComponent: () =>
            import('./access-logs-list.component').then(
                (m) => m.AccessLogsListComponent
            ),
    },
];

import { Routes } from '@angular/router';
import {
    AGENTS_PERFORMANCES_HISTORY,
    AGENTS_PERFORMANCES_LIST,
} from '../constants/agents-performances-paths.constant';

export const AGENTS_PERFORMANCES_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: AGENTS_PERFORMANCES_LIST },
    {
        path: AGENTS_PERFORMANCES_LIST,
        loadComponent: () =>
            import('./agents-performances-list.component').then(
                (m) => m.AgentsPerformancesListComponent
            ),
    },
    {
        path: AGENTS_PERFORMANCES_HISTORY,
        loadComponent: () =>
            import('./agents-performances-history-list.component').then(
                (m) => m.AgentsPerformancesHistoryListComponent
            ),
    },
];

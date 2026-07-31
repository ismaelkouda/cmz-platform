import { Routes } from '@angular/router';

export const FINALIZATION_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'queues',
        pathMatch: 'full',
    },
    {
        path: 'queues',
        loadComponent: () =>
            import('./queues-finalization-page.component').then(
                (m) => m.QueuesFinalizationPageComponent
            ),
        data: { breadcrumb: 'FINALIZATION.QUEUES.BREADCRUMB.LABEL' },
    },
    {
        path: 'tasks',
        loadComponent: () =>
            import('./tasks-finalization-page.component').then(
                (m) => m.TasksFinalizationPageComponent
            ),
        data: { breadcrumb: 'FINALIZATION.TASKS.BREADCRUMB.LABEL' },
    },
    {
        path: 'all',
        loadComponent: () =>
            import('./all-finalization-page.component').then(
                (m) => m.AllFinalizationPageComponent
            ),
        data: { breadcrumb: 'FINALIZATION.ALL.BREADCRUMB.LABEL' },
    },
];

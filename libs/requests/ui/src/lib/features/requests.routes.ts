import { Routes } from '@angular/router';

export const REQUESTS_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'queues',
        pathMatch: 'full',
    },
    {
        path: 'queues',
        loadComponent: () =>
            import('./queues-requests-page.component').then(
                (m) => m.QueuesRequestsPageComponent
            ),
        data: { breadcrumb: 'REQUESTS.QUEUES.BREADCRUMB.LABEL' },
    },
    {
        path: 'tasks',
        loadComponent: () =>
            import('./tasks-requests-page.component').then(
                (m) => m.TasksRequestsPageComponent
            ),
        data: { breadcrumb: 'REQUESTS.TASKS.BREADCRUMB.LABEL' },
    },
    {
        path: 'all',
        loadComponent: () =>
            import('./all-requests-page.component').then(
                (m) => m.AllRequestsPageComponent
            ),
        data: { breadcrumb: 'REQUESTS.ALL.BREADCRUMB.LABEL' },
    },
];

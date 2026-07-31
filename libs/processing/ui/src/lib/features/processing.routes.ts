import { Routes } from '@angular/router';

/**
 * Routes du module `processing`.
 * Fichiers de page : `{volet}-processing-page.component.ts` — évite la
 * collision avec les volets homonymes des modules `requests` / `finalization`.
 */
export const PROCESSING_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'queues',
        pathMatch: 'full',
    },
    {
        path: 'queues',
        loadComponent: () =>
            import('./queues-processing-page.component').then(
                (m) => m.QueuesProcessingPageComponent
            ),
        data: { breadcrumb: 'PROCESSING.QUEUES.BREADCRUMB.LABEL' },
    },
    {
        path: 'tasks',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./tasks-processing-page.component').then(
                        (m) => m.TasksProcessingPageComponent
                    ),
                data: { breadcrumb: 'PROCESSING.TASKS.BREADCRUMB.LABEL' },
            },
            {
                path: 'actions',
                loadComponent: () =>
                    import('./tasks-actions-processing-page.component').then(
                        (m) => m.TasksActionsProcessingPageComponent
                    ),
                data: {
                    breadcrumb: 'PROCESSING.TASKS.ACTIONS.BREADCRUMB.LABEL',
                },
            },
        ],
    },
    {
        path: 'all',
        loadComponent: () =>
            import('./all-processing-page.component').then(
                (m) => m.AllProcessingPageComponent
            ),
        data: { breadcrumb: 'PROCESSING.ALL.BREADCRUMB.LABEL' },
    },
];

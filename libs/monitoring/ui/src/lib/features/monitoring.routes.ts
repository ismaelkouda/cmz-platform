import { Routes } from '@angular/router';

export const NODE_ROUTE = 'processing-status';
export const SERVICES_ROUTE = 'services-states';
export const RESOURCES_ROUTE = 'resources-states';
export const JOBS_ROUTE = 'jobs';

export const MONITORING_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: NODE_ROUTE },
    {
        path: NODE_ROUTE,
        data: { breadcrumb: 'MONITORING.NODE.BREADCRUMB' },
        loadComponent: () =>
            import('./node-page.component').then((m) => m.NodePageComponent),
    },
    {
        path: SERVICES_ROUTE,
        data: { breadcrumb: 'MONITORING.SERVICES.BREADCRUMB' },
        loadComponent: () =>
            import('./services-page.component').then(
                (m) => m.ServicesPageComponent
            ),
    },
    {
        path: RESOURCES_ROUTE,
        data: { breadcrumb: 'MONITORING.RESOURCES.BREADCRUMB' },
        loadComponent: () =>
            import('./resources-page.component').then(
                (m) => m.ResourcesPageComponent
            ),
    },
    {
        path: JOBS_ROUTE,
        data: { breadcrumb: 'MONITORING.JOBS.BREADCRUMB' },
        loadComponent: () =>
            import('./jobs-page.component').then((m) => m.JobsPageComponent),
    },
    { path: '**', redirectTo: NODE_ROUTE },
];

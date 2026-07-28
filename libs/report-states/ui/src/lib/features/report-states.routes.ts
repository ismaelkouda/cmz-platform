import { Routes } from '@angular/router';

export const APPROVE_ROUTE = 'approved';
export const EVALUATE_ROUTE = 'evaluated';
export const CLOSE_ROUTE = 'closed';
export const REJECT_ROUTE = 'rejected';
export const DOWNLOAD_ROUTE = 'downloads';

export const REPORT_STATES_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: APPROVE_ROUTE },
    {
        path: APPROVE_ROUTE,
        data: { breadcrumb: 'REPORT_STATES.APPROVE.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./approve-page.component').then(
                (m) => m.ApprovePageComponent
            ),
    },
    {
        path: EVALUATE_ROUTE,
        data: { breadcrumb: 'REPORT_STATES.EVALUATE.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./evaluate-page.component').then(
                (m) => m.EvaluatePageComponent
            ),
    },
    {
        path: CLOSE_ROUTE,
        data: { breadcrumb: 'REPORT_STATES.CLOSE.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./close-page.component').then((m) => m.ClosePageComponent),
    },
    {
        path: REJECT_ROUTE,
        data: { breadcrumb: 'REPORT_STATES.REJECT.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./reject-page.component').then(
                (m) => m.RejectPageComponent
            ),
    },
    {
        path: DOWNLOAD_ROUTE,
        data: { breadcrumb: 'REPORT_STATES.DOWNLOAD.BREADCRUMB.LABEL' },
        loadComponent: () =>
            import('./download-page.component').then(
                (m) => m.DownloadPageComponent
            ),
    },
    { path: '**', redirectTo: APPROVE_ROUTE },
];

import { Routes } from '@angular/router';

export const REPORT_ROUTE = 'reports';
export const REQUESTS_ROUTE = 'requests';
export const REPORT_BY_CHANNEL_ROUTE = 'report-by-channel';
export const REPORT_BY_OPERATOR_ROUTE = 'report-by-operator';

export const REPORTING_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: REPORT_ROUTE },
    {
        path: REPORT_ROUTE,
        data: { breadcrumb: 'REPORTING.REPORT.BREADCRUMB' },
        loadComponent: () =>
            import('./report-page.component').then(
                (m) => m.ReportPageComponent
            ),
    },
    {
        path: REQUESTS_ROUTE,
        data: { breadcrumb: 'REPORTING.REQUESTS.BREADCRUMB' },
        loadComponent: () =>
            import('./requests-page.component').then(
                (m) => m.RequestsPageComponent
            ),
    },
    {
        path: REPORT_BY_CHANNEL_ROUTE,
        data: { breadcrumb: 'REPORTING.REPORT_BY_CHANNEL.BREADCRUMB' },
        loadComponent: () =>
            import('./report-by-channel-page.component').then(
                (m) => m.ReportByChannelPageComponent
            ),
    },
    {
        path: REPORT_BY_OPERATOR_ROUTE,
        data: { breadcrumb: 'REPORTING.REPORT_BY_OPERATOR.BREADCRUMB' },
        loadComponent: () =>
            import('./report-by-operator-page.component').then(
                (m) => m.ReportByOperatorPageComponent
            ),
    },
    { path: '**', redirectTo: REPORT_ROUTE },
];

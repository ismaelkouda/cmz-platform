import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'equipments/types' },
    {
        path: 'equipments/types',
        loadChildren: () =>
            import('@cmz/administrative-infrastructure-ui').then(
                (m) => m.INFRASTRUCTURE_TYPE_ROUTES
            ),
    },
    {
        path: 'equipments/list',
        loadChildren: () =>
            import('@cmz/administrative-infrastructure-ui').then(
                (m) => m.INFRASTRUCTURE_ROUTES
            ),
    },
];

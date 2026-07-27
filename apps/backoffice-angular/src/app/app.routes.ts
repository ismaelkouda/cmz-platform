import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'equipments/types' },
    {
        path: 'auth',
        loadChildren: () =>
            import('@cmz/authentication-ui').then(
                (m) => m.AUTHENTICATION_ROUTES
            ),
    },
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
    {
        path: 'territorial-structures/regions',
        loadChildren: () =>
            import('@cmz/administrative-boundary-ui').then((m) => [
                ...m.REGION_ROUTES,
                {
                    path: 'departments',
                    data: {
                        breadcrumb:
                            'ADMINISTRATIVE_BOUNDARY.DEPARTMENTS_BY_REGION_ID.BREADCRUMB',
                    },
                    children: m.DEPARTMENTS_BY_REGION_ID_ROUTES,
                },
            ]),
    },
    {
        path: 'territorial-structures/departments',
        loadChildren: () =>
            import('@cmz/administrative-boundary-ui').then((m) => [
                ...m.DEPARTMENT_ROUTES,
                {
                    path: 'municipalities',
                    data: {
                        breadcrumb:
                            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITIES_BY_DEPARTMENT_ID.BREADCRUMB',
                    },
                    children: m.MUNICIPALITIES_BY_DEPARTMENT_ID_ROUTES,
                },
            ]),
    },
    {
        path: 'territorial-structures/municipalities',
        loadChildren: () =>
            import('@cmz/administrative-boundary-ui').then(
                (m) => m.MUNICIPALITY_ROUTES
            ),
    },
    {
        path: 'coverage-areas/site-groups',
        loadChildren: () =>
            import('@cmz/coverage-areas-ui').then((m) => m.SITE_GROUP_ROUTES),
    },
    {
        path: 'coverage-areas/mobile-networks',
        loadChildren: () =>
            import('@cmz/coverage-areas-ui').then(
                (m) => m.MOBILE_NETWORK_ROUTES
            ),
    },
];

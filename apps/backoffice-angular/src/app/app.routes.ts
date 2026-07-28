import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    // Redirige vers `dashboard` maintenant que le module existe — c'était
    // `equipments/types` par défaut faute d'accueil reconstruit ; un
    // tableau de bord est le point d'entrée naturel d'un back-office.
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    {
        path: 'dashboard',
        loadChildren: () =>
            import('@cmz/dashboard-ui').then((m) => m.DASHBOARD_ROUTES),
    },
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
    {
        path: 'coverage-areas/optical-fiber-networks',
        loadChildren: () =>
            import('@cmz/coverage-areas-ui').then(
                (m) => m.OPTICAL_FIBER_NETWORK_ROUTES
            ),
    },
    {
        path: 'coverage-areas/radio-relay-links',
        loadChildren: () =>
            import('@cmz/coverage-areas-ui').then(
                (m) => m.RADIO_RELAY_LINKS_ROUTES
            ),
    },
    {
        path: 'team-organization/participants',
        loadChildren: () =>
            import('@cmz/team-organization-ui').then(
                (m) => m.PARTICIPANTS_ROUTES
            ),
    },
    {
        path: 'team-organization/teams',
        loadChildren: () =>
            import('@cmz/team-organization-ui').then((m) => m.TEAMS_ROUTES),
    },
    {
        path: 'content-management/home',
        loadChildren: () =>
            import('@cmz/content-management-ui').then((m) => m.HOME_ROUTES),
    },
    {
        path: 'content-management/slide',
        loadChildren: () =>
            import('@cmz/content-management-ui').then((m) => m.SLIDE_ROUTES),
    },
    {
        path: 'content-management/news',
        loadChildren: () =>
            import('@cmz/content-management-ui').then((m) => m.NEWS_ROUTES),
    },
    {
        path: 'content-management/legal-notice',
        loadChildren: () =>
            import('@cmz/content-management-ui').then(
                (m) => m.LEGAL_NOTICE_ROUTES
            ),
    },
    {
        path: 'content-management/privacy-policy',
        loadChildren: () =>
            import('@cmz/content-management-ui').then(
                (m) => m.PRIVACY_POLICY_ROUTES
            ),
    },
    {
        path: 'content-management/terms-use',
        loadChildren: () =>
            import('@cmz/content-management-ui').then(
                (m) => m.TERMS_USE_ROUTES
            ),
    },
    {
        path: 'settings-security/users',
        loadChildren: () =>
            import('@cmz/settings-security-ui').then((m) => m.USERS_ROUTES),
    },
    {
        path: 'settings-security/profiles-permissions',
        loadChildren: () =>
            import('@cmz/settings-security-ui').then(
                (m) => m.PROFILES_PERMISSIONS_ROUTES
            ),
    },
    {
        path: 'settings-security/access-logs',
        loadChildren: () =>
            import('@cmz/settings-security-ui').then(
                (m) => m.ACCESS_LOGS_ROUTES
            ),
    },
    {
        path: 'communication/messaging',
        loadChildren: () =>
            import('@cmz/communication-ui').then((m) => m.MESSAGING_ROUTES),
    },
    {
        path: 'communication/notifications',
        loadChildren: () =>
            import('@cmz/communication-ui').then((m) => m.NOTIFICATIONS_ROUTES),
    },
];

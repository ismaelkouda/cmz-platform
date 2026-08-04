import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { pathsGuard } from './guards/paths.guard';

export const appRoutes: Route[] = [
    // Hors périmètre protégé : login/forgot/reset — accessible sans session
    // (c'est justement leur rôle). `authInterceptor` marque leurs appels
    // `SKIP_AUTH` côté HTTP (cf. authentication/data/src/lib/sources/*.api.ts).
    {
        path: 'auth',
        loadChildren: () =>
            import('@cmz/authentication-ui').then(
                (m) => m.AUTHENTICATION_ROUTES
            ),
    },
    {
        // Périmètre protégé — un seul point d'application de `authGuard`
        // pour tous les modules ci-dessous (chantier I-5/I-6, audit
        // 2026-08-02 addendum) : Angular évalue `canActivate` du parent
        // avant de résoudre n'importe lequel de ses enfants. Les 4 routes
        // `workflow-action` gardent en plus `pathsGuard` (page listée dans
        // `CurrentUser.paths`) — les deux gardes se combinent, ils ne se
        // remplacent pas : `authGuard` répond « qui es-tu ? », `pathsGuard`
        // répond « cette page t'est-elle accordée ? ». Remplace l'ancien
        // `permissionGuard(module, 'VIEW')` — 'VIEW' n'existait dans aucun
        // vocabulaire d'action réel, voir `guards/paths.guard.ts` (I-7,
        // audit-workspace-2026-08-02-revue-finale.md, débloqué 2026-08-03).
        path: '',
        canActivate: [authGuard],
        children: [
            // Redirige vers `dashboard` maintenant que le module existe —
            // c'était `equipments/types` par défaut faute d'accueil
            // reconstruit ; un tableau de bord est le point d'entrée
            // naturel d'un back-office.
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                loadChildren: () =>
                    import('@cmz/dashboard-ui').then(
                        (m) => m.DASHBOARD_ROUTES
                    ),
            },
            {
                path: 'monitoring',
                loadChildren: () =>
                    import('@cmz/monitoring-ui').then(
                        (m) => m.MONITORING_ROUTES
                    ),
            },
            {
                path: 'reporting',
                loadChildren: () =>
                    import('@cmz/reporting-ui').then(
                        (m) => m.REPORTING_ROUTES
                    ),
            },
            {
                path: 'interactive-map',
                loadChildren: () =>
                    import('@cmz/interactive-map-ui').then(
                        (m) => m.INTERACTIVE_MAP_ROUTES
                    ),
            },
            {
                path: 'report-states',
                // canActivate sur le segment parent : toutes les sous-routes
                // héritent de l'accès à la page 'report-states'. Les actions
                // granulaires (APPROVE, REJECT, EVALUATE, CLOSE) restent
                // vérifiées dans les composants via
                // PermissionActionsService.can() directement — inchangé.
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('@cmz/report-states-ui').then(
                        (m) => m.REPORT_STATES_ROUTES
                    ),
            },
            {
                path: 'processing',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('@cmz/processing-ui').then(
                        (m) => m.PROCESSING_ROUTES
                    ),
            },
            {
                path: 'requests',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('@cmz/requests-ui').then((m) => m.REQUESTS_ROUTES),
            },
            {
                path: 'finalization',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('@cmz/finalization-ui').then(
                        (m) => m.FINALIZATION_ROUTES
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
                    import('@cmz/coverage-areas-ui').then(
                        (m) => m.SITE_GROUP_ROUTES
                    ),
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
                    import('@cmz/team-organization-ui').then(
                        (m) => m.TEAMS_ROUTES
                    ),
            },
            {
                path: 'content-management/home',
                loadChildren: () =>
                    import('@cmz/content-management-ui').then(
                        (m) => m.HOME_ROUTES
                    ),
            },
            {
                path: 'content-management/slide',
                loadChildren: () =>
                    import('@cmz/content-management-ui').then(
                        (m) => m.SLIDE_ROUTES
                    ),
            },
            {
                path: 'content-management/news',
                loadChildren: () =>
                    import('@cmz/content-management-ui').then(
                        (m) => m.NEWS_ROUTES
                    ),
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
                    import('@cmz/settings-security-ui').then(
                        (m) => m.USERS_ROUTES
                    ),
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
                    import('@cmz/communication-ui').then(
                        (m) => m.MESSAGING_ROUTES
                    ),
            },
            {
                path: 'communication/notifications',
                loadChildren: () =>
                    import('@cmz/communication-ui').then(
                        (m) => m.NOTIFICATIONS_ROUTES
                    ),
            },
        ],
    },
];

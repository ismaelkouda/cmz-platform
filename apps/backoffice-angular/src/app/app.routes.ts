import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { pathsGuard } from './guards/paths.guard';

export const appRoutes: Route[] = [
    // Hors périmètre protégé : login/forgot/reset — accessible sans session
    // (c'est justement leur rôle). `authInterceptor` marque leurs appels
    // `SKIP_AUTH` côté HTTP (cf. authentication/data/src/lib/sources/*.api.ts).
    {
        // Un seul niveau de `loadChildren` (pas de `loadChildren` imbriqué
        // dans le `.then()` d'un autre `loadChildren`, cf. historique
        // d'edge-cases du Router sur ce pattern précis —
        // github.com/angular/angular/issues/54518) : les deux imports
        // dynamiques (`providers/authentication.providers` et
        // `@cmz/authentication-ui`) sont résolus en parallèle par
        // `Promise.all`, puis combinés en un seul `Route[]` synthétique où
        // `providers` et les 3 routes réelles (`AUTHENTICATION_ROUTES`)
        // sont au même niveau `children` — pas de second `loadChildren`
        // intermédiaire.
        path: 'auth',
        loadChildren: () =>
            Promise.all([
                import('./providers/authentication.providers'),
                import('@cmz/authentication-ui'),
            ]).then(([providersModule, routesModule]) => [
                {
                    path: '',
                    providers: providersModule.provideAuthentication(),
                    children: routesModule.AUTHENTICATION_ROUTES,
                },
            ]),
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
                    Promise.all([
                        import('./providers/dashboard.providers'),
                        import('@cmz/dashboard-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers: providersModule.provideDashboard(),
                            children: routesModule.DASHBOARD_ROUTES,
                        },
                    ]),
            },
            {
                path: 'monitoring',
                loadChildren: () =>
                    Promise.all([
                        import('./providers/monitoring.providers'),
                        import('@cmz/monitoring-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers: providersModule.provideMonitoring(),
                            children: routesModule.MONITORING_ROUTES,
                        },
                    ]),
            },
            {
                path: 'reporting',
                loadChildren: () =>
                    Promise.all([
                        import('./providers/reporting.providers'),
                        import('@cmz/reporting-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers: providersModule.provideReporting(),
                            children: routesModule.REPORTING_ROUTES,
                        },
                    ]),
            },
            {
                path: 'interactive-map',
                loadChildren: () =>
                    Promise.all([
                        import('./providers/interactive-map.providers'),
                        import('@cmz/interactive-map-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideInteractiveMap(),
                            children: routesModule.INTERACTIVE_MAP_ROUTES,
                        },
                    ]),
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
                    Promise.all([
                        import('./providers/report-states.providers'),
                        import('@cmz/report-states-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideReportStates(),
                            children: routesModule.REPORT_STATES_ROUTES,
                        },
                    ]),
            },
            {
                path: 'processing',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/processing.providers'),
                        import('@cmz/processing-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers: providersModule.provideProcessing(),
                            children: routesModule.PROCESSING_ROUTES,
                        },
                    ]),
            },
            {
                path: 'requests',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/requests.providers'),
                        import('@cmz/requests-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers: providersModule.provideRequests(),
                            children: routesModule.REQUESTS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'finalization',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/finalization.providers'),
                        import('@cmz/finalization-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideFinalization(),
                            children: routesModule.FINALIZATION_ROUTES,
                        },
                    ]),
            },
            {
                path: 'equipments/types',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import(
                            './providers/administrative-infrastructure.providers'
                        ),
                        import('@cmz/administrative-infrastructure-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideAdministrativeInfrastructure(),
                            children: routesModule.INFRASTRUCTURE_TYPE_ROUTES,
                        },
                    ]),
            },
            {
                path: 'equipments/list',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import(
                            './providers/administrative-infrastructure.providers'
                        ),
                        import('@cmz/administrative-infrastructure-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideAdministrativeInfrastructure(),
                            children: routesModule.INFRASTRUCTURE_ROUTES,
                        },
                    ]),
            },
            {
                path: 'territorial-structures/regions',
                canActivate: [pathsGuard],
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
                canActivate: [pathsGuard],
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
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('@cmz/administrative-boundary-ui').then(
                        (m) => m.MUNICIPALITY_ROUTES
                    ),
            },
            {
                path: 'coverage-areas/site-groups',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/coverage-areas.providers'),
                        import('@cmz/coverage-areas-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCoverageAreas(),
                            children: routesModule.SITE_GROUP_ROUTES,
                        },
                    ]),
            },
            {
                path: 'coverage-areas/mobile-networks',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/coverage-areas.providers'),
                        import('@cmz/coverage-areas-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCoverageAreas(),
                            children: routesModule.MOBILE_NETWORK_ROUTES,
                        },
                    ]),
            },
            {
                path: 'coverage-areas/optical-fiber-networks',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/coverage-areas.providers'),
                        import('@cmz/coverage-areas-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCoverageAreas(),
                            children:
                                routesModule.OPTICAL_FIBER_NETWORK_ROUTES,
                        },
                    ]),
            },
            {
                path: 'coverage-areas/radio-relay-links',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/coverage-areas.providers'),
                        import('@cmz/coverage-areas-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCoverageAreas(),
                            children: routesModule.RADIO_RELAY_LINKS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'team-organization/participants',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/team-organization.providers'),
                        import('@cmz/team-organization-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideTeamOrganization(),
                            children: routesModule.PARTICIPANTS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'team-organization/teams',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/team-organization.providers'),
                        import('@cmz/team-organization-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideTeamOrganization(),
                            children: routesModule.TEAMS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'team-organization/agents-performances',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/team-organization.providers'),
                        import('@cmz/team-organization-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideTeamOrganization(),
                            children:
                                routesModule.AGENTS_PERFORMANCES_ROUTES,
                        },
                    ]),
            },
            {
                path: 'team-organization/daily-goal',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/team-organization.providers'),
                        import('@cmz/team-organization-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideTeamOrganization(),
                            children: routesModule.DAILY_GOAL_ROUTES,
                        },
                    ]),
            },
            // POC réduction bundle initial (2026-08-21, voir taches-restantes.md) :
            // provideContentManagement() (13 repositories @cmz/content-management-data,
            // 44.7 kB — le plus gros contributeur de code métier au chunk initial
            // mesuré par source-map-explorer) était fourni statiquement dans
            // app.config.ts, donc chargé au démarrage même si aucune page
            // content-management n'est jamais visitée. `loadChildren` retourne
            // maintenant un unique Route synthétique portant `providers` (résolus
            // dans le même chunk paresseux que le module importé) et les 6 routes
            // réelles en `children` — Angular Router applique les providers d'une
            // route avant de résoudre ses enfants, y compris quand cette route
            // elle-même provient d'un `loadChildren`. Le fichier
            // `providers/content-management.providers.ts` reste inchangé : il
            // n'est plus importé statiquement en haut de ce fichier, seulement
            // depuis l'intérieur de cette factory paresseuse.
            {
                path: 'content-management',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    import('./providers/content-management.providers').then(
                        (providersModule) => [
                            {
                                path: '',
                                providers:
                                    providersModule.provideContentManagement(),
                                children: [
                                    {
                                        path: 'home',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.HOME_ROUTES
                                            ),
                                    },
                                    {
                                        path: 'slide',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.SLIDE_ROUTES
                                            ),
                                    },
                                    {
                                        path: 'news',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.NEWS_ROUTES
                                            ),
                                    },
                                    {
                                        path: 'legal-notice',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.LEGAL_NOTICE_ROUTES
                                            ),
                                    },
                                    {
                                        path: 'privacy-policy',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.PRIVACY_POLICY_ROUTES
                                            ),
                                    },
                                    {
                                        path: 'terms-use',
                                        loadChildren: () =>
                                            import('@cmz/content-management-ui').then(
                                                (m) => m.TERMS_USE_ROUTES
                                            ),
                                    },
                                ],
                            },
                        ]
                    ),
            },
            {
                path: 'settings-security/users',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/settings-security.providers'),
                        import('@cmz/settings-security-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideSettingsSecurity(),
                            children: routesModule.USERS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'settings-security/profiles-permissions',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/settings-security.providers'),
                        import('@cmz/settings-security-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideSettingsSecurity(),
                            children:
                                routesModule.PROFILES_PERMISSIONS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'settings-security/access-logs',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/settings-security.providers'),
                        import('@cmz/settings-security-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideSettingsSecurity(),
                            children: routesModule.ACCESS_LOGS_ROUTES,
                        },
                    ]),
            },
            {
                path: 'communication/messaging',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/communication.providers'),
                        import('@cmz/communication-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCommunication(),
                            children: routesModule.MESSAGING_ROUTES,
                        },
                    ]),
            },
            {
                path: 'communication/notifications',
                canActivate: [pathsGuard],
                loadChildren: () =>
                    Promise.all([
                        import('./providers/communication.providers'),
                        import('@cmz/communication-ui'),
                    ]).then(([providersModule, routesModule]) => [
                        {
                            path: '',
                            providers:
                                providersModule.provideCommunication(),
                            children: routesModule.NOTIFICATIONS_ROUTES,
                        },
                    ]),
            },
        ],
    },
];

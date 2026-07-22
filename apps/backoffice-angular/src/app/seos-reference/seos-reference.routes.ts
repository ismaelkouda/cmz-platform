import { Routes } from '@angular/router';
import { RESOURCES_ROUTE } from '@pages/seos-reference/presentation/features/resources/resources-paths.constants';

export const routes: Routes = [
    {
        path: RESOURCES_ROUTE,
        data: {
            breadcrumb: {
                label: 'SEOS_REFERENCE.RESOURCES.BREADCRUMB.LABEL',
                icon: 'SEOS_REFERENCE.RESOURCES.BREADCRUMB.ICON',
            },
        },
        children: [
            {
                path: '',
                loadChildren: () =>
                    import('@pages/seos-reference/presentation/features/resources/resources.routes').then(
                        (m) => m.RESOURCES_ROUTES
                    ),
                data: { breadcrumb: { hide: true } },
            },
            {
                path: '**',
                redirectTo: '',
            },
        ],
    },
];

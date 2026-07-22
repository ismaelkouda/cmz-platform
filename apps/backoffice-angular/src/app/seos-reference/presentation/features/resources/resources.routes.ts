import { Routes } from '@angular/router';
import {
    RESOURCES_FORM,
    RESOURCES_LIST,
} from '@pages/seos-reference/presentation/features/resources/resources-paths.constants';

export const RESOURCES_ROUTES: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: RESOURCES_LIST,
    },
    {
        path: RESOURCES_LIST,
        loadComponent: () =>
            import('@pages/seos-reference/presentation/features/resources/resources-list/resources-list.component').then(
                (m) => m.ResourcesListComponent
            ),
    },
    {
        path: RESOURCES_FORM,
        loadComponent: () =>
            import('@pages/seos-reference/presentation/features/resources/resources-form/resources-form.component').then(
                (m) => m.ResourcesFormComponent
            ),
    },
];

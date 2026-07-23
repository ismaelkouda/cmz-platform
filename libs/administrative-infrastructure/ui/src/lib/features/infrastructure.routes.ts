import { Routes } from '@angular/router';
import {
    InfrastructureFindOneRepository,
    InfrastructureRepository,
    InfrastructureSelectRepository,
    InfrastructureTypeSelectRepository,
} from '@cmz/administrative-infrastructure-domain';
import {
    InfrastructureFindOneRepositoryImpl,
    InfrastructureRepositoryImpl,
    InfrastructureSelectRepositoryImpl,
    InfrastructureTypeSelectRepositoryImpl,
} from '@cmz/administrative-infrastructure-data';
import {
    INFRASTRUCTURE_FORM,
    INFRASTRUCTURE_LIST,
} from '../constants/infrastructure-paths.constant';

/**
 * Routes du feature `infrastructure` + composition root. Wire les ports (dont
 * `InfrastructureTypeSelectRepository`, requis par le select de types du
 * formulaire/filtre) à leurs impls `data`.
 */
export const INFRASTRUCTURE_ROUTES: Routes = [
    {
        path: '',
        providers: [
            {
                provide: InfrastructureRepository,
                useClass: InfrastructureRepositoryImpl,
            },
            {
                provide: InfrastructureFindOneRepository,
                useClass: InfrastructureFindOneRepositoryImpl,
            },
            {
                provide: InfrastructureSelectRepository,
                useClass: InfrastructureSelectRepositoryImpl,
            },
            {
                provide: InfrastructureTypeSelectRepository,
                useClass: InfrastructureTypeSelectRepositoryImpl,
            },
        ],
        children: [
            { path: '', pathMatch: 'full', redirectTo: INFRASTRUCTURE_LIST },
            {
                path: INFRASTRUCTURE_LIST,
                loadComponent: () =>
                    import('./infrastructure-list.component').then(
                        (m) => m.InfrastructureListComponent
                    ),
            },
            {
                path: INFRASTRUCTURE_FORM,
                loadComponent: () =>
                    import('./infrastructure-form.component').then(
                        (m) => m.InfrastructureFormComponent
                    ),
            },
        ],
    },
];

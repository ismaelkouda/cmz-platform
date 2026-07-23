import { Routes } from '@angular/router';
import {
    InfrastructureTypeFindOneRepository,
    InfrastructureTypeRepository,
    InfrastructureTypeSelectRepository,
} from '@cmz/administrative-infrastructure-domain';
import {
    InfrastructureTypeFindOneRepositoryImpl,
    InfrastructureTypeRepositoryImpl,
    InfrastructureTypeSelectRepositoryImpl,
} from '@cmz/administrative-infrastructure-data';
import {
    INFRASTRUCTURE_TYPE_FORM,
    INFRASTRUCTURE_TYPE_LIST,
} from '../constants/infrastructure-type-paths.constant';

/**
 * Routes du feature `infrastructure-type` + **composition root** : wire les
 * ports domaine à leurs implémentations `data` (les use-cases/mappers/apis sont
 * déjà `@Service()` root). Composants chargés en lazy (`loadComponent`).
 */
export const INFRASTRUCTURE_TYPE_ROUTES: Routes = [
    {
        path: '',
        providers: [
            {
                provide: InfrastructureTypeRepository,
                useClass: InfrastructureTypeRepositoryImpl,
            },
            {
                provide: InfrastructureTypeFindOneRepository,
                useClass: InfrastructureTypeFindOneRepositoryImpl,
            },
            {
                provide: InfrastructureTypeSelectRepository,
                useClass: InfrastructureTypeSelectRepositoryImpl,
            },
        ],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: INFRASTRUCTURE_TYPE_LIST,
            },
            {
                path: INFRASTRUCTURE_TYPE_LIST,
                loadComponent: () =>
                    import('./infrastructure-type-list.component').then(
                        (m) => m.InfrastructureTypeListComponent
                    ),
            },
            {
                path: INFRASTRUCTURE_TYPE_FORM,
                loadComponent: () =>
                    import('./infrastructure-type-form.component').then(
                        (m) => m.InfrastructureTypeFormComponent
                    ),
            },
        ],
    },
];

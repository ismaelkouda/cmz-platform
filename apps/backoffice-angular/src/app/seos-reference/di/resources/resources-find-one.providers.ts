import { Provider } from '@angular/core';
import { ResourcesFindOneRepository } from '@pages/seos-reference/domain/repositories/resources/resources-find-one.repository';
import { ResourcesFindOneRepositoryImpl } from '@pages/seos-reference/infrastructure/data/repositories/resources/resources-find-one.repository.impl';

export const resourcesFindOneProviders: Provider[] = [
    {
        provide: ResourcesFindOneRepository,
        useClass: ResourcesFindOneRepositoryImpl,
    },
];

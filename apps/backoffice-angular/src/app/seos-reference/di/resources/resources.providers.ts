import { Provider } from '@angular/core';
import { ResourcesRepository } from '@pages/seos-reference/domain/repositories/resources/resources.repository';
import { ResourcesRepositoryImpl } from '@pages/seos-reference/infrastructure/data/repositories/resources/resources.repository.impl';

export const resourcesProviders: Provider[] = [
    {
        provide: ResourcesRepository,
        useClass: ResourcesRepositoryImpl,
    },
];

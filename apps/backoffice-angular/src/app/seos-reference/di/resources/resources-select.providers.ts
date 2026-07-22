import { Provider } from '@angular/core';
import { ResourcesSelectRepository } from '@pages/seos-reference/domain/repositories/resources/resources-select.repository';
import { ResourcesSelectRepositoryImpl } from '@pages/seos-reference/infrastructure/data/repositories/resources/resources-select.repository.impl';

export const resourcesSelectProviders: Provider[] = [
    {
        provide: ResourcesSelectRepository,
        useClass: ResourcesSelectRepositoryImpl,
    },
];

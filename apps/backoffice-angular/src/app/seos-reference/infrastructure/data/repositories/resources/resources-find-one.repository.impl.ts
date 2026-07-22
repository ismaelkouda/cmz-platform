import { Injectable, inject } from '@angular/core';
import { ResourcesFindOneFilterValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.validate-contract';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { ResourcesFindOneRepository } from '@pages/seos-reference/domain/repositories/resources/resources-find-one.repository';
import { resourcesFindOneFilterMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-find-one-filter.mapper';
import { ResourcesFindOneMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-find-one.mapper';
import { ResourcesFindOneApi } from '@pages/seos-reference/infrastructure/data/sources/resources/resources-find-one.api';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ResourcesFindOneRepositoryImpl implements ResourcesFindOneRepository {
    private readonly api = inject(ResourcesFindOneApi);
    private readonly mapper = inject(ResourcesFindOneMapper);

    execute(
        validContract: ResourcesFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ResourcesFindOneEntity> {
        const dto = resourcesFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

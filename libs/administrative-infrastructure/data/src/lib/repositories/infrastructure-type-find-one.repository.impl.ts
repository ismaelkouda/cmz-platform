import { Service, inject } from '@angular/core';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterValidateContract,
    InfrastructureTypeFindOneRepository,
} from '@cmz/administrative-infrastructure-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { infrastructureTypeFindOneFilterMapper } from '../mappers/infrastructure-type-find-one-filter.mapper';
import { InfrastructureTypeFindOneMapper } from '../mappers/infrastructure-type-find-one.mapper';
import { InfrastructureTypeFindOneApi } from '../sources/infrastructure-type-find-one.api';

@Service()
export class InfrastructureTypeFindOneRepositoryImpl implements InfrastructureTypeFindOneRepository {
    private readonly api = inject(InfrastructureTypeFindOneApi);
    private readonly mapper = inject(InfrastructureTypeFindOneMapper);

    execute(
        validContract: InfrastructureTypeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<InfrastructureTypeFindOneEntity> {
        const dto = infrastructureTypeFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

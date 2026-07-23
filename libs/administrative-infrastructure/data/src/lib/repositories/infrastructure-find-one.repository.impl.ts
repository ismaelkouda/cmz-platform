import { Service, inject } from '@angular/core';
import {
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterValidateContract,
    InfrastructureFindOneRepository,
} from '@cmz/administrative-infrastructure-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { infrastructureFindOneFilterMapper } from '../mappers/infrastructure-find-one-filter.mapper';
import { InfrastructureFindOneMapper } from '../mappers/infrastructure-find-one.mapper';
import { InfrastructureFindOneApi } from '../sources/infrastructure-find-one.api';

@Service()
export class InfrastructureFindOneRepositoryImpl implements InfrastructureFindOneRepository {
    private readonly api = inject(InfrastructureFindOneApi);
    private readonly mapper = inject(InfrastructureFindOneMapper);

    execute(
        validContract: InfrastructureFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<InfrastructureFindOneEntity> {
        const dto = infrastructureFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

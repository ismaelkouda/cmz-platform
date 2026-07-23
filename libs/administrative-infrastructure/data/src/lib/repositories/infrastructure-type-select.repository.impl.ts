import { Service, inject } from '@angular/core';
import { InfrastructureTypeSelectRepository } from '@cmz/administrative-infrastructure-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { InfrastructureTypeSelectMapper } from '../mappers/infrastructure-type-select.mapper';
import { InfrastructureTypeSelectApi } from '../sources/infrastructure-type-select.api';

@Service()
export class InfrastructureTypeSelectRepositoryImpl implements InfrastructureTypeSelectRepository {
    private readonly api = inject(InfrastructureTypeSelectApi);
    private readonly mapper = inject(InfrastructureTypeSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

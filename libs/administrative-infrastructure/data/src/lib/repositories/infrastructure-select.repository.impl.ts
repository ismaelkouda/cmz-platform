import { Service, inject } from '@angular/core';
import { InfrastructureSelectRepository } from '@cmz/administrative-infrastructure-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { InfrastructureSelectMapper } from '../mappers/infrastructure-select.mapper';
import { InfrastructureSelectApi } from '../sources/infrastructure-select.api';

@Service()
export class InfrastructureSelectRepositoryImpl implements InfrastructureSelectRepository {
    private readonly api = inject(InfrastructureSelectApi);
    private readonly mapper = inject(InfrastructureSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

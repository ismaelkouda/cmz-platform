import { Service, inject } from '@angular/core';
import { RadioRelayLinksSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { RadioRelayLinksSelectMapper } from '../mappers/radio-relay-links-select.mapper';
import { RadioRelayLinksSelectApi } from '../sources/radio-relay-links-select.api';

@Service()
export class RadioRelayLinksSelectRepositoryImpl implements RadioRelayLinksSelectRepository {
    private readonly api = inject(RadioRelayLinksSelectApi);
    private readonly mapper = inject(RadioRelayLinksSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

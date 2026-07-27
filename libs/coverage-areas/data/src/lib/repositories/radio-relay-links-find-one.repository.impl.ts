import { Service, inject } from '@angular/core';
import {
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneFilterValidateContract,
    RadioRelayLinksFindOneRepository,
} from '@cmz/coverage-areas-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { radioRelayLinksFindOneFilterMapper } from '../mappers/radio-relay-links-find-one-filter.mapper';
import { RadioRelayLinksFindOneMapper } from '../mappers/radio-relay-links-find-one.mapper';
import { RadioRelayLinksFindOneApi } from '../sources/radio-relay-links-find-one.api';

@Service()
export class RadioRelayLinksFindOneRepositoryImpl implements RadioRelayLinksFindOneRepository {
    private readonly api = inject(RadioRelayLinksFindOneApi);
    private readonly mapper = inject(RadioRelayLinksFindOneMapper);

    execute(
        validContract: RadioRelayLinksFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<RadioRelayLinksFindOneEntity> {
        const dto = radioRelayLinksFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

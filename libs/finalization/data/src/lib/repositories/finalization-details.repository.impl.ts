import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { unwrapResponse } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    FinalizationDetailsEntity,
    FinalizationDetailsFilterContract,
    FinalizationDetailsFinalizeEntity,
    FinalizationDetailsRepository,
    FinalizationDetailsTakeEntity,
} from '@cmz/finalization-domain';
import { finalizationDetailsFilterMapper } from '../mappers/finalization-details-filter.mapper';
import { FinalizationDetailsMapper } from '../mappers/finalization-details.mapper';
import { finalizationDetailsTakeMapper } from '../mappers/finalization-details-take.mapper';
import { finalizationDetailsFinalizeMapper } from '../mappers/finalization-details-finalize.mapper';
import { FinalizationDetailsApi } from '../sources/finalization-details.api';

@Service()
export class FinalizationDetailsRepositoryImpl implements FinalizationDetailsRepository {
    private readonly api = inject(FinalizationDetailsApi);
    private readonly mapper = inject(FinalizationDetailsMapper);

    execute(
        validContract: FinalizationDetailsFilterContract,
        options?: FetchOptions
    ): Observable<FinalizationDetailsEntity> {
        return this.api
            .execute(finalizationDetailsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    take(entity: FinalizationDetailsTakeEntity): Observable<void> {
        return this.api
            .take(finalizationDetailsTakeMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    finalize(entity: FinalizationDetailsFinalizeEntity): Observable<void> {
        return this.api
            .finalize(finalizationDetailsFinalizeMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }
}

import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { unwrapResponse } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ProcessingDetailsEntity,
    ProcessingDetailsFilterContract,
    ProcessingDetailsRepository,
    ProcessingDetailsTakeEntity,
    ProcessingDetailsTreatEntity,
} from '@cmz/processing-domain';
import { processingDetailsFilterMapper } from '../mappers/processing-details-filter.mapper';
import { ProcessingDetailsMapper } from '../mappers/processing-details.mapper';
import { processingDetailsTakeMapper } from '../mappers/processing-details-take.mapper';
import { processingDetailsTreatMapper } from '../mappers/processing-details-treat.mapper';
import { ProcessingDetailsApi } from '../sources/processing-details.api';

@Service()
export class ProcessingDetailsRepositoryImpl implements ProcessingDetailsRepository {
    private readonly api = inject(ProcessingDetailsApi);
    private readonly mapper = inject(ProcessingDetailsMapper);

    execute(
        validContract: ProcessingDetailsFilterContract,
        options?: FetchOptions
    ): Observable<ProcessingDetailsEntity> {
        return this.api
            .execute(processingDetailsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    take(entity: ProcessingDetailsTakeEntity): Observable<void> {
        return this.api
            .take(processingDetailsTakeMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    treat(entity: ProcessingDetailsTreatEntity): Observable<void> {
        return this.api
            .treat(processingDetailsTreatMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }
}

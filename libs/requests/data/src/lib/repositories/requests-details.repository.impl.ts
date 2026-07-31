import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { unwrapResponse } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RequestsDetailsEntity,
    RequestsDetailsFilterContract,
    RequestsDetailsRepository,
    RequestsDetailsApproveEntity,
    RequestsDetailsRejectEntity,
    RequestsDetailsTakeEntity,
} from '@cmz/requests-domain';
import { requestsDetailsFilterMapper } from '../mappers/requests-details-filter.mapper';
import { RequestsDetailsMapper } from '../mappers/requests-details.mapper';
import { requestsDetailsTakeMapper } from '../mappers/requests-details-take.mapper';
import { requestsDetailsApproveMapper } from '../mappers/requests-details-approve.mapper';
import { requestsDetailsRejectMapper } from '../mappers/requests-details-reject.mapper';
import { RequestsDetailsApi } from '../sources/requests-details.api';

@Service()
export class RequestsDetailsRepositoryImpl implements RequestsDetailsRepository {
    private readonly api = inject(RequestsDetailsApi);
    private readonly mapper = inject(RequestsDetailsMapper);

    execute(
        validContract: RequestsDetailsFilterContract,
        options?: FetchOptions
    ): Observable<RequestsDetailsEntity> {
        return this.api
            .execute(requestsDetailsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    take(entity: RequestsDetailsTakeEntity): Observable<void> {
        return this.api
            .take(requestsDetailsTakeMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    approve(entity: RequestsDetailsApproveEntity): Observable<void> {
        return this.api
            .approve(requestsDetailsApproveMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    reject(entity: RequestsDetailsRejectEntity): Observable<void> {
        return this.api
            .reject(requestsDetailsRejectMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }
}

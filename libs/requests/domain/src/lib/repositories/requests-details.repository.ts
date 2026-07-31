import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { RequestsDetailsFilterContract } from '../contracts/requests-details-filter.contract';
import { RequestsDetailsEntity } from '../entities/requests-details.entity';
import { RequestsDetailsApproveEntity } from '../entities/requests-details-approve.entity';
import { RequestsDetailsRejectEntity } from '../entities/requests-details-reject.entity';
import { RequestsDetailsTakeEntity } from '../entities/requests-details-take.entity';

export abstract class RequestsDetailsRepository {
    abstract execute(
        filter: RequestsDetailsFilterContract,
        options?: FetchOptions
    ): Observable<RequestsDetailsEntity>;

    abstract take(entity: RequestsDetailsTakeEntity): Observable<void>;

    abstract approve(entity: RequestsDetailsApproveEntity): Observable<void>;

    abstract reject(entity: RequestsDetailsRejectEntity): Observable<void>;
}

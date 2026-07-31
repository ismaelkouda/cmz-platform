import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { ReportStatesDetailsFilterContract } from '../contracts/report-states-details-filter.contract';
import { ReportStatesDetailsEntity } from '../entities/report-states-details.entity';
import { ReportStatesDetailsApproveEntity } from '../entities/report-states-details-approve.entity';
import { ReportStatesDetailsRejectEntity } from '../entities/report-states-details-reject.entity';
import { ReportStatesDetailsTakeEntity } from '../entities/report-states-details-take.entity';

export abstract class ReportStatesDetailsRepository {
    abstract execute(
        filter: ReportStatesDetailsFilterContract,
        options?: FetchOptions
    ): Observable<ReportStatesDetailsEntity>;

    abstract take(entity: ReportStatesDetailsTakeEntity): Observable<void>;

    abstract approve(
        entity: ReportStatesDetailsApproveEntity
    ): Observable<void>;

    abstract reject(entity: ReportStatesDetailsRejectEntity): Observable<void>;
}

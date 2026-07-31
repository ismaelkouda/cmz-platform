import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { FinalizationDetailsFilterContract } from '../contracts/finalization-details-filter.contract';
import { FinalizationDetailsEntity } from '../entities/finalization-details.entity';
import { FinalizationDetailsFinalizeEntity } from '../entities/finalization-details-finalize.entity';
import { FinalizationDetailsTakeEntity } from '../entities/finalization-details-take.entity';

export abstract class FinalizationDetailsRepository {
    abstract execute(
        filter: FinalizationDetailsFilterContract,
        options?: FetchOptions
    ): Observable<FinalizationDetailsEntity>;

    abstract take(entity: FinalizationDetailsTakeEntity): Observable<void>;

    abstract finalize(
        entity: FinalizationDetailsFinalizeEntity
    ): Observable<void>;
}

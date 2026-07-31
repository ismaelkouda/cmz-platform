import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { ProcessingDetailsFilterContract } from '../contracts/processing-details-filter.contract';
import { ProcessingDetailsEntity } from '../entities/processing-details.entity';
import { ProcessingDetailsTakeEntity } from '../entities/processing-details-take.entity';
import { ProcessingDetailsTreatEntity } from '../entities/processing-details-treat.entity';

export abstract class ProcessingDetailsRepository {
    abstract execute(
        filter: ProcessingDetailsFilterContract,
        options?: FetchOptions
    ): Observable<ProcessingDetailsEntity>;

    abstract take(entity: ProcessingDetailsTakeEntity): Observable<void>;

    abstract treat(entity: ProcessingDetailsTreatEntity): Observable<void>;
}

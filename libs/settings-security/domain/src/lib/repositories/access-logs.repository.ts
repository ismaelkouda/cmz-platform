import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { AccessLogsEntity } from '../entities/access-logs.entity';
import { AccessLogsFilterContract } from '../contracts/access-logs-filter.contract';

/**
 * Port lecture seule — confirmé dans le source (`AccessLogsRepository`
 * n'expose qu'une seule méthode, pas de create/update/delete/enable/disable,
 * pas de find-one).
 */
export abstract class AccessLogsRepository {
    abstract execute(
        filter: AccessLogsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AccessLogsEntity>>;
}

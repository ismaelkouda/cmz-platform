import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { AgentsPerformancesHistoryFilterContract } from '../contracts/agents-performances-history-filter.contract';
import { AgentsPerformancesHistoryEntity } from '../entities/agents-performances-history.entity';

/**
 * Volet « historique » — liste paginée filtrée par `uniqId` (agent), pas un
 * find-one GET simple. Reproduit fidèlement la forme legacy
 * (`AgentsPerformancesFindOneRepository.execute(filter, page, options):
 * Observable<Paginate<...>>`), renommé `-history` pour refléter la vraie
 * nature du flux plutôt que le nom trompeur `find-one` du legacy.
 */
export abstract class AgentsPerformancesHistoryRepository {
    abstract execute(
        filter: AgentsPerformancesHistoryFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesHistoryEntity>>;
}

import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { AgentsPerformancesFilterContract } from '../contracts/agents-performances-filter.contract';
import { AgentsPerformancesEntity } from '../entities/agents-performances.entity';

/**
 * Lecture seule — pas de create/update/delete/enable/disable, pas
 * d'`export()` serveur (l'export Excel du legacy est fait 100% côté client
 * sur les données déjà chargées, `ExcelExportService.exportToExcel`, pas un
 * second appel réseau — contrairement à `QueuesProcessingRepository.export()`).
 */
export abstract class AgentsPerformancesRepository {
    abstract execute(
        filter: AgentsPerformancesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesEntity>>;
}

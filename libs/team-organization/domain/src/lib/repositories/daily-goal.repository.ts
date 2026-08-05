import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { DailyGoalFilterContract } from '../contracts/daily-goal-filter.contract';
import { DailyGoalEntity } from '../entities/daily-goal.entity';

/**
 * Lecture seule — pas de create/update/delete/enable/disable, pas
 * d'`export()` serveur (même raisonnement que
 * `AgentsPerformancesRepository` : le legacy n'a qu'un `readAll`).
 */
export abstract class DailyGoalRepository {
    abstract execute(
        filter: DailyGoalFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DailyGoalEntity>>;
}

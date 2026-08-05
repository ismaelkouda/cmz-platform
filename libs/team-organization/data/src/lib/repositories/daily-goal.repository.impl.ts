import { Service, inject } from '@angular/core';
import {
    DailyGoalEntity,
    DailyGoalFilterContract,
    DailyGoalRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { dailyGoalFilterMapper } from '../mappers/daily-goal-filter.mapper';
import { DailyGoalMapper } from '../mappers/daily-goal.mapper';
import { DailyGoalApi } from '../sources/daily-goal.api';

@Service()
export class DailyGoalRepositoryImpl implements DailyGoalRepository {
    private readonly api = inject(DailyGoalApi);
    private readonly mapper = inject(DailyGoalMapper);

    execute(
        filter: DailyGoalFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DailyGoalEntity>> {
        return this.api
            .execute(dailyGoalFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    DailyGoalEntity,
    DailyGoalFilterContract,
    DailyGoalRepository,
    dailyGoalFilterEntity,
    dailyGoalFilterVo,
} from '@cmz/team-organization-domain';

@Service()
export class DailyGoalUseCase {
    private readonly repository = inject(DailyGoalRepository);

    execute(
        contract: DailyGoalFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DailyGoalEntity>> {
        return defer(() =>
            this.repository.execute(
                dailyGoalFilterEntity(dailyGoalFilterVo(contract)),
                page,
                options
            )
        );
    }
}

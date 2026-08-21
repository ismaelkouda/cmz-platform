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

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
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

import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    EvaluateReportStatesEntity,
    EvaluateReportStatesFilterContract,
    EvaluateReportStatesRepository,
    evaluateReportStatesFilterEntity,
    evaluateReportStatesFilterVo,
} from '@cmz/report-states-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class EvaluateReportStatesUseCase {
    private readonly repository = inject(EvaluateReportStatesRepository);

    execute(
        contract: EvaluateReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<EvaluateReportStatesEntity>> {
        return defer(() =>
            this.repository.execute(
                evaluateReportStatesFilterEntity(
                    evaluateReportStatesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: EvaluateReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesEntity[]> {
        return defer(() =>
            this.repository.export(
                evaluateReportStatesFilterEntity(
                    evaluateReportStatesFilterVo(contract)
                ),
                options
            )
        );
    }
}

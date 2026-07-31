import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    RejectReportStatesEntity,
    RejectReportStatesFilterContract,
    RejectReportStatesRepository,
    rejectReportStatesFilterEntity,
    rejectReportStatesFilterVo,
} from '@cmz/report-states-domain';

@Service()
export class RejectReportStatesUseCase {
    private readonly repository = inject(RejectReportStatesRepository);

    execute(
        contract: RejectReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RejectReportStatesEntity>> {
        return defer(() =>
            this.repository.execute(
                rejectReportStatesFilterEntity(
                    rejectReportStatesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: RejectReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<RejectReportStatesEntity[]> {
        return defer(() =>
            this.repository.export(
                rejectReportStatesFilterEntity(
                    rejectReportStatesFilterVo(contract)
                ),
                options
            )
        );
    }
}

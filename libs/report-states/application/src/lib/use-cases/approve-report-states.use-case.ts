import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    ApproveReportStatesEntity,
    ApproveReportStatesFilterContract,
    ApproveReportStatesRepository,
    approveReportStatesFilterEntity,
    approveReportStatesFilterVo,
} from '@cmz/report-states-domain';

@Service()
export class ApproveReportStatesUseCase {
    private readonly repository = inject(ApproveReportStatesRepository);

    execute(
        contract: ApproveReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ApproveReportStatesEntity>> {
        return defer(() =>
            this.repository.execute(
                approveReportStatesFilterEntity(
                    approveReportStatesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: ApproveReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<ApproveReportStatesEntity[]> {
        return defer(() =>
            this.repository.export(
                approveReportStatesFilterEntity(
                    approveReportStatesFilterVo(contract)
                ),
                options
            )
        );
    }
}

import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    CloseReportStatesFilterContract,
    CloseReportStatesRepository,
    CloseReportStatesEntity,
    closeReportStatesFilterEntity,
    closeReportStatesFilterVo,
} from '@cmz/report-states-domain';

@Service()
export class CloseReportStatesUseCase {
    private readonly repository = inject(CloseReportStatesRepository);

    execute(
        contract: CloseReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<CloseReportStatesEntity>> {
        return defer(() =>
            this.repository.execute(
                closeReportStatesFilterEntity(
                    closeReportStatesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: CloseReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<CloseReportStatesEntity[]> {
        return defer(() =>
            this.repository.export(
                closeReportStatesFilterEntity(
                    closeReportStatesFilterVo(contract)
                ),
                options
            )
        );
    }
}

import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    EvaluateReportStatesFilterContract,
    EvaluateReportStatesEntity,
    EvaluateReportStatesRepository,
} from '@cmz/report-states-domain';
import { evaluateReportStatesFilterMapper } from '../mappers/evaluate-report-states-filter.mapper';
import { EvaluateReportStatesItemMapper } from '../mappers/evaluate-report-states-item.mapper';
import { EvaluateReportStatesApi } from '../sources/evaluate-report-states.api';

@Service()
export class EvaluateReportStatesRepositoryImpl implements EvaluateReportStatesRepository {
    private readonly api = inject(EvaluateReportStatesApi);
    private readonly mapper = inject(EvaluateReportStatesItemMapper);

    execute(
        validContract: EvaluateReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<EvaluateReportStatesEntity>> {
        return this.api
            .execute(
                evaluateReportStatesFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: EvaluateReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesEntity[]> {
        return this.api
            .export(evaluateReportStatesFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}

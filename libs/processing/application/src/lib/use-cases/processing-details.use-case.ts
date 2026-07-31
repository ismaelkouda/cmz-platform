import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ProcessingDetailsEntity,
    ProcessingDetailsFilterContract,
    ProcessingDetailsPermissions,
    ProcessingDetailsRepository,
    ProcessingDetailsTakeContract,
    ProcessingDetailsTakeEntity,
    ProcessingDetailsTreatContract,
    ProcessingDetailsTreatEntity,
    processingDetailsFilterEntity,
    processingDetailsFilterVo,
} from '@cmz/processing-domain';

export interface ProcessingDetailsQuery {
    filter: ProcessingDetailsFilterContract;
    permissions: ProcessingDetailsPermissions;
    options?: FetchOptions;
}

@Service()
export class ProcessingDetailsUseCase {
    private readonly repository = inject(ProcessingDetailsRepository);

    execute(
        query: ProcessingDetailsQuery
    ): Observable<ProcessingDetailsEntity> {
        return defer(() =>
            this.repository
                .execute(
                    processingDetailsFilterEntity(
                        processingDetailsFilterVo(query.filter)
                    ),
                    query.options
                )
                .pipe(
                    map((entity) => entity.withPermissions(query.permissions))
                )
        );
    }

    take(contract: ProcessingDetailsTakeContract): Observable<void> {
        return defer(() =>
            this.repository.take(
                ProcessingDetailsTakeEntity.fromContract(contract)
            )
        );
    }

    treat(contract: ProcessingDetailsTreatContract): Observable<void> {
        return defer(() =>
            this.repository.treat(
                ProcessingDetailsTreatEntity.fromContract(contract)
            )
        );
    }
}

import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FetchOptions } from '@cmz/shared-domain';
import {
    FinalizationDetailsEntity,
    FinalizationDetailsFilterContract,
    FinalizationDetailsFinalizeContract,
    FinalizationDetailsFinalizeEntity,
    FinalizationDetailsPermissions,
    FinalizationDetailsRepository,
    FinalizationDetailsTakeContract,
    FinalizationDetailsTakeEntity,
    finalizationDetailsFilterEntity,
    finalizationDetailsFilterVo,
} from '@cmz/finalization-domain';

export interface FinalizationDetailsQuery {
    filter: FinalizationDetailsFilterContract;
    permissions: FinalizationDetailsPermissions;
    options?: FetchOptions;
}

@Service()
export class FinalizationDetailsUseCase {
    private readonly repository = inject(FinalizationDetailsRepository);

    execute(
        query: FinalizationDetailsQuery
    ): Observable<FinalizationDetailsEntity> {
        return defer(() =>
            this.repository
                .execute(
                    finalizationDetailsFilterEntity(
                        finalizationDetailsFilterVo(query.filter)
                    ),
                    query.options
                )
                .pipe(
                    map((entity) => entity.withPermissions(query.permissions))
                )
        );
    }

    take(contract: FinalizationDetailsTakeContract): Observable<void> {
        return defer(() =>
            this.repository.take(
                FinalizationDetailsTakeEntity.fromContract(contract)
            )
        );
    }

    finalize(contract: FinalizationDetailsFinalizeContract): Observable<void> {
        return defer(() =>
            this.repository.finalize(
                FinalizationDetailsFinalizeEntity.fromContract(contract)
            )
        );
    }
}

import { Service, inject } from '@angular/core';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    AccessLogsEntity,
    AccessLogsFilterContract,
} from '@cmz/settings-security-domain';
import { AccessLogsUseCase } from '../use-cases/access-logs.use-case';

/**
 * `PaginatedResourceFacade` directement (pas `CollectionResourceFacade`) :
 * pas de mutations à porter, `access-logs` est un journal en lecture seule
 * (cf. domaine `AccessLogsRepository`).
 *
 * `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts).
 */
@Service({ autoProvided: false })
export class AccessLogsFacade extends PaginatedResourceFacade<
    AccessLogsEntity,
    AccessLogsFilterContract
> {
    private readonly useCase = inject(AccessLogsUseCase);

    protected stream(
        params: PageQuery<AccessLogsFilterContract>
    ): Observable<PageResult<AccessLogsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}

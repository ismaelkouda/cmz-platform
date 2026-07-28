import { Service, inject } from '@angular/core';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AccessLogsEntity,
    AccessLogsFilterContract,
    AccessLogsRepository,
    accessLogsFilterVo,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

/** Lecture seule — pas de create/update/delete/enable/disable (cf. domaine). */
@Service()
export class AccessLogsUseCase {
    private readonly repository = inject(AccessLogsRepository);

    execute(
        contract: AccessLogsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AccessLogsEntity>> {
        return defer(() =>
            this.repository.execute(accessLogsFilterVo(contract), page, options)
        );
    }
}

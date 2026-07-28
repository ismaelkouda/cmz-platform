import { Service, inject } from '@angular/core';
import {
    AccessLogsEntity,
    AccessLogsFilterContract,
    AccessLogsRepository,
} from '@cmz/settings-security-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { AccessLogsFilterMapper } from '../mappers/access-logs-filter.mapper';
import { AccessLogsMapper } from '../mappers/access-logs.mapper';
import { AccessLogsApi } from '../sources/access-logs.api';

/** Lecture seule — confirmé dans le domaine (`AccessLogsRepository` n'expose qu'`execute`). */
@Service()
export class AccessLogsRepositoryImpl implements AccessLogsRepository {
    private readonly api = inject(AccessLogsApi);
    private readonly mapper = inject(AccessLogsMapper);
    private readonly filterMapper = inject(AccessLogsFilterMapper);

    execute(
        filter: AccessLogsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AccessLogsEntity>> {
        return this.api
            .readAll(this.filterMapper.mapContractToApi(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

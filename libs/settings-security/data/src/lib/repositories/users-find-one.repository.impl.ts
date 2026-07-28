import { Service, inject } from '@angular/core';
import {
    UsersFindOneEntity,
    UsersFindOneFilterValidateContract,
    UsersFindOneRepository,
} from '@cmz/settings-security-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { usersFindOneFilterMapper } from '../mappers/users-find-one-filter.mapper';
import { UsersFindOneMapper } from '../mappers/users-find-one.mapper';
import { UsersFindOneApi } from '../sources/users-find-one.api';

@Service()
export class UsersFindOneRepositoryImpl implements UsersFindOneRepository {
    private readonly api = inject(UsersFindOneApi);
    private readonly mapper = inject(UsersFindOneMapper);

    execute(
        filter: UsersFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<UsersFindOneEntity> {
        const dto = usersFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}

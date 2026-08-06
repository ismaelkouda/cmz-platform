import { Service, inject } from '@angular/core';
import { UsersSelectRepository } from '@cmz/settings-security-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { UsersSelectMapper } from '../mappers/users-select.mapper';
import { UsersSelectApi } from '../sources/users-select.api';

@Service()
export class UsersSelectRepositoryImpl implements UsersSelectRepository {
    private readonly api = inject(UsersSelectApi);
    private readonly mapper = inject(UsersSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
